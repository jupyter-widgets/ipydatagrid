// Copyright (c) Bloomberg
// Distributed under the terms of the Modified BSD License.

import { Application, IPlugin } from '@lumino/application';

import { Widget } from '@lumino/widgets';

import { IJupyterWidgetRegistry, WidgetView } from '@jupyter-widgets/base';

import { IThemeManager } from '@jupyterlab/apputils';

import * as widgetExports from './datagrid';

import { MODULE_NAME, MODULE_VERSION } from './version';

const EXTENSION_ID = 'ipydatagrid:plugin';

/**
 * The datagrid plugin.
 */
const datagridPlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optional: [IThemeManager as any],
  activate: activateWidgetExtension,
  autoStart: true,
};

export default datagridPlugin;

/**
 * Activate the widget extension.
 */
function activateWidgetExtension(
  app: Application<Widget>,
  registry: IJupyterWidgetRegistry,
  themeManager: IThemeManager,
): void {
  // Exporting a patched DataGridView widget which handles dynamic theme changes
  class DataGridView extends widgetExports.DataGridView {
    initialize(parameters: WidgetView.InitializeParameters) {
      if (themeManager.theme != null) {
        this.isLightTheme = themeManager.isLight(themeManager.theme);
      }
      super.initialize(parameters);
    }

    render() {
      return super.render().then(() => {
        if (themeManager) {
          themeManager.themeChanged.connect(this.onThemeChanged, this);
        }
      });
    }

    private onThemeChanged() {
      if (themeManager.theme != null) {
        this.isLightTheme = themeManager.isLight(themeManager.theme);
      }
      this.updateGridStyle();
      this.default_renderer.onThemeChanged();

      for (const key in this.renderers) {
        this.renderers[key].onThemeChanged();
      }
    }

    remove() {
      if (themeManager) {
        themeManager.themeChanged.disconnect(this.onThemeChanged, this);
      }
      return super.remove();
    }
  }

  registry.registerWidget({
    name: MODULE_NAME,
    version: MODULE_VERSION,
    exports: {
      ...widgetExports,
      DataGridView,
    },
  });
}
