// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import * as _ from 'underscore';

import {
    Message
} from '@phosphor/messaging';

import {
    Widget
} from '@phosphor/widgets';

import {
  DataGrid, TextRenderer, CellRenderer
} from '@phosphor/datagrid';

import {
  WidgetModel, DOMWidgetModel, DOMWidgetView, ISerializers, resolvePromisesDict, unpack_models
} from '@jupyter-widgets/base';

import {
  Transform, Sort, Filter
} from './core/transform'

import {
  ViewBasedJSONModel
} from './core/viewbasedjsonmodel'

// Import CSS
import '../css/datagrid.css'

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

// Temporary, will be removed when the scales are exported from bqplot
type ColorScale = any;

// Shorthand for a string->T mapping
type Dict<T> = { [keys: string]: T; };

// Function that computes a color depending on a given renderer (color scale, conditional renderer) and a value
function compute_color(renderer: string, config: CellRenderer.ICellConfig): string;
function compute_color(renderer: ConditionalRendererBaseModel, config: CellRenderer.ICellConfig): string;
function compute_color(renderer: ColorScale, config: CellRenderer.ICellConfig): string {
  if (typeof renderer === 'string') {
    return renderer;
  }

  if (renderer instanceof ConditionalRendererBaseModel) {
    return renderer.process(config);
  }

  return renderer.scale(config.value);
};


abstract class ConditionalRendererBaseModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: ConditionalRendererBaseModel.model_module,
      _model_module_version: ConditionalRendererBaseModel.model_module_version
    };
  }

  abstract process(config: CellRenderer.ICellConfig): string;

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
}


export
class ConditionalRendererModel extends ConditionalRendererBaseModel {
  defaults() {
    return {...super.defaults(),
      _model_name: ConditionalRendererModel.model_name,
      cell_field: 'value',
      operator: '<',
      reference_value: null,
      output_if_true: null,
      output_if_false: null
    };
  }

  process(config: CellRenderer.ICellConfig) {
    const cell_field: keyof CellRenderer.ICellConfig = this.get('cell_field');
    const cell_value = config[cell_field];
    const reference_value = this.get('reference_value');

    let condition: boolean;
    switch (this.get('operator')) {
      case '<':
        condition = cell_value < reference_value;
        break;
      case '>':
        condition = cell_value > reference_value;
        break;
      case '=':
        condition = cell_value == reference_value;
        break;
      default:
        condition = false;
        break;
    }

    return condition ? this.get('output_if_true') : this.get('output_if_false');
  }

  static model_name = 'ConditionalRendererModel';
}


abstract class TransformModel extends WidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: TransformModel.model_module,
      _model_module_version: TransformModel.model_module_version,
      field: ''
    };
  }

  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  abstract transform: Transform;
}


export
class FilterModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: FilterModel.model_name,
      operator: '<',
      value: null
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    const operators_map: any = {
      '<': Filter.Operators.LessThan,
      '>': Filter.Operators.GreaterThan,
      '=': Filter.Operators.Equals
    };

    this.transform = new Filter({
      field: this.get('field'),
      operator: operators_map[this.get('operator')],
      value: this.get('value')
    });
  }

  static model_name = 'FilterModel';

  transform: Filter;
}


export
class SortModel extends TransformModel {
  defaults() {
    return {...super.defaults(),
      _model_name: SortModel.model_name,
      desc: true
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.transform = new Sort({
      field: this.get('field'),
      desc: this.get('desc')
    });
  }

  static model_name = 'SortModel';

  transform: Sort;
}


export
class DataGridModel extends DOMWidgetModel {
  defaults() {
    return {...super.defaults(),
      _model_module: DataGridModel.model_module,
      _model_module_version: DataGridModel.model_module_version,
      _view_name: DataGridModel.view_name,
      _view_module: DataGridModel.view_module,
      _view_module_version: DataGridModel.view_module_version,
      baseRowSize: 20,
      baseColumnSize: 64,
      baseRowHeaderSize: 64,
      baseColumnHeaderSize: 20,
      headerVisibility: 'all',
      data: {},
      transforms: [],
      renderers: {},
      default_background_color_renderer: 'white',
      default_text_color_renderer: 'black',
    };
  }

  initialize(attributes: any, options: any) {
    super.initialize(attributes, options);

    this.data_model = new ViewBasedJSONModel(this.get('data'));

    this.on('change:transforms', this.update_transforms.bind(this));
    this.update_transforms();
  }

  update_transforms() {
    const transforms = this.get('transforms').map((x: TransformModel) => x.transform);

    this.data_model.updateView(transforms);
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    transforms: { deserialize: (unpack_models as any) },
    renderers: { deserialize: (unpack_models as any) },
    default_background_color_renderer: { deserialize: (unpack_models as any) },
    default_text_color_renderer: { deserialize: (unpack_models as any) },
  }

