const fs = require('fs');
const path = require('path');

// Function to find all markdown files recursively
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      // Get file stats
      const relativePath = filePath.replace(/\\/g, '/');
      fileList.push({
        path: relativePath,
        name: path.basename(file),
        modified: new Date(stat.mtime).toISOString()
      });
    }
  });

  return fileList;
}

// Update api.json with all markdown files
function updateApiJson() {
  console.log('Scanning content directory...');
  const contentDir = path.join(process.cwd(), 'content');
  const markdownFiles = findMarkdownFiles(contentDir);

  console.log(`Found ${markdownFiles.length} markdown files:`);
  markdownFiles.forEach(file => console.log(` - ${file.path}`));

  const apiData = {
    chats: markdownFiles
  };

  fs.writeFileSync('api.json', JSON.stringify(apiData, null, 2));
  console.log('api.json has been updated successfully!');
}

// Run the script if called directly (not required)
if (require.main === module) {
  try {
    updateApiJson();
  } catch (error) {
    console.error('Error generating api.json:', error);
    process.exit(1);
  }
}

module.exports = { updateApiJson }; 