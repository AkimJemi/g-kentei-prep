const fs = require('fs');
const path = require('path');
const dir = './docs/copy';
const files = fs.readdirSync(dir);
files.forEach(fname => {
    const fpath = path.join(dir, fname);
    const content = fs.readFileSync(fpath, 'utf8');
    const outname = fname.replace('.txt', '_preview.txt');
    // Write first 200 lines for preview
    const lines = content.split('\n').slice(0, 200).join('\n');
    fs.writeFileSync(path.join('./tmp_copy', outname), lines, 'utf8');
});
console.log('Done');
