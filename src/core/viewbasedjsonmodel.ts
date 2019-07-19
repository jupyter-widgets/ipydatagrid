/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/

import {
  DataModel,
} from '@phosphor/datagrid';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  each
} from '@phosphor/algorithm';

import {
  Transform
} from './transform'

import {
  View
} from './view'

/**
 * A view based data model implementation for in-memory JSON data.
 */
export
class ViewBasedJSONModel extends DataModel {
  /**
   * Create a data model with static JSON data.
   *
   * @param data - The dataset for initializing the data model.
   */
  constructor(data: ViewBasedJSONModel.IData) {
    super();
    this._dataset = data;
    this._currentView = new View(this._dataset);
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
   * Apply an array of transformations to the dataset and update the current
   * View
   *
   * @param transforms - Array of transformations to apply to the dataset
   */
  updateView(transforms: Transform[]): void {
    let transformedData = this._dataset;
    each(transforms, (transform: Transform) => {
      transformedData = transform.apply(transformedData);
    });
    this.currentView = new View(transformedData);
    this.emitChanged({ type: 'model-reset' });
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

  private _currentView: View;
  protected readonly _dataset: ViewBasedJSONModel.IData;
}

/**
 * The namespace for the `ViewBasedJSONModel` class statics.
 */
export
namespace ViewBasedJSONModel {
  /**
   *
   */
  export
  interface IField {
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
  export
  interface ISchema {
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
  export
  type DataSource = ReadonlyArray<ReadonlyJSONObject>;

  /**
   * An options object for initializing the data model.
   */
  export
  interface IData {
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
