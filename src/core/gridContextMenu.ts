import {
  DataGrid
} from './ipydatagrid';

import {
  CommandRegistry
} from '@phosphor/commands'

import {
  DataModel
} from '@phosphor/datagrid';

import {
  Menu
} from '@phosphor/widgets';

/**
 * An object which provides context menus for the data grid.
 * 
 * #### Notes
 * This item creates one Menu widget, then changes it's items based on
 * the `cellClick` signal from `DataGrid`. 
 */
export
  abstract class GridContextMenu {

  /**
   * Construct a new grid context menu.
   *
   * @param options - The options for initializing the context menu.
   */
  constructor(options: GridContextMenu.IOptions) {
    // @ts-ignore
    this._menu = new Menu({ commands: options.commands });

    // Connect to the data grid and bind this object, so that it can be
    // referenced in the signal callback
    options.grid.cellClick.connect(this.open.bind(this));
  }

  /**
   * Opens the context menu in reponse to the `cellClick` signal of the
   * data grid.
   * 
   * @param grid - The "sender" of the signal.
   * 
   * @param cellClick  - The "value" of the signal.
   */
  abstract open(grid: DataGrid, cellClick: DataGrid.ICellClick): void;

  /**
   * The menu widget which displays the relevant context items.
   */
  protected readonly _menu: Menu;

}

/**
 * The namespace for the `GridContextMenu` class statics.
 */
export
namespace GridContextMenu {
  /**
   * An options object for initializing a data grid.
   */
  export
    interface IOptions {

    /**
     * The data grid the context menu should be attached to.
     */
    grid: DataGrid,

    /**
     * The command registry to use with the context menu.
     */
    commands: CommandRegistry

    /**
     * The custom renderer to use to render menu items.
     */
    renderer?: Menu.Renderer
  }
}

/**
 * An WIP object which provides context menus for the data grid.
 * 
 * #### Notes
 * This is primarily here for demo purposes to demonstrate how we may want to 
 * manage context menus.
 */
export class IPyDataGridContextMenu extends GridContextMenu {
  /**
   * Opens the context menu in reponse to the `cellClick` signal of the
   * data grid.
   * 
   * @param grid - The "sender" of the signal.
   * 
   * @param cellClick  - The "value" of the signal.
   */
  open(grid: DataGrid, cellClick: DataGrid.ICellClick): void {

    // Bail if this click wasn't intended to open a menu
    if (!cellClick.cell.menuClick) {
      return;
    }

    // Discard the current menu items.
    this._menu.clearItems();

    // Create the args that will be provided to the commands' .execute() method
    const args: IPyDataGridContextMenu.CommandArgs = {
      ...cellClick.cell,
      clientX: cellClick.event.clientX,
      clientY: cellClick.event.clientY
    }

    // Add menu items based on the region of the grid that was clicked on.
    switch (cellClick.cell.region) {
      case 'column-header':
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.SortAscending,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.SortDescending,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.OpenFilterDialog,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.RevertGrid,
          args: args
        });
        break;
      case 'corner-header':
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.SortAscending,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.SortDescending,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.OpenFilterDialog,
          args: args
        });
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.RevertGrid,
          args: args
        });
        break;
      case 'body':
        this._menu.addItem({
          command: IPyDataGridContextMenu.CommandID.RevertGrid,
          args: args
        });
        break;
      default:
        throw 'unreachable';
    }

    // Open context menu at location of the click event
    this._menu.open(cellClick.event.clientX, cellClick.event.clientY)
  }
}

/**
 * The namespace for the `IPyDataGridContextMenu` class statics.
 */
export namespace IPyDataGridContextMenu {

  /**
   * An options object for initializing a context menu.
   */
  export interface IOptions {

    /**
     * The data grid to listen to clicks on.
     */
    grid: DataGrid,

  /**
   * The command registry used by the menu.
   */
    commands: CommandRegistry
  }

  /**
   * Command ID strings for the IpyDataGridContextMenu.
   */
  export enum CommandID {
    SortAscending = 'sort:Asc',
    SortDescending = 'sort:Desc',
    OpenFilterDialog = 'filter:openDialog',
    RevertGrid = 'grid:reset'
  }

  /**
   * Arguments to be provided to a command for execution.
   */
  export type CommandArgs = {
    region: DataModel.CellRegion,
    rowIndex: number,
    columnIndex: number,
    clientX: number,
    clientY: number
  }
}
