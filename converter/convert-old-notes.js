const fs = require('fs');
const path = require('path');

/**
 * Converts old .ezn format to new format
 * Old format: { notes: {}, highlights: {}, textboxes: {}, totalPages, lastPage, savedAt }
 * New format: { name, subject, date, last_page, num_notebook_pages, pages: [] }
 */

function convertOldToNew(oldData, fileName, subject) {
  const newData = {
    name: fileName.replace('.ezn', ''),
    subject: subject || 'Imported',
    date: oldData.savedAt || new Date().toISOString(),
    last_page: oldData.lastPage || 1,
    num_notebook_pages: oldData.totalPages || 100,
    pages: []
  };

  // Convert notes
  if (oldData.notes && typeof oldData.notes === 'object') {
    for (const [pageNum, noteContent] of Object.entries(oldData.notes)) {
      const pageNumber = parseInt(pageNum);
      
      // Find or create page
      let page = newData.pages.find(p => p.page_number === pageNumber);
      if (!page) {
        page = {
          page_number: pageNumber,
          slide_number: pageNumber, // Assume 1:1 mapping
          note_content: '',
          text_boxes: [],
          highlights: []
        };
        newData.pages.push(page);
      }
      
      page.note_content = noteContent;
    }
  }

  // Convert textboxes
  if (oldData.textboxes && typeof oldData.textboxes === 'object') {
    for (const [pageNum, boxes] of Object.entries(oldData.textboxes)) {
      const pageNumber = parseInt(pageNum);
      
      let page = newData.pages.find(p => p.page_number === pageNumber);
      if (!page) {
        page = {
          page_number: pageNumber,
          slide_number: pageNumber,
          note_content: '',
          text_boxes: [],
          highlights: []
        };
        newData.pages.push(page);
      }
      
      if (Array.isArray(boxes)) {
        page.text_boxes = boxes;
      }
    }
  }

  // Convert highlights
  if (oldData.highlights && typeof oldData.highlights === 'object') {
    for (const [pageNum, highlights] of Object.entries(oldData.highlights)) {
      const pageNumber = parseInt(pageNum);
      
      let page = newData.pages.find(p => p.page_number === pageNumber);
      if (!page) {
        page = {
          page_number: pageNumber,
          slide_number: pageNumber,
          note_content: '',
          text_boxes: [],
          highlights: []
        };
        newData.pages.push(page);
      }
      
      if (Array.isArray(highlights)) {
        page.highlights = highlights;
      }
    }
  }

  // Sort pages by page_number
  newData.pages.sort((a, b) => a.page_number - b.page_number);

  return newData;
}

function convertFile(filePath, subject) {
  try {
    console.log(`Converting: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const oldData = JSON.parse(content);
    
    // Check if it's already in new format
    if (oldData.pages && Array.isArray(oldData.pages)) {
      console.log(`  → Already in new format, skipping`);
      return;
    }
    
    // Check if it's old format
    if (!oldData.notes && !oldData.highlights && !oldData.textboxes) {
      console.log(`  → Unknown format, skipping`);
      return;
    }
    
    const fileName = path.basename(filePath);
    const newData = convertOldToNew(oldData, fileName, subject);
    
    // Backup old file
    const backupPath = filePath.replace('.ezn', '.ezn.backup');
    fs.copyFileSync(filePath, backupPath);
    console.log(`  → Backup created: ${backupPath}`);
    
    // Write new format
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
    console.log(`  → Converted successfully`);
    
  } catch (error) {
    console.error(`  ✗ Error converting ${filePath}:`, error.message);
  }
}

function findAndConvertFiles(directory, subject) {
  console.log(`\nSearching for .ezn files in: ${directory}`);
  console.log(`Subject to set: ${subject}\n`);
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ezn')) {
        convertFile(fullPath, subject);
      }
    }
  }
  
  scanDirectory(directory);
}

// Main
const targetDir = process.argv[2] || process.cwd();
const subject = process.argv[3] || 'Imported';

console.log('='.repeat(60));
console.log('Easy Notes Plus - Old Format Converter');
console.log('='.repeat(60));

if (!fs.existsSync(targetDir)) {
  console.error(`\nError: Directory not found: ${targetDir}`);
  process.exit(1);
}

findAndConvertFiles(targetDir, subject);

console.log('\n' + '='.repeat(60));
console.log('Conversion completed!');
console.log('='.repeat(60));
console.log('\nNote: Original files have been backed up with .backup extension');
