import {
  Transform
} from './transform';

import {
  ViewBasedJSONModel
} from './viewbasedjsonmodel';

import {
  DataGrid
} from './datagrid';

import {
  DataModel
} from '@lumino/datagrid';

import {
  ElementExt
} from '@lumino/domutils';

import {
  Message, MessageLoop, ConflatableMessage
} from '@lumino/messaging';

import {
  BasicMouseHandler
} from '@lumino/datagrid';

import {
  Widget, BoxPanel
} from '@lumino/widgets';

import {
  VirtualDOM, VirtualElement, h
} from '@lumino/virtualdom'

import {
  FilterValueRenderer
} from './valueRenderer';

import {
  Theme
} from '../utils';

/**
 * An interactive widget to add filter transformations to the data model.
 */
export class InteractiveFilterDialog extends BoxPanel {

  /**
   * Construct a new InteractiveFilterDialog.
   *
   * @param options - The options for initializing the InteractiveFilterDialog.
   */
  constructor(options: InteractiveFilterDialog.IOptions) {
    super();

    // Set CSS
    this.addClass('ipydatagrid-filterMenu');
    this.node.style.position = 'absolute'
    this._model = options.model;

    // Widget to display condition operators
    this._filterByConditionWidget = new Widget()
    this._filterByConditionWidget.addClass('ipydatagrid-filter-condition-select')

    // Grid to display unique values
    this._uniqueValueGrid = new DataGrid({
      headerVisibility: 'none',
      stretchLastColumn: true,
    });
    this._uniqueValueGrid.addClass('ipydatagrid-unique-value-grid');

    // State management for unique value grid
    this._uniqueValueStateManager = new UniqueValueStateManager({
      grid: this._uniqueValueGrid
    });

    const mouseHandler = new UniqueValueGridMouseHandler({
      stateManager: this._uniqueValueStateManager,
      dialog: this
    });
    //@ts-ignore added so we don't have to add basicmousehandler.ts fork
    this._uniqueValueGrid.mouseHandler = mouseHandler;

    // Widget to display the dialog title
    this._titleWidget = new Widget();
    this._titleWidget.addClass('ipydatagrid-filter-title')

    // Widget to display "apply" button.
    this._applyWidget = new Widget();
    this._applyWidget.addClass('ipydatagrid-filter-apply')

    // Add all widgets to the dock
    this.addWidget(this._titleWidget);
    this.addWidget(this._filterByConditionWidget);
    this.addWidget(this._uniqueValueGrid);
    this.addWidget(this._applyWidget);
  }

  /**
   * Checks for any undefined values in `this._filterValue`.
   *
   * Note: This should be expanded in the future to also check for dtype
   * inappropriate values.
   */
  hasValidFilterValue(): boolean {
    if (this._filterValue === '' || this._filterValue === undefined) {
      return false;
    } else if (Array.isArray(this._filterValue)) {
      if (
        this._filterValue[0] === ''
        || this._filterValue[0] === undefined
        || this._filterValue[1] === ''
        || this._filterValue[1] === undefined
      ) {
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

    const value = this._mode === 'condition'
      ? <Transform.FilterValue>this._filterValue
      : this._uniqueValueStateManager.getValues(this.region, this._columnIndex);

    // Construct transform
    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: this.model.getSchemaIndex(this._region, this._columnIndex),
      operator: this._filterOperator,
      value: value
    };

    this._model.addTransform(transform);
    this.close();
  }

  /**
   * Updates the DOM elements with transform state from the linked data model.
   */
  updateDialog(): void {
    const lookupColumn = this.model.getSchemaIndex(
      this._region, this._columnIndex
    );
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
      this._applyWidget.node.style.minHeight = '65px';
      this._uniqueValueGrid.setHidden(true)
      this._filterByConditionWidget.setHidden(false)

      // selector
      VirtualDOM.render([
        this.createOperatorList(),
      ], this._filterByConditionWidget.node);

      // title
      VirtualDOM.render([
        this.createTitleNode(),
      ], this._titleWidget.node);

      // apply buttons
      VirtualDOM.render([
        this._filterOperator === 'between'
          ? this.createDualValueNode()
          : this.createSingleValueNode()
      ], this._applyWidget.node);

    } else if (this._mode === 'value') {
      this._applyWidget.node.style.minHeight = '30px';
      this._uniqueValueGrid.setHidden(false);
      this._filterByConditionWidget.setHidden(true);

      // title
      VirtualDOM.render([
        this.createTitleNode(),
      ], this._titleWidget.node);

      // apply buttons
      VirtualDOM.render([
        this.createApplyButtonNode()
      ], this._applyWidget.node);

      this._renderUniqueVals();

    } else {
      throw 'unreachable';
    }
  }

