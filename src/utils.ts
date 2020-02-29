const d3Color: any = require('d3-color');

export namespace ArrayUtils {
    
  /**
   * Returns the locations of multi-index column arrays.
   * @param model the datamodel instance.
   */
  export 
  function generateMultiIndexArrayLocations(model: any): number[] {
    const primaryKey = model._dataset.schema.primaryKey;
    const dataFields = model._dataset.schema.fields;
    let multiIndexLocationArr: number[] = [];
    for (let i = 0; i < dataFields.length; i++) {
      if(!primaryKey.includes(dataFields[i].name)) {
        multiIndexLocationArr.push(i);
      }
    }
    return multiIndexLocationArr;
  }

  /**
   * Returns an array of [mergedCellSiblingGroup]. Each element represents a row of columns.
   * The 0th row will be the top level group, and the n-th will be the last.
   * @param model the data model.
   * @param multiIndexArrayLocations index-based locations of all mutli-index coulmns.
   */
  export
  function generateDataGridMergedCellLocations(model: any, multiIndexArrayLocations: number[]): any[] {
    // Terminating if no locations are passed.
    if (multiIndexArrayLocations.length === 0) {
      return [];
    }
    
    const dataFields = model._dataset.schema.fields;
    // The data grid doesn't count corner-headers when indexing column-headers, so if a given 
    // datagrid has 5 columns, 2 of which are corner-headers, the index of the first column 
    // header will not be 2, but 0. columnStartIndexOffset calculaates that offset so we 
    // can correctly identify indices corresponding to column-headers. 
    const columnStartIndexOffset = model._dataset.schema.primaryKey.length
    let retArr: any[] = [];
    let curRow: any[] = [];
    const firstIndex = multiIndexArrayLocations[0];

    let prevVal: string | number | undefined = undefined;
    for (let i = 0; i < dataFields[firstIndex].rows.length; i++) {
      let curMergedRange: number[][] = [];
      for (let j of multiIndexArrayLocations) {
        let curVal = dataFields[j].rows[i];
        if (curMergedRange.length == 0 
            || prevVal == curVal) {
          curMergedRange.push([i, j - columnStartIndexOffset]);
        }
        else {
          curRow.push(curMergedRange);
          curMergedRange = [[i, j - columnStartIndexOffset]];
        }
        prevVal = curVal;
      }
      curRow.push(curMergedRange);
      retArr.push(curRow);
      curRow = [];
    }
    return retArr;
  }
  /**
   * Checks whether the merged cell ranges conform to a valid hierarchy.
   * @param retVal boolean
   */
  export
  function validateMergingHierarchy(retVal: number[][]): boolean {
    let prevLevelLength;
    for (let mergeRange of retVal) { 
      // First element - setting up the value of prevLevelLength
      if (prevLevelLength === undefined) {
        prevLevelLength = mergeRange.length
        continue
      }
      // If the current merged range list has a length that is less than
      // the previous range, it means the current level is a larger merged
      // range, which violates the hierarchy. The function terminates here 
      // and returns false. 
      if (mergeRange.length < prevLevelLength) {
        return false;
      }
      prevLevelLength = mergeRange.length
    }
    return true;
  }
}

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
      '--jp-brand-color5': '#00e6ff',
      '--jp-brand-color6': '#ffe100',
      '--jp-brand-color7': '#009eb0',
      '--jp-brand-color8': '#b09b00'
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
