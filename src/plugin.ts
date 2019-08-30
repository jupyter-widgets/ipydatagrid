// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IJupyterWidgetRegistry
} from '@jupyter-widgets/base';

import {
  IThemeManager
} from '@jupyterlab/apputils';

import * as widgetExports from './datagrid';

import {
  MODULE_NAME, MODULE_VERSION
} from './version';

const EXTENSION_ID = 'jupyter-datagrid:plugin';

/**
 * The datagrid plugin.
 */
const datagridPlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  optional: [IThemeManager],
  activate: activateWidgetExtension,
  autoStart: true
};

export default datagridPlugin;


/**
 * Activate the widget extension.
 */
function activateWidgetExtension(app: Application<Widget>, registry: IJupyterWidgetRegistry, themeManager: IThemeManager): void {
  // Exporting a patched DataGridView widget which handles dynamic theme changes
  class DataGridView extends widgetExports.DataGridView {
    render() {
      return super.render().then(() => {
        if (themeManager) {
          themeManager.themeChanged.connect(this._on_theme_changed, this);
        }
      });
    }

    private _on_theme_changed() {
      this._update_grid_style();
      this.default_renderer.on_theme_changed();

      for (const key in this.renderers) {
        this.renderers[key].on_theme_changed();
      }
    }

    remove() {
      if (themeManager) {
        themeManager.themeChanged.disconnect(this._on_theme_changed, this);
      }
      return super.remove();
    }
  }

  registry.registerWidget({
    name: MODULE_NAME,
    version: MODULE_VERSION,
    exports: {
      ...widgetExports,
      DataGridView
    },
  });
}
