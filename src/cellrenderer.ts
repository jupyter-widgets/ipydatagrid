// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  CellRenderer
} from '@phosphor/datagrid';

import {
  WidgetModel, WidgetView, ISerializers, unpack_models
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Temporary, will be removed when the scales are exported from bqplot
type ColorScale = any;


abstract class OperatorBaseModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: OperatorBaseModel.model_module,
      _model_module_version: OperatorBaseModel.model_module_version,
      cell_field: 'value',
      operator: '<',
      reference_value: null,
      output_if_true: '',
    };
  }

  abstract process(config: CellRenderer.ICellConfig, current: string): string;

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}


export
class OperatorModel extends OperatorBaseModel {
  defaults() {
    return {...super.defaults(),
      _model_name: OperatorModel.model_name,
    };
  }

  process(config: CellRenderer.ICellConfig, current: string) {
    const cell_field: keyof CellRenderer.ICellConfig = this.get('cell_field');
    const cell_value = config[cell_field];
    const reference_value = this.get('reference_value');

    let condition: boolean;
    switch (this.get('operator')) {
      case '<':
        condition = cell_value < reference_value;
        break;
      case '>':
        condition = cell_value > reference_value;
        break;
      case '=':
        condition = cell_value == reference_value;
        break;
      case '>=':
        condition = cell_value >= reference_value;
        break;
      case '<=':
        condition = cell_value <= reference_value;
        break;
      case 'contains':
        condition = cell_value.toString().includes(reference_value.toString());
        break;
      default:
        condition = false;
        break;
    }

    return condition ? this.get('output_if_true') : current;
  }

  static model_name = 'OperatorModel';
}


export
class TernaryOperatorModel extends OperatorModel {
  defaults() {
    return {...super.defaults(),
      _model_name: TernaryOperatorModel.model_name,
      output_if_false: null,
    };
  }

  process(config: CellRenderer.ICellConfig, current: string) {
    return super.process(config, this.get('output_if_false'));
  }

  static model_name = 'TernaryOperatorModel';
}


type ColorProcessor = string | OperatorBaseModel[] | ColorScale;


export
class CellRendererModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: CellRendererModel.model_name,
      _model_module: CellRendererModel.model_module,
      _model_module_version: CellRendererModel.model_module_version,
      _view_name: CellRendererModel.view_name,
      _view_module: CellRendererModel.view_module,
      _view_module_version: CellRendererModel.view_module_version,
      text_color: 'black',
      background_color: 'white',
    };
  }

  static serializers: ISerializers = {
    ...WidgetModel.serializers,
    text_color: { deserialize: (unpack_models as any) },
    background_color: { deserialize: (unpack_models as any) },
  }

  static model_name = 'CellRendererModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'CellRendererView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}


export
class CellRendererView extends WidgetView {
  render() {
    return this.ready = Promise.all([
      this._initialize_color_processor('text_color').then((processor: ColorProcessor) => {
        this._text_color = processor;
      }),
      this._initialize_color_processor('background_color').then((processor: ColorProcessor) => {
        this._background_color = processor;
      })
    ]);
  }

  compute_text_color(config: CellRenderer.ICellConfig): string {
    // Not using this.ready promise, this method MUST be synchronous.
    // The caller needs to check that the renderer is ready before calling this.
    return this._compute_color(this._text_color, config, 'black');
  }

  compute_background_color(config: CellRenderer.ICellConfig): string {
    // Not using this.ready promise, this method MUST be synchronous.
    // The caller needs to check that the renderer is ready before calling this.
    return this._compute_color(this._background_color, config, 'white');
  }

  _initialize_color_processor(name: string): Promise<any> {
    let color_processor = this.model.get(name);

    if (typeof color_processor === 'string') {
      return Promise.resolve(color_processor);
    }

    if (color_processor instanceof OperatorBaseModel) {
      color_processor = [color_processor];
    }

    // If it's an Array, assuming it's OperatorBaseModel[]
    if (color_processor instanceof Array) {
      for (const operator of color_processor) {
        this.listenTo(operator, 'change', () => { this.trigger('renderer_changed'); });
      }

      return Promise.resolve(color_processor);
    }

    // Assuming it is a ColorScale model
    this.listenTo(color_processor, 'change', () => { this.trigger('renderer_changed'); });

    return this.create_child_view(color_processor);
  }

  _compute_color(processor: ColorProcessor, config: CellRenderer.ICellConfig, default_value: string) {
    if (typeof processor === 'string') {
      return processor;
    }

    // If it's an Array, assuming it's OperatorBaseModel[]
    if (processor instanceof Array) {
      let color = default_value;

      for (const operator of processor) {
        color = operator.process(config, color);
      }

      return color;
    }

    // Assuming it is a ColorScale view
    return processor.scale(config.value);
  }

  ready: Promise<void[]>;

  _text_color: ColorProcessor;
  _background_color: ColorProcessor;
}
