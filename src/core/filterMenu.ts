import { 
  Transform 
} from './transform';

import { 
  ViewBasedJSONModel 
} from './viewbasedjsonmodel';

import { 
  DataModel 
} from '@phosphor/datagrid';

import {
  ElementExt
} from '@phosphor/domutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';


export class InteractiveFilterDialog extends Widget {
  constructor(options: InteractiveFilterDialog.IOptions) {
    super();
    this._model = options.model;

    this.node.style.position = 'absolute';
    this.node.className = 'p-Widget p-Menu';

    // Note: UL tags are used here to so that this menu will have the same
    // appearance as the phosphor menu widgets on the page.

    // Main content element
    this._contentElem = document.createElement('ul');
    this._contentElem.className = 'p-Menu-content';
    this._contentElem.style.cssText = `
      padding-left: 4px;
      padding-right: 4px;`;
    this.node.appendChild(this._contentElem);

    // Title element
    const titleLiElem = document.createElement('li');
    titleLiElem.className = 'p-Menu-item';
    const titleNode = document.createElement('div');
    titleNode.className= 'p-Menu-itemLabel';
    titleNode.innerText = 'Filter by condition:';
    titleLiElem.appendChild(titleNode);
    this._contentElem.appendChild(titleLiElem);

    // Selector
    const selectLiElem = document.createElement('li');
    selectLiElem.className = 'p-Menu-item';
    const selectDiv = document.createElement('div');
    selectDiv.className = 'p-Menu-itemLabel';
    selectLiElem.appendChild(selectDiv);
    this._selectElem = Private.createSelectElem();
    selectDiv.append(this._selectElem);
    this._contentElem.append(selectLiElem);

    // Input area
    const inputLiElem = document.createElement('li');
    inputLiElem.className = 'p-Menu-item';
    const inputDiv = document.createElement('div');
    inputDiv.className = 'p-Menu-itemLabel';
    inputLiElem.appendChild(inputDiv);
    this._inputElem = document.createElement('input');
    this._inputElem.style.marginRight = '5px';
    inputDiv.appendChild(this._inputElem);
    this._contentElem.appendChild(inputLiElem);

    // Apply button
    const applyButton = document.createElement('button');
    applyButton.innerText = 'Apply';
    inputDiv.appendChild(applyButton);
    applyButton.onclick = this.applyFilter.bind(this);
  }

  /**
   * Applies the active transformation to the linked data model.
   */
  applyFilter() : void {
    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: (this._region !== 'column-header')
        ? this._columnIndex
        : this._columnIndex + 1,
      operator: <Transform.FilterOperators>this._selectElem.value,
      value: (this._columnDtype === 'number')
        ? Number(this._inputElem.value)
        : this._inputElem.value
    };
    this._model.addTransform(transform);
    this.close()
  }

  /**
   * Updates the DOM elements with transform state from the linked data model.
   */
  updateDialog(): void {
    // The 0 index of the model's data is the primary key field, so we need to 
    // add 1 to get the correct field if the click was on a column header
    const lookupColumn = (this._region === 'column-header')
      ? this._columnIndex + 1
      : 0;
    const columnState = this._model.transformMetadata(lookupColumn);
    
    // Populate fields with defaultMetadata, if present
    if (columnState && columnState.filter) {
      this._inputElem.value = String(columnState.filter.value);
      this._selectElem.value = columnState.filter.operator;
    } else {
      this._inputElem.value = '';
      this._selectElem.value = '>';
    }
  }

  /**
   * Open the menu at the specified location.
   * 
   * @param options - The additional options for opening the menu.
   */
  open(options: InteractiveFilterDialog.IOpenOptions): void {

    // Update members with the metadata of the event that opened the menu. 
    this._columnIndex = options.columnIndex;
    this._columnDtype = this._model.metadata(
      options.region,
      options.columnIndex
    )['type'];
    this._region = options.region;

    // Update dom elements with transform state for the column
    this.updateDialog();

    // Get the current position and size of the main viewport.
    let px = window.pageXOffset;
    let py = window.pageYOffset;
    let cw = document.documentElement.clientWidth;
    let ch = document.documentElement.clientHeight;

    // Compute the maximum allowed height for the menu.
    let maxHeight = ch - (options.forceY ? options.y : 0);

    // Fetch common variables.
    let node = this.node;
    let style = node.style;

    // Clear the menu geometry and prepare it for measuring.
    style.top = '';
    style.left = '';
    style.width = '';
    style.height = '';
    style.visibility = 'hidden';
    style.maxHeight = `${maxHeight}px`;

    // Attach the menu to the document.
    Widget.attach(this, document.body);

    // Measure the size of the menu.
    let { width, height } = node.getBoundingClientRect();

    // Adjust the X position of the menu to fit on-screen.
    if (!options.forceX && (options.x + width > px + cw)) {
      options.x = px + cw - width;
    }

    // Adjust the Y position of the menu to fit on-screen.
    if (!options.forceY && (options.y + height > py + ch)) {
      if (options.y > py + ch) {
        options.y = py + ch - height;
      } else {
        options.y = options.y - height;
      }
    }

    // Update the position of the menu to the computed position.
    style.top = `${Math.max(0, options.y)}px`;
    style.left = `${Math.max(0, options.x)}px`;

    // Finally, make the menu visible on the screen.
    style.visibility = '';
  }

  /**
   * Handle the DOM events for the filter dialog.
   *
   * @param event - The DOM event sent to the panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
      case 'keydown':
        this._evtKeyDown(event as KeyboardEvent);
        break;
    }
  }
  
  protected _evtMouseDown(event: MouseEvent) {
    // Close the menu if a click is detected anywhere else
    if (!ElementExt.hitTest(this._contentElem, event.clientX, event.clientY)) {
      this.close()
    }
  }

  /**
   * Handle the `'keydown'` event for the menu.
   *
   * #### Notes
   * This listener is attached to the menu node.
   */
  protected _evtKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();
    switch (event.keyCode) {
      // Enter
      case (13):
        this.applyFilter();
        return;
      // Escape
      case (27):
        this.close();
        return;
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    document.addEventListener('mousedown', this, true);
    document.addEventListener('keydown', this, true);
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    document.removeEventListener('mousedown', this, true);
    document.removeEventListener('keydown', this, true);
  }

  private _model: ViewBasedJSONModel;

  // DOM elements
  private _selectElem: HTMLSelectElement;
  private _contentElem: HTMLUListElement;
  private _inputElem: HTMLInputElement;

  // Cell metadata
  private _columnIndex: number = 0;
  private _columnDtype: string = '';
  private _region: DataModel.CellRegion = 'column-header';
}

