/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/

import { ReadonlyJSONObject } from '@lumino/coreutils';

import { DataModel } from '@lumino/datagrid';
import { ViewBasedJSONModel } from './viewbasedjsonmodel';

/**
 * A View implementation for immutable in-memory JSON data.
 *
 * Note: Most of this is just repurposed from JSONModel, and can likely be
 * streamlined quite a bit.
 */
export class View {
  /**
   * Create a view with static JSON data.
   *
   * @param options - The options for initializing the view.
   */
  constructor(options: View.IOptions) {
    const split = Private.splitFields(options.schema);
    this._data = options.data;
    this._bodyFields = split.bodyFields;
    this._headerFields = split.headerFields;
    this._missingValues = Private.createMissingMap(options.schema);
  }

  /**
   * Get the row count for a region in the view.
   *
   * @param region - The row region of interest.
   *
   * @returns - The row count for the region.
   */
  rowCount(region: DataModel.RowRegion): number {
    if (region === 'body') {
      return this._data.length;
    } else {
      return this._bodyFields[0].rows.length;
    }
  }

  /**
   * Get the column count for a region in the view.
   *
   * @param region - The column region of interest.
   *
   * @returns - The column count for the region.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    if (region === 'body') {
      return this._bodyFields.length;
    }
    return this._headerFields.length;
  }

  /**
   * Get the metadata for a column in the view.
   *
   * @param region - The cell region of interest.
   *
   * @param column - The index of the column of interest.
   *
   * @returns The metadata for the column.
   */
  metadata(
    region: DataModel.CellRegion,
    row: number,
    column: number,
  ): DataModel.Metadata {
    if (region === 'body' || region === 'column-header') {
      return { row: row, column: column, ...this._bodyFields[column] };
    }
    return { row: row, column: column, ...this._headerFields[column] };
  }

  /**
   * Get the data value for a cell in the view.
   *
   * @param region - The cell region of interest.
   *
   * @param row - The row index of the cell of interest.
   *
   * @param column - The column index of the cell of interest.
   *
   * @param returns - The data value for the specified cell.
   *
   * #### Notes
   * A `missingValue` as defined by the schema is converted to `null`.
   */
  data(region: DataModel.CellRegion, row: number, column: number): any {
    // Set up the field and value variables.

    let field: ViewBasedJSONModel.IField;
    let value: any;

    // Look up the field and value for the region.
    switch (region) {
      case 'body':
        field = this._bodyFields[column];
        value = this._data[row][field.name];
        break;
      case 'column-header':
        field = this._bodyFields[column];
        value = field.rows[row];
        break;
      case 'row-header':
        field = this._headerFields[column];
        value = this._data[row][field.name];
        break;
      case 'corner-header':
        field = this._headerFields[column];
        value = field.rows[row];
        break;
      default:
        throw 'unreachable';
    }

    // Test whether the value is a missing value.
    const missing =
      this._missingValues !== null &&
      typeof value === 'string' &&
      this._missingValues[value] === true;

    // Return the final value.
    return missing ? null : value;
  }

  /**
   * Returns a reference to the dataset from this View.
   */
  get dataset(): View.DataSource {
    return this._data;
  }

  /**
   * Returns the index in the schema that relates to the index by region.
   *
   * @param region - The `CellRegion` of interest.
   *
   * @param index - The column index to look up.
   */
  getSchemaIndex(region: DataModel.CellRegion, index: number): number {
    if (region === 'corner-header') {
      return index;
    } else {
      return this._headerFields.length + index;
    }
  }

  /**
   * Returns a Promise that resolves to an array of unique values contained in
   * the provided column index.
   *
   * @param columnIndex - The index to retrieve unique values for.
   */
  async uniqueValues(
    region: DataModel.CellRegion,
    columnIndex: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const columnName = this.metadata(region, 0, columnIndex)['name'];
      const uniqueVals = new Set();
      for (const row of this.dataset) {
        uniqueVals.add(row[columnName]);
      }
      resolve(Array.from(uniqueVals));
    });
  }

  private readonly _data: View.DataSource;
  private readonly _bodyFields: ViewBasedJSONModel.IField[];
  private readonly _headerFields: ViewBasedJSONModel.IField[];
  private readonly _missingValues: Private.MissingValuesMap | null;
}

/**
 * The namespace for the `View` class statics.
 */
export namespace View {
  /**
   * An object which describes a column of data in the view.
   *
   * #### Notes
   * This is based on the JSON Table Schema specification:
   * https://specs.frictionlessdata.io/table-schema/
   */

  /**
   * An object when specifies the schema for a view.
   *
   * #### Notes
   * This is based on the JSON Table Schema specification:
   * https://specs.frictionlessdata.io/table-schema/
   */
  export interface ISchema {
    /**
     * The fields which describe the view columns.
     *
     * Primary key fields are rendered as row header columns.
     */
    readonly fields: ViewBasedJSONModel.IField[];

    /**
     * The values to treat as "missing" data.
     *
     * Missing values are automatically converted to `null`.
     */
    readonly missingValues?: string[];

    /**
     * The field names which act as primary keys.
     *
     * Primary key fields are rendered as row header columns.
     */
    readonly primaryKey?: string | string[];

    /**
     * The name of the unique identifier in the primary key array
     */
    readonly primaryKeyUuid: string;
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
   * An options object for initializing a view.
   */
  export interface IOptions {
    /**
     * The schema for the for the view.
     *
     * The schema should be treated as an immutable object.
     */
    schema: ISchema;

    /**
     * The data source for the view.
     *
     * The data model takes full ownership of the data source.
     */
    data: DataSource;
  }
}

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * An object which holds the results of splitting schema fields.
   */
  export interface ISplitFieldsResult {
    /**
     * The non-primary key fields to use for the grid body.
     */
    bodyFields: ViewBasedJSONModel.IField[];

    /**
     * The primary key fields to use for the grid headers.
     */
    headerFields: ViewBasedJSONModel.IField[];
  }

  /**
   * Split the schema fields into header and body fields.
   */
  export function splitFields(schema: View.ISchema): ISplitFieldsResult {
    // Normalize the primary keys.
    let primaryKeys: string[];
    if (schema.primaryKey === undefined) {
      primaryKeys = [];
    } else if (typeof schema.primaryKey === 'string') {
      primaryKeys = [schema.primaryKey];
    } else {
      primaryKeys = schema.primaryKey;
    }
    // Separate the fields for the body and header.
    const bodyFields: ViewBasedJSONModel.IField[] = [];
    const headerFields: ViewBasedJSONModel.IField[] = [];
    for (const field of schema.fields) {
      // Skipping the primary key unique identifier so
      // it is not rendered.
      if (field.rows[0] == schema.primaryKeyUuid) {
        continue;
      }
      if (primaryKeys.indexOf(field.name) === -1) {
        bodyFields.push(field);
      } else {
        headerFields.push(field);
      }
    }

    // Return the separated fields.
    return { bodyFields, headerFields };
  }

  /**
   * A type alias for a missing value map.
   */
  export type MissingValuesMap = { [key: string]: boolean };

  /**
   * Create a missing values map for a schema.
   *
   * This returns `null` if there are no missing values.
   */
  export function createMissingMap(
    schema: View.ISchema,
  ): MissingValuesMap | null {
    // Bail early if there are no missing values.
    if (!schema.missingValues || schema.missingValues.length === 0) {
      return null;
    }

    // Collect the missing values into a map.
    const result: MissingValuesMap = Object.create(null);
    for (const value of schema.missingValues) {
      result[value] = true;
    }

    // Return the populated map.
    return result;
  }
}
