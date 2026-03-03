const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const filePath = path.join(process.cwd(), 'docs', '\u8cc7\u6599', '\u6a5f\u68b0\u5b66\u7fd2\u306e\u5177\u4f53\u7684\u624b\u6cd5.pdf');
const buf = fs.readFileSync(filePath);
pdfParse(buf).then(d => {
    console.log(d.text);
}).catch(e => console.error('Error:', e.message));
