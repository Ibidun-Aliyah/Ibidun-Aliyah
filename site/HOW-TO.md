# Aliyah's board: how to use it

## Write a post (no code)

1. Go to **https://app.pagescms.org** and log in with GitHub (first time only: allow it to access this repo).
2. Open this repo, then **Posts**, then **Add an entry**.
3. Fill in the title, a one-line summary, the date, and what kind of post it is
   (that picks the LED colour). Add a cover photo if you like, then write the post.
   You can drop photos straight into the post too.
4. **Hide this post (draft)** starts switched on, so nobody sees it yet.
   Switch it off when you're ready, press **Save**, and the post goes live about a minute later.

Works on your phone's browser too.

## Change your details

`site/src/site.config.ts` holds your email, LinkedIn, Instagram and the Google verification code.
The robot's lines are at the top of `site/src/components/Robot.astro`.

## Get on Google (free)

1. Go to https://search.google.com/search-console and add your site's address.
2. Choose "HTML tag", copy only the `content="..."` value into `googleVerification`
   in `site.config.ts`, wait a minute, then press Verify.
3. Under "Sitemaps", submit `sitemap-index.xml`.
4. Put your site link on LinkedIn, Instagram and your GitHub profile.

## Note

The repo is public, so drafts are hidden from the website but still readable on GitHub.
