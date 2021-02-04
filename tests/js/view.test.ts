import { DataGenerator } from './testUtils';
import { View } from '../../js/core/view';
import { DataModel } from '@lumino/datagrid';

describe('Test .metadata()', () => {
  const testData = DataGenerator.multiCol({
    length: 3,
    data: [
      { name: 'index', type: 'string', data: ['A', 'B', 'B'] },
      { name: 'col1', type: 'number', data: [10, 20, 30] },
      { name: 'col2', type: 'boolean', data: [true, false, true] },
    ],
  });
  const view = new View(testData);
  const testCases: Private.MetadataTestCase[] = [
    { region: 'column-header', column: 0, expected: 'col1' },
    { region: 'column-header', column: 1, expected: 'col2' },
    { region: 'corner-header', column: 0, expected: 'index' },
    { region: 'body', column: 0, expected: 'col1' },
  ];
  testCases.forEach((val) => {
    test(`cellregion-${val.region}-${val.column}`, () => {
      expect(view.metadata(val.region, 0, val.column)['name']).toBe(
        val.expected,
      );
    });
  });
});

describe('Test .rowCount()', () => {
  const testData = DataGenerator.multiCol({
    length: 3,
    data: [{ name: 'string', type: 'string', data: ['A', 'B', 'C'] }],
  });
  const testView = new View(testData);
  test('cellregion-body', () => {
    expect(testView.rowCount('body')).toBe(3);
  });
  test('cellregion-column-header', () => {
    expect(testView.rowCount('column-header')).toBe(1);
  });
});

describe('Test .rowCount() nestedColumns', () => {
  const testData = DataGenerator.multiIndexCol(
    {
      data: [
        {
          name: "('year', '')",
          type: 'number',
          data: [2013, 2013, 2014, 2014],
        },
        { name: "('visit', '')", type: 'number', data: [1, 2, 1, 2] },
        {
          name: "('Bob', 'HR')",
          type: 'number',
          data: [41.0, 28.0, 42.0, 37.0],
        },
        {
          name: "('Bob', 'Temp')",
          type: 'number',
          data: [37.1, 35.2, 37.3, 39.2],
        },
        {
          name: "('Guido', 'HR')",
          type: 'number',
          data: [50.0, 35.0, 42.0, 31.0],
        },
        {
          name: "('Guido', 'Temp')",
          type: 'number',
          data: [37.7, 37.1, 37.4, 35.1],
        },
        {
          name: "('Sue', 'HR')",
          type: 'number',
          data: [23.0, 48.0, 44.0, 34.0],
        },
        {
          name: "('Sue', 'Temp')",
          type: 'number',
          data: [37.5, 37.1, 37.5, 39.0],
        },
        { name: "('ipydguuid', '')", type: 'number', data: [0, 1, 2, 3] },
      ],
      length: 4,
      primaryKeyData: ["('year', '')", "('visit', '')", "('ipydguuid', '')"],
    },
    "('ipydguuid', '')",
  );
  const testView = new View(testData);
  test('cellregion-body', () => {
    expect(testView.rowCount('body')).toBe(4);
  });
  test('cellregion-column-header', () => {
    expect(testView.rowCount('column-header')).toBe(2);
  });
});

describe('Test .columnCount()', () => {
  const testData = DataGenerator.multiCol({
    length: 3,
    data: [
      { name: 'index', type: 'index', data: ['A', 'B', 'B'] },
      { name: 'boolean', type: 'boolean', data: [true, false, true] },
    ],
  });
  const testView = new View(testData);
  test('cellregion-body', () => {
    expect(testView.columnCount('body')).toBe(1);
  });
  test('cellregion-row-header', () => {
    expect(testView.columnCount('row-header')).toBe(1);
  });
});

describe('Test .columnCount() nestedColumns', () => {
  const testData = DataGenerator.multiIndexCol(
    {
      data: [
        {
          name: "('year', '')",
          type: 'number',
          data: [2013, 2013, 2014, 2014],
        },
        { name: "('visit', '')", type: 'number', data: [1, 2, 1, 2] },
        {
          name: "('Bob', 'HR')",
          type: 'number',
          data: [41.0, 28.0, 42.0, 37.0],
        },
        {
          name: "('Bob', 'Temp')",
          type: 'number',
          data: [37.1, 35.2, 37.3, 39.2],
        },
        {
          name: "('Guido', 'HR')",
          type: 'number',
          data: [50.0, 35.0, 42.0, 31.0],
        },
        {
          name: "('Guido', 'Temp')",
          type: 'number',
          data: [37.7, 37.1, 37.4, 35.1],
        },
        {
          name: "('Sue', 'HR')",
          type: 'number',
          data: [23.0, 48.0, 44.0, 34.0],
        },
        {
          name: "('Sue', 'Temp')",
          type: 'number',
          data: [37.5, 37.1, 37.5, 39.0],
        },
        { name: "('ipydguuid', '')", type: 'number', data: [0, 1, 2, 3] },
      ],
      length: 4,
      primaryKeyData: ["('year', '')", "('visit', '')", "('ipydguuid', '')"],
    },
    "('ipydguuid', '')",
  );
  const testView = new View(testData);
  test('cellregion-body', () => {
    expect(testView.columnCount('body')).toBe(6);
  });
  test('cellregion-row-header', () => {
    expect(testView.columnCount('row-header')).toBe(3); // Including primary key uuid
  });
});

