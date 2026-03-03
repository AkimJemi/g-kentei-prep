const fs = require('fs');
const path = require('path');
const dir = './docs/copy';

// Read all files into memory
const texts = {};
fs.readdirSync(dir).forEach(fname => {
    texts[fname] = fs.readFileSync(path.join(dir, fname), 'utf8');
});

// For each file, extract unique terms (lines starting with ‧ or →)
Object.entries(texts).forEach(([fname, content]) => {
    const keyLines = content.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('‧') || l.match(/^[A-Z].*：/))
        .filter(l => l.length > 5 && l.length < 120)
        .filter((l, i, arr) => arr.indexOf(l) === i)  // unique
        .slice(0, 80);

    const outName = fname.replace('.txt', '_terms.txt');
    fs.writeFileSync(path.join('./tmp_terms', outName), keyLines.join('\n'), 'utf8');
    console.log(`${fname}: ${keyLines.length} key terms`);
});
