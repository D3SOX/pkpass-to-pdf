/**
 * PDF generation from parsed PKPASS data
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import type { ParsedPass, PassField, PassBarcode } from "./types.ts";

// Page dimensions (standard letter-ish, portrait)
const PAGE_WIDTH = 400;
const PAGE_HEIGHT = 700;
const MARGIN = 30;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Colors
const DEFAULT_BG_COLOR = rgb(0.95, 0.95, 0.95);
const DEFAULT_FG_COLOR = rgb(0.1, 0.1, 0.1);
const DEFAULT_LABEL_COLOR = rgb(0.4, 0.4, 0.4);

/**
 * Parse a CSS color string (rgb or hex) to pdf-lib RGB
 */
function parseColor(colorStr: string | undefined, fallback: ReturnType<typeof rgb>): ReturnType<typeof rgb> {
  if (!colorStr) return fallback;

  // Handle rgb(r, g, b) format
  const rgbMatch = colorStr.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10) / 255;
    const g = parseInt(rgbMatch[2]!, 10) / 255;
    const b = parseInt(rgbMatch[3]!, 10) / 255;
    return rgb(r, g, b);
  }

  // Handle #RRGGBB or #RGB format
  const hexMatch = colorStr.match(/^#?([0-9a-f]{3,6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1]!;
    if (hex.length === 3) {
      hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }

  return fallback;
}

/**
 * Generate a QR code PNG buffer from barcode data
 */
async function generateQRCode(barcode: PassBarcode): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(barcode.message, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Convert data URL to buffer
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * Format a field value for display
 */
function formatFieldValue(field: PassField): string {
  const value = field.value;
  
  if (typeof value === "number") {
    if (field.currencyCode) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: field.currencyCode,
      }).format(value);
    }
    return value.toString();
  }

  // Try to format as date if dateStyle is specified
  if (field.dateStyle && typeof value === "string") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const options: Intl.DateTimeFormatOptions = {};
        if (field.dateStyle === "PKDateStyleShort") options.dateStyle = "short";
        else if (field.dateStyle === "PKDateStyleMedium") options.dateStyle = "medium";
        else if (field.dateStyle === "PKDateStyleLong") options.dateStyle = "long";
        else if (field.dateStyle === "PKDateStyleFull") options.dateStyle = "full";
        
        if (field.timeStyle === "PKDateStyleShort") options.timeStyle = "short";
        else if (field.timeStyle === "PKDateStyleMedium") options.timeStyle = "medium";
        else if (field.timeStyle === "PKDateStyleLong") options.timeStyle = "long";
        else if (field.timeStyle === "PKDateStyleFull") options.timeStyle = "full";
        
        return new Intl.DateTimeFormat("en-US", options).format(date);
      }
    } catch {
      // Fall through to return raw value
    }
  }

  return String(value);
}

/**
 * Draw a section of fields on the page
 */
function drawFieldSection(
  page: PDFPage,
  fields: PassField[],
  yPosition: number,
  font: PDFFont,
  boldFont: PDFFont,
  fgColor: ReturnType<typeof rgb>,
  labelColor: ReturnType<typeof rgb>,
  options: { columns?: number; labelSize?: number; valueSize?: number } = {}
): number {
  if (fields.length === 0) return yPosition;

  const { columns = 2, labelSize = 8, valueSize = 11 } = options;
  const columnWidth = CONTENT_WIDTH / columns;
  let y = yPosition;

  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    const col = i % columns;
    const x = MARGIN + col * columnWidth;

    // Draw label
    if (field.label) {
      page.drawText(field.label.toUpperCase(), {
        x,
        y,
        size: labelSize,
        font,
        color: labelColor,
      });
    }

    // Draw value (with proper spacing below label)
    const valueText = formatFieldValue(field);
    const labelValueGap = field.label ? labelSize + 6 : 0;
    page.drawText(valueText, {
      x,
      y: y - labelValueGap,
      size: valueSize,
      font: boldFont,
      color: fgColor,
      maxWidth: columnWidth - 10,
    });

    // Move to next row after filling all columns
    if (col === columns - 1 || i === fields.length - 1) {
      y -= labelValueGap + valueSize + 12;
    }
  }

  return y;
}

/**
 * Draw a horizontal separator line
 */
function drawSeparator(page: PDFPage, y: number, color: ReturnType<typeof rgb>): void {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color,
  });
}

/**
 * Generate a PDF from parsed pass data
 */
