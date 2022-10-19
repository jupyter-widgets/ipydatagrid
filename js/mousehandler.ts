import {
  BasicMouseHandler,
  CellRenderer,
  DataGrid,
  HyperlinkRenderer,
  Private,
  TextRenderer,
} from '@lumino/datagrid';
import { Platform } from '@lumino/domutils';
import { ISignal, Signal } from '@lumino/signaling';
import { HeaderRenderer } from './core/headerRenderer';
import { FeatherGrid } from './feathergrid';

export class MouseHandler extends BasicMouseHandler {
  /**
   * Construct a new datagrid mouse handler.
   *
   * @param grid - The FeatherGrid object for which mouse events are handled.
   */
  constructor(grid: FeatherGrid) {
    super();

    this._grid = grid;
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
    const buttonSize = HeaderRenderer.iconWidth * 1.5;
    const buttonPadding = HeaderRenderer.buttonPadding;
    const accel = Platform.accelKey(event);

    this._mouseIsDown = true;

    // Send cell clicked signal
    if (hit.region !== 'void') {
      this._cellClicked.emit(hit);
    }

    if (hitRegion === 'corner-header' || hitRegion === 'column-header') {
      const columnWidth = grid.columnSize(
        hitRegion === 'corner-header' ? 'row-header' : 'body',
        hit.column,
      );
      const rowHeight = grid.rowSize('column-header', hit.row);

      const isMenuRow =
        (hit.region === 'column-header' &&
          hit.row ==
          this._grid.grid.dataModel!.rowCount('column-header') - 1) ||
        (hit.region === 'corner-header' && hit.row === 0);

      const isMenuClick =
        hit.x > columnWidth - buttonSize - buttonPadding &&
        hit.x < columnWidth - buttonPadding &&
        hit.y > rowHeight - buttonSize - buttonPadding &&
        hit.y < rowHeight - buttonPadding &&
        isMenuRow;

      if (isMenuClick) {
        this._grid.contextMenu.open(grid, {
          ...hit,
          x: event.clientX + window.scrollX,
          y: event.clientY + window.scrollY,
        });
        return;
      }
    }
    if (grid) {
      // Create cell config object.
      const config = Private.createCellConfigObject(grid, hit);

      // Bail if no cell config object is defined for the region.
      if (!config) {
        return;
      }

      // Retrieve cell renderer.
      const renderer = grid.cellRenderers.get(config!);

      // Only process hyperlink renderers.
      if (renderer instanceof HyperlinkRenderer) {
        // Use the url param if it exists.
        let url = CellRenderer.resolveOption(renderer.url, config!);
        // Otherwise assume cell value is the URL.
        if (!url) {
          const format = TextRenderer.formatGeneric();
          url = format(config!);
        }

        // Emit message to open the hyperlink only if user hit Ctrl+Click.
        if (accel) {
          // Emit event that will be caught in case window.open is blocked
          window.postMessage(
            {
              id: 'ipydatagrid::hyperlinkclick',
              url,
            },
            '*',
          );
          // Reset cursor default after clicking
          const cursor = this.cursorForHandle('none');
          grid.viewport.node.style.cursor = cursor;
        }
      }
    }
    super.onMouseDown(grid, event);
  }

  onMouseUp(grid: DataGrid, event: MouseEvent): void {
    this._mouseIsDown = false;
    super.onMouseUp(grid, event);
  }

  get mouseIsDown(): boolean {
    return this._mouseIsDown;
  }

  get isResizing(): boolean {
    return (
      this.pressData !== null &&
      (this.pressData.type == 'column-resize' ||
        this.pressData.type == 'row-resize')
    );
  }

  /**
   * A signal emitted when a grid cell is clicked.
   */
  get cellClicked(): ISignal<this, DataGrid.HitTestResult> {
    return this._cellClicked;
  }

  private _grid: FeatherGrid;
  private _mouseIsDown = false;
  private _cellClicked = new Signal<this, DataGrid.HitTestResult>(this);
}
