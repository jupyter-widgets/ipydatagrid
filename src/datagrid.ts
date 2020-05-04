// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  BasicSelectionModel
} from '@lumino/datagrid';

import {
  CellRenderer
} from '@lumino/datagrid';

import {
  DOMWidgetModel, DOMWidgetView, JupyterPhosphorPanelWidget,
  ISerializers, resolvePromisesDict, unpack_models, WidgetModel
} from '@jupyter-widgets/base';

import {
  ViewBasedJSONModel
} from './core/viewbasedjsonmodel'

import {
  IPyDataGridContextMenu
} from './core/gridContextMenu';

import {
  InteractiveFilterDialog
} from './core/filterMenu';

// Import CSS
import '../css/datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import {
  CellRendererModel, CellRendererView
} from './cellrenderer'

import { DataGridWidget } from './datagridwidget';

// Shorthand for a string->T mapping
type Dict<T> = { [keys: string]: T; };


export
  class DataGridModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_module: DataGridModel.model_module,
      _model_module_version: DataGridModel.model_module_version,
      _view_name: DataGridModel.view_name,
      _view_module: DataGridModel.view_module,
      _view_module_version: DataGridModel.view_module_version,
      _visible_rows: [],
      _transforms: [],
      baseRowSize: 20,
      baseColumnSize: 64,
      baseRowHeaderSize: 64,
      baseColumnHeaderSize: 20,
      headerVisibility: 'all',
      _data: {},
      renderers: {},
      default_renderer: null,
      selection_mode: 'none',
      selections: [],
      editable: false,
      column_widths: {}
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.on('change:_data', this.updateData.bind(this));
    this.on('change:_transforms', this.updateTransforms.bind(this));
    this.on('change:selection_mode', this.updateSelectionModel, this);
    this.on('change:selections', this.updateSelections, this);
    this.updateData();
    this.updateTransforms();
    this.updateSelectionModel();

    this.on('msg:custom', (content) => {
      if (content.event_type === 'cell-changed') {
        this.data_model.setModelData('body', content.row, content.column_index, content.value);
      }
    });
  }

  updateData() {
    const data = this.data;
    const schema = Private.createSchema(data)

    this.data_model = new ViewBasedJSONModel({
      data: data.data,
      schema: schema
    });
    this.data_model.transformStateChanged.connect((sender, value) => {
      this.set('_transforms', value.transforms);
      this.save_changes();
    });
    this.data_model.dataSync.connect((sender, msg) => {
      switch (msg.type) {
        case ('row-indices-updated'):
          this.set('_visible_rows', msg.indices);
          this.save_changes();
          break;
        case ('cell-updated'):
          this.set('_data', this.data_model.dataset);
          this.save_changes();
          break;
        default:
          throw 'unreachable';
      }
    })

    this.data_model.changed.connect((sender: ViewBasedJSONModel, args: any) => {
      if (args.type === 'cells-changed') {
        const value = this.data_model.data(args.region, args.row, args.column);
        const datasetRow = this.data_model.getDatasetRowFromView(args.region, args.row)
        this.comm.send({
          method: 'custom',
          content: {
            event_type: 'cell-changed',
            region: args.region,
            row: datasetRow,
            column_index: args.column,
            value: value
          }
        }, null);
      }
    });

    this.updateTransforms();
    this.trigger('data-model-changed');
    this.updateSelectionModel();
  }

  updateTransforms() {
    if (this.selectionModel) {
      this.selectionModel.clear();
    }
    this.data_model.replaceTransforms(this.get('_transforms'));
  }

  updateSelectionModel() {
    if (this.selectionModel) {
      this.selectionModel.clear();
    }

    const selectionMode = this.get('selection_mode');

    if (selectionMode === 'none') {
      this.selectionModel = null;
      return;
    }

    this.selectionModel = new BasicSelectionModel({ dataModel: this.data_model });
    this.selectionModel.selectionMode = selectionMode;
    this.trigger('selection-model-changed');

    this.selectionModel.changed.connect((sender: BasicSelectionModel, args: void) => {
      if (this.synchingWithKernel) {
        return;
      }

      this.synchingWithKernel = true;

      const selectionIter = sender.selections().iter();
      const selections: any[] = [];
      let selection = null;
      while (selection = selectionIter.next()) {
        selections.push({
          r1: Math.min(selection.r1, selection.r2),
          r2: Math.max(selection.r1, selection.r2),
          c1: Math.min(selection.c1, selection.c2),
          c2: Math.max(selection.c1, selection.c2),
        });
      }

      this.set('selections', selections);
      this.save_changes();

      this.synchingWithKernel = false;
    }, this);
  }

  updateSelections() {
    if (!this.selectionModel || this.synchingWithKernel) {
      return;
    }

    this.synchingWithKernel = true;

    const selections = this.get('selections');
    this.selectionModel.clear();

    for (let selection of selections) {
      this.selectionModel.select({
        r1: selection.r1,
        c1: selection.c1,
        r2: selection.r2,
        c2: selection.c2,
        cursorRow: selection.r1,
        cursorColumn: selection.c1,
        clear: "none"
      });
    }

    this.synchingWithKernel = false;
  }

  get data(): DataGridModel.IData {
    return this.get('_data');
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    transforms: { deserialize: (unpack_models as any) },
    renderers: { deserialize: (unpack_models as any) },
    default_renderer: { deserialize: (unpack_models as any) },
    _data: { deserialize: (unpack_data as any) },
  }

  static model_name = 'DataGridModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  static view_name = 'DataGridView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  data_model: ViewBasedJSONModel;
  selectionModel: BasicSelectionModel | null;
  synchingWithKernel: boolean = false;
}

