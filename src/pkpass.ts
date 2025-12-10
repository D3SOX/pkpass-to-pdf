/**
 * PKPASS file parser - extracts pass.json and assets from .pkpass ZIP files
 */

import JSZip from "jszip";
import type {
  ParsedPass,
  PassImages,
  PassJson,
  PassStyle,
  PassStyleContent,
} from "./types.ts";

const PASS_STYLES: PassStyle[] = [
  "boardingPass",
  "coupon",
  "eventTicket",
  "generic",
  "storeCard",
];

const IMAGE_FILES = [
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "strip.png",
  "strip@2x.png",
  "strip@3x.png",
  "background.png",
  "background@2x.png",
  "background@3x.png",
  "thumbnail.png",
  "thumbnail@2x.png",
  "thumbnail@3x.png",
  "footer.png",
  "footer@2x.png",
  "footer@3x.png",
] as const;

type ImageKey = "logo" | "icon" | "strip" | "background" | "thumbnail" | "footer";

/**
 * Parse a .pkpass file and extract all relevant data
 */
export async function parsePkpass(filePath: string): Promise<ParsedPass> {
  const fileData = await Bun.file(filePath).arrayBuffer();
  const zip = await JSZip.loadAsync(fileData);

  // Extract pass.json
  const passJsonFile = zip.file("pass.json");
  if (!passJsonFile) {
    throw new Error("Invalid .pkpass file: pass.json not found");
  }

  const passJsonContent = await passJsonFile.async("string");
  let passJson: PassJson;
  try {
    passJson = JSON.parse(passJsonContent) as PassJson;
  } catch {
    throw new Error("Invalid .pkpass file: pass.json is not valid JSON");
  }

  // Detect pass style
  const style = detectPassStyle(passJson);
  const styleContent = getStyleContent(passJson, style);

  // Extract images (prefer @2x for better quality, fall back to standard)
  const images = await extractImages(zip);

  // Get barcode (prefer barcodes[] array, fall back to legacy barcode)
  const barcode = passJson.barcodes?.[0] ?? passJson.barcode;

  return {
    raw: passJson,
    style,
    organizationName: passJson.organizationName,
    description: passJson.description,
    logoText: passJson.logoText,
    headerFields: styleContent?.headerFields ?? [],
    primaryFields: styleContent?.primaryFields ?? [],
    secondaryFields: styleContent?.secondaryFields ?? [],
    auxiliaryFields: styleContent?.auxiliaryFields ?? [],
    backFields: styleContent?.backFields ?? [],
    barcode,
    images,
    foregroundColor: passJson.foregroundColor,
    backgroundColor: passJson.backgroundColor,
    labelColor: passJson.labelColor,
    transitType:
      style === "boardingPass"
        ? (passJson.boardingPass as PassStyleContent & { transitType?: string })?.transitType as ParsedPass["transitType"]
        : undefined,
    relevantDate: passJson.relevantDate,
    expirationDate: passJson.expirationDate,
  };
}

/**
 * Detect which pass style is used in the pass.json
 */
function detectPassStyle(passJson: PassJson): PassStyle {
  for (const style of PASS_STYLES) {
    if (passJson[style]) {
      return style;
    }
  }
  return "generic"; // Default fallback
}

/**
 * Get the style-specific content from pass.json
 */
function getStyleContent(
  passJson: PassJson,
  style: PassStyle
): PassStyleContent | undefined {
  return passJson[style] as PassStyleContent | undefined;
}

/**
 * Extract images from the .pkpass ZIP, preferring higher resolution versions
 */
async function extractImages(zip: JSZip): Promise<PassImages> {
  const images: PassImages = {};

  const imageKeys: ImageKey[] = ["logo", "icon", "strip", "background", "thumbnail", "footer"];

  for (const key of imageKeys) {
    // Try @3x, then @2x, then standard
    const variants = [`${key}@3x.png`, `${key}@2x.png`, `${key}.png`];
    
    for (const filename of variants) {
      const file = zip.file(filename);
      if (file) {
        const data = await file.async("nodebuffer");
        images[key] = Buffer.from(data);
        break; // Use the first (highest resolution) variant found
      }
    }
  }

  return images;
}

/**
 * List all files in a .pkpass for debugging
 */
export async function listPkpassContents(filePath: string): Promise<string[]> {
  const fileData = await Bun.file(filePath).arrayBuffer();
  const zip = await JSZip.loadAsync(fileData);
  return Object.keys(zip.files);
}