  /**
   * Displays the unique values of a column.
   */
  async _renderUniqueVals() {
    const uniqueVals = this._model.uniqueValues(
      this._region,
      this._columnIndex
    );

    uniqueVals.then(value => {
      let items = value.map((val, i) => {
        return { index: i, 'uniqueVals': val }
      });

      let data: ViewBasedJSONModel.IData = {
        schema: {
          fields: [
            { name: 'index', type: 'integer', rows: [] },
            { name: 'uniqueVals', type: 'number', rows: [] }
          ],
          primaryKey: ['index'],
          primaryKeyUuid: 'index'
        },
        data: items
      }
      this._uniqueValueGrid.dataModel = new ViewBasedJSONModel(data);
    });
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
      0,
      options.columnIndex
    )['type'];
    this._region = options.region;
    this._mode = options.mode;

    // Setting filter flag
    this.hasFilter = this._model.getFilterTransform(this._columnIndex) !== undefined

    // Update styling on unique value grid
    this._uniqueValueGrid.style = {
      voidColor: Theme.getBackgroundColor(),
      backgroundColor: Theme.getBackgroundColor(),
      gridLineColor: Theme.getBackgroundColor(),
      headerGridLineColor: Theme.getBorderColor(1),
      selectionFillColor: Theme.getBrandColor(2, 0.4),
      selectionBorderColor: Theme.getBrandColor(1),
      headerSelectionFillColor: Theme.getBackgroundColor(3, 0.4),
      headerSelectionBorderColor: Theme.getBorderColor(1),
      cursorFillColor: Theme.getBrandColor(3, 0.4),
      cursorBorderColor: Theme.getBrandColor(1),
    };

    this._uniqueValueGrid.cellRenderers.update({
      'body': new FilterValueRenderer({
        stateManager: this._uniqueValueStateManager,
        dialog: this,
        textColor: Theme.getFontColor(),
        backgroundColor: Theme.getBackgroundColor()
      })
    });

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
    if (!ElementExt.hitTest(this.node, event.clientX, event.clientY)) {
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
    return h.div(
      {
        className: '', style: {
          paddingLeft: '5px',
          color: 'var(--ipydatagrid-filter-dlg-textcolor,black)'
        }
      },
      (this._mode === 'condition')
        ? 'Filter by condition:'
        : 'Filter by value:')
  }

