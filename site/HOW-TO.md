# My site: how to use it

The site lives in this `site` folder. Every time you load a page it picks a random mix of
colours, fonts, patterns and shapes from six styles (Toy Robot Workshop, Sticker Notebook,
Ankara Pop, Pixel Arcade, Cotton Cloud, Blueprint Storybook). Visitors can open
"Today's mix" in the corner to see the mix and remix it.

## Add a blog post (you can do this right on github.com)

1. Open `site/src/content/blog/`.
2. Copy `_new-post-template.md` into a new file with a short name, like `my-line-follower.md`.
   The file name becomes the web address: `/blog/my-line-follower/`.
3. Fill in the title, description (Google shows this in results), date and tags.
4. Change `draft: true` to `draft: false`, write your post underneath, and commit.
5. The site rebuilds and goes live by itself in about a minute.

Photos go in `site/public/images/`, then in a post: `![What the photo shows](/images/photo.jpg)`.

## Change your details

Edit `site/src/site.config.ts` for your email, LinkedIn, Instagram and the Google verification code.
The About page text is in `site/src/pages/about.astro`.

## Remove a style from the mix

Open `site/public/mixer.js` and delete that style's block from `DIRECTIONS`.

## Get on Google (free)

1. Go to https://search.google.com/search-console and add your site's address.
2. Pick "HTML tag" verification, copy only the `content="..."` value into
   `googleVerification` in `site.config.ts`, commit, wait a minute, then press Verify.
3. In Search Console open "Sitemaps" and submit `sitemap-index.xml`.
4. Put your site link on LinkedIn, Instagram and your GitHub profile.

## Run it on your own computer (optional)

    cd site
    npm install
    npm run dev
