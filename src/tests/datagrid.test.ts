import {
  DataGridModel, DataGridView,
} from '../datagrid';

import {
  DataGenerator
} from '../tests/testUtils'

import {
  ViewBasedJSONModel
} from '../core/viewbasedjsonmodel';

import {
  Transform
} from '../core/transform';

import {
  WidgetManager
} from './testUtils';

/**
 * Tests that assigning new data to the `data` attribute of the widget behaves
 * as intended.
 */
describe('Test trait: data', () => {

  test('Data model is updated on trait update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({ data: testData.set1 });
    const oldDataModel = grid.model.data_model;
    grid.model.set('data', testData.set2);
    expect(grid.model.data_model.dataset).toEqual(testData.set2);
    expect(grid.model.data_model).not.toBe(oldDataModel);
  });

  test('Selection model updated on trait update', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({
      data: testData.set1, modelAttributes: { selection_mode: 'cell' }
    });
    const oldSelectionModel = grid.model.selectionModel;
    grid.model.set('data', testData.set2);
    expect(grid.model.selectionModel).not.toBe(oldSelectionModel);
  });

  test('Transforms are copied to new model', async () => {
    const testData = Private.createBasicTestData();
    const transform: Transform.TransformSpec = {
      type: 'sort',
      columnIndex: 0,
      desc: true
    }
    const grid = await Private.createGridWidget({
      data: testData.set1, modelAttributes: {
        selection_mode: 'cell',
        _transforms: [transform]
      }
    });
    const oldTransforms = grid.model.data_model.transformMetadata(
      transform.columnIndex
    );
    const oldDataModel = grid.model.data_model
    grid.model.set('data', testData.set2);
    expect(grid.model.data_model).not.toBe(oldDataModel);
    expect(grid.model.data_model.transformMetadata(
      transform.columnIndex
    )).toEqual(
      oldTransforms
    )
  });

  test('HeaderRenderer updated with reference to new model', async () => {
    const testData = Private.createBasicTestData();
    const grid = await Private.createGridWidget({
      data: testData.set1, modelAttributes: { selection_mode: 'cell' }
    });
    const oldColHead = grid.view.grid.cellRenderers.get('column-header', {});
    const oldCornerHead = grid.view.grid.cellRenderers.get('column-header', {});
    grid.model.set('data', testData.set2);
    expect(
      grid.view.grid.cellRenderers.get('corner-header', {})
    ).not.toBe(oldCornerHead);
    expect(
      grid.view.grid.cellRenderers.get('column-header', {})
    ).not.toBe(oldColHead);
  });
});

namespace Private {
  /**
   * Creates a model and view instance for the front-end of the widget.
   * 
   * @param options - The options to create a grid widget
   */
  export function createGridWidget(
    options: ICreateGridWidgetOptions): Promise<GridWidgetComponents> {
    return new Promise(async (resolve) => {
      const widgetManager = new WidgetManager()
      const gridModel = new DataGridModel(
        { ...options.modelAttributes, data: options.data },
        { model_id: 'testModel', widget_manager: widgetManager }
      );
      const gridView = new DataGridView({ model: gridModel })
      await gridView.render();
      resolve({ model: gridModel, view: gridView })
    })
  }

  /**
   * An options object to create a grid widget for testing.
   */
  export interface ICreateGridWidgetOptions {
    /**
     * Attributes to be passed along to the model constructor.
     */
    modelAttributes?: { [key: string]: any }

    /**
     * The grid data to instantiate the model with.
     */
    data: ViewBasedJSONModel.IData
  }

  /**
   * An object that contains references to a linked datagrid model and view.
   */
  export interface GridWidgetComponents {

    /**
     * The widget model instance.
     */
    model: DataGridModel

    /**
     * A widget view
     */
    view: DataGridView
  }

  /**
   * Creates 2 sets of data in the JSON Table Schema format for testing.
   */
  export function createBasicTestData() {
    const data1 = DataGenerator.singleCol({
      data: [1, 2, 3], name: 'test', type: 'number'
    });
    const data2 = DataGenerator.singleCol({
      data: [4, 5, 6], name: 'test2', type: 'number'
    });
    return { set1: data1, set2: data2 };
  }
}