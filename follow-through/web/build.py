"""Builds the web (iPhone) version into /docs from the Android app's dashboard, so both stay identical.
Run from anywhere:  python3 follow-through/web/build.py"""
import hashlib, json, os, re, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FT = os.path.dirname(HERE)
ASSETS = os.path.join(FT, 'android/app/src/main/assets')
RES = os.path.join(FT, 'android/app/src/main/res/drawable-nodpi')
OUT = os.path.join(os.path.dirname(FT), 'docs')

os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
for f in ['bisi.js', 'games.js', 'fonts/nunito.woff2', 'fonts/patrickhand.woff2']:
    shutil.copy(os.path.join(ASSETS, f), os.path.join(OUT, f))
shutil.copy(os.path.join(HERE, 'web.js'), os.path.join(OUT, 'web.js'))
shutil.copy(os.path.join(FT, 'apps-script/Code.gs'), os.path.join(OUT, 'Code.gs'))
shutil.copy(os.path.join(FT, 'android/releases/follow-through.apk'), os.path.join(OUT, 'follow-through.apk'))  # Android friends download it here

# icons: Bisi on honeycomb (same art as the Android launcher icon)
bg = Image.open(os.path.join(RES, 'ic_bg.png')).convert('RGBA')
fg = Image.open(os.path.join(RES, 'ic_fg.png')).convert('RGBA').resize(bg.size, Image.LANCZOS)
icon = Image.alpha_composite(bg, fg)
w = icon.size[0]; crop = int(w * 0.12)          # adaptive icons have a safe-zone margin; trim some of it
icon = icon.crop((crop, crop, w - crop, w - crop))
for s in (180, 192, 512):
    icon.resize((s, s), Image.LANCZOS).convert('RGB').save(os.path.join(OUT, f'icon-{s}.png'), optimize=True)

json.dump({'name': 'Follow-Through', 'short_name': 'Follow-Through', 'start_url': './', 'scope': './', 'display': 'standalone',
           'background_color': '#FFF8E1', 'theme_color': '#F5B700',
           'description': 'Save opportunities, track deadlines, and let Bisi the bee nag you until you apply.',
           'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                     {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}]},
          open(os.path.join(OUT, 'manifest.webmanifest'), 'w'), indent=1)

html = open(os.path.join(ASSETS, 'dashboard.html')).read()
head = ('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n<meta name="apple-mobile-web-app-title" content="Follow-Through">\n'
        '<meta name="theme-color" content="#F5B700">\n<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="icon-180.png">\n<link rel="icon" href="icon-192.png">\n'
        '<script src="web.js"></script>')
vp = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
assert vp in html
html = html.replace(vp, head, 1)
open(os.path.join(OUT, 'index.html'), 'w').write(html)

# a new service-worker cache name whenever anything changes, so phones pick up updates
h = hashlib.sha1()
for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    if os.path.isfile(p) and f != 'sw.js': h.update(open(p, 'rb').read())
open(os.path.join(OUT, 'sw.js'), 'w').write(open(os.path.join(HERE, 'sw.js')).read().replace('__VERSION__', h.hexdigest()[:10]))
open(os.path.join(OUT, '.nojekyll'), 'w').write('')
# the Android app checks this to offer updates
g = open(os.path.join(FT, 'android/app/build.gradle')).read()
code = int(re.search(r'versionCode (\d+)', g).group(1)); name = re.search(r'versionName "([^"]+)"', g).group(1)
wn = os.path.join(FT, 'android/whatsnew.txt')
json.dump({'versionCode': code, 'versionName': name, 'whatsNew': open(wn).read().strip() if os.path.exists(wn) else ''},
          open(os.path.join(OUT, 'version.json'), 'w'))
print('built', OUT, sorted(os.listdir(OUT)))
