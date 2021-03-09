import { BasicKeyHandler, DataGrid } from '@lumino/datagrid';

/**
 * ipydatagrid specific KeyHandler class for handling
 * key events. Only polymorphed events are listed here,
 * the rest are ihnerited and used as is from the
 * parent class.
 */
export class KeyHandler extends BasicKeyHandler {
  constructor() {
    super();
  }

  /**
   * Handle the `'Escape'` key press for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The keyboard event of interest.
   */
  protected onEscape(grid: DataGrid, event: KeyboardEvent): void {
    // Bail if no selection model exists
    if (!grid.selectionModel) {
      return;
    }

    // Returns the first selection from the model, if selections exist
    const selections = grid.selectionModel.selections().next();

    if (selections) {
      grid.selectionModel.clear();
    } else {
      // Chrome's implementation of focus() requires the
      // target element to have the tabIndex attribute set.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=467043
      if (document.body.tabIndex === -1) {
        document.body.tabIndex = 0;
      }
      document.body.focus();
    }
  }
}
