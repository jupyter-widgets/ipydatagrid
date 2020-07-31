import { TextRenderer, CellRenderer, GraphicsContext } from '@lumino/datagrid';

import { Theme } from '../utils';

import { UniqueValueStateManager, InteractiveFilterDialog } from './filterMenu';

/**
 * A custom cell renderer for displaying the unique values of a column.
 */
export class FilterValueRenderer extends TextRenderer {
  constructor(options: FilterValueRenderer.IOptions) {
    super({
      textColor: options.textColor,
      backgroundColor: options.backgroundColor,
    });
    this._stateManager = options.stateManager;
    this._dialog = options.dialog;
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

    // Resolve the vertical and horizontal alignment.
    const vAlign = CellRenderer.resolveOption(this.verticalAlignment, config);
    const hAlign = CellRenderer.resolveOption(this.horizontalAlignment, config);

    // Compute the padded text box height for the specified alignment.
    const boxHeight = config.height - (vAlign === 'center' ? 1 : 2);

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
        textY = config.y + 2 + textHeight;
        break;
      case 'center':
        textY = config.y + config.height / 2 + textHeight / 2;
        break;
      case 'bottom':
        textY = config.y + config.height - 2;
        break;
      default:
        throw 'unreachable';
    }

    // Compute the X position for the text.
    switch (hAlign) {
      case 'left':
        textX = config.x + 2;
        break;
      case 'center':
        textX = config.x + config.width / 2;
        break;
      case 'right':
        textX = config.x + config.width - 3;
        break;
      default:
        throw 'unreachable';
    }

    // Clip the cell if the text is taller than the text box height.
    if (textHeight > boxHeight) {
      gc.beginPath();
      gc.rect(config.x, config.y, config.width, config.height - 1);
      gc.clip();
    }

    // Set the gc state.
    gc.font = font;
    gc.fillStyle = color;
    gc.textAlign = hAlign;
    gc.textBaseline = 'bottom';

    // Draw the text
    gc.fillText(text, textX + 25, textY);
    gc.fillStyle = Theme.getBorderColor(1);

    const BOX_OFFSET = 5;

    gc.fillStyle = '#ffffff';
    gc.fillRect(config.x + BOX_OFFSET, config.y + BOX_OFFSET, 10, 10);

    gc.fillStyle = '#000000';
    gc.strokeRect(config.x + BOX_OFFSET, config.y + BOX_OFFSET, 10, 10);

    // Check state to display checkbox
    if (this._getCheckedState(config)) {
      gc.beginPath();
      gc.strokeStyle = '#000000';
      gc.moveTo(config.x + BOX_OFFSET + 3, config.y + BOX_OFFSET + 5);
      gc.lineTo(config.x + BOX_OFFSET + 4, config.y + BOX_OFFSET + 8);
      gc.lineTo(config.x + BOX_OFFSET + 8, config.y + BOX_OFFSET + 2);
      gc.lineWidth = 2;
      gc.stroke();
    }
  }

  private _getCheckedState(config: CellRenderer.CellConfig): boolean {
    return (
      this._stateManager.has(
        this._dialog.region,
        this._dialog.columnIndex,
        config.value,
      ) ||
      (!this._dialog.hasFilter && !this._dialog.userInteractedWithDialog)
    );
  }

  private _stateManager: UniqueValueStateManager;
  private _dialog: InteractiveFilterDialog;
}

/**
 * The namespace for the `HeaderRenderer` class statics.
 */
export namespace FilterValueRenderer {
  /**
   * An options object for initializing a renderer.
   */
  export interface IOptions {
    /**
     * The `UniqueValueStateManager` to be used by this renderer.
     */
    readonly stateManager: UniqueValueStateManager;

    /**
     * The `InteractiveFilterDialog` this renderer is used by.
     */
    readonly dialog: InteractiveFilterDialog;

    /**
     * The CSS color for drawing the text.
     */
    readonly backgroundColor: string;

    /**
     * The CSS color for drawing the text.
     */
    readonly textColor: string;
  }
}
