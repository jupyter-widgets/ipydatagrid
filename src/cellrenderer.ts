// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

const d3Format: any = require('d3-format');

import {
  CellRenderer, TextRenderer
} from '@phosphor/datagrid';

import {
  Dict, WidgetModel, WidgetView, ISerializers, resolvePromisesDict, unpack_models
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import {
  BarRenderer
} from './core/barrenderer';

import {
  VegaExprView
} from './vegaexpr';

// Temporary, will be removed when the scales are exported from bqplot
type Scale = any;

type Scalar = boolean | string | number | null;
type Processor = Scalar | VegaExprView | Scale;


function isScalar(x: any): x is Scalar {
    return typeof x === "boolean" || typeof x === "string" || typeof x === "number" || x === null;
}

interface ICellRendererAttribute {
  // The name of the widget attribute
  name: string;

  // The name of the equivalent phosphor attribute, if null the CellRenderer attribute has no equivalent in phosphor
  phosphor_name: string | null;

  // The default value for this attribute
  default_value: Scalar;
}

export
abstract class CellRendererModel extends WidgetModel {
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

  abstract get_attrs(): ICellRendererAttribute[];

  static model_name = 'CellRendererModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'CellRendererView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}


export
abstract class CellRendererView extends WidgetView {
  render() {
    return this._initialize().then(() => {
      this._update_renderer();

      this.on('processor_changed', this._update_renderer.bind(this));
    });
  }

  /**
   * Initialize the CellRenderer widget.
   *
   * @return The promise to initialize the renderer
   */
  protected _initialize(): Promise<any> {
    const promises: Dict<PromiseLike<Processor>> = {};
    const attr_names = this.model.get_attrs().map((attr: ICellRendererAttribute) => { return attr.name; });

    this.model.on_some_change(attr_names, this._on_some_processors_change, this);

    for (const name of attr_names) {
      promises[name] = this._update_processor(name);
    }

    return resolvePromisesDict(promises).then((processors: Dict<Processor>) => {
      this.processors = processors;
    });
  }

  private _on_some_processors_change(event: any) {
    const promises: Dict<PromiseLike<Processor>> = {};

    for (const name in event.changed) {
      promises[name] = this._update_processor(name);
    }

    resolvePromisesDict(promises).then((processors: Dict<Processor>) => {
      this.processors = {
        ...this.processors,
        ...processors
      };

      this.trigger('processor_changed');
    });
  }

  /**
   * Update the phosphor renderer value, and trigger an event so that the DataGrid widget knows it has
   * changed.
   */
  _update_renderer() {
    let options: any = {};
    for (const attr of this.model.get_attrs()) {
      if (attr.phosphor_name) {
        options[attr.phosphor_name] = (config: CellRenderer.ICellConfig) => {
          return this.process(attr.name, config, attr.default_value);
        };
      }
    }

    this.renderer = this._create_renderer(options);

    this.trigger('renderer_changed');
  }

  /**
   * Update the processor associated with the given name.
   *
   * @param name - The name of the attribute to process.
   *
   * @return The PromiseLike to update the processor view.
   */
  protected _update_processor(name: string): any {
    let processor: any = this.model.get(name);

    if (isScalar(processor)) {
      return processor;
    }

    // Assuming it is an VegaExprModel or a Scale model
    this.listenTo(processor, 'change', () => { this.trigger('processor_changed'); });

    return this.create_child_view(processor);
  }

  /**
   * Process a cell attribute given the cell config.
   *
   * @param name - The name of the attribute to process.
   *
   * @param config - The configuration data for the cell.
   *
   * @param default_value - The default attribute value.
   */
  protected process(name: string, config: CellRenderer.ICellConfig, default_value: Scalar): any {
    const processor = this.processors[name];

    if (isScalar(processor)) {
      return processor;
    }

    if (processor instanceof VegaExprView) {
      return processor.process(config, default_value);
    }

    // Assuming it is a Scale view
    return processor.scale(config.value);
  }

  protected abstract _create_renderer(options: any): CellRenderer;

  model: CellRendererModel;

  renderer: CellRenderer;

  processors: Dict<Processor> = {};
}


export
class TextRendererModel extends CellRendererModel {
  defaults() {
    return {...super.defaults(),
      _model_name: TextRendererModel.model_name,
      _view_name: TextRendererModel.view_name,
      font: '12px sans-serif',
      text_color: 'black',
      text_value: null,
      background_color: 'white',
      vertical_alignment: 'center',
      horizontal_alignment: 'left',
      format: null,
    };
  }

  get_attrs(): ICellRendererAttribute[] {
    return [
      {name: 'font', phosphor_name: 'font', default_value: '12px sans-serif'},
      {name: 'text_color', phosphor_name: 'textColor', default_value: 'black'},
      {name: 'text_value', phosphor_name: null, default_value: null},
      {name: 'background_color', phosphor_name: 'backgroundColor', default_value: 'white'},
      {name: 'vertical_alignment', phosphor_name: 'verticalAlignment', default_value: 'center'},
      {name: 'horizontal_alignment', phosphor_name: 'horizontalAlignment', default_value: 'left'},
      {name: 'format', phosphor_name: null, default_value: null},
    ];
  }

  static serializers: ISerializers = {
    ...CellRendererModel.serializers,
    font: { deserialize: (unpack_models as any) },
    text_color: { deserialize: (unpack_models as any) },
    text_value: { deserialize: (unpack_models as any) },
    background_color: { deserialize: (unpack_models as any) },
    vertical_alignment: { deserialize: (unpack_models as any) },
    horizontal_alignment: { deserialize: (unpack_models as any) },
    format: { deserialize: (unpack_models as any) },
  }

  static model_name = 'TextRendererModel';
  static view_name = 'TextRendererView';
}


export
class TextRendererView extends CellRendererView {
  _create_renderer(options: TextRenderer.IOptions) {
    return new TextRenderer({
      ...options,
      format: this.get_formatter()
    });
  }

  get_formatter(options: TextRenderer.formatGeneric.IOptions = {}): TextRenderer.FormatFunc {
    return (config: CellRenderer.ICellConfig) => {
      const formatting_rule = this.process('format', config, null);

      let formatted_value: string;
      if (formatting_rule === null) {
        if (config.value === null) {
          formatted_value = 'None'
        } else {
          formatted_value = String(config.value);
        }
      } else {
        formatted_value = String(d3Format.format(formatting_rule)(config.value));
      }

      return this.process('text_value', config, formatted_value) || formatted_value;
    };
  }

  renderer: TextRenderer;

  model: TextRendererModel;

  _text_value: Processor;
  _format: Processor;
}


export
class BarRendererModel extends TextRendererModel {
  defaults() {
    return {...super.defaults(),
      _model_name: BarRendererModel.model_name,
      _view_name: BarRendererModel.view_name,
      bar_color: '#4682b4',
      bar_value: 0.,
      orientation: 'horizontal',
      bar_vertical_alignment: 'bottom',
      bar_horizontal_alignment: 'left',
      show_text: true,
    };
  }

  get_attrs(): ICellRendererAttribute[] {
    return super.get_attrs().concat([
      {name: 'bar_color', phosphor_name: 'barColor', default_value: '#4682b4'},
      {name: 'bar_value', phosphor_name: 'barValue', default_value: 0.},
      {name: 'orientation', phosphor_name: 'orientation', default_value: 'horizontal'},
      {name: 'bar_vertical_alignment', phosphor_name: 'barVerticalAlignment', default_value: 'bottom'},
      {name: 'bar_horizontal_alignment', phosphor_name: 'barHorizontalAlignment', default_value: 'left'},
      {name: 'show_text', phosphor_name: 'showText', default_value: true},
    ]);
  }

  static serializers: ISerializers = {
    ...TextRendererModel.serializers,
    bar_color: { deserialize: (unpack_models as any) },
    bar_value: { deserialize: (unpack_models as any) },
    orientation: { deserialize: (unpack_models as any) },
    bar_vertical_alignment: { deserialize: (unpack_models as any) },
    bar_horizontal_alignment: { deserialize: (unpack_models as any) },
    show_text: { deserialize: (unpack_models as any) },
  }

  static model_name = 'BarRendererModel';
  static view_name = 'BarRendererView';
}


export
class BarRendererView extends TextRendererView {
  _create_renderer(options: BarRenderer.IOptions) {
    return new BarRenderer({
      ...options,
      format: this.get_formatter()
    });
  }

  renderer: BarRenderer;

  model: BarRendererModel;
}