describe('Test .data()', () => {
  const testData = DataGenerator.multiCol({
    length: 3,
    data: [
      { name: 'index', type: 'string', data: ['A', 'B', 'B'] },
      { name: 'col1', type: 'number', data: [10, 20, 30] },
      { name: 'col2', type: 'boolean', data: [true, false, true] },
    ],
  });
  const view = new View(testData);
  const testCases: Private.DataTestCase[] = [
    { region: 'body', row: 0, column: 0, expected: 10 },
    { region: 'body', row: 1, column: 0, expected: 20 },
    { region: 'body', row: 0, column: 1, expected: true },
    { region: 'column-header', row: 0, column: 0, expected: 'col1' },
    { region: 'column-header', row: 0, column: 1, expected: 'col2' },
    { region: 'row-header', row: 0, column: 0, expected: 'A' },
    { region: 'row-header', row: 1, column: 0, expected: 'B' },
  ];
  testCases.forEach((val) => {
    test(`cellregion-${val.region}-${val.row},${val.column}`, () => {
      expect(view.data(val.region, val.row, val.column)).toBe(val.expected);
    });
  });
});

describe('Test .data() nestedColumns', () => {
  const testData = DataGenerator.multiIndexCol(
    {
      data: [
        {
          name: "('year', '')",
          type: 'number',
          data: [2013, 2013, 2014, 2014],
        },
        { name: "('visit', '')", type: 'number', data: [1, 2, 1, 2] },
        {
          name: "('Bob', 'HR')",
          type: 'number',
          data: [41.0, 28.0, 42.0, 37.0],
        },
        {
          name: "('Bob', 'Temp')",
          type: 'number',
          data: [37.1, 35.2, 37.3, 39.2],
        },
        {
          name: "('Guido', 'HR')",
          type: 'number',
          data: [50.0, 35.0, 42.0, 31.0],
        },
        {
          name: "('Guido', 'Temp')",
          type: 'number',
          data: [37.7, 37.1, 37.4, 35.1],
        },
        {
          name: "('Sue', 'HR')",
          type: 'number',
          data: [23.0, 48.0, 44.0, 34.0],
        },
        {
          name: "('Sue', 'Temp')",
          type: 'number',
          data: [37.5, 37.1, 37.5, 39.0],
        },
        { name: "('ipydguuid', '')", type: 'number', data: [0, 1, 2, 3] },
      ],
      length: 4,
      primaryKeyData: ["('year', '')", "('visit', '')", "('ipydguuid', '')"],
    },
    "('ipydguuid', '')",
  );
  const testView = new View(testData);
  const testCases: Private.DataTestCase[] = [
    { region: 'body', row: 0, column: 0, expected: 41.0 },
    { region: 'body', row: 1, column: 3, expected: 37.1 },
    { region: 'body', row: 2, column: 2, expected: 42.0 },
    { region: 'body', row: 3, column: 5, expected: 39.0 },
    { region: 'column-header', row: 0, column: 0, expected: 'Bob' },
    { region: 'column-header', row: 0, column: 1, expected: 'Bob' },
    { region: 'column-header', row: 1, column: 4, expected: 'HR' },
    { region: 'column-header', row: 1, column: 5, expected: 'Temp' },
    { region: 'row-header', row: 0, column: 0, expected: 2013 },
    { region: 'row-header', row: 0, column: 1, expected: 1 },
    { region: 'row-header', row: 1, column: 1, expected: 2 },
    { region: 'row-header', row: 3, column: 0, expected: 2014 },
  ];
  testCases.forEach((val) => {
    test(`cellregion-${val.region}-${val.row},${val.column}`, () => {
      expect(testView.data(val.region, val.row, val.column)).toBe(val.expected);
    });
  });
});

/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A type to describe test cases for .data()
   */
  export type DataTestCase = {
    /**
     * The cell region to be tested.
     */
    region: DataModel.CellRegion;

    /**
     * The row index to be tested.
     */
    row: number;

    /**
     * The column index to be tested.
     */
    column: number;

    /**
     * The values expected to be returned from the test.
     */
    expected: any | any[];
  };

  /**
   * A type to describe test cases for .metadata()
   */
  export type MetadataTestCase = {
    /**
     * The cell region to be tested.
     */
    region: DataModel.CellRegion;

    /**
     * The column index to be tested.
     */
    column: number;

    /**
     * The values expected to be returned from the test.
     */
    expected: any | any[];
  };
}
