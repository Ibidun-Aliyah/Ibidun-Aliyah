// Builds links that work whether the site lives at the domain root
// or in a sub-folder (like username.github.io/repo-name/).
export function u(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : '/' + path;
  return base + clean;
}

export function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
