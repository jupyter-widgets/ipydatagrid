import { Signal } from '@phosphor/signaling';
import { View } from '../core/view'
import { ViewBasedJSONModel } from '../core/viewbasedjsonmodel'
import { TransformStateManager } from '../core/transformStateManager';
import { Transform } from '../core/transform';
import { DataGenerator } from './testUtils'

describe('Test interactions with View', () => {
  test('.rowCount()', () => {
    const model = Private.createSimpleModel();
    const mock = jest.spyOn(View.prototype, 'rowCount');
    model.rowCount('body');
    expect(mock).toHaveBeenCalledWith('body');
  })
  test('.columnCount()', () => {
    const model = Private.createSimpleModel();
    const mock = jest.spyOn(View.prototype, 'columnCount');
    model.columnCount('body');
    expect(mock).toHaveBeenCalledWith('body');
  })
  test('.metadata()', () => {
    const model = Private.createSimpleModel();
    const mock = jest.spyOn(View.prototype, 'metadata');
    model.metadata('body', 0, 0);
    expect(mock).toHaveBeenCalledWith('body', 0, 0);
  })
  test('.getSchemaIndex()', () => {
    const model = Private.createSimpleModel();
    const mock = jest.spyOn(View.prototype, 'getSchemaIndex');
    model.getSchemaIndex('column-header', 0);
    expect(mock).toHaveBeenCalledWith('column-header', 0);
  })
  test('.data()', () => {
    const model = Private.createSimpleModel();
    const mock = jest.spyOn(View.prototype, 'data');
    model.data('body', 0, 0);
    expect(mock).toHaveBeenCalledWith('body', 0, 0);
  })
})

describe('Test interactions with TransformStateManager', () => {
  test('.addTransform()', () => {
    const model = Private.createSimpleModel();
    let mock = jest.spyOn(TransformStateManager.prototype, 'add');
    const transform: Transform.TransformSpec = {
      type: 'sort', columnIndex: 0, desc: true
    };
    model.addTransform(transform);
    expect(mock).toBeCalledWith(transform)
  })
  test('.removeTransform()', () => {
    const model = Private.createSimpleModel();
    let mock = jest.spyOn(TransformStateManager.prototype, 'remove');
    model.removeTransform(0, 'sort');
    expect(mock).toBeCalledWith(0, 'sort')
  })
  test('.replaceTransform()', () => {
    const model = Private.createSimpleModel();
    let mock = jest.spyOn(TransformStateManager.prototype, 'replace');
    const transforms: Transform.TransformSpec[] = [{
      type: 'sort', columnIndex: 0, desc: true
    }];
    model.replaceTransforms(transforms);
    expect(mock).toBeCalledWith(transforms);
  })
  test('.clearTransform()', () => {
    const model = Private.createSimpleModel();
    let mock = jest.spyOn(TransformStateManager.prototype, 'clear');
    model.clearTransforms()
    expect(mock).toHaveBeenCalledTimes(1)
  })
  test('.transformMetadata()', () => {
    const model = Private.createSimpleModel();
    let mock = jest.spyOn(TransformStateManager.prototype, 'metadata');
    model.transformMetadata(0);
    expect(mock).toBeCalledWith(0)
  })
})

describe('Test signal getters', () => {
  test('.transformStateChanged()', () => {
    const model = Private.createSimpleModel();
    expect(model.transformStateChanged).toBeInstanceOf(Signal)
  })
})

describe('Test mutable dataset', () => {
  test('.setData()', () => {
    const model = Private.createSimpleModel();
    const row = 1, column = 0;
    const initialValue: number = model.data('body', row, column);
    expect(initialValue).toBe(2);
    model.setData('body', row, column, 1.23);
    const newValue: number = model.data('body', row, column);
    expect(newValue).toBe(1.23);
  });

  test('cell data changed signal received', async () => {
    return new Promise((resolve, reject) => {
      const model = Private.createSimpleModel();
      const row = 1, column = 0;
      model.changed.connect((model: ViewBasedJSONModel, args: any) => {
        if (args.type === 'cells-changed') {
          expect(args.row).toBe(row);
          expect(args.column).toBe(column);
          resolve();
        }
      });
      model.setData('body', row, column, 1.23);
    });
  });
});

describe('Test .uniqueValues()', () => {
  const testData = DataGenerator.multiCol({
    length: 5, data: [
      { name: 'string', type: 'string', data: ['A', 'C', 'B', 'A', 'C'] },
      { name: 'boolean', type: 'boolean', data: [true, false, true, false, false] },
    ]
  });
  const testModel = new ViewBasedJSONModel(testData)
  test('cellregion-column-header-0', () => {
    expect(testModel.uniqueValues('column-header', 0)).resolves.toEqual(['A', 'C', 'B'])
  });
  test('cellregion-column-header-1', () => {
    expect(testModel.uniqueValues('column-header', 1)).resolves.toEqual([true, false])
  });
  test('cellregion-corner-header-0', () => {
    expect(testModel.uniqueValues('corner-header', 0)).resolves.toEqual([0, 1, 2, 3, 4])
  });
});

namespace Private {
  export function createSimpleModel(): ViewBasedJSONModel {
    const testData = DataGenerator.singleCol({
      name: 'test',
      type: 'number',
      data: [1, 2, 3, 4]
    });
    const model = new ViewBasedJSONModel(testData);
    return model;
  }
}