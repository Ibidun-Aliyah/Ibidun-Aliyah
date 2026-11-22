"""Builds l-wrapped.html (artifact body) and index.html (standalone page) from src/template.html.

The email parsing engine, sample data and .eml decoder are reused from v1/app.html.
Run: python3 l-wrapped/src/build.py
"""
import pathlib

here = pathlib.Path(__file__).resolve().parent
root = here.parent
v1 = (root / 'v1' / 'app.html').read_text()


def between(s, a, b):
    i = s.index(a)
    j = s.index(b, i)
    return s[i:j].rstrip()


engine = between(v1, '/* ================= parsing', 'function analyze(text, totalApplied)')
sample = between(v1, '/* ================= sample data', '/* ================= intake UI')
eml = between(v1, '// .eml / .txt import', 'async function addFiles')

t = (here / 'template.html').read_text()
t = t.replace('/*@@ENGINE@@*/', engine).replace('/*@@SAMPLE@@*/', sample).replace('/*@@EML@@*/', eml)
(root / 'l-wrapped.html').write_text(t)

head, body = t.split('<!-- /head -->', 1)
(root / 'index.html').write_text(
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + head.strip() + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n'
)
print('built l-wrapped.html and index.html')
