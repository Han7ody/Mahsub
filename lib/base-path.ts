export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const ABSOLUTE_SCHEMES = ['http:', 'https:', 'data:', 'blob:'];

export function withBasePath(path: string): string {
  if (!path) return BASE_PATH || '';

  for (const scheme of ABSOLUTE_SCHEMES) {
    if (path.startsWith(scheme)) return path;
  }

  const base = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return base ? `${base}${normalizedPath}` : normalizedPath;
}
