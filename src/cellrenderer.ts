// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
    Message
} from '@phosphor/messaging';

import {
    Widget
} from '@phosphor/widgets';

import {
  DataGrid, TextRenderer, CellRenderer
} from '@phosphor/datagrid';

import {
  WidgetModel, DOMWidgetModel, DOMWidgetView, ISerializers, resolvePromisesDict, unpack_models
} from '@jupyter-widgets/base';

import {
  Transform, Sort, Filter
} from './core/transform'

import {
  ViewBasedJSONModel
} from './core/viewbasedjsonmodel'

// Import CSS
import '../css/datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Temporary, will be removed when the scales are exported from bqplot
type ColorScale = any;

// Function that computes a color depending on a given renderer (color scale, conditional renderer) and a value
function compute_color(renderer: string, config: CellRenderer.ICellConfig): string;
function compute_color(renderer: ConditionalRendererBaseModel, config: CellRenderer.ICellConfig): string;
function compute_color(renderer: ColorScale, config: CellRenderer.ICellConfig): string {
  if (typeof renderer === 'string') {
    return renderer;
  }

  if (renderer instanceof ConditionalRendererBaseModel) {
    return renderer.process(config);
  }

  return renderer.scale(config.value);
};


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
      output_if_false: '',
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
    };
  }

  process(config: CellRenderer.ICellConfig, current: string) {
    super.process(config, this.get('output_if_false'));
  }

  static model_name = 'TernaryOperatorModel';
}

class OperatorBaseModel extends WidgetModel {
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
