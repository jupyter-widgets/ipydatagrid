import {
  TextRenderer, CellRenderer, GraphicsContext
} from '@phosphor/datagrid'

import {
  ViewBasedJSONModel
} from './viewbasedjsonmodel';

import {
  Theme
} from '../utils';

/**
 * A custom cell renderer for headers that provides a menu icon.
 */
export class HeaderRenderer extends TextRenderer {

  /**
  * Draw the text for the cell.
  *
  * @param gc - The graphics context to use for drawing.
  *
  * @param config - The configuration data for the cell.
  */
  drawText(gc: GraphicsContext, config: CellRenderer.CellConfig): void {
    // Resolve the font for the cell.
    let font = CellRenderer.resolveOption(this.font, config);

    // Bail if there is no font to draw.
    if (!font) {
      return;
    }

    // Resolve the text color for the cell.
    let color = CellRenderer.resolveOption(this.textColor, config);

    // Bail if there is no text color to draw.
    if (!color) {
      return;
    }

    // Format the cell value to text.
    let format = this.format;
    let text = format(config);

    // Bail if there is no text to draw.
    if (!text) {
      return;
    }

    // Resolve the vertical and horizontal alignment.
    let vAlign = CellRenderer.resolveOption(this.verticalAlignment, config);
    let hAlign = CellRenderer.resolveOption(this.horizontalAlignment, config);

    // Compute the padded text box height for the specified alignment.
    let boxHeight = config.height - (vAlign === 'center' ? 1 : 2);

    // Bail if the text box has no effective size.
    if (boxHeight <= 0) {
      return;
    }

    // Compute the text height for the gc font.
    let textHeight = TextRenderer.measureFontHeight(font);

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
    gc.fillText(text, textX, textY);

    // Fill the area behind the menu icon
    // Note: This seems to perform better than adding a clip path
    const backgroundSize = HeaderRenderer.buttonSize + HeaderRenderer.buttonPadding;
    gc.fillStyle = CellRenderer.resolveOption(this.backgroundColor, config);
    gc.fillRect(
      (config.x + config.width - backgroundSize),
      (config.y + config.height - backgroundSize),
      backgroundSize, 
      backgroundSize
    )

    const iconStart = config.x
      + config.width
      - HeaderRenderer.iconWidth
      - HeaderRenderer.buttonPadding;

    // Draw menu icon
    gc.beginPath();
    gc.moveTo(
      iconStart,
      config.height - HeaderRenderer.buttonPadding - HeaderRenderer.iconHeight
    );
    gc.lineTo(
      iconStart + (HeaderRenderer.iconWidth / 2),
      config.height - HeaderRenderer.buttonPadding
    );
    gc.lineTo(
      iconStart + HeaderRenderer.iconWidth,
      config.height - HeaderRenderer.buttonPadding - HeaderRenderer.iconHeight
    );
    gc.closePath();

    // Check for transform metadata
    if (this._model) {
      // Get cell metadata
      const schemaIndex = this._model.getSchemaIndex(
        config.region,
        config.column
      );
      if (this._model.transformMetadata(schemaIndex)
        && (this._model.transformMetadata(schemaIndex))!['filter']) {
        gc.fillStyle = Theme.getBrandColor(1);
        gc.fill()
        return;
      }
    }
    gc.fillStyle = color;
    gc.fill();
  }


  /**
   * Sets the data model that should provide metadata for this renderer.
   */
  set model(model: ViewBasedJSONModel | undefined) {
    this._model = model
  }

  /**
   * Indicates the size of the menu icon, to support the current implementation
   * of hit testing.
   */
  static buttonSize: number = 11;
  static iconWidth: number = 12;
  static iconHeight: number = 6;
  static buttonPadding: number = 5;

  private _model: ViewBasedJSONModel | undefined = undefined
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
    model: ViewBasedJSONModel

    textOptions: TextRenderer.IOptions
  }
}