// modified from ipywidgets original
function unpack_data(
  value: any | Dict<unknown> | string | (Dict<unknown> | string)[],
  manager: any
): Promise<WidgetModel | Dict<WidgetModel> | WidgetModel[] | any> {
  if (Array.isArray(value)) {
    const unpacked: any[] = [];
    value.forEach((sub_value, key) => {
      unpacked.push(unpack_data(sub_value, manager));
    });
    return Promise.all(unpacked);
  } else if (value instanceof Object && typeof value !== 'string') {
    const unpacked: { [key: string]: any } = {};
    Object.keys(value).forEach(key => {
      unpacked[key] = unpack_data(value[key], manager);
    });
    return resolvePromisesDict(unpacked);
  } else if (value === '$NaN$') {
    return Promise.resolve(Number.NaN);
  } else if (value === '$Infinity$') {
    return Promise.resolve(Number.POSITIVE_INFINITY);
  } else if (value === '$NegInfinity$') {
    return Promise.resolve(Number.NEGATIVE_INFINITY);
  } else if (value === '$NaT$') {
    return Promise.resolve(new Date("INVALID"));
  } else {
    return Promise.resolve(value);
  }
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
    this.el.classList.add('datagrid-container');

    return this.updateRenderers().then(() => {
      this.grid = new DataGridWidget();
      this.grid.baseRowSize = this.model.get('base_row_size');
      this.grid.baseColumnSize = this.model.get('base_column_size');
      this.grid.baseRowHeaderSize = this.model.get('base_row_header_size');
      this.grid.baseColumnHeaderSize = this.model.get('base_column_header_size');
      this.grid.headerVisibility = this.model.get('header_visibility');
      this.grid.dataModel = this.model.data_model;
      this.grid.selectionModel = this.model.selectionModel;
      this.grid.editable = this.model.get('editable');

      this.updateGridStyle();
      this.updateGridRenderers();
      
      this.model.on('data-model-changed', () => {
        this.grid.dataModel = this.model.data_model;
        this.filterDialog.model = this.model.data_model;
      });

      this.model.on('change:base_row_size', () => {
        this.grid.baseRowSize = this.model.get('base_row_size');
      });

      this.model.on('change:base_column_size', () => {
        this.grid.baseColumnSize = this.model.get('base_column_size');
      });

      this.model.on('change:column_widths', () => {
        this.grid.columnWidths = this.model.get('column_widths');
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
        this.updateRenderers().then(this.updateGridRenderers.bind(this));
      }, this);

      this.model.on('selection-model-changed', () => {
        this.grid.selectionModel = this.model.selectionModel;
      });

      this.model.on('change:editable', () => {
        this.grid.editable = this.model.get('editable');
      });

      // @ts-ignore
      this.pWidget.addWidget(this.grid.grid);
    });
  }

  private updateRenderers() {

    // Unlisten to previous renderers
    if (this.default_renderer) {
      this.stopListening(this.default_renderer, 'renderer-changed');
    }
    for (const key in this.renderers) {
      this.stopListening(this.renderers[key], 'renderer-changed');
    }

    // And create views for new renderers
    let promises = [];

    const default_renderer = this.model.get('default_renderer');
    promises.push(this.create_child_view(default_renderer).then((defaultRendererView: any) => {
      this.default_renderer = defaultRendererView;

      this.listenTo(this.default_renderer, 'renderer-changed', this.updateGridRenderers.bind(this));
    }));

    let renderer_promises: Dict<Promise<any>> = {};
    _.each(this.model.get('renderers'), (model: CellRendererModel, key: string) => {
      renderer_promises[key] = this.create_child_view(model);
    });
    promises.push(resolvePromisesDict(renderer_promises).then((rendererViews: Dict<CellRendererView>) => {
      this.renderers = rendererViews;

      for (const key in rendererViews) {
        this.listenTo(rendererViews[key], 'renderer-changed', this.updateGridRenderers.bind(this));
      }
    }));

    return Promise.all(promises);
  }
  
  public updateGridStyle() {
    this.grid.updateGridStyle();
  }

  private updateGridRenderers() {
    const defaultRenderer = this.default_renderer.renderer;
    const renderers: Dict<CellRenderer> = {};
    Object.entries(this.renderers).forEach(([name, rendererView]) =>{
         renderers[name] = rendererView.renderer;
      }
    );
    this.grid.defaultRenderer = defaultRenderer;
    this.grid.renderers = renderers;
  }


  renderers: Dict<CellRendererView>;
  default_renderer: CellRendererView;

  grid: DataGridWidget;

  pWidget: JupyterPhosphorPanelWidget;

  model: DataGridModel;

  contextMenu: IPyDataGridContextMenu;
  filterDialog: InteractiveFilterDialog;

  isLightTheme: boolean = true;
}

