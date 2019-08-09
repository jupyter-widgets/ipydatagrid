// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  DataGrid
} from './core/ipydatagrid';

import {
  WidgetModel, DOMWidgetModel, DOMWidgetView, JupyterPhosphorPanelWidget, ISerializers, resolvePromisesDict, unpack_models
} from '@jupyter-widgets/base';

import {
  Transform
} from './core/transform'

import {
  ViewBasedJSONModel
} from './core/viewbasedjsonmodel'

import {
  IPyDataGridContextMenu
} from './core/gridContextMenu';

import {
  InteractiveFilterDialog
} from './core/filterMenu';

import {
  HeaderRenderer
} from './core/headerRenderer';

// Import CSS
import '../css/datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import {
  CellRendererModel, CellRendererView
} from './cellrenderer'
import { CommandRegistry } from '@phosphor/commands';

// Shorthand for a string->T mapping
type Dict<T> = { [keys: string]: T; };


abstract class TransformModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: TransformModel.model_module,
      _model_module_version: TransformModel.model_module_version,
      columnIndex: null
    };
  }

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  abstract transform: Transform.TransformSpec;
}


export
class FilterModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: FilterModel.model_name,
      type: 'filter',
      operator: '<',
      value: null
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.transform = {
      type: this.get('type'),
      columnIndex: this.get('column_index'),
      operator: this.get('operator'),
      value: this.get('value')
    };
  }

  static model_name = 'FilterModel';

  transform: Transform.Filter;
}


export
class SortModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: SortModel.model_name,
      type: 'sort',
      desc: true
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.transform = {
      type: this.get('type'),
      columnIndex: this.get('column_index'),
      desc: this.get('desc')
    };
  }

  static model_name = 'SortModel';

  transform: Transform.Sort;
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
      _transforms: [],
      renderers: {},
      default_renderer: null
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.data_model = new ViewBasedJSONModel(this.get('data'));

    this.on('change:_transforms', this.update_transforms.bind(this));
    this.update_transforms();
  }

  update_transforms() {
    this.data_model.replaceTransforms(this.get('_transforms'));
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

      this.filterDialog = new InteractiveFilterDialog({
        model: this.model.data_model
      });

      this.contextMenu = new IPyDataGridContextMenu({
        grid: this.grid,
        commands: this._createCommandRegistry()
      })

      this.grid.model = this.model.data_model;

      this.grid.cellRenderers.set('body', {}, this.default_renderer.renderer);

      // Set ipydatagrid header renderer
      const headerRenderer = new HeaderRenderer({
        textColor: '#000000',
        backgroundColor: 'rgb(243, 243, 243)',
        horizontalAlignment: 'center'
      });

      this.grid.cellRenderers.set('column-header', {}, headerRenderer);
      this.grid.cellRenderers.set('corner-header', {}, headerRenderer)

      for (const key in this.renderers) {
        this.grid.cellRenderers.set('body', {'name': key}, this.renderers[key].renderer);
      }

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

      this.pWidget.addWidget(this.grid);
    });
  }

  _update_renderers() {
    let promises = [];

    const default_renderer = this.model.get('default_renderer');
    if (default_renderer) {
      promises.push(this.create_child_view(default_renderer).then((default_renderer_view: any) => {
        this.default_renderer = default_renderer_view;

        this.listenTo(this.default_renderer, 'renderer_changed', this._repaint.bind(this));
      }));
    }

    let renderer_promises: Dict<Promise<any>> = {};
    _.each(this.model.get('renderers'), (model: CellRendererModel, key: string) => {
        renderer_promises[key] = this.create_child_view(model);
    });
    promises.push(resolvePromisesDict(renderer_promises).then((renderer_views: Dict<CellRendererView>) => {
      this.renderers = renderer_views;

      for (const key in renderer_views) {
        this.listenTo(renderer_views[key], 'renderer_changed', this._repaint.bind(this));
      }
    }));

    return Promise.all(promises);
  }

  _repaint() {
    this.grid.repaint();
  }

  _createCommandRegistry(): CommandRegistry {
    const commands = new CommandRegistry();
    commands.addCommand(IPyDataGridContextMenu.CommandID.SortAscending, {
      label: 'Sort ASC',
      mnemonic: 1,
      iconClass: 'fa fa-arrow-up',
      execute: (args): void => {
        // @ts-ignore
        const cellClick: DataGrid.ICellHit = <DataGrid.ICellHit>args;
        this.model.data_model.addTransform({
          type: 'sort',
          columnIndex: cellClick.columnIndex + 1,
          desc: false
        })
      }
    });
    commands.addCommand(IPyDataGridContextMenu.CommandID.SortDescending, {
      label: 'Sort DESC',
      mnemonic: 1,
      iconClass: 'fa fa-arrow-down',
      execute: (args) => {
        // @ts-ignore
        const cellClick: DataGrid.ICellHit = <DataGrid.ICellHit>args;
        this.model.data_model.addTransform({
          type: 'sort',
          columnIndex: cellClick.columnIndex + 1,
          desc: true
        })
      }
    });
    commands.addCommand(IPyDataGridContextMenu.CommandID.RevertGrid, {
      label: 'Revert grid',
      mnemonic: 8,
      iconClass: 'fa fa-refresh',
      execute: (args) => {
        this.model.data_model.clearTransforms();
      }
    });
    commands.addCommand(IPyDataGridContextMenu.CommandID.OpenFilterByConditionDialog, {
      label: 'Filter by condition...',
      mnemonic: 4,
      iconClass: 'fa fa-filter',
      execute: (args) => {
        let commandArgs = <IPyDataGridContextMenu.CommandArgs>args
        this.filterDialog.open({
          x: commandArgs.clientX,
          y: commandArgs.clientY,
          region: commandArgs.region,
          columnIndex: commandArgs.columnIndex,
          forceX: false,
          forceY: false,
          mode: 'condition'
        });
      }
    });
    commands.addCommand(IPyDataGridContextMenu.CommandID.OpenFilterByValueDialog, {
      label: 'Filter by value...',
      mnemonic: 4,
      iconClass: 'fa fa-filter',
      execute: (args) => {
        let commandArgs = <IPyDataGridContextMenu.CommandArgs>args
        this.filterDialog.open({
          x: commandArgs.clientX,
          y: commandArgs.clientY,
          region: commandArgs.region,
          columnIndex: commandArgs.columnIndex,
          forceX: false,
          forceY: false,
          mode: 'value'
        });
      }
    });
    return commands;

  }

  renderers: Dict<CellRendererView>;
  default_renderer: CellRendererView;

  grid: DataGrid;

  pWidget: JupyterPhosphorPanelWidget;

  model: DataGridModel;

  contextMenu: IPyDataGridContextMenu;
  filterDialog: InteractiveFilterDialog;
}

export * from './cellrenderer';
