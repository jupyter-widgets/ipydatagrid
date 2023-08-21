import { InteractiveFilterDialog } from '../../js/core/filterMenu';
import { ViewBasedJSONModel } from '../../js/core/viewbasedjsonmodel';
import { DataGenerator } from '../js/testUtils';
import { Transform } from '../../js/core/transform';
import { DataModel } from '@lumino/datagrid';

describe('Test .hasValidFilterValue()', () => {
  const testCases: Private.ValidFilterValueTestCase[] = [
    { type: 'number', data: [1, 2, 3], value: 5, expected: true },
    { type: 'number', data: [1, 2, 3], value: '', expected: false },
    { type: 'number', data: [1, 2, 3], value: ['5', '2'], expected: true },
    { type: 'number', data: [1, 2, 3], value: ['5', ''], expected: false },
    { type: 'number', data: [1, 2, 3], value: ['', '5'], expected: false },
    { type: 'number', data: [1, 2, 3], value: [''], expected: false },
    { type: 'number', data: [1, 2, 3], value: 0, expected: true },
    { type: 'number', data: [1, 2, 3], value: '0', expected: true },
    { type: 'number', data: [1, 2, 3], value: ['0', '2'], expected: true },
    { type: 'number', data: [1, 2, 3], value: ['5', '0'], expected: true },
  ];

  testCases.forEach((testCase) => {
    test(`${testCase.value} - ${testCase.expected}`, () => {
      const dialog = Private.createSimpleDialog();
      // @ts-ignore
      dialog._filterValue = testCase.value;
      expect(dialog.hasValidFilterValue()).toBe(testCase.expected);
    });
  });
});

describe('Test .applyFilter()', () => {
  test('.addTransform() is called', () => {
    const dialog = Private.createSimpleDialog();
    const colIndex = 0;

    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: colIndex + 1,
      operator: '=',
      value: 6,
    };

    Private.setDialogState({
      dialog: dialog,
      columnIndex: colIndex,
      mode: 'condition',
      operator: transform.operator,
      region: 'body',
      value: transform.value,
    });

    const mock = jest.spyOn(dialog.model, 'addTransform');
    dialog.applyFilter();
    expect(mock).toBeCalledWith(transform);
  });
  test('condition transform is added', () => {
    const dialog = Private.createSimpleDialog();
    const colIndex = 0;

    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: colIndex + 1,
      operator: '=',
      value: 6,
    };

    Private.setDialogState({
      dialog: dialog,
      columnIndex: colIndex,
      mode: 'condition',
      operator: transform.operator,
      region: 'body',
      value: transform.value,
    });

    dialog.applyFilter();
    const addedTransform = dialog.model.transformMetadata(colIndex + 1)![
      'filter'
    ];
    expect(addedTransform).toEqual(transform);
  });
  test('value transform is added', () => {
    const dialog = Private.createSimpleDialog();
    const colIndex = 0;

    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: colIndex + 1,
      operator: 'in',
      value: [],
    };

    Private.setDialogState({
      dialog: dialog,
      columnIndex: colIndex,
      mode: 'value',
      operator: transform.operator,
      region: 'body',
      value: transform.value,
    });
    dialog.userInteractedWithDialog = true;
    dialog.applyFilter();
    const addedTransform = dialog.model.transformMetadata(colIndex + 1)![
      'filter'
    ];
    expect(addedTransform).toEqual(transform);
  });
});

describe('Test .updateDialog()', () => {
  test('Test operator overrride', () => {
    const dialog = Private.createSimpleDialog();

    Private.setDialogState({
      dialog: dialog,
      region: 'body',
      value: 6,
      columnIndex: 0,
      mode: 'value',
      operator: '<',
    });

    dialog.updateDialog();
    expect(dialog.operator).toBe('in');
  });
  test('Test transform metadata retrieval', () => {
    const dialog = Private.createSimpleDialog();
    const mock = jest.spyOn(dialog.model, 'transformMetadata');
    dialog.updateDialog();
    expect(mock).toBeCalledTimes(1);
  });
  test('Transform metadata updates state', () => {
    const dialog = Private.createSimpleDialog();
    const transform: Transform.TransformSpec = {
      type: 'filter',
      columnIndex: 1,
      operator: '>=',
      value: 6,
    };
    dialog.model.addTransform(transform);
    dialog.open({
      columnIndex: 0,
      region: 'body',
      mode: 'condition',
      x: 0,
      y: 0,
      forceY: false,
      forceX: false,
    });
    expect(dialog.operator).toBe('>=');
    expect(dialog.value).toBe(6);
  });
});

describe('.open()', () => {
  test('open event updates state', () => {
    const dialog = Private.createSimpleDialog();
    const openOptions: InteractiveFilterDialog.IOpenOptions = {
      columnIndex: 0,
      forceX: false,
      forceY: false,
      mode: 'condition',
      region: 'body',
      x: 0,
      y: 0,
    };
    dialog.open(openOptions);
    expect(dialog.columnIndex).toBe(openOptions.columnIndex);
    expect(dialog.columnDType).toBe(
      dialog.model.metadata(openOptions.region, 0, openOptions.columnIndex)[
      'type'
      ],
    );
  });
});

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Returns a data model containing the provided data.
   *
   * @param data
   */
  export function createSimpleModel(
    data: DataGenerator.ISingleColOptions,
  ): ViewBasedJSONModel {
    const model = new ViewBasedJSONModel(DataGenerator.singleCol(data));
    return model;
  }

  /**
   * Returns a simple `InteractiveFilterDialog` instance.
   */
  export function createSimpleDialog(): InteractiveFilterDialog {
    const model = Private.createSimpleModel({
      name: 'test',
      type: 'number',
      data: [1, 2, 3],
    });
    return new InteractiveFilterDialog({ model: model });
  }

  /**
   * Sets the provided state on the provided `InteractiveFilterDialog` instance.
   *
   * @param options - The options for setting state.
   */
  export function setDialogState(options: Private.ISetDialogStateOptions) {
    const dialog = options.dialog;
    // @ts-ignore
    dialog._region = options.region;
    // @ts-ignore
    dialog._filterValue = options.value;
    // @ts-ignore
    dialog._columnIndex = options.columnIndex;
    // @ts-ignore
    dialog._mode = options.mode;
    // @ts-ignore
    dialog._filterOperator = options.operator;
  }

  /**
   * A type alias for a `.hasValidFilterValue()` test case.
   */
  export type ValidFilterValueTestCase = {
    /**
     * The dtype of the provided data.
     */
    type: string;

    /**
     * The data to create a data model with.
     */
    data: any[];

    /**
     * The value/s to test against.
     */
    value: InteractiveFilterDialog.FilterValue;

    /**
     * The expected result of the test.
     */
    expected: boolean;
  };

  /**
   * An options object for the `setDialogState()` function.
   */
  export interface ISetDialogStateOptions {
    /**
     * The `InteractiveFilterDialog` to operate on.
     */
    dialog: InteractiveFilterDialog;

    /**
     * The active cell region to set.
     */
    region: DataModel.CellRegion;

    /**
     * The active filter value to set.
     */
    value: InteractiveFilterDialog.FilterValue;

    /**
     * The active filter operator to set.
     */
    operator: Transform.FilterOperator;

    /**
     * The active filter mode to set.
     */
    mode: InteractiveFilterDialog.FilterMode;

    /**
     * The active column index to set.
     */
    columnIndex: number;
  }
}
