import { TextRenderer, CellRenderer, GraphicsContext } from '@lumino/datagrid';

import { ViewBasedJSONModel } from './viewbasedjsonmodel';

import { Theme } from '../utils';

import { TransformStateManager } from './transformStateManager';

import { DataGrid } from './datagrid';

/**
 * A custom cell renderer for headers that provides a menu icon.
 */
export class HeaderRenderer extends TextRenderer {
  constructor(options: HeaderRenderer.IOptions) {
    super(options.textOptions);
    this._isLightTheme = options.isLightTheme;
    this._grid = options.grid;
  }

  /**
   * Model getter.
   */
  get model(): ViewBasedJSONModel {
    return this._grid.dataModel as ViewBasedJSONModel;
  }

  /**
   * Draw the background for the cell.
   *
   * @param gc - The graphics context to use for drawing.
   *
   * @param config - The configuration data for the cell.
   */
  drawBackground(gc: GraphicsContext, config: CellRenderer.CellConfig): void {
    const merges =
      config.region === 'column-header'
        ? this.model.getMergedSiblingCells([config.row, config.column])
        : [];

    // Resolve the background color for the cell.
    const color = CellRenderer.resolveOption(this.backgroundColor, config);

    // Bail if there is no background color to draw.
    if (!color) {
      return;
    }

    if (merges.length > 1) {
      let xStart = Number.MAX_SAFE_INTEGER;
      let yStart = Number.MAX_SAFE_INTEGER;
      let xEnd = Number.MIN_SAFE_INTEGER;
      let yEnd = Number.MIN_SAFE_INTEGER;

      const grid = this._grid!;
      for (const merge of merges) {
        const [row, column] = merge;

        const headerOffset =
          config.region === 'corner-header'
            ? 0
            : this._grid!.headerWidth - this._grid.scrollX;
        const x1 = grid.columnOffset('body', column) + headerOffset;
        const y1 = grid.rowOffset('column-header', row);
        const x2 = x1 + grid.columnSize('body', column);
        const y2 = y1 + grid.rowSize('column-header', row);
        xStart = Math.min(xStart, x1);
        yStart = Math.min(yStart, y1);
        xEnd = Math.max(xEnd, x2);
        yEnd = Math.max(yEnd, y2);
      }

      const width = xEnd - xStart;
      const height = yEnd - yStart;

      // Fill the cell with the background color.
      gc.fillStyle = color;

      gc.fillRect(xStart, yStart, width, height);
    } else {
      // Fill the cell with the background color.
      gc.fillStyle = color;
      gc.fillRect(config.x, config.y, config.width, config.height);
    }
  }

