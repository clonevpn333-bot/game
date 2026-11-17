"""Build single-file versions of Highschool.

    python3 highschool/tools/build.py

dist/highschool.html               the whole game in one file (font + scripts inlined), works offline
dist/highschool-blob.html          a launcher: one button that opens the game in a new tab from a blob: URL
dist/highschool-noabby.html        the No-Abby edition: no Abby, and Corey's love life never comes up
dist/highschool-noabby-blob.html   its blob: launcher
"""
import base64, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
dist = root / 'dist'; dist.mkdir(exist_ok=True)
html = (root / 'index.html').read_text(encoding='utf8')

def inline_css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf8') + '\n</style>'
def inline_js(m):
    code = (root / m.group(1)).read_text(encoding='utf8').replace('</script', '<\\/script')
    return '<script>\n/* ' + m.group(1) + ' */\n' + code + '\n</script>'

def build(src, name, title):
    html = src
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    assert 'src="js/' not in html and 'href="font.css"' not in html
    (dist / (name + '.html')).write_text(html, encoding='utf8')

    b64 = base64.b64encode(html.encode('utf8')).decode('ascii')
    launcher = '''<!doctype html>
    <html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>'''+title+'''</title>
    <style>
    html,body{margin:0;height:100%;background:#0d0b14;color:#f3e8d6;font:16px/1.5 ui-monospace,Menlo,Consolas,monospace}
    main{min-height:100%;display:grid;place-content:center;text-align:center;padding:16px}
    h1{margin:0 0 6px;font-size:clamp(36px,9vw,72px);letter-spacing:.02em;color:#f7ebc9;text-shadow:4px 4px #4a264f}
    p{color:#a99aa8;margin:0 0 18px}
    button{font:inherit;font-size:18px;letter-spacing:.08em;padding:14px 24px;background:#f08a72;color:#1c0c10;border:2px solid #ffc0a6;box-shadow:4px 4px #3a1622;cursor:pointer}
    button:hover{filter:brightness(1.1)}
    small{display:block;margin-top:14px;color:#6f6478}
    a{color:#f6cf8e}
    </style></head>
    <body><main>
    <h1>HIGHSCHOOL</h1>
    <p>A Calling of Aidan story.</p>
    <div><button id="go">OPEN IN NEW TAB</button></div>
    <small id="msg">Opens the game from a blob: link. If nothing happens, allow pop-ups, or <a href="#" id="here">play it in this tab</a>.</small>
    </main>
    <script>
    const GAME="''' + b64 + '''";
    function gameURL(){
      const bin=atob(GAME),bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes],{type:'text/html;charset=utf-8'}));
    }
    document.getElementById('go').onclick=()=>{
      const url=gameURL(),w=window.open(url,'_blank');
      if(!w){document.getElementById('msg').textContent='Pop-up blocked. Opening here instead…';setTimeout(()=>{location.href=url},600);}
    };
    document.getElementById('here').onclick=e=>{e.preventDefault();location.href=gameURL();};
    </script>
    </body></html>
    '''
    (dist / (name + '-blob.html')).write_text(launcher, encoding='utf8')


build(html, 'highschool', 'Highschool')
noabby = html.replace('<script src="js/main.js"></script>', '<script src="js/edition-noabby.js"></script>\n<script src="js/main.js"></script>')
assert noabby != html
build(noabby, 'highschool-noabby', 'Highschool')
for f in ('highschool.html', 'highschool-blob.html', 'highschool-noabby.html', 'highschool-noabby-blob.html'):
    print(f, round((dist / f).stat().st_size / 1024), 'KB')
