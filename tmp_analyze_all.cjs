const fs = require('fs');
const path = require('path');
const dir = './docs/copy';
const files = fs.readdirSync(dir);

// For each file, extract key terms and output summary
files.forEach(fname => {
    const fpath = path.join(dir, fname);
    const content = fs.readFileSync(fpath, 'utf8');
    const lines = content.split('\n');
    // Print file name and line count
    console.log(`\n=== ${fname} (${lines.length} lines, ${content.length} bytes) ===`);
    // Print first 30 non-empty lines as preview
    lines.filter(l => l.trim()).slice(0, 30).forEach(l => console.log('  ' + l.trim().slice(0, 80)));
});
