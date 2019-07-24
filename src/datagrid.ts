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

import {
  CellRendererModel, CellRendererView
} from './cellrenderer'

// Shorthand for a string->T mapping
type Dict<T> = { [keys: string]: T; };


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
class DataGridModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: DataGridModel.model_module,
      _model_module_version: DataGridModel.model_module_version,
      _view_name: DataGridModel.view_name,
      _view_module: DataGridModel.view_module,
      _view_module_version: DataGridModel.view_module_version,
      baseRowSize: 20,
      baseColumnSize: 64,
      baseRowHeaderSize: 64,
      baseColumnHeaderSize: 20,
      headerVisibility: 'all',
      data: {},
      transforms: [],
      renderers: {},
      default_renderer: null
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.data_model = new ViewBasedJSONModel(this.get('data'));

    this.on('change:transforms', this.update_transforms.bind(this));
    this.update_transforms();
  }

  update_transforms() {
    const transforms = this.get('transforms').map((x: TransformModel) => x.transform);

    this.data_model.updateView(transforms);
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    transforms: { deserialize: (unpack_models as any) },
    renderers: { deserialize: (unpack_models as any) },
    default_renderer: { deserialize: (unpack_models as any) },
  }

  static model_name = 'DataGridModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  static view_name = 'DataGridView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  data_model: ViewBasedJSONModel;
}


export
class DataGridView extends DOMWidgetView {
  render() {
    return this._update_renderers().then(() => {
      this.grid = new DataGrid({
        baseRowSize: this.model.get('base_row_size'),
        baseColumnSize: this.model.get('base_column_size'),
        baseRowHeaderSize: this.model.get('base_row_header_size'),
        baseColumnHeaderSize: this.model.get('base_column_header_size'),
        headerVisibility: this.model.get('header_visibility')
      });

      this.grid.model = this.model.data_model;

      const body_renderer = new TextRenderer({
        backgroundColor: this._compute_background_color.bind(this),
        textColor: this._compute_text_color.bind(this)
      });

      this.grid.cellRenderers.set('body', {}, body_renderer);
    });
  }

  _compute_background_color(config: CellRenderer.ICellConfig): string {
    return 'red';
  }

  _compute_text_color(config: CellRenderer.ICellConfig): string {
    return 'white';
  }

  _update_renderers() {
    let promises = [];

    const default_renderer = this.model.get('default_renderer');
    if (default_renderer) {
      promises.push(this.create_child_view(default_renderer).then((default_renderer_view) => {
        this.default_renderer = (default_renderer_view as any); // TypeScript thinks it's a DOMWidgetView here
      }));
    }

    let renderer_promises: Dict<Promise<CellRendererView>> = {};
    _.each(this.model.get('renderers'), (model: CellRendererModel, key: string) => {
        renderer_promises[key] = (this.create_child_view(model) as any); // TypeScript thinks it's a Dict<DOMWidgetView> here
    });
    promises.push(resolvePromisesDict(renderer_promises).then((renderer_views: Dict<CellRendererView>) => {
      this.renderers = renderer_views;
    }));

    return Promise.all(promises);
  }

  _repaint() {
    this.grid.repaint();
  }

  processPhosphorMessage(msg: Message) {
    super.processPhosphorMessage(msg);
    switch (msg.type) {
    case 'after-attach':
      Widget.attach(this.grid, this.el);
      break;
    }
  }

  renderers: Dict<CellRendererView>;
  default_renderer: CellRendererView;

  grid: DataGrid;

  model: DataGridModel;
}

export * from './cellrenderer';
