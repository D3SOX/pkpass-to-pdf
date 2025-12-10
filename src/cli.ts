#!/usr/bin/env bun
/**
 * CLI entry point for pkpass-to-pdf converter
 */

import { existsSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import prompts from "prompts";
import { parsePkpass } from "./pkpass.ts";
import { generatePdf } from "./pdf.ts";

const LOGO = `
┌─────────────────────────────────┐
│     📱 PKPASS → PDF Converter   │
└─────────────────────────────────┘
`;

async function main(): Promise<void> {
  console.log(LOGO);

  // Get input file path from args or prompt
  let inputPath: string = process.argv[2] ?? "";

  if (!inputPath) {
    const response = await prompts({
      type: "text",
      name: "file",
      message: "Enter path to .pkpass file:",
      validate: (value: string) => {
        if (!value.trim()) return "Please enter a file path";
        if (!value.endsWith(".pkpass")) return "File must have .pkpass extension";
        return true;
      },
    });

    if (!response.file) {
      console.error("❌ No file provided. Exiting.");
      process.exit(1);
    }
    inputPath = response.file;
  }

  // Resolve to absolute path
  const absoluteInputPath = resolve(inputPath);

  // Validate file exists
  if (!existsSync(absoluteInputPath)) {
    console.error(`❌ File not found: ${absoluteInputPath}`);
    process.exit(1);
  }

  // Validate extension
  if (!absoluteInputPath.endsWith(".pkpass")) {
    console.error("❌ File must have .pkpass extension");
    process.exit(1);
  }

  // Derive output path (same folder, same name, .pdf extension)
  const dir = dirname(absoluteInputPath);
  const baseName = basename(absoluteInputPath, ".pkpass");
  const outputPath = join(dir, `${baseName}.pdf`);

  console.log(`📂 Input:  ${absoluteInputPath}`);
  console.log(`📄 Output: ${outputPath}`);
  console.log("");

  try {
    // Parse the .pkpass file
    console.log("🔍 Parsing .pkpass file...");
    const passData = await parsePkpass(absoluteInputPath);
    console.log(`   ✓ Pass type: ${passData.style}`);
    console.log(`   ✓ Organization: ${passData.organizationName}`);
    console.log(`   ✓ Description: ${passData.description}`);
    
    if (passData.barcode) {
      console.log(`   ✓ Barcode: ${passData.barcode.format}`);
    }

    const imageCount = Object.values(passData.images).filter(Boolean).length;
    console.log(`   ✓ Images found: ${imageCount}`);
    console.log("");

    // Generate PDF
    console.log("📝 Generating PDF...");
    await generatePdf(passData, outputPath);
    console.log("");

    console.log(`✅ Success! PDF saved to: ${outputPath}`);
  } catch (error) {
    console.error("");
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();

