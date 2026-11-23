# L Wrapped

Your year in rejections, wrapped. LinkedIn shows the wins. This shows the rest.

Paste the rejection (and interview, and offer) emails you got this year, or just type your numbers in quick mode, and get an auto-playing story with a soundtrack: total Ls, rejection bingo, your top rejection phrases, your eras, the 3 a.m. rejection, robot rejections, who ghosted you, your L-to-W ratio, highlight reel vs real reel, your L aura and L personality. It ends with share cards for every slide and a ready-to-post LinkedIn / X caption in three tones.

**Privacy:** everything runs in the browser. No server, no storage, no tracking. Emails vanish when the tab closes. Company names are hidden by default.

## Settings you might change (in `src/template.html`, then rebuild)
- `APP_URL`: your public link once hosted, so share and L Party links point to it.
- `LAUNCH`: the drop date for the countdown banner (default 1 Dec 2026, WAT).
- `CLUBS`: the six L clubs and their roles.

## How L Party works
Each Wrapped gets a challenge link like `…#vs-Name-…`. It carries only the numbers (Ls, interviews, offers, ghosted, so close, applications, projects) and the personality, never emails. A friend who opens it sees the challenge and gets a side-by-side slide at the end of their own Wrapped.

## Files
- `index.html`: the app. Open it in a browser or host this folder on GitHub Pages / Netlify / Vercel.
- `og.png`: link preview image. Once hosted, change the `og:image` / `twitter:image` meta tags in `src/template.html` to the full URL (e.g. `https://you.github.io/l-wrapped/og.png`), since LinkedIn and X need an absolute URL.
- `src/template.html`: v2 source. `src/build.py` combines it with the email parser from v1 and writes `index.html` and `l-wrapped.html`.
- `v1/`: the first version, kept as a backup.

## Build
```
python3 l-wrapped/src/build.py
```
