import { ViewBasedJSONModel } from '../../js/core/viewbasedjsonmodel';

import {
  IClassicComm,
  ICallbacks,
  WidgetView,
  WidgetModel,
} from '@jupyter-widgets/base';

import { JSONObject } from '@lumino/coreutils';

/**
 * A namespace for functions that generate tables for testing.
 *
 * #### Notes
 * This is based on the JSON Table Schema specification:
 * https://specs.frictionlessdata.io/table-schema/
 */
export namespace DataGenerator {
  // Unique primary key identifier
  export const IPYDG_UUID = 'ipydguuid';

  /**
   * A function that returns a table with a single column.
   *
   * @param options - The options for creating a table.
   */
  export function singleCol(
    options: ISingleColOptions,
  ): ViewBasedJSONModel.IData {
    const data = options.data.map((val: any, i: number) => {
      const row: { [key: string]: any } = { index: i, IPYDG_UUID: i };
      row[options.name] = val;
      return row;
    });
    return {
      schema: {
        fields: [
          { name: 'index', type: 'integer', rows: ['index'] },
          { name: options.name, type: options.type, rows: [options.name] },
          { name: IPYDG_UUID, type: 'integer', rows: [IPYDG_UUID] },
        ],
        primaryKey: ['index', IPYDG_UUID],
        primaryKeyUuid: IPYDG_UUID,
      },
      data: data,
    };
  }

  export function multiCol(
    options: IMultiColOptions,
  ): ViewBasedJSONModel.IData {
    const fields = options.data.map((val) => {
      return { name: val.name, type: val.type, rows: [val.name] };
    });
    const rows = [];

    for (let i = 0; i < options.length; i++) {
      const row: { [key: string]: any } = {};
      options.data.forEach((col) => {
        row[col.name] = col.data[i];
      });
      row[IPYDG_UUID] = i;
      rows.push(row);
    }

    return {
      schema: {
        fields: [
          ...fields,
          { name: IPYDG_UUID, type: 'integer', rows: [IPYDG_UUID] },
        ],
        primaryKey: ['index', IPYDG_UUID],
        primaryKeyUuid: IPYDG_UUID,
      },
      data: rows,
    };
  }

  /**
   * A function that returns a table with multiple indices and multiple columns
   *
   * @param options - The options for creating a table.
   */
  export function multiIndexCol(
    options: IMultiIndexColOptions,
    primaryKeyUuid: string,
  ): ViewBasedJSONModel.IData {
    const fields = options.data.map((val) => {
      return {
        name: val.name,
        type: val.type,
        rows:
          typeof val.name === 'number'
            ? [val.name]
            : val.name.replace(/[^\w\s]/gi, '').split(' '),
      };
    });
    const rows = [];

    for (let i = 0; i < options.length; i++) {
      const row: { [key: string]: any } = {};
      options.data.forEach((col) => {
        row[col.name] = col.data[i];
      });
      row[primaryKeyUuid] = i;
      rows.push(row);
    }

    return {
      schema: {
        fields: fields,
        primaryKey: options.primaryKeyData,
        primaryKeyUuid: primaryKeyUuid,
      },
      data: rows,
    };
  }

  /**
   * An options object for initializing single column table for testing.
   */
  export interface ISingleColOptions {
    /**
     * The name of the column to be created.
     */
    name: string;

    /**
     * The dtype of the column to be created.
     */
    type: string;

    /**
     * The data to be added to the created column.
     */
    data: any[];
  }

  export interface IMultiColOptions {
    data: DataGenerator.ISingleColOptions[];
    length: number;
  }

  export interface IMultiIndexColOptions {
    data: DataGenerator.ISingleColOptions[];
    length: number;
    primaryKeyData: any[];
  }
}

/**
 * Mock widget manager for testing.
 */
export class MockWidgetManager {
  create_view(model: any) {
    return new Promise((resolve, reject) => {
      resolve(new MockView());
    });
  }
  display_view(model: any) {
    return new Promise((resolve, reject) => {
      resolve(jest.fn());
    });
  }

  callbacks(view?: WidgetView): ICallbacks {
    return {};
  }
}

class MockView {
  on() { }
}

/**
 * Mock Comm for testing.
 */
export class MockComm implements IClassicComm {
  constructor() {
    this.comm_id = `mock-comm-id-${MockComm.numComms}`;
    MockComm.numComms += 1;
  }
  on_open(fn: Function) {
    this._on_open = fn;
  }
  on_close(fn: Function) {
    this._on_close = fn;
  }
  on_msg(fn: Function) {
    this._on_msg = fn;
  }
  _process_msg(msg: any) {
    if (this._on_msg) {
      return this._on_msg(msg);
    } else {
      return Promise.resolve();
    }
  }
  open() {
    if (this._on_open) {
      this._on_open();
    }
    return '';
  }
  close() {
    if (this._on_close) {
      this._on_close();
    }
    return '';
  }
  send() {
    return '';
  }
  comm_id: string;
  target_name: string;
  _on_msg: Function;
  _on_open: Function;
  _on_close: Function;

  private static numComms: number = 0;
}

export function emulateCustomCommMessage(
  model: WidgetModel,
  channel: 'iopub' | 'shell',
  content: JSONObject,
) {
  // @ts-ignore
  model._handle_comm_msg({
    channel: channel,
    content: {
      comm_id: '',
      data: {
        method: 'custom',
        content: content,
      },
    },
  });
}
