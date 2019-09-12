import {
  ViewBasedJSONModel
} from '../core/viewbasedjsonmodel'

/**
 * A namespace for functions that generate tables for testing.
 * 
 * #### Notes
 * This is based on the JSON Table Schema specification:
 * https://specs.frictionlessdata.io/table-schema/
 */
export namespace DataGenerator {

  /**
   * A function that returns a table with a single column.
   *
   * @param options - The options for creating a table.
   */
  export function createTestData(options: ICreateTestDataOptions): ViewBasedJSONModel.IData {
    const data = options.data.map((val: any, i: number) => {
      const row: { [key: string]: any } = { 'index': i };
      row[options.name] = val;
      return row;
    });
    return {
      'schema': {
        'fields': [
          { name: 'index', type: 'integer' },
          { name: options.name, type: options.type }
        ],
        'primaryKey': ['index']
      },
      'data': data
    }
  }

  /**
   * An options object for initializing single column table for testing.
   */
  export interface ICreateTestDataOptions {

    /**
     * The name of the column to be created.
     */
    name: string

    /**
     * The dtype of the column to be created.
     */
    type: string

    /**
     * The data to be added to the created column.
     */
    data: any[]
  }
}

