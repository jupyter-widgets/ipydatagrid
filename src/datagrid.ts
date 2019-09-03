// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
  DataGrid
} from './core/ipydatagrid';

import {
  BasicKeyHandler
} from './core/basickeyhandler';

import {
  BasicMouseHandler
} from './core/basicmousehandler';

import {
  BasicSelectionModel
} from './core/basicselectionmodel';

import {
  DOMWidgetModel, DOMWidgetView, JupyterPhosphorPanelWidget, ISerializers, resolvePromisesDict, unpack_models
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

    this.on('change:data', this.update_data.bind(this));
    this.on('change:_transforms', this.update_transforms.bind(this));
    this.update_data();
    this.update_transforms();
  }

  update_data() {
    this.data_model = new ViewBasedJSONModel(this.get('data'));
    this.data_model.transformStateChanged.connect((sender, value) => {
      this.set('_transforms', value.transforms);
      this.save_changes();
    });

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

class IIPyDataGridMouseHandler extends BasicMouseHandler {
  /**
   * Construct a new datagrid mouse handler.
   *
   * @param dataGridView - The DataGridView object for which mouse events are handled.
   */
  constructor(dataGridView: DataGridView) {
    super();

    this._dataGridView = dataGridView;
  }

  /**
   * Handle the mouse down event for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The mouse down event of interest.
   */
  onMouseDown(grid: DataGrid, event: MouseEvent): void {
    const hit = grid.hitTest(event.clientX, event.clientY);
    

    if (hit.region === 'column-header') {
      const columnSize = grid.columnSize('body', hit.column);
      const isMenuClick = hit.x > columnSize - HeaderRenderer.buttonSize;
      
      if (isMenuClick) {
        this._dataGridView.contextMenu.open(grid, {
          ...hit, x: event.clientX, y: event.clientY
        });

        return;
      }
    }

    super.onMouseDown(grid, event);
  }

  private _dataGridView: DataGridView;
};

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
        defaultSizes: {
          rowHeight: this.model.get('base_row_size'),
          columnWidth: this.model.get('base_column_size'),
          rowHeaderWidth: this.model.get('base_row_header_size'),
          columnHeaderHeight: this.model.get('base_column_header_size')
        },
        headerVisibility: this.model.get('header_visibility'),
      });

      this.filterDialog = new InteractiveFilterDialog({
        model: this.model.data_model
      });

      this.contextMenu = new IPyDataGridContextMenu({
        grid: this.grid,
        commands: this._createCommandRegistry()
      });

      // Set ipydatagrid header renderer
      const headerRenderer = new HeaderRenderer({
        textColor: '#000000',
        backgroundColor: 'rgb(243, 243, 243)',
        horizontalAlignment: 'center'
      });
      this.grid.cellRenderers.set('column-header', {}, headerRenderer);
      this.grid.cellRenderers.set('corner-header', {}, headerRenderer);

      this.grid.model = this.model.data_model;
      this.grid.keyHandler = new BasicKeyHandler();
      this.grid.mouseHandler = new IIPyDataGridMouseHandler(this);
      this.grid.selectionModel = new BasicSelectionModel({ model: this.model.data_model });
      this._update_grid_renderers();

      this.model.on('change:data', () => {
        this.grid.model = this.model.data_model;
      });

      this.model.on('change:base_row_size', () => {
        this.grid.defaultSizes = {
          ...this.grid.defaultSizes,
          rowHeight: this.model.get('base_row_size')
        };
      });

      this.model.on('change:base_column_size', () => {
        this.grid.defaultSizes = {
          ...this.grid.defaultSizes,
          columnWidth: this.model.get('base_column_size')
        };
      });

      this.model.on('change:base_row_header_size', () => {
        this.grid.defaultSizes = {
          ...this.grid.defaultSizes,
          rowHeaderWidth: this.model.get('base_row_header_size')
        };
      });

      this.model.on('change:base_column_header_size', () => {
        this.grid.defaultSizes = {
          ...this.grid.defaultSizes,
          columnHeaderHeight: this.model.get('base_column_header_size')
        };
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
      if (this.grid.cellRenderers.get('body', { 'name': key }) !== this.renderers[key].renderer) {
        this.grid.cellRenderers.set('body', { 'name': key }, this.renderers[key].renderer);
      }
    }
  }

  _createCommandRegistry(): CommandRegistry {
    const commands = new CommandRegistry();
    commands.addCommand(IPyDataGridContextMenu.CommandID.SortAscending, {
      label: 'Sort ASC',
      mnemonic: 1,
      iconClass: 'fa fa-arrow-up',
      execute: (args): void => {
        const cellClick: IPyDataGridContextMenu.CommandArgs = args as IPyDataGridContextMenu.CommandArgs;
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
        const cellClick: IPyDataGridContextMenu.CommandArgs = args as IPyDataGridContextMenu.CommandArgs;
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

export {
  TextRendererModel, TextRendererView,
  BarRendererModel, BarRendererView,
} from './cellrenderer';

export {
  VegaExprModel, VegaExprView
} from './vegaexpr';