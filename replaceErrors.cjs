const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { pattern: /['"]Failed to load([^'"]*)['"]/g, repl: '"We couldn\'t load$1. Please refresh and try again."' },
  { pattern: /['"]Failed to update([^'"]*)['"]/g, repl: '"We couldn\'t update$1. Please try again."' },
  { pattern: /['"]Failed to delete([^'"]*)['"]/g, repl: '"We couldn\'t delete$1. Please try again."' },
  { pattern: /['"]Failed to upload([^'"]*)['"]/g, repl: '"We couldn\'t upload$1. Please try again."' },
  { pattern: /['"]Failed to create([^'"]*)['"]/g, repl: '"We couldn\'t create$1. Please try again."' },
  { pattern: /['"]Failed to save([^'"]*)['"]/g, repl: '"We couldn\'t save$1. Please try again."' },
  { pattern: /['"]Failed to copy([^'"]*)['"]/g, repl: '"We couldn\'t copy$1. Please try again."' },
  { pattern: /['"]Failed to toggle([^'"]*)['"]/g, repl: '"We couldn\'t update$1. Please try again."' },
  { pattern: /['"]Failed to remove([^'"]*)['"]/g, repl: '"We couldn\'t remove$1. Please try again."' },
  { pattern: /['"]Failed to process([^'"]*)['"]/g, repl: '"We couldn\'t process$1. Please try again."' },
  { pattern: /['"]Error\b([^'"]*)['"]/g, repl: '"Failed$1"' },
];

walkDir('c:/Users/sagar/OneDrive/Desktop/Ronika Website/admin/src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(({pattern, repl}) => {
      content = content.replace(pattern, repl);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
