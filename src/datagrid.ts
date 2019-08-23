// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  DataGrid
} from '@phosphor/datagrid';

import {
  WidgetModel, DOMWidgetModel, DOMWidgetView, JupyterPhosphorPanelWidget, ISerializers, resolvePromisesDict, unpack_models
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

    this.on('change:data', this.update_data.bind(this));
    this.on('change:transforms', this.update_transforms.bind(this));
    this.update_data();
    this.update_transforms();
  }

  update_data() {
    this.data_model = new ViewBasedJSONModel(this.get('data'));

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
  _createElement(tagName: string) {
    this.pWidget = new JupyterPhosphorPanelWidget({ view: this });
    return this.pWidget.node;
  }

  _setElement(el: HTMLElement) {
    if (this.el || el !== this.pWidget.node) {
      throw new Error('Cannot reset the DOM element.');
    }

    this.el = this.pWidget.node;
  }

  render() {
    return this._update_renderers().then(() => {
      this.grid = new DataGrid({
        baseRowSize: this.model.get('base_row_size'),
        baseColumnSize: this.model.get('base_column_size'),
        baseRowHeaderSize: this.model.get('base_row_header_size'),
        baseColumnHeaderSize: this.model.get('base_column_header_size'),
        headerVisibility: this.model.get('header_visibility'),
      });

      this.grid.model = this.model.data_model;
      this._update_grid_renderers();

      this.model.on('change:data', () => {
        this.grid.model = this.model.data_model;
      });

      this.model.on('change:base_row_size', () => {
        this.grid.baseRowSize = this.model.get('base_row_size');
      });

      this.model.on('change:base_column_size', () => {
        this.grid.baseColumnSize = this.model.get('base_column_size');
      });

      this.model.on('change:base_row_header_size', () => {
        this.grid.baseRowHeaderSize = this.model.get('base_row_header_size');
      });

      this.model.on('change:base_column_header_size', () => {
        this.grid.baseColumnHeaderSize = this.model.get('base_column_header_size');
      });

      this.model.on('change:header_visibility', () => {
        this.grid.headerVisibility = this.model.get('header_visibility');
      });

      this.model.on_some_change(['default_renderer', 'renderers'], () => {
        this._update_renderers().then(this._update_grid_renderers.bind(this));
      }, this);

      this.pWidget.addWidget(this.grid);
    });
  }

  _update_renderers() {
    // Unlisten to previous renderers
    if (this.default_renderer) {
      this.stopListening(this.default_renderer, 'renderer_changed');
    }
    for (const key in this.renderers) {
      this.stopListening(this.renderers[key], 'renderer_changed');
    }

    // And create views for new renderers
    let promises = [];

    const default_renderer = this.model.get('default_renderer');
    promises.push(this.create_child_view(default_renderer).then((default_renderer_view: any) => {
      this.default_renderer = default_renderer_view;

      this.listenTo(this.default_renderer, 'renderer_changed', this._update_grid_renderers.bind(this));
    }));

    let renderer_promises: Dict<Promise<any>> = {};
    _.each(this.model.get('renderers'), (model: CellRendererModel, key: string) => {
        renderer_promises[key] = this.create_child_view(model);
    });
    promises.push(resolvePromisesDict(renderer_promises).then((renderer_views: Dict<CellRendererView>) => {
      this.renderers = renderer_views;

      for (const key in renderer_views) {
        this.listenTo(renderer_views[key], 'renderer_changed', this._update_grid_renderers.bind(this));
      }
    }));

    return Promise.all(promises);
  }

  _update_grid_renderers() {
    if (this.grid.cellRenderers.get('body', {}) !== this.default_renderer.renderer) {
      this.grid.cellRenderers.set('body', {}, this.default_renderer.renderer);
    }

    for (const key in this.renderers) {
      if (this.grid.cellRenderers.get('body', {'name': key}) !== this.renderers[key].renderer) {
        this.grid.cellRenderers.set('body', {'name': key}, this.renderers[key].renderer);
      }
    }
  }

  renderers: Dict<CellRendererView>;
  default_renderer: CellRendererView;

  grid: DataGrid;

  pWidget: JupyterPhosphorPanelWidget;

  model: DataGridModel;
}

export {
  TextRendererModel, TextRendererView,
  BarRendererModel, BarRendererView,
} from './cellrenderer';

export {
  VegaExprModel, VegaExprView
} from './vegaexpr';
