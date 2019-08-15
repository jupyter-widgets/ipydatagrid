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

import {
  VirtualDOM, VirtualElement, h
} from '@phosphor/virtualdom'

/**
 * An interactive widget to add filter transformations to the data model.
 */
export class InteractiveFilterDialog extends Widget {

  /**
   * Construct a new InteractiveFilterDialog.
   *
   * @param options - The options for initializing the InteractiveFilterDialog.
   */
  constructor(options: InteractiveFilterDialog.IOptions) {
    super();
    this._model = options.model;
    this.node.style.position = 'absolute';
    this.node.className = 'p-Widget p-Menu';

    // Note: UL tags are used here to so that this menu will have the same
    // appearance as the phosphor menu widgets on the page.

    // Main content element
    this._mainElem = document.createElement('ul');
    this._mainElem.className = 'p-Menu-content';
    this._mainElem.style.cssText = `
      padding-left: 4px;
      padding-right: 4px;
      text-align: right;`;
    this.node.appendChild(this._mainElem);
  }

  /**
   * Checks for any undefined values in `this._filterValue`.
   */
  hasValidFilterValue(): boolean {
    if (!this._filterValue) {
      return false;
    } else if (Array.isArray(this._filterValue)) {
      if (this._filterValue[0] === undefined
        || this._filterValue[1] === undefined) {
        return false;
      }
    }
    return true;
  }

  /**
   * Applies the active transformation to the linked data model.
   */
  applyFilter(): void {
    // Bail if no value has been entered
    // TODO: Create some kind of visual error state to indicate the blank field
    // that needs a value.
    if (!this.hasValidFilterValue) {
      return;
    }

    // Construct transform
    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: (this._region !== 'column-header')
        ? this._columnIndex
        : this._columnIndex + 1,
      operator: this._filterOperator,
      value: <Transform.FilterValue>this._filterValue
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

    // Update state with transform metadata, if present
    if (columnState && columnState.filter) {
      this._filterOperator = columnState.filter.operator;
      this._filterValue = columnState.filter.value;
    } else {
      this._filterOperator = '<'
      this._filterValue = undefined;
    }

    // Override filter operator if in "Filter by value" mode.
    if (this._mode === 'value') {
      this._filterOperator = 'in'
    }

    // Render virtual DOM
    this._render();
  }

  /**
   * Renders the widget with VirtualDOM.
   */
  private _render(): void {
    if (this._mode === 'condition') {
      VirtualDOM.render([
        this.createTitleNode(),
        this.createOperatorList(),
        this._filterOperator === 'between'
          ? this.createDualValueNode()
          : this.createSingleValueNode()
      ], this._mainElem);
    } else if (this._mode === 'value') {
      VirtualDOM.render([
        this.createTitleNode(),
        this.createUniqueValueNodes(),
        h.button({
          style: { paddingTop: '5px' },
          onclick: this.applyFilter.bind(this)
        }, 'Apply')
      ], this._mainElem);
    } else {
      throw 'unreachable';
    }
  }

