// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  WidgetModel, DOMWidgetModel, DOMWidgetView, ISerializers, resolvePromisesDict, unpack_models
} from '@jupyter-widgets/base';

import {
    Message
} from '@phosphor/messaging';

import {
    Widget
} from '@phosphor/widgets';

import {
  DataGrid, JSONModel, TextRenderer, CellRenderer
} from '@phosphor/datagrid';

import {
  Transform, Sort, Filter
} from './core/transform'

import {
  ViewBasedJSONModel
} from './core/viewbasedjsonmodel'

// Import CSS
import '@phosphor/default-theme/style/index.css';
import './datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';


abstract class GridModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: GridModel.model_module,
      _model_module_version: GridModel.model_module_version,
      _view_name: GridModel.view_name,
      _view_module: GridModel.view_module,
      _view_module_version: GridModel.view_module_version,
      baseRowSize: 20,
      baseColumnSize: 64,
      baseRowHeaderSize: 64,
      baseColumnHeaderSize: 20,
      headerVisibility: 'all',
      formatters: {},
      default_background_color: 'white'
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.initialize_data_model();
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    formatters: { deserialize: (unpack_models as any) }
  }

  abstract initialize_data_model(): any;

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  static view_name = 'GridView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  data_model: any;
}


type Dict<T> = { [keys: string]: T; };

export
class GridView extends DOMWidgetView {
  render() {
    return this._initializeScaleViews().then(() => {
      this.grid = new DataGrid({
        baseRowSize: this.model.get('base_row_size'),
        baseColumnSize: this.model.get('base_column_size'),
        baseRowHeaderSize: this.model.get('base_row_header_size'),
        baseColumnHeaderSize: this.model.get('base_column_header_size'),
        headerVisibility: this.model.get('header_visibility')
      });
      this.grid.model = this.model.data_model;

      const body_renderer = new TextRenderer({
        backgroundColor: this._computeBackgroundColor.bind(this),
      });

      this.grid.cellRenderers.set('body', {}, body_renderer);
    });
  }

  _initializeScaleViews() {
    const formatters = this.model.get('formatters');
    let scalesPromises: Dict<Dict<Promise<any>>> = {};
    this.scales = {};

    _.each(formatters, (attrs: Dict<any>, header: string) => {
      scalesPromises[header] = {};
      _.each(attrs, (scaleModel: any, attr: string) => {
        // If scaleModel is not a string, assuming it is a scale
        if (typeof scaleModel !== 'string') {
          scalesPromises[header][attr] = this.create_child_view(scaleModel);
        }
      });
    });

    let promises: Promise<any>[] = [];
    _.each(scalesPromises, (attrs, header) => {
      promises.push(resolvePromisesDict(attrs).then((scales) => {
        this.scales[header] = scales;
      }));
    });

    return Promise.all(promises);
  }

  _computeBackgroundColor(config: CellRenderer.ICellConfig) {
    const formatters = this.model.get('formatters');

    if (formatters[config.metadata.name] && formatters[config.metadata.name]['background_color']) {
      const background_color = formatters[config.metadata.name]['background_color'];

      // If background_color is not a string, assuming it is a color scale
      return typeof background_color === 'string' ? background_color : this.scales[config.metadata.name]['background_color'].scale(config.value);
    }

    return this.model.get('default_background_color');
  }

  processPhosphorMessage(msg: Message) {
    super.processPhosphorMessage(msg);
    switch (msg.type) {
    case 'after-attach':
      Widget.attach(this.grid, this.el);
      break;
    }
  }

  scales: Dict<Dict<any>>;
  model: GridModel;
  grid: DataGrid;
}


export
class JSONGridModel extends GridModel {
  defaults() {
    return {...super.defaults(),
      _model_name: JSONGridModel.model_name,
      data: {}
    };
  }

  initialize_data_model() {
    this.data_model = new JSONModel(this.get('data'));
  }

  static model_name = 'JSONGridModel';

  data_model: JSONModel;
}


abstract class TransformModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: TransformModel.model_module,
      _model_module_version: TransformModel.model_module_version,
      field: ''
    };
  }

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  abstract transform: Transform;
}


export
class FilterModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: FilterModel.model_name,
      operator: '<',
      value: null
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    const operators_map: any = {
      '<': Filter.Operators.LessThan,
      '>': Filter.Operators.GreaterThan,
      '=': Filter.Operators.Equals
    };

    this.transform = new Filter({
      field: this.get('field'),
      operator: operators_map[this.get('operator')],
      value: this.get('value')
    });
  }

  static model_name = 'FilterModel';

  transform: Filter;
}


export
class SortModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: SortModel.model_name,
      desc: true
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.transform = new Sort({
      field: this.get('field'),
      desc: this.get('desc')
    });
  }

  static model_name = 'SortModel';

  transform: Sort;
}


export
class JSONGridViewModel extends GridModel {
  defaults() {
    return {...super.defaults(),
      _model_name: JSONGridViewModel.model_name,
      jsongrid: null,
      transforms: []
    };
  }

  initialize_data_model() {
    this.data_model = new ViewBasedJSONModel(this.get('jsongrid').get('data'));

    const transforms = this.get('transforms').map((x: TransformModel) => x.transform);
    this.data_model.updateView(transforms);
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    jsongrid: { deserialize: (unpack_models as any) },
    transforms: { deserialize: (unpack_models as any) }
  }

  static model_name = 'JSONGridViewModel';

  data_model: ViewBasedJSONModel;
}
