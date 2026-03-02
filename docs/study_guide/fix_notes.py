import os
import sys
import re

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)

study_dir = os.path.dirname(os.path.abspath(__file__))

def parse_wide_table_line(line):
    """Parse a table row that has many trailing spaces, extracting actual cells."""
    # Split by | and strip
    parts = line.split('|')
    cells = [p.strip() for p in parts]
    # Remove empty first/last if line starts/ends with |
    if cells and cells[0] == '':
        cells = cells[1:]
    if cells and cells[-1] == '':
        cells = cells[:-1]
    # Filter out cells that are all spaces or dashes (separator rows)
    return cells

def get_table_section(lines, start_idx):
    """Get all consecutive table lines starting from start_idx, going backward and forward."""
    # go backward to find table start
    table_start = start_idx
    while table_start > 0 and '|' in lines[table_start - 1]:
        table_start -= 1
    # go forward to find table end
    table_end = start_idx
    while table_end < len(lines) - 1 and '|' in lines[table_end + 1]:
        table_end += 1
    return table_start, table_end

# Check each wide table
issues = [
    ('06_DL概要.md', 122),   # learning methods table
    ('06_DL概要.md', 246),   # activation functions table  
    ('07_DL要素技術.md', 266), # long text line
    ('09_DL社会実装.md', 382), # web services table
    ('11_法律契約.md', 390),   # contract types table
]

for (fname, idx) in issues:
    fpath = os.path.join(study_dir, fname)
    with open(fpath, encoding='utf-8') as f:
        lines = f.readlines()
    
    line = lines[idx].rstrip('\r\n')
    
    # Check if it's a table row or regular text
    is_table = '|' in line
    
    print(f'=== {fname} line {idx+1} ({"table" if is_table else "text"}) ===')
    
    if is_table:
        ts, te = get_table_section(lines, idx)
        print(f'Table spans lines {ts+1} to {te+1}')
        for i in range(ts, te+1):
            cells = parse_wide_table_line(lines[i].rstrip('\r\n'))
            print(f'  Row {i+1}: {cells}')
    else:
        # Regular text - just show the meaningful content
        content = ' '.join(line.split())  # collapse whitespace
        print(f'Content: {content[:300]}')
    print()
