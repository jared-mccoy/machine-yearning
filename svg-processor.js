#!/usr/bin/env node

// SVG Processor Script - Node.js version
// Directly converts images to SVG with background removal
const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');

// Get arguments
const args = process.argv.slice(2);
let inputFile = 'agent.png';
let outputFile = 'agent-mono.svg';
let threshold = 200;
let accentColor = '#192b91';

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input' && i + 1 < args.length) {
    inputFile = args[i + 1];
    i++;
  } else if (args[i] === '--output' && i + 1 < args.length) {
    outputFile = args[i + 1];
    i++;
  } else if (args[i] === '--threshold' && i + 1 < args.length) {
    threshold = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--color' && i + 1 < args.length) {
    accentColor = args[i + 1];
    i++;
  }
}

// Default to the sample file if no input is provided
if (args.length === 0) {
  console.log(`No arguments provided, using defaults:
  Input: ${inputFile}
  Output: ${outputFile}
  Threshold: ${threshold}
  Color: ${accentColor}
  `);
}

// Convert image to monochrome SVG
function convertImageToSvg(inputPath, outputPath, accentColor, threshold) {
  // Read the image file
  const img = new Image();
  
  try {
    // Load image from file
    const fileBuffer = fs.readFileSync(inputPath);
    img.src = fileBuffer;
    
    // Create canvas with image dimensions
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixelData.data;
    
    // Create a binary representation of the image (dark pixels only)
    const binaryImage = [];
    for (let y = 0; y < canvas.height; y++) {
      binaryImage[y] = [];
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        
        // Calculate brightness
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Mark pixel as dark (1) or light (0)
        binaryImage[y][x] = (brightness < threshold && a > 127) ? 1 : 0;
      }
    }
    
    // Create SVG header with proper viewBox
    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}">`;
    
    // Create a single path that contains all dark areas
    svgString += `<path fill="${accentColor}" d="`;
    
    // Use a simplified approach - create rectangles for runs of dark pixels
    const paths = [];
    
    // Find horizontal runs of dark pixels
    for (let y = 0; y < canvas.height; y++) {
      let runStart = -1;
      
      for (let x = 0; x < canvas.width; x++) {
        if (binaryImage[y][x] === 1) {
          // Start of a run
          if (runStart === -1) {
            runStart = x;
          }
        } else if (runStart !== -1) {
          // End of a run
          paths.push(`M${runStart},${y}h${x - runStart}v1h-${x - runStart}z`);
          runStart = -1;
        }
      }
      
      // Check for run at the end of the row
      if (runStart !== -1) {
        paths.push(`M${runStart},${y}h${canvas.width - runStart}v1h-${canvas.width - runStart}z`);
      }
    }
    
    // Add all paths to SVG
    svgString += paths.join(' ') + '"/>'; 
    
    // Create simple rect version for testing
    svgString += `<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="none" stroke="red" stroke-width="1" opacity="0.1"/>`;
    
    // Close SVG
    svgString += '</svg>';
    
    // Write SVG to file
    fs.writeFileSync(outputPath, svgString);
    
    console.log(`Successfully converted ${inputPath} to ${outputPath}`);
    console.log(`Applied: 
    - Color: ${accentColor}
    - Threshold: ${threshold} (higher = more aggressive background removal)
    - Input dimensions: ${img.width}x${img.height}
    `);
    
    return true;
  } catch (error) {
    console.error('Error converting image:', error.message);
    return false;
  }
}

// Check if the file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" not found.`);
  process.exit(1);
}

// Run the conversion
convertImageToSvg(inputFile, outputFile, accentColor, threshold);

/*
USAGE:
1. Make sure you have installed the required dependency:
   npm install canvas

2. Make the script executable (Unix/Linux/Mac):
   chmod +x svg-processor.js

3. Run with defaults (processes agent.png in current directory):
   node svg-processor.js

4. Run with custom parameters:
   node svg-processor.js --input agent.png --output agent-mono.svg --threshold 200 --color "#192b91"

5. Parameters:
   --input     : Input image file path
   --output    : Output SVG file path
   --threshold : Brightness threshold (0-255, higher = remove more)
   --color     : Hex color for the SVG output
*/ 