  static model_name = 'DataGridModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  static view_name = 'DataGridView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;

  data_model: ViewBasedJSONModel;
}


export
class DataGridView extends DOMWidgetView {
  render() {
    return this._initializeScaleViews().then(() => {
      this.grid = new DataGrid({
        baseRowSize: this.model.get('base_row_size'),
        baseColumnSize: this.model.get('base_column_size'),
        baseRowHeaderSize: this.model.get('base_row_header_size'),
        baseColumnHeaderSize: this.model.get('base_column_header_size'),
        headerVisibility: this.model.get('header_visibility')
      });

      this.grid.model = this.model.data_model;

      const body_renderer = new TextRenderer({
        backgroundColor: this._computeBackgroundColor.bind(this),
        textColor: this._computeTextColor.bind(this)
      });

      this.grid.cellRenderers.set('body', {}, body_renderer);
    });
  }

  _initializeScaleViews() {
    const renderers = this.model.get('renderers');
    let rendererPromises: Dict<Dict<Promise<any>>> = {};
    this.renderers = {};

    // Create renderers
    _.each(renderers, (attrs: Dict<any>, header: string) => {
      rendererPromises[header] = {};
      _.each(attrs, (renderer: string | ConditionalRendererBaseModel | ColorScale, attr: string) => {
        if (typeof renderer === 'string') {
          rendererPromises[header][attr] = Promise.resolve(renderer);

          return;
        }

        // Listen to change on the renderer model and trigger rerender
        this.listenTo(renderer, 'change', this._repaint.bind(this));

        if (renderer instanceof ConditionalRendererBaseModel) {
          rendererPromises[header][attr] = Promise.resolve(renderer);

          return;
        }

        // If it is a scale, create a view
        rendererPromises[header][attr] = this.create_child_view(renderer);
      });
    });

    // Resolve all promises
    let promises: Promise<any>[] = [];
    _.each(rendererPromises, (attrs, header) => {
      promises.push(resolvePromisesDict(attrs).then((renderers) => {
        this.renderers[header] = renderers;
      }));
    });

    // Create views for default renderers if needed
    const default_background_color_renderer = this.model.get('default_background_color_renderer');
    if (typeof default_background_color_renderer === 'string') {
      this.default_background_color_renderer = default_background_color_renderer;
    } else {
      // Listen to change on the scale model and trigger rerender
      this.listenTo(default_background_color_renderer, 'change', this._repaint.bind(this));

      if (default_background_color_renderer instanceof ConditionalRendererBaseModel) {
        this.default_background_color_renderer = default_background_color_renderer;
      } else {
        promises.push(this.create_child_view(default_background_color_renderer).then((scaleView) => {
          this.default_background_color_renderer = scaleView;
        }));
      }
    }

    const default_text_color_renderer = this.model.get('default_text_color_renderer');
    if (typeof default_text_color_renderer === 'string') {
      this.default_text_color_renderer = default_text_color_renderer;
    } else {
      // Listen to change on the scale model and trigger rerender
      this.listenTo(default_text_color_renderer, 'change', this._repaint.bind(this));

      if (default_text_color_renderer instanceof ConditionalRendererBaseModel) {
        this.default_text_color_renderer = default_text_color_renderer;
      } else {
        promises.push(this.create_child_view(default_text_color_renderer).then((scaleView) => {
          this.default_text_color_renderer = scaleView;
        }));
      }
    }

    return Promise.all(promises);
  }

  _computeBackgroundColor(config: CellRenderer.ICellConfig) {
    const renderers = this.model.get('renderers');

    const has_renderer = renderers[config.metadata.name] && renderers[config.metadata.name]['background_color'];
    const background_color_renderer = has_renderer ? this.renderers[config.metadata.name]['background_color'] : this.default_background_color_renderer;

    return compute_color(background_color_renderer, config);
  }

  _computeTextColor(config: CellRenderer.ICellConfig) {
    const renderers = this.model.get('renderers');

    const has_renderer = renderers[config.metadata.name] && renderers[config.metadata.name]['text_color'];
    const text_color_renderer = has_renderer ? this.renderers[config.metadata.name]['text_color'] : this.default_text_color_renderer;

    return compute_color(text_color_renderer, config);
  }

  _repaint() {
    this.grid.repaint();
  }

  processPhosphorMessage(msg: Message) {
    super.processPhosphorMessage(msg);
    switch (msg.type) {
    case 'after-attach':
      Widget.attach(this.grid, this.el);
      break;
    }
  }

  default_background_color_renderer: string | ConditionalRendererBaseModel | ColorScale;
  default_text_color_renderer: string | ConditionalRendererBaseModel | ColorScale;
  renderers: Dict<Dict<any>>;
  model: DataGridModel;
  grid: DataGrid;
}
