// Copyright (c) Bloomberg
// Distributed under the terms of the Modified BSD License.

const vegaExpressions: any = require('vega-expression');
const vegaFunctions: any = require('vega-functions');
const d3Format: any = require('d3-format');

import { WidgetModel, WidgetView } from '@jupyter-widgets/base';

import { CellRenderer } from '@lumino/datagrid';

import { MODULE_NAME, MODULE_VERSION } from './version';

export class VegaExprModel extends WidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: VegaExprModel.model_name,
      _model_module: VegaExprModel.model_module,
      _model_module_version: VegaExprModel.model_module_version,
      value: 'default_value',
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    const codegen_params = {
      whitelist: ['cell', 'default_value', 'functions'],
      globalvar: 'cell',
      functions: (codegen: any) => {
        const fn = vegaExpressions.functions(codegen);
        fn.format = this.d3FormatFunc;
        for (const name in vegaFunctions.functionContext) {
          fn[name] = 'functions.' + name;
        }
        return fn;
      },
    };

    this._codegen = vegaExpressions.codegen(codegen_params);

    this.updateFunction();
    this.on('change:value', this.updateFunction.bind(this));
  }

  // Newer versions of vega introduced a locale requirement, which we do
  // not use (older vega dependency) in ipydatagrid. The .format() function
  // specifically won't work without that context. Therefore, as that function
  // uses d3-format, we're monkey patching any .format() calls to use d3 directly.
  d3FormatFunc(value: any, spec: any) {
    return d3Format.format(spec)(value);
  }

  process(config: CellRenderer.CellConfig, defaultValue: any) {
    return this._function(config, defaultValue, vegaFunctions.functionContext);
  }

  _processRegex(match: string): string {
    const parsedMatch = match.match(/\[(.*?)\]/g)!;
    const column = parsedMatch[0];

    // Column indexing for regular element.
    if (parsedMatch.length === 1) {
      return `(cell.row, ${column.match(/\[(.*?)\]/)![1]})`;
    }

    const rest = parsedMatch.splice(1);

    // Column indexing for a compound element.
    return `(cell.row, ${column.match(/\[(.*?)\]/)![1]})${rest.join('')}`;
  }

  /**
   * Augments transpiled JS code output from vega with
   * datamodel calls for condition validation.
   * @param parsedValue JS code (string) generated from a vega expression
   */
  private _augmentExpression(parsedValue: ParsedVegaExpr): ParsedVegaExpr {
    let codeToProcess = parsedValue.code;
    codeToProcess = codeToProcess.replace(
      /(?<=cell.metadata.data)(\[(.*?)\])+(?=)/g,
      this._processRegex,
    );
    parsedValue.code = codeToProcess;

    return parsedValue;
  }

  private updateFunction() {
    let parsedValue: ParsedVegaExpr = this._codegen(
      vegaExpressions.parse(this.get('value')),
    );

    parsedValue = this._augmentExpression(parsedValue);

    this._function = Function(
      'cell',
      'default_value',
      'functions',
      '"use strict";return(' + parsedValue.code + ')',
    );
  }

  static model_name = 'VegaExprModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'VegaExprView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  _codegen: any;
  _function: any;
}

export class VegaExprView extends WidgetView {
  process(config: CellRenderer.CellConfig, defaultValue: any) {
    return this.model.process(config, defaultValue);
  }

  model: VegaExprModel;
}

export interface ParsedVegaExpr {
  /**
   * A JavaScript soring literal describing
   * the converted vega expression
   */
  code: string;
}
