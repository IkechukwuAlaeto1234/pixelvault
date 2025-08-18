const fs = require('fs');
const path = require('path');

function checkEJSFiles(directory) {
  console.log(`🔍 Checking EJS files in: ${directory}`);
  
  if (!fs.existsSync(directory)) {
    console.log(`❌ Directory doesn't exist: ${directory}`);
    return;
  }

  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively check subdirectories
      checkEJSFiles(filePath);
    } else if (file.endsWith('.ejs')) {
      console.log(`\n📄 Checking: ${filePath}`);
      checkEJSFile(filePath);
    }
  });
}

function checkEJSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let hasErrors = false;
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for unmatched EJS tags
      const openTags = (line.match(/<%[-=]?/g) || []).length;
      const closeTags = (line.match(/%>/g) || []).length;
      
      if (openTags !== closeTags) {
        console.log(`❌ Line ${lineNum}: Unmatched EJS tags`);
        console.log(`   ${line.trim()}`);
        console.log(`   Open tags: ${openTags}, Close tags: ${closeTags}`);
        hasErrors = true;
      }
      
      // Check for specific malformed patterns
      if (line.includes('<%-') && !line.includes('%>')) {
        console.log(`❌ Line ${lineNum}: Found <%- without closing %>`);
        console.log(`   ${line.trim()}`);
        hasErrors = true;
      }
      
      // Check for other suspicious patterns
      if (line.match(/<%[-=]?\s*$/) || line.match(/^[^<%]*%>/)) {
        console.log(`⚠️  Line ${lineNum}: Potentially malformed tag`);
        console.log(`   ${line.trim()}`);
        hasErrors = true;
      }
    });
    
    if (!hasErrors) {
      console.log(`✅ No obvious EJS syntax errors found`);
    }
    
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
  }
}

// Usage: Check your views directory
const viewsPath = path.join(__dirname, 'views');
checkEJSFiles(viewsPath);

// Also check for common template locations
const possiblePaths = [
  './views',
  './templates', 
  './public'
];

possiblePaths.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath) && fullPath !== path.resolve(viewsPath)) {
    checkEJSFiles(fullPath);
  }
});