# pkpass-to-pdf

A CLI tool to convert Apple Wallet `.pkpass` files to PDF documents.

## Disclaimer

This is a one-shot AI-written tool (planned by GPT 5.1, executed by Opus 4.5). I needed a quick way to turn a `.pkpass` into a PDF to sell a ticket on TicketSwap, could not find a reliable tool, and put this up in case someone else needs it.

Built with [Bun](https://bun.sh) and TypeScript.

## Features

- Parses `.pkpass` files (ZIP archives containing pass data)
- Extracts all pass information: organization, description, fields, barcode
- Generates a formatted PDF with:
  - Pass header with logo and organization name
  - Primary, secondary, and auxiliary fields
  - QR code from the barcode data
  - Back fields (additional information)
  - Pass metadata (serial number, relevant date)
- Supports all pass types: boarding passes, event tickets, coupons, store cards, generic passes

## Installation

```bash
# Clone or download the project
cd pkpass-to-pdf

# Install dependencies
bun install
```

## Usage

### Interactive Mode

```bash
bun run start
```

You'll be prompted to enter the path to your `.pkpass` file.

### Command Line

```bash
bun run src/cli.ts path/to/your/pass.pkpass
```

The PDF will be saved in the same directory with the same filename but `.pdf` extension.

### Build Standalone Executable

```bash
bun run build
```

This creates a standalone `pkpass-to-pdf` binary that can be run without Bun installed:

```bash
./pkpass-to-pdf path/to/your/pass.pkpass
```

### Sample Output

You can see how a generated PDF looks like here: [sample-event.pdf](./test/fixtures/sample-event.pdf).

## Development

### Project Structure

```
src/
├── cli.ts      # CLI entry point
├── pkpass.ts   # PKPASS file parsing
├── pdf.ts      # PDF generation
└── types.ts    # TypeScript type definitions

test/
├── fixtures/   # Test fixture files
├── create-fixture.ts  # Creates sample .pkpass for testing
└── smoke.test.ts      # Smoke tests
```

### Run Tests

```bash
bun test
```

### Create Test Fixture

```bash
bun run create-fixture
```

## Dependencies

- **jszip** - ZIP file extraction
- **pdf-lib** - PDF generation
- **qrcode** - QR code generation
- **prompts** - Interactive CLI prompts

## PKPASS File Format

A `.pkpass` file is a ZIP archive containing:

- `pass.json` - Pass data and field definitions
- `logo.png` / `logo@2x.png` - Logo image
- `icon.png` / `icon@2x.png` - Icon image
- `strip.png` / `strip@2x.png` - Strip image (optional)
- `background.png` - Background image (optional)
- Other assets as needed

The tool extracts all available data and images to create a comprehensive PDF representation of the pass.

## License

[MIT](./LICENSE).
