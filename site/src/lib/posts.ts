import { getCollection } from 'astro:content';

// Newest first. Drafts only show when running on your own computer.
export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  // Designators like a real board: the oldest post is D1 and numbers never shift.
  return posts.map((p, i) => ({ ...p, ref: `D${posts.length - i}` }));
}
