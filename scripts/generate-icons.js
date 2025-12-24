const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputIcon = path.join(__dirname, "../public/icon.svg");
const outputDir = path.join(__dirname, "../public");

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    await sharp(inputIcon)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: icon-${size}.png`);
  }
  
  // Apple touch icon
  await sharp(inputIcon)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, "apple-touch-icon.png"));
  
  console.log("Generated: apple-touch-icon.png");
}

generateIcons().catch(console.error);
