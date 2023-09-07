import { DataGrid } from '@lumino/datagrid';

import { DataModel } from '@lumino/datagrid';

import { CommandRegistry } from '@lumino/commands';

import { Menu } from '@lumino/widgets';

/**
 * An object which provides context menus for the data grid.
 *
 * #### Notes
 * This item creates one Menu widget, then changes it's items based on
 * the `cellClick` signal from `DataGrid`.
 */
export abstract class GridContextMenu {
  /**
   * Construct a new grid context menu.
   *
   * @param options - The options for initializing the context menu.
   */
  constructor(options: GridContextMenu.IOptions) {
    this._menu = new Menu({ commands: options.commands });
    this._menu.addClass('ipydatagrid-context-menu');
  }

  /**
   * Opens the context menu in reponse to the `cellClick` signal of the
   * data grid.
   *
   * @param grid - The "sender" of the signal.
   *
   * @param hit  - The "value" of the signal.
   */
  abstract open(grid: DataGrid, hit: DataGrid.HitTestResult): void;

  /**
   * The menu widget which displays the relevant context items.
   */
  protected readonly _menu: Menu;
}

/**
 * The namespace for the `GridContextMenu` class statics.
 */
export namespace GridContextMenu {
  /**
   * An options object for initializing a data grid.
   */
  export interface IOptions {
    /**
     * The data grid the context menu should be attached to.
     */
    grid: DataGrid;

    /**
     * The command registry to use with the context menu.
     */
    commands: CommandRegistry;

    /**
     * The custom renderer to use to render menu items.
     */
    renderer?: Menu.Renderer;
  }
}

/**
 * An WIP object which provides context menus for the data grid.
 *
 * #### Notes
 * This is primarily here for demo purposes to demonstrate how we may want to
 * manage context menus.
 */
export class FeatherGridContextMenu extends GridContextMenu {
  /**
   * Opens the context menu in reponse to the `cellClick` signal of the
   * data grid.
   *
   * @param grid - The "sender" of the signal.
   *
   * @param hit  - The "value" of the signal.
   */
  open(grid: DataGrid, hit: DataGrid.HitTestResult): void {
    // Discard the current menu items.
    this._menu.clearItems();

    // Create the args that will be provided to the commands' .execute() method
    const args: FeatherGridContextMenu.CommandArgs = {
      region: hit.region as DataModel.CellRegion,
      rowIndex: hit.row,
      columnIndex: hit.column,
      clientX: hit.x,
      clientY: hit.y,
    };

    // Add menu items based on the region of the grid that was clicked on.
    switch (hit.region) {
      case 'column-header':
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.SortAscending,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.SortDescending,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.OpenFilterByConditionDialog,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.OpenFilterByValueDialog,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.ClearThisFilter,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.ClearFiltersInAllColumns,
          args: args,
        });
        break;
      case 'corner-header':
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.SortAscending,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.SortDescending,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.OpenFilterByConditionDialog,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.OpenFilterByValueDialog,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.ClearThisFilter,
          args: args,
        });
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.ClearFiltersInAllColumns,
          args: args,
        });
        break;
      case 'body':
        this._menu.addItem({
          command: FeatherGridContextMenu.CommandID.RevertGrid,
          args: args,
        });
        break;
      default:
        throw 'unreachable';
    }

    // Get the current height of the main viewport.
    const px = window.pageXOffset;
    const py = window.pageYOffset;
    const cw = document.documentElement.clientWidth;
    const ch = document.documentElement.clientHeight;
    const bodyh = document.documentElement.scrollHeight;
    var style = window.getComputedStyle(document.body);
    const extraspaceX = parseFloat(style.marginLeft)+parseFloat(style.paddingLeft)+parseFloat(style.borderLeftWidth);
    const extraspaceY = parseFloat(style.marginTop)+parseFloat(style.paddingTop)+parseFloat(style.borderTopWidth);

    // Open context menu at location of the click event
    this._menu.open(hit.x, 0); //Using 0 so it's at least at the bottom
                               //of the parent div and not a mile down

    // Now that it's open, move it to the correct position.
    // Lumino won't allow a negative y-coordinate, but we
    // need it to be negative with absolute positioning. This
    // position-reposition thing isn't ideal, since there's a
    // split-second that the menu is not where it ought to be,
    // but in practice this is usually going to be so brief a
    // moment that nobody will notice; it's functionally a
    // performance hit in a spot where people likely won't notice
    // a performance hit.

    // We're going to do the full coordinate recalculation,
    // since the conditions below are part of the Lumino
    // menu's positioning math for a reason. They show up in
    // ipydatagrid's InteractiveFilterDialog positioning math
    // as well.

    let node = this._menu.node;
    let { width, height } = node.getBoundingClientRect();

    let hitx = hit.x;
    let hity = hit.y;

    // Adjust the X position of the menu to fit on-screen.
    if (hitx + width > px + cw) {
      hitx = px + cw - width;
    }

    // Adjust the Y position of the menu to fit on-screen.
    if (hity + height > py + ch) {
      if (hity > py + ch) {
        hity = py + ch - height;
      } else {
        hity = hity - height;
      }
    }

    hitx = hitx - extraspaceX;
    hity = hity - bodyh + extraspaceY;

    // Update the position of the menu to the computed position.
    this._menu.node.style.transform = `translate(${Math.max(0, hitx)}px, ${hity}px`;
  }
}

/**
 * The namespace for the `IPyDataGridContextMenu` class statics.
 */
export namespace FeatherGridContextMenu {
  /**
   * An options object for initializing a context menu.
   */
  export interface IOptions {
    /**
     * The data grid to listen to clicks on.
     */
    grid: DataGrid;

    /**
     * The command registry used by the menu.
     */
    commands: CommandRegistry;
  }

  /**
   * Command ID strings for the IpyDataGridContextMenu.
   */
  export enum CommandID {
    SortAscending = 'sort:Asc',
    SortDescending = 'sort:Desc',
    OpenFilterByConditionDialog = 'filterCondition:openDialog',
    OpenFilterByValueDialog = 'filterValue:openDialog',
    RevertGrid = 'grid:reset',
    ClearThisFilter = 'filter:clearCurrentColumn',
    ClearFiltersInAllColumns = 'filter:clearAllColumns',
  }

  /**
   * Arguments to be provided to a command for execution.
   */
  export type CommandArgs = {
    region: DataModel.CellRegion;
    rowIndex: number;
    columnIndex: number;
    clientX: number;
    clientY: number;
  };
}
