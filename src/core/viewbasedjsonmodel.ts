import {
  DataModel,
} from './datamodel';

import {
  ReadonlyJSONObject
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
export class ViewBasedJSONModel extends DataModel {

  /**
   * Create a data model with static JSON data.
   *
   * @param data - The dataset for initializing the data model.
   */
  constructor(data: ViewBasedJSONModel.IData) {
    super();
    this._dataset = data;
    this._currentView = new View(this._dataset);
    this._transformState = new TransformStateManager();

    // Repaint grid on transform state update
    // Note: This will also result in the `model-reset` signal being sent.
    this._transformState.changed.connect((sender, value) => {
      this.currentView = this._transformState.createView(this._dataset);
      this._transformSignal.emit(value)
    })
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
  metadata(region: DataModel.CellRegion, column: number): DataModel.Metadata {
    return this.currentView.metadata(region, column);
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
   * Get the current View for the model.
   */
  protected get currentView(): View {
    return this._currentView;
  }

  /**
   * Sets the provided View as the current View, then emits a changed signal.
   */
  protected set currentView(value: View) {
    this._currentView = value;
    this.emitChanged({ type: 'model-reset' });
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
   * Returns an array of unique values contained in the provided column index.
   * 
   * @param columnIndex - The index to retrieve unique values for.
   */
  uniqueValues(columnIndex: number): any[] {
    return this.currentView.uniqueValues(columnIndex);
  }

  get transformStateChanged(): ISignal<this, TransformStateManager.IEvent> {
    return this._transformSignal;
  }

  private _currentView: View;
  private _transformSignal = new Signal<this, TransformStateManager.IEvent>(this);

  protected readonly _dataset: ViewBasedJSONModel.IData;
  protected readonly _transformState: TransformStateManager;
}

/**
 * The namespace for the `ViewBasedJSONModel` class statics.
 */
export
namespace ViewBasedJSONModel {
  /**
   *
   */
  export interface IField {
    /**
     * The name of the column.
     *
     * This is used as the key to extract a value from a data record.
     * It is also used as the column header label.
     */
    readonly name: string;

    /**
     * The type of data held in the column.
     */
    readonly type: string;
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
}