  /**
   * Draw the text for the cell.
   *
   * @param gc - The graphics context to use for drawing.
   *
   * @param config - The configuration data for the cell.
   */
  drawText(gc: GraphicsContext, config: CellRenderer.CellConfig): void {
    // Resolve the font for the cell.
    const font = CellRenderer.resolveOption(this.font, config);

    // Bail if there is no font to draw.
    if (!font) {
      return;
    }

    // Resolve the text color for the cell.
    const color = CellRenderer.resolveOption(this.textColor, config);

    // Bail if there is no text color to draw.
    if (!color) {
      return;
    }

    // Format the cell value to text.
    const format = this.format;
    const text = format(config);

    // Bail if there is no text to draw.
    if (!text) {
      return;
    }

    const merges =
      config.region === 'column-header'
        ? this.model.getMergedSiblingCells([config.row, config.column])
        : [];

    let width = config.width;
    let height = config.height;
    let x = config.x;
    let y = config.y;

    if (merges.length > 1) {
      let xStart = Number.MAX_SAFE_INTEGER;
      let yStart = Number.MAX_SAFE_INTEGER;
      let xEnd = Number.MIN_SAFE_INTEGER;
      let yEnd = Number.MIN_SAFE_INTEGER;

      for (const merge of merges) {
        const [row, column] = merge;
        const grid = this._grid!;

        const offsetX =
          config.region === 'corner-header'
            ? 0
            : this._grid!.headerWidth - this._grid.scrollX;
        const x1 = grid.columnOffset('body', column) + offsetX;
        const y1 = grid.rowOffset('column-header', row);
        const x2 = x1 + grid.columnSize('body', column);
        const y2 = y1 + grid.rowSize('column-header', row);
        xStart = Math.min(xStart, x1);
        yStart = Math.min(yStart, y1);
        xEnd = Math.max(xEnd, x2);
        yEnd = Math.max(yEnd, y2);

        width = xEnd - xStart;
        height = yEnd - yStart;
        x = xStart;
        y = yStart;
      }
    }

    // Resolve the vertical and horizontal alignment.
    const vAlign = CellRenderer.resolveOption(this.verticalAlignment, config);
    const hAlign = CellRenderer.resolveOption(this.horizontalAlignment, config);

    // Compute the padded text box height for the specified alignment.
    const boxHeight = height - (vAlign === 'center' ? 1 : 2);

    // Bail if the text box has no effective size.
    if (boxHeight <= 0) {
      return;
    }

    // Compute the text height for the gc font.
    const textHeight = TextRenderer.measureFontHeight(font);

    // Set up the text position variables.
    let textX: number;
    let textY: number;

    // Compute the Y position for the text.
    switch (vAlign) {
      case 'top':
        textY = y + 2 + textHeight;
        break;
      case 'center':
        textY = y + height / 2 + textHeight / 2;
        break;
      case 'bottom':
        textY = y + height - 2;
        break;
      default:
        throw 'unreachable';
    }

    // Compute the X position for the text.
    switch (hAlign) {
      case 'left':
        textX = x + 2;
        break;
      case 'center':
        textX = x + width / 2;
        break;
      case 'right':
        textX = x + width - 3;
        break;
      default:
        throw 'unreachable';
    }

    // Clip the cell if the text is taller than the text box height.
    if (textHeight > boxHeight) {
      gc.beginPath();
      gc.rect(x, y, width, height - 1);
      gc.clip();
    }

    // Set the gc state.
    gc.font = font;
    gc.fillStyle = color;
    gc.textAlign = hAlign;
    gc.textBaseline = 'bottom';

    // Draw the text
    gc.fillText(text, textX, textY);

    // Check if not bottom row of 'column-header' CellRegion
    if (
      config.region === 'column-header' &&
      config.row !== this._grid.dataModel!.rowCount('column-header') - 1
    ) {
      return;
    }

    // Fill the area behind the menu icon
    // Note: This seems to perform better than adding a clip path
    const backgroundSize =
      HeaderRenderer.iconWidth +
      HeaderRenderer.iconWidth +
      HeaderRenderer.iconSpacing +
      2 * HeaderRenderer.buttonPadding;

    gc.fillStyle = CellRenderer.resolveOption(this.backgroundColor, config);
    gc.fillRect(
      config.x + config.width - backgroundSize,
      config.y + config.height - backgroundSize,
      backgroundSize,
      backgroundSize,
    );

    const iconStart =
      config.x +
      config.width -
      HeaderRenderer.iconWidth -
      HeaderRenderer.buttonPadding;

    // Draw filter icon
    this.drawFilterIcon(gc, config);
    // Sets filter icon to gray fill
    gc.fillStyle = Theme.getBorderColor(1);
    gc.fill();

    // Check for transform metadata
    if (this.model) {
      // Get cell metadata
      const schemaIndex = this.model.getSchemaIndex(
        config.region,
        config.column,
      );

      const colMetaData:
        | TransformStateManager.IColumn
        | undefined = this.model.transformMetadata(schemaIndex);

      // Fill filter icon if filter applied
      if (colMetaData && colMetaData['filter']) {
        gc.fillStyle = Theme.getBrandColor(this._isLightTheme ? 8 : 6);
        gc.fill();
      }

      // Fill sort icon if sort applied
      if (colMetaData && colMetaData['sort']) {
        // Display ascending or descending icon depending on order
        if (colMetaData['sort'].desc) {
          this.drawSortArrow(gc, config, iconStart, false);
        } else {
          this.drawSortArrow(gc, config, iconStart, true);
        }
        gc.fillStyle = Theme.getBrandColor(this._isLightTheme ? 7 : 5);
        gc.fill();
      }
    }
  }

  /**
   * Draw the filter icon for the cell
   *
   * @param gc - The graphics context to use for drawing.
   *
   * @param config - The configuration data for the cell.
   */
  drawFilterIcon(gc: GraphicsContext, config: CellRenderer.CellConfig): void {
    const filterIconStart =
      config.x +
      config.width -
      HeaderRenderer.iconWidth -
      HeaderRenderer.buttonPadding;

    const filterRightStemWidthX: number = HeaderRenderer.iconWidth / 2 + 1;
    const filterLeftStemWidthX: number = HeaderRenderer.iconWidth / 2 - 1;
    const filterTop: number =
      config.height - HeaderRenderer.iconHeight - 1 + config.y;

    gc.beginPath();
    // Start drawing in top left of filter icon
    gc.moveTo(filterIconStart, filterTop);

    gc.lineTo(filterIconStart + HeaderRenderer.iconWidth, filterTop);
    // Y is the y value of the top of the stem
    gc.lineTo(
      filterIconStart + filterRightStemWidthX,
      config.y + config.height - HeaderRenderer.iconHeight + 2,
    );
    // Y is the y value of the bottom of the stem
    gc.lineTo(
      filterIconStart + filterRightStemWidthX,
      config.y + config.height - 1.5 * HeaderRenderer.buttonPadding,
    );
    gc.lineTo(
      filterIconStart + filterLeftStemWidthX,
      config.y + config.height - 2 * HeaderRenderer.buttonPadding,
    );
    gc.lineTo(
      filterIconStart + filterLeftStemWidthX,
      config.y + config.height - HeaderRenderer.iconHeight + 2,
    );
    gc.closePath();
  }

