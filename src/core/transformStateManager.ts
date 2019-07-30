import {
  Transform
} from './transform';

import {
  View
} from './view';

import {
  ViewBasedJSONModel
} from './viewbasedjsonmodel';

import {
  SortExecutor, FilterExecutor, TransformExecutor
} from './transformExecutors';

import {
  each
} from '@phosphor/algorithm';

import {
  Signal, ISignal
} from '@phosphor/signaling'

/**
 * A state manager for tracking the active transformations of a model.
 */
export class TransformStateManager {

  protected _add(transform: Transform.TransformSpec): void {
    // Add column to state if not already present
    if (!this._state.hasOwnProperty(transform.columnIndex)) {
      this._state[transform.columnIndex] = {
        sort: undefined,
        filter: undefined
      }
    }

    // Add the transform to the state
    switch (transform.type) {
      case ('sort'):
        this._state[transform.columnIndex]['sort'] = transform;
        break;
      case ('filter'):
        this._state[transform.columnIndex]['filter'] = transform;
        break;
      default:
        throw 'unreachable';
    }
  };

  /**
   * Adds the provided transform to the active state.
   * 
   * @param transform - The transform to be added.
   */
  add(transform: Transform.TransformSpec): void {
    try {
      this._add(transform);
      this._changed.emit({ type: 'transforms-updated' });
    } catch (err) {
      this.clear();
    }
  }

  /**
   * Replaces the existing state with the provided list of transforms.
   * 
   * @param transforms - The list of transforms to be added.
   */
  replace(transforms: Transform.TransformSpec[]): void {
    try {
      this._state = {};
      each(transforms, (transform) => {
        this._add(transform);
      });
      this._changed.emit({ type: 'transforms-updated' });
    } catch (err) {
      this.clear();
    }
  };

  /**
   * Creates a new data model View with the active transformations.
   * 
   * @param data - The dataset to operate on.
   */
  createView(data: Readonly<ViewBasedJSONModel.IData>): View {
    const executors = this._createExecutors(data);
    let transformedData = data;
    each(executors, (transform: TransformExecutor) => {
      transformedData = transform.apply(transformedData);
    });
    return new View(transformedData);
  }

  /**
   * Creates an optimzed list of TransformExecutors for the provided data.
   * 
   * @param data - The dataset to operate on.
   */
  private _createExecutors(data: ViewBasedJSONModel.IData): TransformExecutor[] {
    const sortExecutors: SortExecutor[] = [];
    const filterExecutors: FilterExecutor[] = [];

    Object.keys(this._state).forEach((columnIndex) => {
      let transform: TransformStateManager.IColumn = this._state[columnIndex];

      if (transform.sort) {
        let executor = new SortExecutor({
          field: data.schema.fields[transform.sort.columnIndex]['name'],
          desc: transform.sort.desc,
        });
        sortExecutors.push(executor);
      };
      if (transform.filter) {
        let executor = new FilterExecutor({
          field: data.schema.fields[transform.filter.columnIndex]['name'],
          operator: transform.filter.operator,
          value: transform.filter.value
        });
        filterExecutors.push(executor);
      }
    });

    // Always put filters first
    return [...filterExecutors, ...sortExecutors];
  }

  /**
   * Removes the provided transformation from the active state.
   * 
   * @param columnIndex - The index of the column state to be removed.
   * 
   * @param transformType - The type of the transform to be removed from state.
   */
  remove(columnIndex: number, transformType: string): void {
    // Return immediately if the key is not in the state
    if (!this._state.hasOwnProperty(columnIndex)) {
      return;
    }

    try {
      let columnState = this._state[columnIndex];
      if (transformType === 'sort') {
        columnState.sort = undefined;
      } else if (transformType === 'filter') {
        columnState.filter = undefined;
      } else {
        throw 'unreachable';
      }
      if (!columnState.sort && !columnState.filter) {
        delete this._state[columnIndex];
      }
      this._changed.emit({ type: 'transforms-updated' });
    } catch (err) {
      this.clear();
    }
  }

  /**
   * Returns the transform metadata for the provided column.
   * 
   * @param columnIndex - The column index of the metadata to be retrieved.
   */
  metadata(columnIndex: number): TransformStateManager.IColumn | undefined {
    if (!this._state.hasOwnProperty(columnIndex)) {
      return undefined;
    } else {
      return this._state[columnIndex];
    }
  }

  /**
   * Removes all transformations from the active state.
   */
  clear(): void {
    this._state = {};
    this._changed.emit({ type: 'transforms-updated' });
  }

  /**
   * A signal emitted when the transform state has changed.
   */
  get changed(): ISignal<this, TransformStateManager.IEvent> {
    return this._changed;
  }

  private _state: TransformStateManager.IState = {};
  private _changed = new Signal<this, TransformStateManager.IEvent>(this);
}

/**
 * The namespace for the `TransformStateManager` class statics.
 */
export namespace TransformStateManager {

  /**
   * An object when specifies the schema for a single column of state.
   */
  export interface IColumn {
    filter: Transform.Filter | undefined,
    sort: Transform.Sort | undefined
  }
  export interface IState {
    [key: string]: IColumn
  }
  export interface IEvent {
    readonly type: 'transforms-updated'
  }
}