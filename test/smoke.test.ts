/**
 * Smoke test for pkpass-to-pdf conversion
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { parsePkpass } from "../src/pkpass.ts";
import { generatePdf } from "../src/pdf.ts";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");
const SAMPLE_PKPASS = join(FIXTURES_DIR, "sample-event.pkpass");
const OUTPUT_PDF = join(FIXTURES_DIR, "sample-event.pdf");

describe("pkpass-to-pdf", () => {
  beforeAll(async () => {
    // Create the fixture if it doesn't exist
    if (!existsSync(SAMPLE_PKPASS)) {
      await import("./create-fixture.ts");
    }
    
    // Clean up any existing output
    if (existsSync(OUTPUT_PDF)) {
      unlinkSync(OUTPUT_PDF);
    }
  });

  test("should parse a .pkpass file", async () => {
    const pass = await parsePkpass(SAMPLE_PKPASS);
    
    expect(pass.style).toBe("eventTicket");
    expect(pass.organizationName).toBe("Test Events Inc.");
    expect(pass.description).toBe("Concert Ticket - Rock Festival 2024");
    expect(pass.barcode).toBeDefined();
    expect(pass.barcode?.format).toBe("PKBarcodeFormatQR");
    expect(pass.primaryFields.length).toBeGreaterThan(0);
    expect(pass.secondaryFields.length).toBeGreaterThan(0);
    expect(pass.auxiliaryFields.length).toBeGreaterThan(0);
    expect(pass.backFields.length).toBeGreaterThan(0);
  });

  test("should generate a PDF from parsed pass", async () => {
    const pass = await parsePkpass(SAMPLE_PKPASS);
    await generatePdf(pass, OUTPUT_PDF);
    
    expect(existsSync(OUTPUT_PDF)).toBe(true);
    
    // Check that the PDF has reasonable size (should be > 1KB)
    const file = Bun.file(OUTPUT_PDF);
    const size = file.size;
    expect(size).toBeGreaterThan(1000);
  });

  test("should handle missing files gracefully", async () => {
    await expect(parsePkpass("/nonexistent/path.pkpass")).rejects.toThrow();
  });

  test("should extract images from pkpass", async () => {
    const pass = await parsePkpass(SAMPLE_PKPASS);
    
    // Our fixture has thumbnail and icon
    expect(pass.images.thumbnail).toBeDefined();
    expect(pass.images.icon).toBeDefined();
  });

  test("should parse all field types", async () => {
    const pass = await parsePkpass(SAMPLE_PKPASS);
    
    // Header fields
    expect(pass.headerFields.length).toBe(1);
    expect(pass.headerFields[0]?.key).toBe("date");
    
    // Primary fields
    expect(pass.primaryFields[0]?.key).toBe("event");
    
    // Secondary fields  
    expect(pass.secondaryFields.some(f => f.key === "location")).toBe(true);
    
    // Auxiliary fields
    expect(pass.auxiliaryFields.some(f => f.key === "seat")).toBe(true);
    
    // Back fields
    expect(pass.backFields.some(f => f.key === "terms")).toBe(true);
  });
});

