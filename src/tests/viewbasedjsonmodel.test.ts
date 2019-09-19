import { Signal } from '@phosphor/signaling';
import { View } from '../core/view'
import { ViewBasedJSONModel } from '../core/viewbasedjsonmodel'
import { TransformStateManager } from '../core/transformStateManager';
import { Transform } from '../core/transform';
import { DataGenerator } from './testUtils'
jest.mock('../core/view');

const ViewMock = <jest.Mock<View>>View;

beforeEach(() => {
  ViewMock.mockClear();
});

describe('Test interactions with View', () => {
  test('Instantiates a View', () => {
    // Show that mockClear() is working:
    expect(View).not.toHaveBeenCalled();
    // @ts-ignore
    const model = Private.createSimpleModel();
    expect(View).toBeCalledTimes(1)
  })
  test('.rowCount()', () => {
    const model = Private.createSimpleModel();
    model.rowCount('body');
    expect(ViewMock.mock.instances[0].rowCount).toHaveBeenCalledWith('body');
  })
  test('.columnCount()', () => {
    const model = Private.createSimpleModel();
    model.columnCount('body');
    expect(ViewMock.mock.instances[0].columnCount).toHaveBeenCalledWith('body');
  })
  test('.metadata()', () => {
    const model = Private.createSimpleModel();
    model.metadata('body', 0);
    expect(ViewMock.mock.instances[0].metadata).toHaveBeenCalledWith('body', 0);
  })
  test('.uniqueValues()', () => {
    const model = Private.createSimpleModel();
    model.uniqueValues('column-header', 0);
    expect(
      ViewMock.mock.instances[0].uniqueValues
    ).toHaveBeenCalledWith('column-header', 0);
  })
  test('.getSchemaIndex()', () => {
    const model = Private.createSimpleModel();
    model.getSchemaIndex('column-header', 0);

    expect(
      ViewMock.mock.instances[0].getSchemaIndex
    ).toHaveBeenCalledWith('column-header', 0);
  })
  test('.data()', () => {
    const model = Private.createSimpleModel();
    model.data('body', 0, 0);
    expect(ViewMock.mock.instances[0].data).toHaveBeenCalledWith('body', 0, 0);
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