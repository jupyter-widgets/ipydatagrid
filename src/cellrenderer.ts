// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

const vega_expressions: any = require('vega-expression');
const vega_functions: any = require('vega-functions');

import {
  CellRenderer, TextRenderer
} from '@phosphor/datagrid';

import {
  WidgetModel, WidgetView, ISerializers, unpack_models
} from '@jupyter-widgets/base';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import {
  BarRenderer
} from './core/barrenderer';

// Temporary, will be removed when the scales are exported from bqplot
type Scale = any;


export
class VegaExprModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_name: VegaExprModel.model_name,
      _model_module: VegaExprModel.model_module,
      _model_module_version: VegaExprModel.model_module_version,
      value: 'default_value'
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    const codegen_params = {
      whitelist: ['cell', 'default_value', 'functions'],
      globalvar: 'cell',
      functions: function(codegen: any) {
        const fn = vega_expressions.functions(codegen);
        for (let name in vega_functions.functionContext) { fn[name] = 'functions.' + name; }
        return fn;
      }
    };

    this._codegen = vega_expressions.codegen(codegen_params);

    this.update_function();
    this.on('change:value', this.update_function.bind(this));
  }

  process(config: CellRenderer.ICellConfig, default_value: any) {
    return this._function(config, default_value, vega_functions.functionContext);
  }

  update_function() {
    const parsed_value = this._codegen(vega_expressions.parse(this.get('value')));

    this._function = Function('cell', 'default_value', 'functions', '"use strict";return(' + parsed_value.code + ')');
  }

  static model_name = 'VegaExprModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION
  static view_name = 'VegaExprView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  _codegen: any;
  _function: any;
}

export
class VegaExprView extends WidgetView {
  process(config: CellRenderer.ICellConfig, default_value: any) {
    return this.model.process(config, default_value);
  }

  model: VegaExprModel;
}


type Processor = boolean | string | number | VegaExprView | Scale;


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

  static model_name = 'CellRendererModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'CellRendererView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}


export
abstract class CellRendererView extends WidgetView {
  _initialize_processor(name: string): Promise<Processor> {
    let processor = this.model.get(name);

    if (typeof processor === 'string' || typeof processor === 'number' || typeof processor === 'boolean') {
      return Promise.resolve(processor);
    }

    // Assuming it is an VegaExprModel or a Scale model
    this.listenTo(processor, 'change', () => { this.trigger('renderer_changed'); });

    return this.create_child_view(processor);
  }

  _process(processor: Processor, config: CellRenderer.ICellConfig, default_value: any): any {
    if (typeof processor === 'string' || typeof processor === 'number' || typeof processor === 'boolean') {
      return processor;
    }

    if (processor instanceof VegaExprView) {
      return processor.process(config, default_value);
    }

    // Assuming it is a Scale view
    return processor.scale(config.value);
  }

  protected abstract _initialize(): Promise<any>;

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
    return this._initialize().then(() => {
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

  protected _initialize(): Promise<any> {
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
    ]);
  }

  renderer: TextRenderer;

  _font: Processor;
  _text_color: Processor;
  _background_color: Processor;
  _vertical_alignment: Processor;
  _horizontal_alignment: Processor;
}


export
class BarRendererModel extends TextRendererModel {
  defaults() {
    return {...super.defaults(),
      _model_name: BarRendererModel.model_name,
      _view_name: BarRendererModel.view_name,
      bar_color: '#4682b4',
      value: 0.,
      orientation: 'horizontal',
      bar_vertical_alignment: 'bottom',
      bar_horizontal_alignment: 'left',
      show_text: true,
    };
  }

  static serializers: ISerializers = {
    ...TextRendererModel.serializers,
    bar_color: { deserialize: (unpack_models as any) },
    value: { deserialize: (unpack_models as any) },
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
  render() {
    return this._initialize().then(() => {
      // If it's a scale, set the range to [0., 1.]
      if (this._value.scale) {
        this._value.set_range([0., 1.]);
      }

      this.renderer = new BarRenderer({
        font: this.compute_font.bind(this),
        backgroundColor: this.compute_background_color.bind(this),
        textColor: this.compute_text_color.bind(this),
        verticalAlignment: this.compute_vertical_alignment.bind(this),
        horizontalAlignment: this.compute_horizontal_alignment.bind(this),
        barColor: this.compute_bar_color.bind(this),
        value: this.compute_value.bind(this),
        orientation: this.compute_orientation.bind(this),
        barVerticalAlignment: this.compute_bar_vertical_alignment.bind(this),
        barHorizontalAlignment: this.compute_bar_horizontal_alignment.bind(this),
        showText: this.compute_show_text.bind(this),
      });
    });
  }

  compute_bar_color(config: CellRenderer.ICellConfig): string {
    return this._process(this._bar_color, config, '#4682b4');
  }

  compute_value(config: CellRenderer.ICellConfig): number {
    return this._process(this._value, config, 0.);
  }

  compute_orientation(config: CellRenderer.ICellConfig): any {
    return this._process(this._orientation, config, 'horizontal');
  }

  compute_bar_vertical_alignment(config: CellRenderer.ICellConfig): any {
    return this._process(this._bar_vertical_alignment, config, 'bottom');
  }

  compute_bar_horizontal_alignment(config: CellRenderer.ICellConfig): any {
    return this._process(this._bar_horizontal_alignment, config, 'left');
  }

  compute_show_text(config: CellRenderer.ICellConfig): any {
    return this._process(this._show_text, config, true);
  }

  protected _initialize(): Promise<any> {
    return super._initialize().then(() => {
      return Promise.all([
        this._initialize_processor('bar_color').then((processor: Processor) => {
          this._bar_color = processor;
        }),
        this._initialize_processor('value').then((processor: Processor) => {
          this._value = processor;
        }),
        this._initialize_processor('orientation').then((processor: Processor) => {
          this._orientation = processor;
        }),
        this._initialize_processor('bar_vertical_alignment').then((processor: Processor) => {
          this._bar_vertical_alignment = processor;
        }),
        this._initialize_processor('bar_horizontal_alignment').then((processor: Processor) => {
          this._bar_horizontal_alignment = processor;
        }),
        this._initialize_processor('show_text').then((processor: Processor) => {
          this._show_text = processor;
        }),
      ])
    });
  }

  renderer: BarRenderer;

  _bar_color: Processor;
  _value: Processor;
  _orientation: Processor;
  _bar_vertical_alignment: Processor;
  _bar_horizontal_alignment: Processor;
  _show_text: Processor;
}