  /**
   * Creates a `VirtualElement` to display an input element with "apply" button.
   *
   * Note: The `key` is randomly assigned to ensure that this element is always
   * rerendered with current state. User interaction with `input` elements
   * can cause attribute changes that are not recognized by VirtualDOM.
   */
  createSingleValueNode(): VirtualElement {
    return h.div(
      { className: 'widget-text', style: { paddingLeft: '5px', minHeight: '60px' } },
      h.input({
        type: 'text',
        style: {
          marginRight: '5px',
          width: '200px',
          background: 'var(--ipydatagrid-filter-dlg-bgcolor,white)',
          visibility: (
            this._filterOperator === 'empty'
            || this._filterOperator === 'notempty'
            || this._mode === 'value'
          ) ? 'hidden' : 'visible'
        },
        // Assigning a random key ensures that this element is always
        // rerendered
        key: String(Math.random()),
        oninput: (evt) => {
          const elem = <HTMLInputElement>evt.srcElement
          this._filterValue = (this._columnDType === 'number'
            || this._columnDType === 'integer')
            ? Number(elem.value)
            : elem.value;
        },
        value: (this._filterValue !== undefined && !Array.isArray(this._filterValue))
          ? String(this._filterValue)
          : ''
      }),


      h.div({
        className: '', style: {
          width: '202px',
          textAlign: 'right',
          paddingTop: '5px'
        }
      },
        h.button({
          className: 'jupyter-widgets jupyter-button widget-button',
          style: {
            width: '60px',
            padding: '1px',
            border: '1px solid var(--ipydatagrid-menu-border-color, #bdbdbd)'
          },
          onclick: this.applyFilter.bind(this)
        }, 'Apply')
      )
    )
  }

  /**
   * Creates a `VirtualElement` to display an input element with "apply" button.
   *
   * Note: The `key` is randomly assigned to ensure that this element is always
   * rerendered with current state. User interaction with `input` elements
   * can cause attribute changes that are not recognized by VirtualDOM.
   */
  createDualValueNode(): VirtualElement {
    const value = <any[]>this._filterValue;
    return h.div(
      {
        className: 'widget-text', style: {
          paddingLeft: '5px',
          color: 'var(--ipydatagrid-filter-dlg-textcolor,black)',
        }
      },
      h.input({
        style: {
          marginRight: '5px',
          width: '75px',
          background: 'var(--ipydatagrid-filter-dlg-bgcolor,white)'
        },
        // Assigning a random key ensures that this element is always
        // rerendered
        key: String(Math.random()),
        type: 'text',
        oninput: (evt) => {
          const elem = <HTMLInputElement>evt.srcElement;
          this._filterValue = [
            this._columnDType === 'number' || this._columnDType === 'integer'
              ? Number(elem.value)
              : elem.value,
            (<any[]>this._filterValue)[1]
          ];
        },
        // this._filterValue is converted to an array in
        // this.createOperatorList
        value: value[0] !== undefined ? String(value[0]) : ''
      }),
      'and ',
      h.input({
        style: {
          marginRight: '5px',
          width: '75px',
          background: 'var(--ipydatagrid-filter-dlg-bgcolor,white)'
        },
        // Assigning a random key ensures that this element is always
        // rerendered
        key: String(Math.random()),
        type: 'text',
        oninput: (evt) => {
          const elem = <HTMLInputElement>evt.srcElement;
          this._filterValue = [
            (<any[]>this._filterValue)[0],
            this._columnDType === 'number' || this._columnDType === 'integer'
              ? Number(elem.value)
              : elem.value
          ];
        },
        // this._filterValue is converted to an array in
        // this.createOperatorList
        value: value[1] !== undefined ? String(value[1]) : ''
      }),
      h.div(
        { className: '', style: { width: '202px', textAlign: 'right', paddingTop: '5px' } },
        h.button({
          className: "jupyter-widgets jupyter-button widget-button",
          style: {
            width: '60px',
            padding: '1px',
            border: '1px solid var(--ipydatagrid-menu-border-color, #bdbdbd)'
          },
          onclick: this.applyFilter.bind(this)
        }, 'Apply')
      )
    )
  }

  /**
   * Creates a `VirtualElement` to display a "loading" message.
   */
  protected createLoadingMessageNodes(): VirtualElement {
    return h.div(
      { className: 'p-Menu-itemLabel widget-text', style: { paddingLeft: '5px' } },
      'Loading unique values...'
    );
  }

