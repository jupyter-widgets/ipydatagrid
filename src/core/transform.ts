/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/

import {
  toArray, filter
} from '@phosphor/algorithm';

import {
  ViewBasedJSONModel
} from './viewbasedjsonmodel';

/**
 * An object that defines a data transformation.
 */
export
abstract class Transform {
  /**
   * Apply a transformation to the provided data, then return a new copy.
   */
  abstract apply(input: Transform.IData): Transform.IData;
}

/**
 * The namespace for the `Transform` class statics.
 */
export
namespace Transform {
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
class Filter extends Transform {
  /**
   * Create a new transformation.
   *
   * @param options - The options for initializing the transformation.
   */
  constructor(options: Filter.IOptions) {
    super();
    this._options = options;
  }

  /**
   * Apply a transformation to the provided data.
   *
   * @param input - The data to be operated on.
   */
  public apply(input: Transform.IData) : Transform.IData {
    let filterFunc: any;
    switch (this._options.operator) {
      case Filter.Operators.GreaterThan:
        filterFunc = (item: any) => {
          return item[this._options.field] > this._options.value
        };
        break;
      case Filter.Operators.LessThan:
        filterFunc = (item: any) => {
          return item[this._options.field] < this._options.value
        };
        break;
      case Filter.Operators.Equals:
          filterFunc = (item: any) => {
            // If a user inputs a number, will it be cast as a string?
            return item[this._options.field] == this._options.value
          };
          break;
      default:
        throw 'unreachable';
    }

    return {'schema': input.schema,
            'data': toArray(filter(input.data, filterFunc))};
  }

  protected _options: Filter.IOptions;
}

/**
 * The namespace for the `Filter` class statics.
 */
export
namespace Filter {
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
    operator: Filter.Operators,

    /**
     * The value(s) to filter by.
     */
    value: string | string[] | number | number[]
  }

  /**
   * The available operators to filter with.
   */
  export
  enum Operators {
    LessThan,
    GreaterThan,
    Equals
  }
}

/**
 * A transformation that sorts the provided data by the provided field.
 *
 * Note: This is a WIP
 */
export class Sort extends Transform {
  /**
   * Creates a new sort transformation
   *
   * @param options - The options for initializing the transformation.
   */
  constructor(options: Sort.IOptions) {
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
  public apply(input: Transform.IData) : Transform.IData {
    // Note: currently ignores the `desc` parameter
    let sortFunc = (a: any, b: any) : number => {
      return (a[this._options.field] > b[this._options.field]) ? 1 : -1
    };
    return {'schema': input.schema,
            'data': input.data.slice(0).sort(sortFunc)};
  }

  protected _options: Sort.IOptions;
}

/**
 * The namespace for the `Sort` class statics.
 */
export
namespace Sort {
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
