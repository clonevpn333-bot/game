"""Bundle the game into one self-contained HTML file.

    python3 build-single.py   ->  among-us-3d-single.html
"""
import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
html = open('index.html', encoding='utf-8').read()

def guard(js):
    # a literal </script> inside a string would close the tag early
    return js.replace('</script', '<\\/script')

# inline the stylesheet
css = open('css/style.css', encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="css/style.css">',
                    '<style>\n' + css + '\n</style>')

# inline every script, in the order the page lists them
def inline(m):
    src = m.group(1)
    with open(src, encoding='utf-8') as f:
        return '<script>\n/* ---- ' + src + ' ---- */\n' + guard(f.read()) + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

assert 'src="js/' not in html and 'src="vendor/' not in html, 'a script was left external'
assert 'href="css/' not in html, 'the stylesheet was left external'

open('among-us-3d-single.html', 'w', encoding='utf-8').write(html)
print('bundle bytes:', len(html.encode('utf-8')))
print('scripts inlined:', html.count('/* ---- '))
