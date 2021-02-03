import { DataGenerator } from 'tests/js/testUtils';
import { ViewBasedJSONModel } from 'src/core/viewbasedjsonmodel';
import { ArrayUtils } from 'src/utils';

describe('Test multi index array utilities', () => {
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

  // Creating a model
  const testModel = new ViewBasedJSONModel(testData);
  // Generating an array with location of nested level headers
  const mutltiIndexArrayLocations = ArrayUtils.generateMultiIndexArrayLocations(
    testModel,
  );

  test('Test .generateMultiIndexArrayLocations()', async () => {
    expect(mutltiIndexArrayLocations).toEqual([2, 3, 4, 5, 6, 7]);
  });

  // Generating an array with location of nested level headers
  const nestedColumnDataGridIndices = ArrayUtils.generateDataGridMergedCellLocations(
    testModel,
    mutltiIndexArrayLocations,
  );

  test('Test .mergedCellLocations()', async () => {
    expect(nestedColumnDataGridIndices).toEqual([
      [
        [
          [0, 0],
          [0, 1],
        ],
        [
          [0, 2],
          [0, 3],
        ],
        [
          [0, 4],
          [0, 5],
        ],
      ],
      [[[1, 0]], [[1, 1]], [[1, 2]], [[1, 3]], [[1, 4]], [[1, 5]]],
    ]);
  });

  test('Test .validateMergingHierarchy()', async () => {
    expect(
      ArrayUtils.validateMergingHierarchy(nestedColumnDataGridIndices),
    ).toBe(true);
  });
});
