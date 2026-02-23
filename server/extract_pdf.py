import sys
import json
import os

try:
    import PyPDF2
except ImportError:
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'PyPDF2', '--quiet'])
    import PyPDF2

pdf_dir = r'C:\Users\wowp1\Downloads\G検定'

files = [
    ('人工知能とは.pdf', '人工知能とは'),
    ('人工知能をめぐる動向.pdf', '人工知能をめぐる動向'),
    ('機械学習の具体的手法.pdf', '機械学習の概要'),
    ('ディープラーニングの概要.pdf', 'ディープラーニングの概要'),
    ('ディープラーニングの要素技術.pdf', 'ディープラーニングの要素技術'),
    ('ディープラーニングの応用例.pdf', 'ディープラーニングの応用例'),
    ('ディープラーニングの社会実装に向けて.pdf', 'AIの社会実装に向けて'),
    ('AIに必要な数理・統計知識①+.pdf', 'AIに必要な数理・統計知識'),
    ('AIに必要な数理・統計知識②.pdf', 'AIに必要な数理・統計知識'),
    ('AIに関する法律と契約.pdf', 'AIに関する法律と契約'),
    ('AI倫理・AIガバナンス.pdf', 'AI倫理・AIガバナンス'),
]

results = []
for filename, category in files:
    path = os.path.join(pdf_dir, filename)
    try:
        reader = PyPDF2.PdfReader(path)
        text = ''
        for page in reader.pages:
            try:
                t = page.extract_text()
                if t:
                    text += t + '\n'
            except:
                pass
        text = ' '.join(text.split())[:6000]  # 正規化 + 6000文字制限
        results.append({'file': filename, 'category': category, 'text': text, 'chars': len(text)})
        print(f'OK: {filename} ({len(text)}文字)', file=sys.stderr)
    except Exception as e:
        print(f'ERR: {filename}: {e}', file=sys.stderr)
        results.append({'file': filename, 'category': category, 'text': '', 'chars': 0})

print(json.dumps(results, ensure_ascii=False))
