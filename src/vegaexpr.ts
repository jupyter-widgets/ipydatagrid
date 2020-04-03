// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

const vegaExpressions: any = require('vega-expression');
const vegaFunctions: any = require('vega-functions');

import {
  WidgetModel, WidgetView
} from '@jupyter-widgets/base';

import {
  CellRenderer
} from '@lumino/datagrid';

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
        const fn = vegaExpressions.functions(codegen);
        for (let name in vegaFunctions.functionContext) { fn[name] = 'functions.' + name; }
        return fn;
      }
    };

    this._codegen = vegaExpressions.codegen(codegen_params);

    this.updateFunction();
    this.on('change:value', this.updateFunction.bind(this));
  }

  process(config: CellRenderer.CellConfig, defaultValue: any) {
    return this._function(config, defaultValue, vegaFunctions.functionContext);
  }

  private updateFunction() {
    const parsedValue = this._codegen(vegaExpressions.parse(this.get('value')));

    this._function = Function('cell', 'default_value', 'functions', '"use strict";return(' + parsedValue.code + ')');
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
  process(config: CellRenderer.CellConfig, defaultValue: any) {
    return this.model.process(config, defaultValue);
  }

  model: VegaExprModel;
}
