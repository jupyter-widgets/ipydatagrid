import {
  ViewBasedJSONModel
} from './viewbasedjsonmodel';

import {
  toArray, filter
} from '@phosphor/algorithm';

import {
  Transform
} from './transform';

/**
 * An object that defines a data transformation executor.
 */
export
abstract class TransformExecutor {
  /**
   * Apply a transformation to the provided data, then return a new copy.
   */
  abstract apply(input: TransformExecutor.IData): TransformExecutor.IData;
}

/**
* The namespace for the `Transform` class statics.
*/
export
namespace TransformExecutor {
 /**
  * A read only type for the input/output of .apply().
  */
 export
 type IData = Readonly<ViewBasedJSONModel.IData>
}

/**
 * A transformation that filters a single field by the provided operator and
 * value.
 * 
 * Note: This is a WIP
 */
export
class FilterExecutor extends TransformExecutor {
  /**
   * Create a new transformation.
   * 
   * @param options - The options for initializing the transformation.
   */
  constructor(options: FilterExecutor.IOptions) {
    super();
    this._options = options;
  }

  /**
   * Apply a transformation to the provided data.
   * 
   * @param input - The data to be operated on.
   */
  public apply(input: TransformExecutor.IData) : TransformExecutor.IData {
    let filterFunc: any;
    switch (this._options.operator) {
      case ">":
        filterFunc = (item: any) => {
          return item[this._options.field] > this._options.value
        };
        break;
      case "<":
        filterFunc = (item: any) => {
          return item[this._options.field] < this._options.value
        };
        break;
      case "<=":
        filterFunc = (item: any) => {
          return item[this._options.field] <= this._options.value
        };
        break;
      case ">=":
        filterFunc = (item: any) => {
          return item[this._options.field] >= this._options.value
        };
        break;
      case "=":
        filterFunc = (item: any) => {
          // If a user inputs a number, will it be cast as a string?
          return item[this._options.field] == this._options.value
        };
        break;
      case "!=":
        filterFunc = (item: any) => {
          // If a user inputs a number, will it be cast as a string?
          return item[this._options.field] !== this._options.value;
        };
        break;
      case "empty":
        filterFunc = (item: any) => {
          return item[this._options.field] === null;
        };
        break;
      case "notempty":
        filterFunc = (item: any) => {
          return item[this._options.field] !== null;
        };
        break;
      case "in":
        filterFunc = (item: any) => {
          let values = <any[]>this._options.value;
          return values.includes(item[this._options.field])
        };
        break;
      case "between":
        filterFunc = (item: any) => {
          let values = <any[]>this._options.value;
          return item[this._options.field] > values[0]
          && item[this._options.field] < values[1]
        };
        break;
      default:
        throw 'unreachable';
    }

    return {'schema': input.schema,
            'data': toArray(filter(input.data, filterFunc))};
  }

  protected _options: FilterExecutor.IOptions;
}

/**
 * The namespace for the `FilterExecutor` class statics.
 */
export
namespace FilterExecutor {

  /**
   * An options object for initializing a Filter.
   */
  export
  interface IOptions {
    /**
     * The name of the field in the data source.
     */
    field: string,

    /**
     * The operator to use for the comparison.
     */
    operator: Transform.FilterOperator,

    /**
     * The value(s) to filter by.
     */
    value: string | string[] | number | number[]
  }
}

/**
 * A transformation that sorts the provided data by the provided field.
 * 
 * Note: This is a WIP
 */
export class SortExecutor extends TransformExecutor {
  /**
   * Creates a new sort transformation
   * 
   * @param options - The options for initializing the transformation.
   */
  constructor(options: SortExecutor.IOptions) {
    super();
    this._options = options;
  }

  /**
   * Apply a transformation to the provided data.
   * 
   * Note: Currently ignores the `desc` parameter.
   * 
   * @param input - The data to be operated on.
   */
  public apply(input: TransformExecutor.IData) : TransformExecutor.IData {
    let sortFunc: (a: any, b: any) => number;

    if (this._options.desc) {
      sortFunc = (a: any, b: any) : number => {
        return (a[this._options.field] < b[this._options.field]) ? 1 : -1
      };
    } else {
      sortFunc = (a: any, b: any) : number => {
        return (a[this._options.field] > b[this._options.field]) ? 1 : -1
      };
    }
    return {'schema': input.schema,
            'data': input.data.slice(0).sort(sortFunc)};
  }

  protected _options: SortExecutor.IOptions;
}

/**
 * The namespace for the `SortExecutor` class statics.
 */
export
namespace SortExecutor {
  /**
   * An options object for initializing a Sort.
   */
  export
  interface IOptions {
    /**
     * The name of the field in the data source.
     */
    field: string,

    /**
     * Indicates ascending or descending order for the sort.
     */
    desc: boolean
  }
}