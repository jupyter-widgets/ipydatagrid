import {
  DataModel, MutableDataModel
} from './datamodel';

import {
  each
} from '@phosphor/algorithm';

import {
  ReadonlyJSONObject, ReadonlyJSONValue
} from '@phosphor/coreutils';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Transform
} from './transform';

import {
  View
} from './view';

import {
  TransformStateManager
} from './transformStateManager';

/**
 * A view based data model implementation for in-memory JSON data.
 */
export class ViewBasedJSONModel extends MutableDataModel {

  /**
   * Create a data model with static JSON data.
   *
   * @param data - The dataset for initializing the data model.
   */
  constructor(data: ViewBasedJSONModel.IData) {
    super();
    this._updateDataset(data);
    this._transformState = new TransformStateManager();

    // Repaint grid on transform state update
    // Note: This will also result in the `model-reset` signal being sent.
    this._transformState.changed.connect((sender, value) => {
      this.currentView = this._transformState.createView(this._dataset);
      this._transformSignal.emit(value)
    })
  }

  /**
   * Sets the dataset for this model.
   *
   * @param data - The data to be set on this data model
   */
  private _updateDataset(data: ViewBasedJSONModel.IData): void {
    this._dataset = data;
    this._updatePrimaryKeyMap();
    let view = new View(this._dataset);
    this.currentView = view
  }

  /**
   * Updates the primary key map, which provides a mapping from primary key
   * value to row in the full dataset.
   */
  private _updatePrimaryKeyMap(): void {
    this._primaryKeyMap.clear();

    const primaryKey = this._dataset.schema.primaryKey;

    if (Array.isArray(primaryKey)) {
      each(this._dataset.data, (rowData, index) => {
        let keys = primaryKey.map(key => rowData[key])
        this._primaryKeyMap.set(JSON.stringify(keys), index)
      })
    } else {
      // If primaryKey is a string, we want to represent it in the map as
      // an array, as it will be looked up that way.
      each(this._dataset.data, (rowData, index) => {
        this._primaryKeyMap.set(JSON.stringify([rowData[primaryKey]]), index);
      })
    }
  }

  /**
   * Get the row count for a region in the data model.
   *
   * @param region - The row region of interest.
   *
   * @returns - The row count for the region.
   */
  rowCount(region: DataModel.RowRegion): number {
    return this.currentView.rowCount(region)
  }

  /**
   * Get the column count for a region in the data model.
   *
   * @param region - The column region of interest.
   *
   * @returns - The column count for the region.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    return this.currentView.columnCount(region)
  }

  /**
   * Get the metadata for a column in the data model.
   *
   * @param region - The cell region of interest.
   *
   * @param column - The index of the column of interest.
   *
   * @returns The metadata for the column.
   */
  metadata(region: DataModel.CellRegion, row: number, column: number): DataModel.Metadata {
    return this.currentView.metadata(region, row, column);
  }

  /**
   * Get the data value for a cell in the data model.
   *
   * @param region - The cell region of interest.
   *
   * @param row - The row index of the cell of interest.
   *
   * @param column - The column index of the cell of interest.
   *
   * @param returns - The data value for the specified cell.
   */
  data(region: DataModel.CellRegion, row: number, column: number): any {
    return this.currentView.data(region, row, column);
  }

  /**
   * Updates the cell value of the currently displayed View.
   *
   * @param region - The cell region of interest.
   *
   * @param row - The row index of the cell of interest.
   *
   * @param column - The column index of the cell of interest.
   *
   * @param value - The new value to update the indicated cell with.
   *
   */
  setData(region: DataModel.CellRegion, row: number, column: number, value: any): boolean {
    const datasetRow = this.getDatasetRowFromView(row)
    this.updateCellValue({ region: region, row: datasetRow, column: column, value: value });
    this.emitChanged({ type: 'cells-changed', region: region, row: row, column: column, rowSpan: 1, columnSpan: 1 });

    return true;
  }

  /**
   * Updates the cell value of the currently displayed View.
   *
   * @param region - The cell region of interest.
   *
   * @param row - The row index of the cell of interest.
   *
   * @param column - The column index of the cell of interest.
   *
   * @param value - The new value to update the indicated cell with.
   *
   */
  setModelData(region: DataModel.CellRegion, row: number, column: number, value: any): boolean {
    this.updateCellValue({ region: region, row: row, column: column, value: value });
    this.emitChanged({ type: 'cells-changed', region: region, row: row, column: column, rowSpan: 1, columnSpan: 1 });

    return true;
  }