export async function generatePdf(pass: ParsedPass, outputPath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Parse colors
  const bgColor = parseColor(pass.backgroundColor, DEFAULT_BG_COLOR);
  const fgColor = parseColor(pass.foregroundColor, DEFAULT_FG_COLOR);
  const labelColor = parseColor(pass.labelColor, DEFAULT_LABEL_COLOR);

  // Draw background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: bgColor,
  });

  let y = PAGE_HEIGHT - MARGIN;

  // === HEADER SECTION ===
  
  // Try to embed logo if available
  let logoImage: PDFImage | null = null;
  if (pass.images.logo) {
    try {
      logoImage = await pdfDoc.embedPng(pass.images.logo);
    } catch {
      // Logo might not be a valid PNG, skip it
    }
  }

  if (logoImage) {
    const logoHeight = 30;
    const logoScale = logoHeight / logoImage.height;
    const logoWidth = logoImage.width * logoScale;
    
    page.drawImage(logoImage, {
      x: MARGIN,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });

    // Draw logo text next to logo if present
    if (pass.logoText) {
      page.drawText(pass.logoText, {
        x: MARGIN + logoWidth + 10,
        y: y - 20,
        size: 14,
        font: boldFont,
        color: fgColor,
      });
    }
  } else if (pass.logoText) {
    // Just logo text, no image
    page.drawText(pass.logoText, {
      x: MARGIN,
      y: y - 20,
      size: 14,
      font: boldFont,
      color: fgColor,
    });
  } else {
    // Use organization name as fallback header
    page.drawText(pass.organizationName, {
      x: MARGIN,
      y: y - 20,
      size: 14,
      font: boldFont,
      color: fgColor,
    });
  }

  // Try to embed thumbnail on top right if available
  if (pass.images.thumbnail) {
    try {
      const thumbnailImage = await pdfDoc.embedPng(pass.images.thumbnail);
      const thumbnailHeight = 50;
      const thumbnailScale = thumbnailHeight / thumbnailImage.height;
      const thumbnailWidth = thumbnailImage.width * thumbnailScale;
      
      page.drawImage(thumbnailImage, {
        x: PAGE_WIDTH - MARGIN - thumbnailWidth,
        y: y - thumbnailHeight,
        width: thumbnailWidth,
        height: thumbnailHeight,
      });
    } catch {
      // Thumbnail might not be a valid PNG, skip it
    }
  }

  y -= 50;

  // Header fields (if any)
  if (pass.headerFields.length > 0) {
    y = drawFieldSection(page, pass.headerFields, y, font, boldFont, fgColor, labelColor, {
      columns: Math.min(pass.headerFields.length, 3),
      labelSize: 7,
      valueSize: 10,
    });
  }

  // === STRIP IMAGE ===
  if (pass.images.strip) {
    try {
      const stripImage = await pdfDoc.embedPng(pass.images.strip);
      const stripWidth = CONTENT_WIDTH;
      const stripScale = stripWidth / stripImage.width;
      const stripHeight = Math.min(stripImage.height * stripScale, 120);
      
      page.drawImage(stripImage, {
        x: MARGIN,
        y: y - stripHeight,
        width: stripWidth,
        height: stripHeight,
      });
      y -= stripHeight + 15;
    } catch {
      // Strip might not be valid PNG
    }
  }

  // === DESCRIPTION / TITLE ===
  page.drawText(pass.description, {
    x: MARGIN,
    y,
    size: 18,
    font: boldFont,
    color: fgColor,
    maxWidth: CONTENT_WIDTH,
  });
  y -= 30;

  // Pass type indicator
  const styleLabel = formatPassStyle(pass.style, pass.transitType);
  page.drawText(styleLabel, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: labelColor,
  });
  y -= 20;

  drawSeparator(page, y, labelColor);
  y -= 15;

  // === PRIMARY FIELDS ===
  if (pass.primaryFields.length > 0) {
    y = drawFieldSection(page, pass.primaryFields, y, font, boldFont, fgColor, labelColor, {
      columns: Math.min(pass.primaryFields.length, 2),
      labelSize: 9,
      valueSize: 16,
    });
    y -= 5;
  }

  // === SECONDARY FIELDS ===
  if (pass.secondaryFields.length > 0) {
    y = drawFieldSection(page, pass.secondaryFields, y, font, boldFont, fgColor, labelColor, {
      columns: Math.min(pass.secondaryFields.length, 3),
    });
  }

  // === AUXILIARY FIELDS ===
  if (pass.auxiliaryFields.length > 0) {
    drawSeparator(page, y, labelColor);
    y -= 15;
    y = drawFieldSection(page, pass.auxiliaryFields, y, font, boldFont, fgColor, labelColor, {
      columns: Math.min(pass.auxiliaryFields.length, 3),
    });
  }

  // === QR CODE / BARCODE ===
  if (pass.barcode) {
    drawSeparator(page, y, labelColor);
    y -= 20;

    // Generate QR code image
    const qrBuffer = await generateQRCode(pass.barcode);
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    
    const qrSize = 120;
    const qrX = (PAGE_WIDTH - qrSize) / 2;
    
    page.drawImage(qrImage, {
      x: qrX,
      y: y - qrSize,
      width: qrSize,
      height: qrSize,
    });
    y -= qrSize + 10;

    // Barcode format label
    const formatLabel = pass.barcode.format.replace("PKBarcodeFormat", "");
    page.drawText(formatLabel, {
      x: (PAGE_WIDTH - font.widthOfTextAtSize(formatLabel, 8)) / 2,
      y,
      size: 8,
      font,
      color: labelColor,
    });
    y -= 12;

    // Alt text if present
    if (pass.barcode.altText) {
      const altText = pass.barcode.altText;
      page.drawText(altText, {
        x: (PAGE_WIDTH - font.widthOfTextAtSize(altText, 10)) / 2,
        y,
        size: 10,
        font: boldFont,
        color: fgColor,
      });
      y -= 15;
    }
  }

  // === BACK FIELDS (Additional Info) ===
  if (pass.backFields.length > 0) {
    // Check if we need a new page
    if (y < 150) {
      const newPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        color: bgColor,
      });
      y = PAGE_HEIGHT - MARGIN;
      
      // Title for back page
      newPage.drawText("Additional Information", {
        x: MARGIN,
        y,
        size: 14,
        font: boldFont,
        color: fgColor,
      });
      y -= 25;

      for (const field of pass.backFields) {
        if (y < 50) break; // Prevent overflow

        if (field.label) {
          newPage.drawText(field.label, {
            x: MARGIN,
            y,
            size: 9,
            font: boldFont,
            color: fgColor,
          });
          y -= 12;
        }

        const valueText = formatFieldValue(field);
        // Word wrap for long text
        const lines = wrapText(valueText, font, 10, CONTENT_WIDTH);
        for (const line of lines) {
          if (y < 50) break;
          newPage.drawText(line, {
            x: MARGIN,
            y,
            size: 10,
            font,
            color: fgColor,
          });
          y -= 14;
        }
        y -= 10;
      }
    } else {
      drawSeparator(page, y, labelColor);
      y -= 15;

      page.drawText("Additional Information", {
        x: MARGIN,
        y,
        size: 10,
        font: boldFont,
        color: fgColor,
      });
      y -= 18;

      for (const field of pass.backFields) {
        if (y < 50) break;

        if (field.label) {
          page.drawText(field.label, {
            x: MARGIN,
            y,
            size: 8,
            font: boldFont,
            color: labelColor,
          });
          y -= 11;
        }

        const valueText = formatFieldValue(field);
        const lines = wrapText(valueText, font, 9, CONTENT_WIDTH);
        for (const line of lines.slice(0, 3)) { // Limit lines
          if (y < 50) break;
          page.drawText(line, {
            x: MARGIN,
            y,
            size: 9,
            font,
            color: fgColor,
          });
          y -= 12;
        }
        y -= 8;
      }
    }
  }

  // === FOOTER - Metadata ===
  const footerY = 25;
  const metaText = `Serial: ${pass.raw.serialNumber}`;
  page.drawText(metaText, {
    x: MARGIN,
    y: footerY,
    size: 7,
    font,
    color: labelColor,
  });

  if (pass.relevantDate) {
    try {
      const date = new Date(pass.relevantDate);
      const dateStr = date.toLocaleDateString("en-US", {
        dateStyle: "medium",
      });
      page.drawText(`Date: ${dateStr}`, {
        x: PAGE_WIDTH - MARGIN - 80,
        y: footerY,
        size: 7,
        font,
        color: labelColor,
      });
    } catch {
      // Invalid date, skip
    }
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  await Bun.write(outputPath, pdfBytes);
}

/**
 * Format pass style for display
 */
function formatPassStyle(style: string, transitType?: string): string {
  const styleMap: Record<string, string> = {
    boardingPass: "Boarding Pass",
    coupon: "Coupon",
    eventTicket: "Event Ticket",
    generic: "Pass",
    storeCard: "Store Card",
  };

  let label = styleMap[style] ?? style;

  if (transitType) {
    const transitMap: Record<string, string> = {
      PKTransitTypeAir: "Flight",
      PKTransitTypeBoat: "Ferry",
      PKTransitTypeBus: "Bus",
      PKTransitTypeGeneric: "Transit",
      PKTransitTypeTrain: "Train",
    };
    label = transitMap[transitType] ?? label;
  }

  return label;
}

/**
 * Simple word wrapping for text
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

