/**
 * Types for PKPASS file parsing and PDF generation
 */

/** A single field in a pass (label + value pair) */
export interface PassField {
  key: string;
  label?: string;
  value: string | number;
  changeMessage?: string;
  textAlignment?: "PKTextAlignmentLeft" | "PKTextAlignmentCenter" | "PKTextAlignmentRight";
  dateStyle?: string;
  timeStyle?: string;
  isRelative?: boolean;
  currencyCode?: string;
  numberStyle?: string;
}

/** Barcode formats supported by Apple Wallet */
export type BarcodeFormat =
  | "PKBarcodeFormatQR"
  | "PKBarcodeFormatPDF417"
  | "PKBarcodeFormatAztec"
  | "PKBarcodeFormatCode128";

/** Barcode object from pass.json */
export interface PassBarcode {
  message: string;
  format: BarcodeFormat;
  messageEncoding?: string;
  altText?: string;
}

/** Pass style types */
export type PassStyle =
  | "boardingPass"
  | "coupon"
  | "eventTicket"
  | "generic"
  | "storeCard";

/** Transit type for boarding passes */
export type TransitType =
  | "PKTransitTypeAir"
  | "PKTransitTypeBoat"
  | "PKTransitTypeBus"
  | "PKTransitTypeGeneric"
  | "PKTransitTypeTrain";

/** Raw pass.json structure (partial, covers common fields) */
export interface PassJson {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  
  // Relevance
  relevantDate?: string;
  expirationDate?: string;
  voided?: boolean;
  
  // Barcode (legacy single barcode)
  barcode?: PassBarcode;
  // Modern barcodes array
  barcodes?: PassBarcode[];
  
  // Pass style-specific content (only one should be present)
  boardingPass?: PassStyleContent & { transitType?: TransitType };
  coupon?: PassStyleContent;
  eventTicket?: PassStyleContent;
  generic?: PassStyleContent;
  storeCard?: PassStyleContent;
  
  // Web service
  webServiceURL?: string;
  authenticationToken?: string;
  
  // Associated apps
  associatedStoreIdentifiers?: number[];
  appLaunchURL?: string;
  
  // Locations
  locations?: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    relevantText?: string;
  }>;
  
  maxDistance?: number;
}

/** Content structure within a pass style */
export interface PassStyleContent {
  headerFields?: PassField[];
  primaryFields?: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  backFields?: PassField[];
}

/** Extracted images from the .pkpass file */
export interface PassImages {
  logo?: Buffer;
  icon?: Buffer;
  strip?: Buffer;
  background?: Buffer;
  thumbnail?: Buffer;
  footer?: Buffer;
}

/** Normalized parsed pass data for PDF generation */
export interface ParsedPass {
  /** Raw pass.json data */
  raw: PassJson;
  
  /** Detected pass style */
  style: PassStyle;
  
  /** Organization name */
  organizationName: string;
  
  /** Pass description */
  description: string;
  
  /** Optional logo text */
  logoText?: string;
  
  /** All field sections */
  headerFields: PassField[];
  primaryFields: PassField[];
  secondaryFields: PassField[];
  auxiliaryFields: PassField[];
  backFields: PassField[];
  
  /** Primary barcode (first from barcodes[] or legacy barcode) */
  barcode?: PassBarcode;
  
  /** Extracted images */
  images: PassImages;
  
  /** Colors */
  foregroundColor?: string;
  backgroundColor?: string;
  labelColor?: string;
  
  /** Transit type for boarding passes */
  transitType?: TransitType;
  
  /** Relevant dates */
  relevantDate?: string;
  expirationDate?: string;
}