  /**
   * Get the current View for the model.
   */
  protected get currentView(): View {
    return this._currentView;
  }

  /**
   * Sets the provided View as the current View, then emits a changed signal.
   */
  protected set currentView(view: View) {
    this._currentView = view;
    this.emitChanged({ type: 'model-reset' });

    const primaryKey = !Array.isArray(this._dataset.schema.primaryKey)
      ? [this._dataset.schema.primaryKey]
      : this._dataset.schema.primaryKey;

    const indices: number[] = view.dataset.map((val, i) => {
      const lookupVal = JSON.stringify(primaryKey.map(key => val[key]));
      return this._primaryKeyMap.get(lookupVal) || i;
    });

    this.dataSync.emit({
      type: 'row-indices-updated',
      indices: indices
    });
  }

  /**
   * Add a new transform to the currently active transforms.
   *
   * @param transform - The transform to be added.
   */
  addTransform(transform: Transform.TransformSpec): void {
    this._transformState.add(transform);
  }

  /**
   * Removes the provided transformation from the active state.
   *
   * @param columnIndex - The index of the column state to be removed.
   *
   * @param transformType - The type of the transform to be removed from state.
   */
  removeTransform(columnIndex: number, transformType: string): void {
    this._transformState.remove(columnIndex, transformType);
  }

  /**
   * Apply an array of transformations to the dataset and update the current
   * View. The provided transforms will replace any existing ones.
   *
   * @param transforms - Array of transformations to apply to the dataset
   */
  replaceTransforms(transforms: Transform.TransformSpec[]): void {
    this._transformState.replace(transforms);
  }

  /**
   * Removes all active transforms.
   */
  clearTransforms(): void {
    this._transformState.clear();
  }

  /**
   * Returns the transform metadata for the provided column.
   *
   * @param columnIndex - The column index of the metadata to be retrieved.
   */
  transformMetadata(columnIndex: number): TransformStateManager.IColumn | undefined {
    return this._transformState.metadata(columnIndex);
  }

  /**
   * Returns a Promise that resolves to an array of unique values contained in
   * the provided column index.
   *
   * @param columnIndex - The index to retrieve unique values for.
   */
  async uniqueValues(region: DataModel.CellRegion, columnIndex: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const columnName = this.metadata(region, 0, columnIndex)['name'];
      let uniqueVals = new Set();
      for (let row of this.dataset.data) {
        uniqueVals.add(row[columnName]);
      };
      resolve(Array.from(uniqueVals));
    });
  }

  get transformStateChanged(): ISignal<this, TransformStateManager.IEvent> {
    return this._transformSignal;
  }

  /**
   * Returns the active transforms for the current model
   */
  get activeTransforms(): Transform.TransformSpec[] {
    return this._transformState.activeTransforms;
  }

  /**
   * Updates the indicated value in the dataset.
   *
   * Note: provided row/column values should correspond to the currently
   * active View, not the full dataset.
   * Note: Currently, only updating `body` cells is supported.
   *
   * @param options - The options for this method.
   */
  getDatasetRowFromView(row: number): number {

    // Get the index of the row in the full dataset to be updated
    const primaryKey = (Array.isArray(this._dataset.schema.primaryKey))
      ? this._dataset.schema.primaryKey
      : [this._dataset.schema.primaryKey];
    let keyValues = primaryKey.map(key =>
      this._currentView.dataset[row][key]
    );
    const lookupIndex: number = this._primaryKeyMap.get(JSON.stringify(keyValues))!;
    return lookupIndex;
  }

  /**
   * Updates a value in the full dataset of the model.
   *
   * @param options - The options for this function.
   */
  updateCellValue(options: ViewBasedJSONModel.IUpdateCellValuesOptions): void {
    // Bail if cell region isn't the body
    // TODO: Support modifying the schema
    if (options.region !== 'body') {
      return;
    }

    // Create new row and add it to new dataset
    const newRow = { ...this._dataset.data[options.row] };
    newRow[this.metadata('body', 0, options.column)['name']] = options.value;
    const newData = Array.from(this._dataset.data);
    newData[options.row] = newRow;

    this._dataset = {
      data: newData,
      schema: this._dataset.schema
    };

    if (options.syncData) {
      this.dataSync.emit({
        type: 'cell-updated',
      });
    }

    // We need to rerun the transforms, as the changed cell may change the order
    // or visibility of other rows
    this.currentView = this._transformState.createView(this._dataset);
  }

  /**
   * A signal emitted when the data model has changes to sync to the kernel.
   */
  get dataSync(): Signal<this, ViewBasedJSONModel.IDataSyncEvent> {
    return this._dataSyncSignal;
  }

  /**
   * Returns the current full dataset.
   */
  get dataset(): ViewBasedJSONModel.IData {
    return this._dataset;
  }

  /**
   * Returns the index in the schema that relates to the index by region.
   *
   * @param region - The `CellRegion` of interest.
   *
   * @param index - The column index to look up.
   */
  getSchemaIndex(region: DataModel.CellRegion, index: number): number {
    return this.currentView.getSchemaIndex(region, index)
  }

  private _currentView: View;
  private _transformSignal = new Signal<this, TransformStateManager.IEvent>(this);
  private _dataSyncSignal = new Signal<this, ViewBasedJSONModel.IDataSyncEvent>(this);
  private _primaryKeyMap: Map<ReadonlyJSONValue, number> = new Map()

  protected _dataset: ViewBasedJSONModel.IData;
  protected readonly _transformState: TransformStateManager;
}

