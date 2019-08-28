// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

const vega_expressions: any = require('vega-expression');
const vega_functions: any = require('vega-functions');

import {
  WidgetModel, WidgetView
} from '@jupyter-widgets/base';

import {
  CellRenderer
} from '@phosphor/datagrid';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

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