  /**
   * Creates a Promise that resolves to a `VirtualElement` to display the unique
   * values of a column.
   */
  protected async createUniqueValueNodes(): Promise<VirtualElement> {
    const uniqueVals = await this._model.uniqueValues(
      this._region,
      this._columnIndex
    );
    const optionElems = uniqueVals.map(val => {
      return h.option({ value: val }, String(val))
    });

    return h.li(
      { className: 'p-Menu-item' },
      h.div({
        className: 'widget-select widget-select-multiple',
        style: { width: '200px' }
      },
        h.select({
          multiple: '',
          value: '',
          style: {
            width: '200px',
            height: '200px',
            margin: '5px',
            background: 'var(--ipydatagrid-filter-dlg-bgcolor,white)'
          },
          onchange: (evt) => {
            let selectElem = <HTMLSelectElement>evt.srcElement;
            const values = [];
            for (let i = 0; i < selectElem.options.length; i++) {
              if (selectElem.options[i].selected) {
                values.push(
                  (this._columnDType === 'number'
                    || this._columnDType === 'integer')
                    ? Number(selectElem.options[i].value)
                    : selectElem.options[i].value
                )
              }
            }
            this._filterValue = <number[] | string[]>values;
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
  protected createOperatorList() {

    let operators: VirtualElement[];

    // TODO: Refactor this to a switch statement
    if (this._columnDType === 'number' || this._columnDType === 'integer') {
      operators = this._createNumericalOperators();
    } else if (['date', 'time', 'datetime'].includes(this._columnDType)) {
      operators = this._createDateOperators();
    } else if (this._columnDType === 'boolean') {
      operators = this._createBooleanOperators();
    } else {
      operators = this._createCategoricalOperators();
    }

    return h.div(
      { className: 'widget-dropdown', style: { paddingLeft: '5px' } }, h.select({
        style: {
          width: '200px',
          fontSize: '12px',
          background: 'var(--ipydatagrid-filter-dlg-bgcolor,white)'
        },
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
        ...operators
      )
    )
  }

  /**
   * Creates a `VirtualElement` to display an "apply" button.
   */
  protected createApplyButtonNode(): VirtualElement {
    return h.div({
      className: '',
      style: { paddingLeft: '5px', textAlign: 'right', minHeight: '30px' }
    },
      h.button({
        className: 'jupyter-widgets jupyter-button widget-button',
        style: {
          width: '60px',
          border: '1px solid var(--ipydatagrid-menu-border-color, #bdbdbd)'
        },
        onclick: this.applyFilter.bind(this)
      }, 'Apply')

    )

  }

  /**
   * Creates an array of VirtualElements to represent the available operators
   * for columns with a numerical dtype.
   */
  private _createNumericalOperators(): VirtualElement[] {
    const op = this._filterOperator
    return [
      h.option({
        value: 'empty', ...(op === 'empty') && { selected: '' }
      }, 'Is empty:'),
      h.option({
        value: 'notempty', ...(op === 'notempty') && { selected: '' }
      }, 'Is not empty:'),
      h.option({
        value: '', disabled: 'disabled'
      }, "───────────"),
      h.option({
        value: '<', ...(op === '<') && { selected: '' }
      }, 'Less than:'),
      h.option({
        value: '>', ...(op === '>') && { selected: '' }
      }, 'Greater than:'),
      h.option({
        value: '<=', ...(op === '<=') && { selected: '' }
      }, 'Less than or equal to:'),
      h.option({
        value: '>=', ...(op === '>=') && { selected: '' }
      }, 'Greater than or equal to:'),
      h.option({
        value: 'between', ...(op === 'between') && { selected: '' }
      }, 'In between:'),
      h.option({
        value: '=', ...(op === '=') && { selected: '' }
      }, 'Is equal to:'),
      h.option({
        value: '!=', ...(op === '!=') && { selected: '' }
      }, 'Is not equal to:'),
    ]
  }

  /**
   * Creates an array of VirtualElements to represent the available operators
   * for columns with a date dtype.
   */
  private _createDateOperators(): VirtualElement[] {
    const op = this._filterOperator
    return [
      h.option({
        value: 'empty', ...(op === 'empty') && { selected: '' }
      }, 'Is empty:'),
      h.option({
        value: 'notempty', ...(op === 'notempty') && { selected: '' }
      }, 'Is not empty:'),
      h.option({
        value: '', disabled: 'disabled'
      }, "───────────"),
      h.option({
        value: '<', ...(op === '<') && { selected: '' }
      }, 'Date is before:'),
      h.option({
        value: '>', ...(op === '>') && { selected: '' }
      }, 'Date is after:'),
      h.option({
        value: '<=', ...(op === '<') && { selected: '' }
      }, 'Date is on or before:'),
      h.option({
        value: '>=', ...(op === '>') && { selected: '' }
      }, 'Date is on or after:'),
      h.option({
        value: 'isOnSameDay', ...(op === 'between') && { selected: '' }
      }, 'Date is exactly:'),
      h.option({
        value: 'between', ...(op === 'between') && { selected: '' }
      }, 'Date is in between:'),
      h.option({
        value: '=', ...(op === '=') && { selected: '' }
      }, 'Timestamp is exactly equal to:'),
      h.option({
        value: '!=', ...(op === '!=') && { selected: '' }
      }, 'Timestamp is not exactly equal to:'),
    ]
  }

  /**
   * Creates an array of VirtualElements to represent the available operators
   * for columns with a boolean dtype.
   */
  private _createBooleanOperators(): VirtualElement[] {
    const op = this._filterOperator
    return [
      h.option({
        value: 'empty', ...(op === 'empty') && { selected: '' }
      }, 'Is empty:'),
      h.option({
        value: 'notempty', ...(op === 'notempty') && { selected: '' }
      }, 'Is not empty:')
    ]
  }

  /**
   * Creates an array of VirtualElements to represent the available operators
   * for columns with a categorical dtype.
   */
  private _createCategoricalOperators(): VirtualElement[] {
    const op = this._filterOperator
    return [
      h.option({
        value: 'empty', ...(op === 'empty') && { selected: '' }
      }, 'Is empty'),
      h.option({
        value: 'notempty', ...(op === 'notempty') && { selected: '' }
      }, 'Is not empty'),
      h.option({
        value: '', disabled: 'disabled'
      }, "───────────"),
      h.option({
        value: 'contains', ...(op === 'contains') && { selected: '' }
      }, 'Contains'),
      h.option({
        value: '!contains', ...(op === '!contains') && { selected: '' }
      }, 'Does not contain'),
      h.option({
        value: 'startswith', ...(op === 'startswith') && { selected: '' }
      }, 'Starts with'),
      h.option({
        value: 'endswith', ...(op === 'endswith') && { selected: '' }
      }, 'Ends with'),
      h.option({
        value: '=', ...(op === '=') && { selected: '' }
      }, 'Is exactly'),
      h.option({
        value: '!=', ...(op === '!=') && { selected: '' }
      }, 'Is not exactly'),
      h.option({
        value: '', disabled: 'disabled'
      }, "───────────"),
      h.option({
        value: '<', ...(op === '<') && { selected: '' }
      }, 'Is before'),
      h.option({
        value: '>', ...(op === '>') && { selected: '' }
      }, 'Is after'),
      h.option({
        value: 'between', ...(op === 'between') && { selected: '' }
      }, 'Is in between'),
    ]
  }

  /**
   * Returns a reference to the data model used for this menu.
   */
  get model(): ViewBasedJSONModel {
    return this._model;
  }

  /**
   * Updates the data model used for this menu.
   */
  set model(model: ViewBasedJSONModel) {
    this._model = model;
  }

  /**
   * Returns the current input value of the dialog.
   */
  get value(): InteractiveFilterDialog.FilterValue {
    return this._filterValue
  }

  /**
   * Returns the currently active filter operator.
   */
  get operator(): Transform.FilterOperator {
    return this._filterOperator;
  }

  /**
   * Returns the active column index.
   */
  get region(): DataModel.CellRegion {
    return this._region;
  }

  /**
   * Returns the active Cellregion.
   */
  get columnIndex(): number {
    return this._columnIndex;
  }

  /**
   * Returns the active column dtype.
   */
  get columnDType(): string {
    return this._columnDType;
  }

  private _model: ViewBasedJSONModel;

  // Cell metadata
  private _columnDType: string = 'number';
  private _columnIndex: number = 0;
  private _region: DataModel.CellRegion = 'column-header';

  // Menu state
  private _mode: 'condition' | 'value' = 'value';
  private _filterOperator: Transform.FilterOperator = '<';
  private _filterValue: InteractiveFilterDialog.FilterValue

  // Phosphor widgets
  private _uniqueValueGrid: DataGrid
  private _filterByConditionWidget: Widget
  private _titleWidget: Widget
  private _applyWidget: Widget

  // Unique value state
  private _uniqueValueStateManager: UniqueValueStateManager

  // Checking filter status
  hasFilter: boolean = false;
  userInteractedWithDialog: boolean = false;
}

/**
 * The namespace for the `InteractiveFilterDialog` class statics.
 */
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

/**
 * Manages the selection state of the grid that displays the unique values
 * of a column.
 */
export class UniqueValueStateManager {
  constructor(options: UniqueValueStateManager.IOptions) {
    this._grid = options.grid;
  }

  has(region: DataModel.CellRegion, columnIndex: number, value: any): boolean {
    const key = this.getKeyName(region, columnIndex)
    return this._state.hasOwnProperty(key) && this._state[key].has(value);
  }

  getKeyName(region: DataModel.CellRegion, columnIndex: number): string {
    return `${region}:${columnIndex}`
  }

  add(region: DataModel.CellRegion, columnIndex: number, value: any): void {
    const key = this.getKeyName(region, columnIndex);
    if (this._state.hasOwnProperty(key)) {
      this._state[key].add(value)
    } else {
      this._state[key] = new Set<number | string>();
      this._state[key].add(value);
    }
    const msg = new PaintRequest('all', 0, 0, 0, 0);
    MessageLoop.postMessage(this._grid.viewport, msg);
  }

  remove(region: DataModel.CellRegion, columnIndex: number, value: any): void {
    const key = this.getKeyName(region, columnIndex)

    if (this._state.hasOwnProperty(key)) {
      this._state[key].delete(value)
    }
    const msg = new PaintRequest('all', 0, 0, 0, 0);
    MessageLoop.postMessage(this._grid.viewport, msg);
  }

  getValues(region: DataModel.CellRegion, columnIndex: number): any[] {
    const key = this.getKeyName(region, columnIndex)
    if (this._state.hasOwnProperty(key)) {
      return Array.from(this._state[key])
    } else {
      return []
    }
  }

  private _state: { [key: string]: Set<number | string> } = {}
  private _grid: DataGrid
}

class UniqueValueGridMouseHandler extends BasicMouseHandler {
  constructor(options: UniqueValueGridMouseHandler.IOptions) {
    super()
    this._uniqueValuesSelectionState = options.stateManager
    this._filterDialog = options.dialog
  }

  /**
   * Handle the mouse down event for the data grid.
   *
   * @param grid - The data grid of interest.
   *
   * @param event - The mouse down event of interest.
   */
  //@ts-ignore added so we don't have to add basicmousehandler.ts fork
  onMouseDown(grid: DataGrid, event: MouseEvent): void {
    const hit = grid.hitTest(event.clientX, event.clientY);
    const row = hit.row;
    const colIndex = this._filterDialog.columnIndex;
    const region = this._filterDialog.region;
    const value = grid.dataModel!.data('body', row, 0);

    const updateCheckState = () => {
      if (this._uniqueValuesSelectionState.has(region, colIndex, value)) {
        this._uniqueValuesSelectionState.remove(region, colIndex, value)
      } else {
        this._uniqueValuesSelectionState.add(region, colIndex, value)
      }
    }

    // User is clicking for the first time when no filter is applied
    if (!this._filterDialog.hasFilter && !this._filterDialog.userInteractedWithDialog) {
      const uniqueVals = this._filterDialog.model.uniqueValues(
        region,
        colIndex
      );
  
      uniqueVals.then(values => {
        for (let value of values) {
          this._uniqueValuesSelectionState.add(region, colIndex, value);
        }
        
        this._filterDialog.userInteractedWithDialog = true;
        updateCheckState();
      });
    } else {
      updateCheckState();
    }
  }

  private _uniqueValuesSelectionState: UniqueValueStateManager
  private _filterDialog: InteractiveFilterDialog
};

class PaintRequest extends ConflatableMessage {
  /**
   * Construct a new paint request messages.
   *
   * @param region - The cell region for the paint.
   *
   * @param r1 - The top-left row of the dirty region.
   *
   * @param c1 - The top-left column of the dirty region.
   *
   * @param r2 - The bottom-right row of the dirty region.
   *
   * @param c2 - The bottom-right column of the dirty region.
   */
  constructor(region: DataModel.CellRegion | 'all', r1: number, c1: number, r2: number, c2: number) {
    super('paint-request');
    this._region = region;
    this._r1 = r1;
    this._c1 = c1;
    this._r2 = r2;
    this._c2 = c2;
  }

  /**
   * The cell region for the paint.
   */
  get region(): DataModel.CellRegion | 'all' {
    return this._region;
  }

  /**
   * The top-left row of the dirty region.
   */
  get r1(): number {
    return this._r1;
  }

  /**
   * The top-left column of the dirty region.
   */
  get c1(): number {
    return this._c1;
  }

  /**
   * The bottom-right row of the dirty region.
   */
  get r2(): number {
    return this._r2;
  }

  /**
   * The bottom-right column of the dirty region.
   */
  get c2(): number {
    return this._c2;
  }

  /**
   * Conflate this message with another paint request.
   */
  conflate(other: PaintRequest): boolean {
    // Bail early if the request is already painting everything.
    if (this._region === 'all') {
      return true;
    }

    // Any region can conflate with the `'all'` region.
    if (other._region === 'all') {
      this._region = 'all';
      return true;
    }

    // Otherwise, do not conflate with a different region.
    if (this._region !== other._region) {
      return false;
    }

    // Conflate the region to the total boundary.
    this._r1 = Math.min(this._r1, other._r1);
    this._c1 = Math.min(this._c1, other._c1);
    this._r2 = Math.max(this._r2, other._r2);
    this._c2 = Math.max(this._c2, other._c2);
    return true;
  }

  private _region: DataModel.CellRegion | 'all';
  private _r1: number;
  private _c1: number;
  private _r2: number;
  private _c2: number;
}

/**
 * The namespace for the `UniqueValueStateManager` class statics.
 */
export namespace UniqueValueStateManager {

  /**
   * An options object for initializing an UniqueValueStateManager.
   */
  export interface IOptions {

    /**
     * The DataGrid to manage selection state for
     */
    grid: DataGrid
  }
}

/**
 * The namespace for the `UniqueValueGridMouseHandler` class statics.
 */
export namespace UniqueValueGridMouseHandler {
  /**
   * An options object for initializing a UniqueValueGridMouseHandler.
   */
  export interface IOptions {
    /**
     * The state manager linked to the grid for this mouse handler.
     */
    stateManager: UniqueValueStateManager

    /**
     * The dialog linked to this mouse handler.
     */
    dialog: InteractiveFilterDialog
  }
}