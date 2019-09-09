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
  export
  function getCSSVariable(name: string) {
    return window.getComputedStyle(document.documentElement).getPropertyValue(name);
  }

  export
  function getBackgroundColor(index: number = 0) {
    return getCSSVariable('--jp-layout-color' + index);
  }

  export
  function getFontColor(index: number = 0) {
    return getCSSVariable('--jp-ui-font-color' + index);
  }

  export
  function getBorderColor(index: number = 0) {
    return getCSSVariable('--jp-border-color' + index);
  }

  export
  function getBrandColor(index: number = 0) {
    return getCSSVariable('--jp-brand-color' + index);
  }
}
