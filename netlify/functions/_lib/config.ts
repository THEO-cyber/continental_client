export const LANGS = ['en', 'fr', 'zh'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

export function pickLang(acceptLanguage = ''): Lang {
  for (const part of acceptLanguage.toLowerCase().split(',')) {
    const code = part.split(';')[0].trim().slice(0, 2);
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}

// Empty strings fail loudly (via the fetch calls that use them) rather than
// throwing at module load, which would turn a missing env var into an
// opaque cold-start crash instead of a debuggable error response.
export const API_BASE = (process.env.API_BASE || '').replace(/\/+$/, '');
export const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');

// Old backend-rendered version used file mtimes to cache-bust static assets;
// a stateless function has no persistent files to stat, so this uses
// Netlify's per-deploy identifiers instead — same purpose, new mechanism.
export function assetVersion(): string {
  return process.env.DEPLOY_ID || process.env.COMMIT_REF || '1';
}