/**
 * The namespace for the `ViewBasedJSONModel` class statics.
 */
export
namespace ViewBasedJSONModel {
  /**
   * An object which describes a column of data in the model.
   *
   * #### Notes
   * This is based on the JSON Table Schema specification:
   * https://specs.frictionlessdata.io/table-schema/
   */
  export interface IField {
    /**
     * The name of the column.
     *
     * This is used as the key to extract a value from a data record.
     */
    readonly name: string;

    /**
     * The type of data held in the column.
     */
    readonly type: string;

    /**
     * An array of the column labels per header row.
     */
    readonly rows: any[]
  }

  /**
   * An object when specifies the schema for a data model.
   *
   * #### Notes
   * This is based on the JSON Table Schema specification:
   * https://specs.frictionlessdata.io/table-schema/
   */
  export interface ISchema {
    /**
     * The fields which describe the data model columns.
     *
     * Primary key fields are rendered as row header columns.
     */
    readonly fields: IField[];

    /**
     * The field names which act as primary keys.
     *
     * Primary key fields are rendered as row header columns.
     */
    readonly primaryKey: string | string[];
  }

  export interface IUpdateCellValuesOptions {
    /**
     * The `CellRegion` of the cell to be updated.
     */
    region: DataModel.CellRegion;

    /**
     * The index of the target row in the current view.
     */
    column: number;

    /**
     * The index of the target row in the current view.
     */
    row: number;

    /**
     * The new value to replace the old one.
     */
    value: any;

    /**
     * The flag to trigger full data sync with backend.
     */
    syncData?: boolean;
  }

  /**
   * A type alias for a data source for a JSON data model.
   *
   * A data source is an array of JSON object records which represent
   * the rows of the table. The keys of the records correspond to the
   * field names of the columns.
   */
  export type DataSource = ReadonlyArray<ReadonlyJSONObject>;

  /**
   * An options object for initializing the data model.
   */
  export interface IData {
    /**
     * The schema for the for the data model.
     *
     * The schema should be treated as an immutable object.
     */
    schema: ISchema;

    /**
     * The data source for the data model.
     *
     * The data model takes full ownership of the data source.
     */
    data: DataSource
  }
  export type IDataSyncEvent = ISyncCell | ISyncRowIndices

  /**
   * An event that indicates a needed change to the kernel-side dataset.
   */
  export interface ISyncCell {
    /**
     * The discriminated type of the args object.
     */
    type: 'cell-updated'
  }
  export interface ISyncRowIndices {
    /**
     * The discriminated type of the args object.
     */
    type: 'row-indices-updated'

    /**
     * An list of the rows in the untransformed dataset that are currently
     * represented in the `View`.
     */
    indices: number[]
  }
}