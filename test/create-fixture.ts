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

import QRCode from "qrcode";

async function createIconPng(): Promise<Buffer> {
  // Small icon
  const dataUrl = await QRCode.toDataURL("T", {
    errorCorrectionLevel: "L",
    margin: 1,
    width: 29,
    color: {
      dark: "#3C414C",
      light: "#FFFFFF",
    },
  });
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

async function createFixture(): Promise<void> {
  const zip = new JSZip();

  // Add pass.json
  zip.file("pass.json", JSON.stringify(samplePassJson, null, 2));

  // Add minimal placeholder images
  const iconPng = await createIconPng();
  const thumbnailPng = await Bun.file(join(FIXTURE_DIR, "tada.png")).arrayBuffer();
  
  zip.file("icon.png", iconPng);
  zip.file("icon@2x.png", iconPng);
  zip.file("thumbnail.png", Buffer.from(thumbnailPng));
  zip.file("thumbnail@2x.png", Buffer.from(thumbnailPng));

  // Generate the zip file
  const content = await zip.generateAsync({ type: "nodebuffer" });
  
  // Save to fixtures directory
  const outputPath = join(FIXTURE_DIR, "sample-event.pkpass");
  await Bun.write(outputPath, content);
  
  console.log(`✅ Created fixture: ${outputPath}`);
}

createFixture().catch(console.error);

