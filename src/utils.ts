const d3Color: any = require('d3-color');

// Scalar type
export
type Scalar = null | boolean | number | string;

export
namespace Scalar {
  export
  function isScalar(x: any): x is Scalar {
      return x === null || typeof x === "boolean" || typeof x === "number" || typeof x === "string";
  }
}

export
namespace Theme {
  function applyOpacity(color: string, opacity: number) {
    const c = d3Color.rgb(color);
    c.opacity = opacity;

    return c.formatRgb();
  }

  function getDefaultCSSVariable(name: string) {
    const defaults: { [keys: string]: string; } = {
      '--jp-layout-color0': 'white',
      '--jp-layout-color1': 'white',
      '--jp-layout-color2': '#eeeeee',
      '--jp-layout-color3': '#bdbdbd',
      '--jp-layout-color4': '#757575',

      '--jp-ui-font-color0': 'rgba(0, 0, 0, 1)',
      '--jp-ui-font-color1': 'rgba(0, 0, 0, 0.87)',
      '--jp-ui-font-color2': 'rgba(0, 0, 0, 0.54)',
      '--jp-ui-font-color3': 'rgba(0, 0, 0, 0.38)',

      '--jp-border-color0': '#bdbdbd',
      '--jp-border-color1': '#bdbdbd',
      '--jp-border-color2': '#e0e0e0',
      '--jp-border-color3': '#eeeeee',

      '--jp-brand-color0': '#1976d2',
      '--jp-brand-color1': '#2196f3',
      '--jp-brand-color2': '#64b5f6',
      '--jp-brand-color3': '#bbdefb',
      '--jp-brand-color4': '#e3f2fd',
    };

    return defaults[name] ? defaults[name] : '';
  }

  export
  function getCSSVariable(name: string) {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name);

    return value ? value : getDefaultCSSVariable(name);
  }

  export
  function getCSSColor(name: string, opacity: number = 1.) {
    let color = getCSSVariable(name);
    color = applyOpacity(color, opacity);
    return color;
  }

  export
  function getBackgroundColor(index: number = 0, opacity: number = 1.) {
    return getCSSColor('--jp-layout-color' + index, opacity);
  }

  export
  function getFontColor(index: number = 0, opacity: number = 1.) {
    return getCSSColor('--jp-ui-font-color' + index, opacity);
  }

  export
  function getBorderColor(index: number = 0, opacity: number = 1.) {
    return getCSSColor('--jp-border-color' + index, opacity);
  }

  export
  function getBrandColor(index: number = 0, opacity: number = 1.) {
    return getCSSColor('--jp-brand-color' + index, opacity);
  }
}