  /**
   * Draw the ascending and descending sort icons for the cell
   *
   * @param gc - The graphics context to use for drawing.
   *
   * @param config - The configuration data for the cell.
   *
   * @param filterIconStart - The bottom right corner of drawing area.
   *
   * @param asc - Indicates whether to draw ascending or descending icon.
   */
  drawSortArrow(
    gc: GraphicsContext,
    config: CellRenderer.CellConfig,
    filterIconStart: number,
    asc: boolean,
  ): void {
    const arrowWidth = HeaderRenderer.iconWidth - 2;
    const sortIconStart = filterIconStart - HeaderRenderer.iconSpacing;
    const ascArrowRightStemWidth: number = sortIconStart - arrowWidth / 2 + 0.5;
    const descArrowRightStemWidth: number =
      sortIconStart - arrowWidth / 2 - 0.5;
    const arrowHeadSideY: number =
      config.height +
      config.y -
      HeaderRenderer.buttonPadding -
      HeaderRenderer.iconHeight +
      4;
    const arrowMiddle: number = sortIconStart - arrowWidth / 2;
    const ascArrowTipY: number =
      config.height + config.y - HeaderRenderer.iconHeight - 1;
    const ascArrowBottomY: number =
      config.height - 8 + config.y + HeaderRenderer.buttonPadding;

    gc.beginPath();

    if (asc) {
      // Draw starting in middle of arrow
      // Y is the tip of the ascending arrow
      gc.moveTo(arrowMiddle, ascArrowTipY);
      gc.lineTo(sortIconStart, arrowHeadSideY);
      gc.lineTo(sortIconStart, arrowHeadSideY + 1);

      // Draw to middle of arrow
      gc.lineTo(ascArrowRightStemWidth, arrowHeadSideY + 1);

      // Y is the bottom of the arrow stem
      gc.lineTo(arrowMiddle + 0.5, ascArrowBottomY);
      gc.lineTo(arrowMiddle - 0.5, ascArrowBottomY);
      gc.lineTo(arrowMiddle - 0.5, arrowHeadSideY + 1);
      gc.lineTo(sortIconStart - arrowWidth, arrowHeadSideY + 1);
      gc.lineTo(sortIconStart - arrowWidth, arrowHeadSideY);
    } else {
      // Draw starting in middle of arrow
      // Y is the tip of the descending arrow
      gc.moveTo(arrowMiddle, ascArrowBottomY);
      gc.lineTo(sortIconStart - arrowWidth, arrowHeadSideY + 4.5);
      gc.lineTo(sortIconStart - arrowWidth, arrowHeadSideY + 3.5);

      // Draw to middle of arrow
      gc.lineTo(descArrowRightStemWidth, arrowHeadSideY + 3.5);

      // Y is the bottom of the arrow stem
      gc.lineTo(descArrowRightStemWidth, ascArrowTipY);
      gc.lineTo(arrowMiddle + 0.5, ascArrowTipY);

      // Draw left side of descending arrow
      gc.lineTo(arrowMiddle + 0.5, arrowHeadSideY + 3.5);
      gc.lineTo(sortIconStart, arrowHeadSideY + 3.5);
      gc.lineTo(sortIconStart, arrowHeadSideY + 4.5);
    }
    gc.closePath();
  }

  /**
   * Indicates the size of the menu icon, to support the current implementation
   * of hit testing.
   */
  static buttonSize = 11;
  static iconHeight = 12;
  static iconWidth = 7;
  static buttonPadding = 3;
  static iconSpacing = 1.5;

  private _isLightTheme: boolean;
  private _grid: DataGrid;
}

/**
 * The namespace for the `HeaderRenderer` class statics.
 */
export namespace HeaderRenderer {
  /**
   * An options object for initializing a renderer.
   */
  export interface IOptions {
    /**
     * The data model this renderer should get metadata from.
     */
    textOptions: TextRenderer.IOptions;
    isLightTheme: boolean;
    grid: DataGrid;
  }
}