  /**
   * Open the menu at the specified location.
   * 
   * @param options - The additional options for opening the menu.
   */
  open(options: InteractiveFilterDialog.IOpenOptions): void {

    // Update state with the metadata of the event that opened the menu.
    this._columnIndex = options.columnIndex;
    this._columnDType = this._model.metadata(
      options.region,
      options.columnIndex
    )['type'];
    this._region = options.region;
    this._mode = options.mode;

    // Update DOM elements and render virtual DOM
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

  /**
   * Handle the `'mousedown'` event for the menu.
   *
   * #### Notes
   * This listener is attached to the document node.
   */
  protected _evtMouseDown(event: MouseEvent) {
    // Close the menu if a click is detected anywhere else
    if (!ElementExt.hitTest(this._mainElem, event.clientX, event.clientY)) {
      this.close();
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

  /**
   * Creates a `VirtualElement` to display the menu title.
   */
  createTitleNode(): VirtualElement {
    return h.li(
      { className: 'p-Menu-item' }, h.div(
        { className: 'p-Menu-itemLabel' }, (this._mode === 'condition')
          ? 'Filter by condition:'
          : 'Filter by value:')
    );
  }

  /**
   * Creates a `VirtualElement` to display an input element with "apply" button.
   *
   * Note: The `key` is randomly assigned to ensure that this element is always
   * rerendered with current state. User interaction with `input` elements
   * can cause attribute changes that are not recognized by VirtualDOM.
   */
  createSingleValueNode(): VirtualElement {
    return h.li(
      { className: 'p-Menu-item' }, h.div(
        { className: 'p-Menu-itemLabel' },
        h.input({
          style: { marginRight: '5px' },
          // Assigning a random key ensures that this element is always
          // rerendered
          key: String(Math.random()),
          oninput: (evt) => {
            const elem = <HTMLInputElement>evt.srcElement
            this._filterValue = this._columnDType === 'number'
              ? Number(elem.value)
              : elem.value;
          },
          value: (this._filterValue && !Array.isArray(this._filterValue))
            ? String(this._filterValue)
            : ''
        }),
        h.button({ onclick: this.applyFilter.bind(this) }, 'Apply'))
    );
  }

  /**
 * Creates a `VirtualElement` to display an input element with "apply" button.
 *
 * Note: The `key` is randomly assigned to ensure that this element is always
 * rerendered with current state. User interaction with `input` elements
 * can cause attribute changes that are not recognized by VirtualDOM.
 */
  createDualValueNode(): VirtualElement {
    return h.li(
      { className: 'p-Menu-item' }, h.div(
        { className: 'p-Menu-itemLabel' },
        h.input({
          style: { marginRight: '5px', width: '50px' },
          // Assigning a random key ensures that this element is always
          // rerendered
          key: String(Math.random()),
          oninput: (evt) => {
            const elem = <HTMLInputElement>evt.srcElement;
            this._filterValue = [
              this._columnDType === 'number'
                ? Number(elem.value)
                : elem.value,
              (<any[]>this._filterValue)[1]
            ];
          },
          // this._filterValue is converted to an array in
          // this.createOperatorList
          value: String((<any[]>this._filterValue)[0] || '')
        }),
        'and ',
        h.input({
          style: { marginRight: '5px', width: '50px' },
          // Assigning a random key ensures that this element is always
          // rerendered
          key: String(Math.random()),
          oninput: (evt) => {
            const elem = <HTMLInputElement>evt.srcElement;
            this._filterValue = [
              (<any[]>this._filterValue)[0],
              this._columnDType === 'number'
                ? Number(elem.value)
                : elem.value
            ];
          },
          // this._filterValue is converted to an array in
          // this.createOperatorList
          value: String((<any[]>this._filterValue)[1] || '')
        }),
        h.button({ onclick: this.applyFilter.bind(this) }, 'Apply'))
    );
  }

  /**
   * Creates a `VirtualElement` to display the unique values of a column.
   */
  createUniqueValueNodes(): VirtualElement {
    const uniqueVals = this._model.uniqueValues(this._columnIndex);
    const optionElems = uniqueVals.map(val => {
      return h.option({ value: val }, String(val))
    });

    return h.li(
      { className: 'p-Menu-item' },
      h.div(
        h.select({
          multiple: '',
          style: { width: '100%', height: '200px' },
          onchange: (evt) => {
            let selectElem = <HTMLSelectElement>evt.srcElement;
            const vals = [];
            for (let i = 0; i < selectElem.options.length; i++) {
              if (selectElem.options[i].selected) {
                vals.push(Number(selectElem.options[i].value))
              }
            }
            this._filterValue = vals;
          }
        }, optionElems)
      )
    );
  }

  /**
   * Creates a `VirtualElement` to display the available filter operators.
   *
   * Note: The `key` is randomly assigned to ensure that this element is always
   * rerendered with current state. User interaction with `input` elements
   * can cause attribute changes that are not recognized by VirtualDOM.
   */
  createOperatorList() {
    const op = this._filterOperator
    return h.li(
      { className: 'p-Menu-item' }, h.div(
        { className: 'p-Menu-itemLabel' }, h.select({
          // Assigning a random key ensures that this element is always
          // rerendered
          key: String(Math.random()),
          onchange: (evt) => {
            const elem = <HTMLSelectElement>evt.srcElement
            this._filterOperator = <Transform.FilterOperator>elem.value;

            if (elem.value === 'between') {
              this._filterValue = new Array(2);
            }
            // Re-render virtual DOM, in case input elements need to change.
            this._render();
          },
          value: this._filterOperator
        },
          h.option({
            value: '<', ...(op === '<') && { selected: '' }
          }, 'Value less than:'),
          h.option({
            value: '>', ...(op === '>') && { selected: '' }
          }, 'Value greater than:'),
          h.option({
            value: '<=', ...(op === '<=') && { selected: '' }
          }, 'Value less than or equal to:'),
          h.option({
            value: '>=', ...(op === '>=') && { selected: '' }
          }, 'Value greater than or equal to:'),
          h.option({
            value: 'between', ...(op === 'between') && { selected: '' }
          }, 'Value is in between:'),
          h.option({
            value: '=', ...(op === '=') && { selected: '' }
          }, 'Value is equal to:'),
          h.option({
            value: '!=', ...(op === '!=') && { selected: '' }
          }, 'Value is not equal to:'),
          h.option({
            value: 'empty', ...(op === 'empty') && { selected: '' }
          }, 'Value is empty:'),
          h.option({
            value: 'notempty', ...(op === 'notempty') && { selected: '' }
          }, 'Value is not empty:')
        )
      )
    )
  }

  private _model: ViewBasedJSONModel;

  // DOM elements
  private _mainElem: HTMLUListElement;

  // Cell metadata
  private _columnDType: string = 'number';
  private _columnIndex: number = 0;
  private _region: DataModel.CellRegion = 'column-header';

  // Menu state
  private _mode: 'condition' | 'value' = 'value';
  private _filterOperator: Transform.FilterOperator = '<';
  private _filterValue: InteractiveFilterDialog.FilterValue
}

export namespace InteractiveFilterDialog {

  /**
   * An options object for creating an `InteractiveFilterDialog`.
   */
  export interface IOptions {
    model: ViewBasedJSONModel
  }

  /**
   * A type alias for various filter modes.
   */
  export type FilterMode = 'condition' | 'value'

  /**
   * Type alias for valid input element values.
   */
  export type FilterValue = Transform.FilterValue | undefined | undefined[]

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

    /**
     * Selects if widget will open in `condition` or `value` mode.
     */
    mode: FilterMode
  }
}