export {
  TextRendererModel, TextRendererView,
  BarRendererModel, BarRendererView,
} from './cellrenderer';

export {
  VegaExprModel, VegaExprView
} from './vegaexpr';

export namespace DataGridModel {

  /**
   * An options object for initializing the data model.
   */
  export interface IData {

    data: ViewBasedJSONModel.DataSource
    schema: ISchema
    fields: { [key: string]: null }[]
  }
  export interface IField {
    readonly name: string | any[]
    readonly type: string
    readonly rows: any[]
  }
  export interface ISchema {
    readonly fields: IField[];
    readonly primaryKey: string[];
    readonly primaryKeyUuid: string;
  }
}

/**
 * The namespace for the module implementation details.
 */
namespace Private {

  /**
   * Creates a valid JSON Table Schema from the schema provided by pandas.
   * 
   * @param data - The data that has been synced from the kernel.
   */
  export function createSchema(data: DataGridModel.IData): ViewBasedJSONModel.ISchema {

    // Construct a new array of schema fields based on the keys in data.fields
    // Note: this accounts for how tuples/lists may be serialized into strings
    // in the case of multiIndex columns.
    const fields: ViewBasedJSONModel.IField[] = [];
    data.fields.forEach((val: { [key: string]: null }, i: number) => {
      let rows = Array.isArray(data.schema.fields[i].name)
        ? <any[]>data.schema.fields[i].name
        : <string[]>[data.schema.fields[i].name]
      let field = {
        name: Object.keys(val)[0],
        type: data.schema.fields[i].type,
        rows: rows
      }
      fields.push(field);
    })

    // Updating the primary key to account for a multiIndex primary key.
    const primaryKey = data.schema.primaryKey.map((key: string) => {
      for (let i = 0; i < data.schema.fields.length; i++) {
        const curFieldKey = Array.isArray(key) 
        ? data.schema.fields[i].name[0]
        : data.schema.fields[i].name;
        const newKey = Array.isArray(key) ? key[0] : key;

        if (curFieldKey == newKey) {
          return Object.keys(data.fields[i])[0];
        }
      }
      return "unreachable";
    });

    return {
      primaryKey: primaryKey,
      primaryKeyUuid: data.schema.primaryKeyUuid,
      fields: fields
    }
  }
}