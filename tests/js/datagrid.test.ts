import { DataGridModel, DataGridView } from '../../js/';

import {
  DataGenerator,
  MockWidgetManager,
  MockComm,
  emulateCustomCommMessage,
} from '../js/testUtils';

import { ViewBasedJSONModel } from '../../js/core/viewbasedjsonmodel';

import { Transform } from '../../js/core/transform';

import { CellRenderer, DataModel } from '@lumino/datagrid';
import { IClassicComm } from '@jupyter-widgets/base';

/**
 * Tests that assigning new data to the `data` attribute of the widget behaves
 * as intended.
 */
describe('Test trait: data', () => {
  test('Data model is updated on trait update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({ data: testData.set1 });
    grid.model.set('_data', testData.set2);
    expect(grid.model.data_model.dataset).toEqual({
      data: testData.set2.data,
      schema: testData.set2.schema,
    });
  });

  test('Comm message sent to backend on frontend cell update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({ data: testData.set1 });
    let dataModel = grid.model.data_model;
    grid.model.set('_data', testData.set2);
    dataModel = grid.model.data_model
    const mock = jest.spyOn((grid.model.comm as IClassicComm), 'send');
    dataModel.setData('body', 1, 0, 1.23);
    expect(mock).toBeCalled();
  });

  test('Comm message sent to frontend on backend cell update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({ data: testData.set1 });
    const row = 1,
      column = 0;
    const value = 1.23;
    grid.model.set('_data', testData.set2);

    return new Promise<void>((resolve, reject) => {
      grid.model.on('msg:custom', (content) => {
        if (content.event_type === 'cell-changed') {
          expect(content.row).toBe(row);
          expect(content.column_index).toBe(column);
          expect(content.value).toBe(value);
          resolve();
        }
      });

      emulateCustomCommMessage(grid.model, 'iopub', {
        event_type: 'cell-changed',
        row: row,
        column_index: column,
        value: value,
      });
    });
  });

  test('Backend driven cell update propagates properly', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({ data: testData.set1 });
    const row = 1,
      column = 0;
    const value = 1.23;
    grid.model.set('_data', testData.set2);

    return new Promise<void>((resolve, reject) => {
      grid.model.data_model.changed.connect(
        (model: ViewBasedJSONModel, args: any) => {
          if (args.type === 'cells-changed') {
            const updatedValue = model.data(args.region, args.row, args.column);
            expect(args.row).toBe(row);
            expect(args.column).toBe(column);
            expect(updatedValue).toBe(value);
            resolve();
          }
        },
      );

      emulateCustomCommMessage(grid.model, 'iopub', {
        event_type: 'cell-changed',
        row: row,
        column_index: column,
        value: value,
      });
    });
  });

  test('Selection model updated on trait update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({
      data: testData.set1,
      modelAttributes: { selection_mode: 'cell' },
    });
    const oldSelectionModel = grid.model.selectionModel;
    grid.model.set('_data', testData.set2);
    expect(grid.model.selectionModel).not.toBe(oldSelectionModel);
  });

  test('Transforms are copied to new model', async () => {
    const testData = Private.createBasicTestData();
    const transform: Transform.TransformSpec = {
      type: 'sort',
      columnIndex: 0,
      desc: true,
    };
    const grid = await Private.createGridWidget({
      data: testData.set1,
      modelAttributes: {
        selection_mode: 'cell',
        _transforms: [transform],
      },
    });
    const oldTransforms = grid.model.data_model.transformMetadata(
      transform.columnIndex,
    );
    grid.model.set('_data', testData.set2);
    expect(
      grid.model.data_model.transformMetadata(transform.columnIndex),
    ).toEqual(oldTransforms);
  });

  test('HeaderRenderer keeps same data model ref on data change (same model, new data)', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({
      data: testData.set1,
      modelAttributes: { selection_mode: 'cell' },
    });
    const cornerCellConfig = Private.createCellConfig('corner-header');
    const columnCellConfig = Private.createCellConfig('column-header');
    const oldCornerHead = grid.view.grid.cellRenderers.get(cornerCellConfig);
    const oldColHead = grid.view.grid.cellRenderers.get(columnCellConfig);
    grid.model.set('_data', testData.set2);
    expect(grid.view.grid.cellRenderers.get(cornerCellConfig)).toBe(
      oldCornerHead,
    );
    expect(grid.view.grid.cellRenderers.get(columnCellConfig)).toBe(oldColHead);
  });

  test('Correct index of the grid is determined from column name', async () => {
    const testData = Private.createMultiIndexData();
    const grid = await Private.createGridWidget({
      data: testData.set1,
    });

    // Testing primary keys
    expect(grid.model.data_model.columnNameToIndex('index1')).toBe(0);
    expect(grid.model.data_model.columnNameToIndex('index2')).toBe(1);

    // Testing columns
    expect(grid.model.data_model.columnNameToIndex('col1')).toBe(0);
    expect(grid.model.data_model.columnNameToIndex('col2')).toBe(1);
  });

  test('Correct column name is determined from column index', async () => {
    const testData = Private.createMultiIndexData();
    const grid = await Private.createGridWidget({
      data: testData.set1,
    });

    // Testing primary keys
    expect(grid.model.data_model.columnIndexToName(0, 'row-header')).toBe(
      'index1',
    );
    expect(grid.model.data_model.columnIndexToName(1, 'row-header')).toBe(
      'index2',
    );

    // Testing columns
    expect(grid.model.data_model.columnIndexToName(0, 'body')).toBe('col1');
    expect(grid.model.data_model.columnIndexToName(1, 'body')).toBe('col2');
  });

  test('Correct column region is determined from column name', async () => {
    const testData = Private.createMultiIndexData();
    const grid = await Private.createGridWidget({
      data: testData.set1,
    });

    // Testing primary keys
    expect(grid.model.data_model.columnNameToRegion('index1')).toBe(
      'row-header',
    );
    expect(grid.model.data_model.columnNameToRegion('index2')).toBe(
      'row-header',
    );

    // Testing columns
    expect(grid.model.data_model.columnNameToRegion('col1')).toBe('body');
    expect(grid.model.data_model.columnNameToRegion('col2')).toBe('body');
  });
});

