// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

const d3Color: any = require('d3-color');

import {
  TextRenderer
} from '@phosphor/datagrid';

import {
  CommandRegistry
} from '@phosphor/commands';

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

import {
  DataGrid
} from './core/ipydatagrid';

// Import CSS
import '../css/datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

import {
  CellRendererModel, CellRendererView
} from './cellrenderer'

import {
  Theme
} from './utils'

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

    this.on('change:data', this.updateData.bind(this));
    this.on('change:_transforms', this.updateTransforms.bind(this));
    this.updateData();
    this.updateTransforms();
  }

  updateData() {
    this.data_model = new ViewBasedJSONModel(this.get('data'));
    this.data_model.transformStateChanged.connect((sender, value) => {
      this.set('_transforms', value.transforms);
      this.save_changes();
    });

    this.selectionModel = new BasicSelectionModel({ model: this.data_model });

    this.updateTransforms();
  }

  updateTransforms() {
    this.selectionModel.clear();
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
  selectionModel: BasicSelectionModel;
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
    const hitRegion = hit.region;
    const buttonSize = HeaderRenderer.buttonSize;
    const buttonPadding = HeaderRenderer.buttonPadding;

    if (hitRegion === 'corner-header' || hitRegion === 'column-header') {
      const columnWidth = grid.columnSize(
        hitRegion === 'corner-header' ? 'row-header' : 'body', hit.column);
      const rowHeight = grid.rowSize('column-header', hit.row);
      const isMenuClick =
        hit.x > (columnWidth - buttonSize - buttonPadding) &&
        hit.x < (columnWidth - buttonPadding) &&
        hit.y > (rowHeight - buttonSize - buttonPadding) &&
        hit.y < (rowHeight - buttonPadding);

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
    this.el.classList.add('datagrid-container');

    return this.updateRenderers().then(() => {
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

      this.updateGridStyle();

      this.grid.model = this.model.data_model;
      this.grid.keyHandler = new BasicKeyHandler();
      this.grid.mouseHandler = new IIPyDataGridMouseHandler(this);
      this.grid.selectionModel = this.model.selectionModel;
      this.updateGridRenderers();

      this.model.on('change:data', () => {
        this.grid.model = this.model.data_model;
        this.grid.selectionModel = this.model.selectionModel;
        this.updateHeaderRenderer();
        this.filterDialog.model = this.model.data_model;
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
        this.updateRenderers().then(this.updateGridRenderers.bind(this));
      }, this);

      this.pWidget.addWidget(this.grid);
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

  private updateGridRenderers() {
    if (this.grid.cellRenderers.get('body', {}) !== this.default_renderer.renderer) {
      this.grid.cellRenderers.set('body', {}, this.default_renderer.renderer);
    }

    for (const key in this.renderers) {
      if (this.grid.cellRenderers.get('body', { 'name': key }) !== this.renderers[key].renderer) {
        this.grid.cellRenderers.set('body', { 'name': key }, this.renderers[key].renderer);
      }
    }
  }

  protected updateGridStyle() {
    this.updateHeaderRenderer();
    const rowHeaderRenderer = new TextRenderer({
      textColor: Theme.getFontColor(1),
      backgroundColor: Theme.getBackgroundColor(2),
      horizontalAlignment: 'center',
      verticalAlignment: 'center'
    });
    this.grid.cellRenderers.set('row-header', {}, rowHeaderRenderer);

    const selectionFillColor = d3Color.rgb(Theme.getBrandColor(2));
    selectionFillColor.opacity = 0.4;

    const headerSelectionFillColor = d3Color.rgb(Theme.getBrandColor(2));
    headerSelectionFillColor.opacity = 0.1;

    this.grid.style = {
      voidColor: Theme.getBackgroundColor(),
      backgroundColor: Theme.getBackgroundColor(),
      gridLineColor: Theme.getBorderColor(),
      headerGridLineColor: Theme.getBorderColor(1),
      selectionFillColor: selectionFillColor.formatRgb(),
      selectionBorderColor: Theme.getBrandColor(1),
      headerSelectionFillColor: headerSelectionFillColor.formatRgb(),
      headerSelectionBorderColor: Theme.getBrandColor(1),
    };
  }

  private updateHeaderRenderer() {
    const headerRenderer = new HeaderRenderer({
      textColor: Theme.getFontColor(1),
      backgroundColor: Theme.getBackgroundColor(2),
      horizontalAlignment: 'center'
    });
    headerRenderer.model = this.model.data_model;
    this.grid.cellRenderers.set('column-header', {}, headerRenderer);
    this.grid.cellRenderers.set('corner-header', {}, headerRenderer);
  }

  private _createCommandRegistry(): CommandRegistry {
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
