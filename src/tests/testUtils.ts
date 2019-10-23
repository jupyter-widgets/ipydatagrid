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
  export function singleCol(options: ISingleColOptions): ViewBasedJSONModel.IData {
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

  export function multiCol(options: IMultiColOptions): ViewBasedJSONModel.IData{
    const fields = options.data.map(val=>{
      return {name: val.name, type: val.type}
    });
    const rows = [];

    for (let i=0;i<options.length;i++){
      const row: { [key: string]: any } = {};
      options.data.forEach(col=>{
        row[col.name] = col.data[i];
        row['index'] = i;
      });
      rows.push(row)
    }
  
    return {
      'schema': {
        'fields': [
          { name: 'index', type: 'integer' },
          ...fields
        ],
        'primaryKey': ['index']
      },
      'data': rows
    }
  }

  /**
   * An options object for initializing single column table for testing.
   */
  export interface ISingleColOptions {

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

  export interface IMultiColOptions {
    data: DataGenerator.ISingleColOptions[]
    length: number
  }
}

/**
 * Mock widget manager for testing.
 */
export class WidgetManager {
  create_view(model: any) {
    return new Promise((resolve, reject) => {
      resolve(jest.fn())
    })
  }
  display_view(model: any) {
    return new Promise((resolve, reject) => {
      resolve(jest.fn())
    })
  }
}