test('Testing resizeColumns() is called upon model update', async () => {
  const testData = Private.createMultiIndexData();
  const grid = await Private.createGridWidget({
    data: testData.set1,
  });
  const mock = jest.spyOn(grid.view.grid.grid, 'resizeColumn');

  let mockDict = { col1: 200 };
  grid.model.set('column_widths', mockDict);
  grid.model.save_changes();

  expect(mock).toHaveBeenCalledWith('body', 0, 200);
});

namespace Private {
  /**
   * Creates a model and view instance for the front-end of the widget.
   *
   * @param options - The options to create a grid widget
   */
  export function createGridWidget(
    options: ICreateGridWidgetOptions,
  ): Promise<GridWidgetComponents> {
    return new Promise(async (resolve) => {
      const widgetManager = new MockWidgetManager();
      const comm = new MockComm();
      const gridModel = new DataGridModel(
        { ...options.modelAttributes, _data: options.data },
        {
          model_id: 'testModel',
          comm: comm,
          widget_manager: widgetManager,
        } as any,
      );
      const gridView = new DataGridView({ model: gridModel });
      await gridView.render();
      resolve({ model: gridModel, view: gridView });
    });
  }

  /**
   * An options object to create a grid widget for testing.
   */
  export interface ICreateGridWidgetOptions {
    /**
     * Attributes to be passed along to the model constructor.
     */
    modelAttributes?: { [key: string]: any };

    /**
     * The grid data to instantiate the model with.
     */
    data: DataGridModel.IData;
  }

  /**
   * An object that contains references to a linked datagrid model and view.
   */
  export interface GridWidgetComponents {
    /**
     * The widget model instance.
     */
    model: DataGridModel;

    /**
     * A widget view
     */
    view: DataGridView;
  }

  /**
   * Creates 2 sets of data in the JSON Table Schema format for testing.
   */
  export function createBasicTestData(): BasicModelTestData {
    const data1 = DataGenerator.singleCol({
      data: [1, 2, 3],
      name: 'test',
      type: 'number',
    });

    const data2 = DataGenerator.singleCol({
      data: [4, 5, 6],
      name: 'test2',
      type: 'number',
    });

    const set1: DataGridModel.IData = {
      data: data1.data,
      schema: data1.schema,
      fields: data1.schema.fields.map((field: ViewBasedJSONModel.IField) => {
        let tempObject: { [key: string]: null } = {};
        tempObject[field.name] = null;
        return tempObject;
      }),
    };

    const set2: DataGridModel.IData = {
      data: data2.data,
      schema: data2.schema,
      fields: data2.schema.fields.map((field: ViewBasedJSONModel.IField) => {
        let tempObject: { [key: string]: null } = {};
        tempObject[field.name] = null;
        return tempObject;
      }),
    };

    return { set1: set1, set2: set2 };
  }

  export interface BasicModelTestData {
    set1: DataGridModel.IData;
    set2: DataGridModel.IData;
  }

  /**
   *
   * Creates test data for multi index and multi column data
   */
  export function createMultiIndexData(): BasicModelTestData {
    const data1 = DataGenerator.multiIndexCol(
      {
        data: [
          { data: [0, 0, 0], name: 'index1', type: 'number' },
          { data: [0, 0, 0], name: 'index2', type: 'number' },
          { data: [1, 2, 3], name: 'col1', type: 'number' },
          { data: [1, 2, 3], name: 'col2', type: 'number' },
        ],
        length: 2,
        primaryKeyData: ['index1', 'index2', 'ipydguuid'],
      },
      'ipydguuid',
    );

    const set1: DataGridModel.IData = {
      data: data1.data,
      schema: data1.schema,
      fields: data1.schema.fields.map((field: ViewBasedJSONModel.IField) => {
        let tempObject: { [key: string]: null } = {};
        tempObject[field.name] = null;
        return tempObject;
      }),
    };

    const data2 = DataGenerator.multiIndexCol(
      {
        data: [
          { data: [7, 8, 9], name: 'index3', type: 'number' },
          { data: [7, 8, 9], name: 'index4', type: 'number' },
          { data: [4, 5, 6], name: 'col3', type: 'number' },
          { data: [4, 5, 6], name: 'col4', type: 'number' },
        ],
        length: 2,
        primaryKeyData: ['index1', 'index2', 'ipydguuid'],
      },
      'ipydguuid',
    );

    const set2: DataGridModel.IData = {
      data: data2.data,
      schema: data2.schema,
      fields: data2.schema.fields.map((field: ViewBasedJSONModel.IField) => {
        let tempObject: { [key: string]: null } = {};
        tempObject[field.name] = null;
        return tempObject;
      }),
    };

    return { set1: set1, set2: set2 };
  }

  /**
   * Returns a CellConfig for getting CellRenderers
   *
   * @param region The CellRegion to be added to the CellConfig
   */
  export function createCellConfig(
    region: DataModel.CellRegion,
  ): CellRenderer.CellConfig {
    return {
      column: 0,
      height: 0,
      metadata: {},
      region: region,
      row: 0,
      value: 0,
      width: 0,
      x: 0,
      y: 0,
    };
  }
}
