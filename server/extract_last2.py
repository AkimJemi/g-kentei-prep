import sys
import json

try:
    import PyPDF2
except ImportError:
    sys.exit(json.dumps({'error': 'PyPDF2 not installed'}))

import os

targets = [
    ('C:/Users/wowp1/Downloads/G検定/AIに関する法律と契約.pdf', 'AIに関する法律と契約'),
    ('C:/Users/wowp1/Downloads/G検定/AI倫理・AIガバナンス.pdf', 'AI倫理・AIガバナンス'),
]

results = []
for path, category in targets:
    try:
        reader = PyPDF2.PdfReader(path)
        text = ''
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + ' '
        text = ' '.join(text.split())[:6000]
        results.append({'category': category, 'text': text, 'chars': len(text)})
    except Exception as e:
        results.append({'category': category, 'text': '', 'chars': 0, 'error': str(e)})

sys.stdout.buffer.write(json.dumps(results, ensure_ascii=False).encode('utf-8'))
