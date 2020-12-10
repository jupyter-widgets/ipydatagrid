import { ViewBasedJSONModel } from './viewbasedjsonmodel';

import { toArray, filter } from '@lumino/algorithm';

import { Transform } from './transform';

import * as moment from 'moment';

/**
 * An object that defines a data transformation executor.
 */
export abstract class TransformExecutor {
  /**
   * Apply a transformation to the provided data, then return a new copy.
   */
  abstract apply(input: TransformExecutor.IData): TransformExecutor.IData;
}

/**
 * The namespace for the `Transform` class statics.
 */
export namespace TransformExecutor {
  /**
   * A read only type for the input/output of .apply().
   */
  export type IData = Readonly<ViewBasedJSONModel.IData>;
}

/**
 * A transformation that filters a single field by the provided operator and
 * value.
 *
 * Note: This is a WIP
 */
export class FilterExecutor extends TransformExecutor {
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
  public apply(input: TransformExecutor.IData): TransformExecutor.IData {
    let filterFunc: any;
    switch (this._options.operator) {
      case '>':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return target.isAfter(value, 'day');
          }
          return item[this._options.field] > this._options.value;
        };
        break;
      case '<':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return target.isBefore(value, 'day');
          }
          return item[this._options.field] < this._options.value;
        };
        break;
      case '<=':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return target.isSameOrBefore(value, 'day');
          }
          return item[this._options.field] <= this._options.value;
        };
        break;
      case '>=':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return target.isSameOrAfter(value, 'day');
          }
          return item[this._options.field] >= this._options.value;
        };
        break;
      case '=':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return target.isSame(value);
          }
          return item[this._options.field] == this._options.value;
        };
        break;
      case '!=':
        filterFunc = (item: any) => {
          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const value = moment.default.utc(this._options.value);
            return !target.isSame(value);
          }
          return item[this._options.field] !== this._options.value;
        };
        break;
      case 'empty':
        filterFunc = (item: any) => {
          return item[this._options.field] === null;
        };
        break;
      case 'notempty':
        filterFunc = (item: any) => {
          return item[this._options.field] !== null;
        };
        break;
      case 'in':
        filterFunc = (item: any) => {
          const values = <any[]>this._options.value;
          return values.includes(item[this._options.field]);
        };
        break;
      case 'between':
        filterFunc = (item: any) => {
          const values = <any[]>this._options.value;

          if (['date', 'datetime', 'time'].includes(this._options.dType)) {
            const target = moment.default.utc(item[this._options.field]);
            const lowValue = moment.default.utc(values[0]);
            const highValue = moment.default.utc(values[1]);

            return target.isBetween(lowValue, highValue, 'day');
          }

          return (
            item[this._options.field] > values[0] &&
            item[this._options.field] < values[1]
          );
        };
        break;
      case 'startswith':
        filterFunc = (item: any) => {
          return item[this._options.field].startsWith(this._options.value);
        };
        break;
      case 'endswith':
        filterFunc = (item: any) => {
          return item[this._options.field].endsWith(this._options.value);
        };
        break;
      case 'stringContains':
        filterFunc = (item: any) => {
          return String(item[this._options.field])
            .toLowerCase()
            .includes(String(this._options.value).toLowerCase());
        };
        break;
      case 'contains':
        filterFunc = (item: any) => {
          return item[this._options.field].includes(this._options.value);
        };
        break;
      case '!contains':
        filterFunc = (item: any) => {
          return !item[this._options.field].includes(this._options.value);
        };
        break;
      case 'isOnSameDay':
        filterFunc = (item: any) => {
          const target = moment.default.utc(item[this._options.field]);
          const value = moment.default.utc(this._options.value);
          return target.isSame(value, 'day');
        };
        break;
      default:
        throw 'unreachable';
    }

    return {
      schema: input.schema,
      data: toArray(filter(input.data, filterFunc)),
    };
  }

  protected _options: FilterExecutor.IOptions;
}

/**
 * The namespace for the `FilterExecutor` class statics.
 */
export namespace FilterExecutor {
  /**
   * An options object for initializing a Filter.
   */
  export interface IOptions {
    /**
     * The name of the field in the data source.
     */
    field: string;

    /**
     * The data type of the column associated with this transform.
     */
    dType: string;

    /**
     * The operator to use for the comparison.
     */
    operator: Transform.FilterOperator;

    /**
     * The value(s) to filter by.
     */
    value: string | string[] | number | number[];
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
  public apply(input: TransformExecutor.IData): TransformExecutor.IData {
    let sortFunc: (a: any, b: any) => number;
    const field = this._options.field;
    const columnDataType = this._options.dType;

    // Adding string checks within the sort function so we do
    // not have to mutate in-place the original types of the
    // values of the column into strings. This allows the
    // displayed values to maintain their original types but
    // be sorted as if they were all strings.
    const stringifyIfNeeded = (value: any) => {
      if (typeof value != 'string') {
        return String(value);
      }
      return value;
    };

    if (columnDataType == 'string') {
      if (this._options.desc) {
        sortFunc = (a: any, b: any): number => {
          return stringifyIfNeeded(a[field]) < stringifyIfNeeded(b[field])
            ? 1
            : -1;
        };
      } else {
        sortFunc = (a: any, b: any): number => {
          return stringifyIfNeeded(a[field]) > stringifyIfNeeded(b[field])
            ? 1
            : -1;
        };
      }
    } else {
      if (this._options.desc) {
        sortFunc = (a: any, b: any): number => {
          return a[field] < b[field] ? 1 : -1;
        };
      } else {
        sortFunc = (a: any, b: any): number => {
          return a[field] > b[field] ? 1 : -1;
        };
      }
    }

    const data = input.data.slice(0);
    const sortables: any[] = [],
      notSortables: any[] = [];

    data.forEach((value: any) => {
      const cellValue = value[field];
      const notSortable =
        cellValue === null ||
        (typeof cellValue === 'number' && Number.isNaN(cellValue)) ||
        (cellValue instanceof Date && Number.isNaN(cellValue.getTime()));

      if (notSortable) {
        notSortables.push(value);
      } else {
        sortables.push(value);
      }
    });

    return {
      schema: input.schema,
      data: sortables.sort(sortFunc).concat(notSortables),
    };
  }

  protected _options: SortExecutor.IOptions;
}

/**
 * The namespace for the `SortExecutor` class statics.
 */
export namespace SortExecutor {
  /**
   * An options object for initializing a Sort.
   */
  export interface IOptions {
    /**
     * The name of the field in the data source.
     */
    field: string;

    /**
     * The data type of the column associated with this transform.
     */
    dType: string;

    /**
     * Indicates ascending or descending order for the sort.
     */
    desc: boolean;
  }
}

export namespace Private {
  export type JSONDate = 'date' | 'time' | 'datetime';
}