export namespace InteractiveFilterDialog {
  export interface IOptions {
    model: ViewBasedJSONModel
  }

  /**
   * An options object for the `open` method of this item.
   */
  export interface IOpenOptions {
    /**
     * The client X coordinate of the menu location.
     */
    x: number, 

    /**
     * The client Y coordinate of the menu location.
     */
    y: number, 

    /**
     * The CellRegion of the `cellClick` that triggered this call.
     */
    region: DataModel.CellRegion, 

    /**
     * The column index of the `cellClick` that triggered this call.
     */
    columnIndex: number,

    /**
     * Disallow repositioning of the X coordinates to prevent the menu from
     * extending out of the window.
     */
    forceX: boolean, 

    /**
     * Disallow repositioning of the Y coordinates to prevent the menu from
     * extending out of the window.
     */
    forceY: boolean
  }
}

/**
 * The namespace for the module implementation details.
 */
export namespace Private {

  /**
   * Creates the Select elem containing the filter options for this menu.
   */
  export function createSelectElem(): HTMLSelectElement {
    const selectElem = document.createElement('select');

    const optionGreaterThan = document.createElement('option');
    optionGreaterThan.setAttribute('value', '>');
    optionGreaterThan.innerText = 'Value Greater than:';
    selectElem.appendChild(optionGreaterThan); 

    const optionLessThan = document.createElement('option');
    optionLessThan.setAttribute('value', '<');
    optionLessThan.innerText = 'Value Less than:';
    selectElem.appendChild(optionLessThan); 

    const optionEqualTo = document.createElement('option');
    optionEqualTo.setAttribute('value', '=');
    optionEqualTo.innerText = 'Value equal to:';
    selectElem.appendChild(optionEqualTo); 

    const optionNotEqualTo = document.createElement('option');
    optionNotEqualTo.setAttribute('value', '!=');
    optionNotEqualTo.innerText = 'Value not equal to:';
    selectElem.appendChild(optionNotEqualTo);

    const optionLessThanOrEqualTo = document.createElement('option');
    optionLessThanOrEqualTo.setAttribute('value', '<=');
    optionLessThanOrEqualTo.innerText = 'Value less than or equal to:';
    selectElem.appendChild(optionLessThanOrEqualTo);

    const optionGreaterThanOrEqualTo = document.createElement('option');
    optionGreaterThanOrEqualTo.setAttribute('value', '>=');
    optionGreaterThanOrEqualTo.innerText = 'Value greather than or equal to:';
    selectElem.appendChild(optionGreaterThanOrEqualTo);

    const optionIsEmpty = document.createElement('option');
    optionIsEmpty.setAttribute('value', 'empty');
    optionIsEmpty.innerText = 'Value is empty:';
    selectElem.appendChild(optionIsEmpty);

    const optionIsNotEmpty = document.createElement('option');
    optionIsNotEmpty.setAttribute('value', 'notempty');
    optionIsNotEmpty.innerText = 'Value is not empty:';
    selectElem.appendChild(optionIsNotEmpty);
    
    return selectElem;
  }
}