const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const pdfPoppler = require('pdf-poppler');

// Handbook files to process
const handbookFiles = [
  {
    name: 'College Handbook',
    path: path.join(__dirname, '../../frontend/src/assets/College-HANDBOOK.pdf'),
    type: 'College'
  },
  {
    name: 'Grade 12 Handbook',
    path: path.join(__dirname, '../../frontend/src/assets/Grade-12-HANDBOOK.pdf'),
    type: 'Grade-12'
  },
  {
    name: 'SHS Handbook',
    path: path.join(__dirname, '../../frontend/src/assets/shs_handbook.pdf'),
    type: 'SHS'
  }
];

// Output directory for extracted text
const outputDir = path.join(__dirname, 'extracted-handbooks');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Extract text from a PDF file using OCR
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} handbookName - Name of the handbook
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfPath, handbookName) {
  console.log(`\n📖 Processing: ${handbookName}`);
  console.log(`📁 Path: ${pdfPath}`);

  try {
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`File not found: ${pdfPath}`);
    }

    // Read the PDF file as a buffer
    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Create temporary directory for images
    const tempDir = path.join(__dirname, 'temp-images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Convert PDF to images using pdf-poppler
    console.log(`🖼️  Converting PDF to images...`);
    
    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',
      scale: 2.0 // Higher scale for better OCR
    };

    await pdfPoppler.convert(pdfPath, options);

    // Get all generated images
    const files = fs.readdirSync(tempDir).filter(file => file.endsWith('.png'));
    files.sort(); // Ensure pages are in order

    console.log(`📄 Total pages: ${files.length}`);

    // Perform OCR on each image
    console.log(`🔍 Starting OCR extraction...`);
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\r   Page ${m.page}/${files.length} - ${(m.progress * 100).toFixed(0)}%`);
        }
      }
    });

    let allText = '';
    
    for (let i = 0; i < files.length; i++) {
      const imagePath = path.join(tempDir, files[i]);
      console.log(`\n   Processing page ${i + 1}/${files.length}...`);
      
      const { data: { text } } = await worker.recognize(imagePath);
      allText += text + '\n\n';
      
      // Clean up temporary image
      fs.unlinkSync(imagePath);
    }
    
    await worker.terminate();

    // Clean up temp directory
    fs.rmdirSync(tempDir);

    console.log(`\n✅ OCR extraction complete!`);
    console.log(`📝 Extracted ${allText.length} characters`);

    return allText;
  } catch (error) {
    console.error(`❌ Error processing ${handbookName}:`, error.message);
    throw error;
  }
}

/**
 * Parse extracted text into structured sections
 * @param {string} text - Raw extracted text
 * @param {string} handbookType - Type of handbook
 * @returns {Object} Structured handbook data
 */
function parseHandbookText(text, handbookType) {
  const sections = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentSection = null;
  let currentContent = [];

  // Common section headers in handbooks
  const sectionPatterns = [
    /^(CHAPTER|Chapter)\s+\d+/i,
    /^(SECTION|Section)\s+\d+/i,
    /^(ARTICLE|Article)\s+\d+/i,
    /^(PART|Part)\s+\d+/i,
    /^[IVX]+\.\s+/i,
    /^\d+\.\s+[A-Z]/,
    /^(DISCIPLINARY|ACADEMIC|ATTENDANCE|CONDUCT|RULES|REGULATIONS|POLICIES)/i
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line is a section header
    const isSectionHeader = sectionPatterns.some(pattern => pattern.test(trimmedLine));
    
    if (isSectionHeader && trimmedLine.length < 100) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim()
        });
      }
      
      // Start new section
      currentSection = trimmedLine;
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(trimmedLine);
    }
  }

  // Add the last section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  // If no sections were found, create a single section with all content
  if (sections.length === 0) {
    sections.push({
      title: 'General Content',
      content: text
    });
  }

  return {
    type: handbookType,
    title: `${handbookType} Student Handbook`,
    sections: sections,
    rawText: text,
    extractedAt: new Date().toISOString()
  };
}

/**
 * Save extracted handbook data to JSON file
 * @param {Object} handbookData - Structured handbook data
 * @param {string} filename - Output filename
 */
function saveHandbookData(handbookData, filename) {
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(handbookData, null, 2), 'utf-8');
  console.log(`💾 Saved to: ${outputPath}`);
}

/**
 * Main function to process all handbooks
 */
async function processAllHandbooks() {
  console.log('========================================');
  console.log('  HANDBOOK OCR EXTRACTION TOOL');
  console.log('========================================');

  const results = [];

  for (const handbook of handbookFiles) {
    try {
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(handbook.path, handbook.name);
      
      // Parse text into structured format
      const handbookData = parseHandbookText(extractedText, handbook.type);
      
      // Save to JSON file
      const filename = `${handbook.type.toLowerCase()}-handbook.json`;
      saveHandbookData(handbookData, filename);
      
      results.push({
        name: handbook.name,
        type: handbook.type,
        sections: handbookData.sections.length,
        characters: extractedText.length,
        status: 'success'
      });
    } catch (error) {
      console.error(`❌ Failed to process ${handbook.name}:`, error.message);
      results.push({
        name: handbook.name,
        type: handbook.type,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n========================================');
  console.log('  EXTRACTION SUMMARY');
  console.log('========================================');
  
  results.forEach(result => {
    if (result.status === 'success') {
      console.log(`✅ ${result.name}: ${result.sections} sections, ${result.characters} characters`);
    } else {
      console.log(`❌ ${result.name}: ${result.error}`);
    }
  });

  console.log(`\n📁 Output directory: ${outputDir}`);
  console.log('========================================');
}

// Run the extraction
processAllHandbooks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
