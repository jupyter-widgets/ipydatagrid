// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

const vegaExpressions: any = require('vega-expression');
const vegaFunctions: any = require('vega-functions');

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
      functions: function (codegen: any) {
        const fn = vegaExpressions.functions(codegen);
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

  process(config: CellRenderer.CellConfig, defaultValue: any) {
    return this._function(config, defaultValue, vegaFunctions.functionContext);
  }

  /**
   * Augments transpiled JS code output from vega with
   * datamodel calls for condition validation.
   * @param parsedValue JS code (string) generated from a vega expression
   */
  private _augmentExpression(parsedValue: ParsedVegaExpr): ParsedVegaExpr {
    const codeToProcess = parsedValue.code;
    if (codeToProcess.includes('cell.metadata.data')) {
      const localRegex = /\[(.*?)\]/; // For "abc[1]" returns ["[1]", "1"];
      const indices = parsedValue.code.match(/\[(.*?)\]/g)!;
      const oldSuffix = indices.join('');
      const stringToReplace = `cell.metadata.data${oldSuffix}`;
      let row, column;
      let newReplacement;

      // Row and column passed - indexing based on given row and given column
      if (indices.length === 2) {
        [row, column] = indices;
        newReplacement = `cell.metadata.data(${row.match(localRegex)![1]}, ${
          column.match(localRegex)![1]
        })`;
      } else {
        // Only column passed - indexing based on given column and sibling row
        column = indices[0];
        newReplacement = `cell.metadata.data(cell.row, ${
          column.match(localRegex)![1]
        })`;
      }

      parsedValue.code = codeToProcess.replace(stringToReplace, newReplacement);
    }

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
