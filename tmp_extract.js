const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const filePath = path.join(process.cwd(), 'docs', '資料', '機械学習の具体的手法.pdf');
const buf = fs.readFileSync(filePath);
pdfParse(buf).then(d => {
    console.log(d.text);
}).catch(e => console.error('Error:', e.message));
