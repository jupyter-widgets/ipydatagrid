// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  CellRenderer, TextRenderer
} from '@phosphor/datagrid';

import {
  WidgetModel, WidgetView, ISerializers, unpack_models
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Temporary, will be removed when the scales are exported from bqplot
type Scale = any;


export
class PredicateModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: PredicateModel.model_name,
      _model_module: PredicateModel.model_module,
      _model_module_version: PredicateModel.model_module_version,
      cell_field: 'value',
      operator: '<',
      reference_value: null,
      output_if_true: '',
      output_if_false: null,
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

    const output_if_false = this.get('output_if_false') ? this.get('output_if_false') : current;
    return condition ? this.get('output_if_true') : output_if_false;
  }

  static model_name = 'PredicateModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}


type Processor = string | PredicateModel[] | Scale;


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
    };
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
  renderer: CellRenderer;
}


export
class TextRendererModel extends CellRendererModel {
  defaults() {
    return {...super.defaults(),
      _model_name: TextRendererModel.model_name,
      _view_name: TextRendererModel.view_name,
      font: '12px sans-serif',
      text_color: 'black',
      background_color: 'white',
      vertical_alignment: 'center',
      horizontal_alignment: 'left',
    };
  }

  static serializers: ISerializers = {
    ...CellRendererModel.serializers,
    font: { deserialize: (unpack_models as any) },
    text_color: { deserialize: (unpack_models as any) },
    background_color: { deserialize: (unpack_models as any) },
    vertical_alignment: { deserialize: (unpack_models as any) },
    horizontal_alignment: { deserialize: (unpack_models as any) },
  }

  static model_name = 'TextRendererModel';
  static view_name = 'TextRendererView';
}


export
class TextRendererView extends CellRendererView {
  render() {
    return Promise.all([
      this._initialize_processor('font').then((processor: Processor) => {
        this._font = processor;
      }),
      this._initialize_processor('text_color').then((processor: Processor) => {
        this._text_color = processor;
      }),
      this._initialize_processor('background_color').then((processor: Processor) => {
        this._background_color = processor;
      }),
      this._initialize_processor('vertical_alignment').then((processor: Processor) => {
        this._vertical_alignment = processor;
      }),
      this._initialize_processor('horizontal_alignment').then((processor: Processor) => {
        this._horizontal_alignment = processor;
      })
    ]).then(() => {
      this.renderer = new TextRenderer({
        font: this.compute_font.bind(this),
        backgroundColor: this.compute_background_color.bind(this),
        textColor: this.compute_text_color.bind(this),
        verticalAlignment: this.compute_vertical_alignment.bind(this),
        horizontalAlignment: this.compute_horizontal_alignment.bind(this),
      });
    });
  }

  compute_font(config: CellRenderer.ICellConfig): string {
    return this._process(this._font, config, '12px sans-serif');
  }

  compute_text_color(config: CellRenderer.ICellConfig): string {
    return this._process(this._text_color, config, 'black');
  }

  compute_background_color(config: CellRenderer.ICellConfig): string {
    return this._process(this._background_color, config, 'white');
  }

  compute_vertical_alignment(config: CellRenderer.ICellConfig): any {
    return this._process(this._vertical_alignment, config, 'center');
  }

  compute_horizontal_alignment(config: CellRenderer.ICellConfig): any {
    return this._process(this._horizontal_alignment, config, 'left');
  }

  _initialize_processor(name: string): Promise<any> {
    let processor = this.model.get(name);

    if (typeof processor === 'string') {
      return Promise.resolve(processor);
    }

    if (processor instanceof PredicateModel) {
      processor = [processor];
    }

    // If it's an Array, assuming it's PredicateModel[]
    if (processor instanceof Array) {
      for (const predicate of processor) {
        this.listenTo(predicate, 'change', () => { this.trigger('renderer_changed'); });
      }

      return Promise.resolve(processor);
    }

    // Assuming it is a Scale model
    this.listenTo(processor, 'change', () => { this.trigger('renderer_changed'); });

    return this.create_child_view(processor);
  }

  _process(processor: Processor, config: CellRenderer.ICellConfig, default_value: string) {
    if (typeof processor === 'string') {
      return processor;
    }

    // If it's an Array, assuming it's PredicateModel[]
    if (processor instanceof Array) {
      let value = default_value;

      for (const predicate of processor) {
        value = predicate.process(config, value);
      }

      return value;
    }

    // Assuming it is a Scale view
    return processor.scale(config.value);
  }

  renderer: TextRenderer;

  _font: Processor;
  _text_color: Processor;
  _background_color: Processor;
  _vertical_alignment: Processor;
  _horizontal_alignment: Processor;
}
