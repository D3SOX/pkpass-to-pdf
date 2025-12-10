#!/usr/bin/env bun
/**
 * Creates a sample .pkpass fixture file for testing
 */

import JSZip from "jszip";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "fixtures");

// Sample pass.json for an event ticket
const samplePassJson = {
  formatVersion: 1,
  passTypeIdentifier: "pass.com.example.test",
  serialNumber: "TEST-001-2024",
  teamIdentifier: "EXAMPLE123",
  organizationName: "Test Events Inc.",
  description: "Concert Ticket - Rock Festival 2024",
  logoText: "Rock Fest",
  foregroundColor: "rgb(255, 255, 255)",
  backgroundColor: "rgb(60, 65, 76)",
  labelColor: "rgb(198, 202, 211)",
  
  barcode: {
    message: "https://example.com/ticket/TEST-001-2024",
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: "TEST-001-2024",
  },
  
  barcodes: [
    {
      message: "https://example.com/ticket/TEST-001-2024",
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
      altText: "TEST-001-2024",
    },
  ],
  
  relevantDate: "2024-12-31T19:00:00-05:00",
  
  eventTicket: {
    headerFields: [
      {
        key: "date",
        label: "DATE",
        value: "Dec 31, 2024",
      },
    ],
    primaryFields: [
      {
        key: "event",
        label: "EVENT",
        value: "Rock Festival 2024",
      },
    ],
    secondaryFields: [
      {
        key: "location",
        label: "VENUE",
        value: "Madison Square Garden",
      },
      {
        key: "time",
        label: "DOORS OPEN",
        value: "7:00 PM",
      },
    ],
    auxiliaryFields: [
      {
        key: "section",
        label: "SECTION",
        value: "Floor A",
      },
      {
        key: "row",
        label: "ROW",
        value: "12",
      },
      {
        key: "seat",
        label: "SEAT",
        value: "45",
      },
    ],
    backFields: [
      {
        key: "terms",
        label: "Terms & Conditions",
        value: "This ticket is non-refundable. Must present valid ID matching the name on the ticket. No re-entry allowed. Recording devices prohibited.",
      },
      {
        key: "contact",
        label: "Contact",
        value: "support@example.com | 1-800-EXAMPLE",
      },
    ],
  },
};

// Create a simple 1x1 white PNG for logo placeholder
function createMinimalPng(): Buffer {
  // Minimal valid PNG - 1x1 white pixel
  const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR type
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x02, // bit depth: 8, color type: 2 (RGB)
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x90, 0x77, 0x53, 0xde, // IHDR CRC
    0x00, 0x00, 0x00, 0x0c, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT type
    0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0xff, 0x00, // compressed data
    0x05, 0xfe, 0x02, 0xfe, // IDAT CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4e, 0x44, // IEND type
    0xae, 0x42, 0x60, 0x82, // IEND CRC
  ]);
  return pngData;
}

async function createFixture(): Promise<void> {
  const zip = new JSZip();

  // Add pass.json
  zip.file("pass.json", JSON.stringify(samplePassJson, null, 2));

  // Add minimal placeholder images
  const png = createMinimalPng();
  zip.file("icon.png", png);
  zip.file("icon@2x.png", png);
  zip.file("logo.png", png);
  zip.file("logo@2x.png", png);

  // Generate the zip file
  const content = await zip.generateAsync({ type: "nodebuffer" });
  
  // Save to fixtures directory
  const outputPath = join(FIXTURE_DIR, "sample-event.pkpass");
  await Bun.write(outputPath, content);
  
  console.log(`✅ Created fixture: ${outputPath}`);
}

createFixture().catch(console.error);

