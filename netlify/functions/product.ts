import { getSettings, getProducts, getCategories } from './_lib/api';
import { renderProduct } from './_lib/render';
import { isLang, type Lang } from './_lib/config';

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const [lang, , slug] = url.pathname.split('/').filter(Boolean);
  if (!isLang(lang) || !slug) return new Response('Not found', { status: 404 });

  try {
    const [settings, products, catMap] = await Promise.all([
      getSettings(),
      getProducts(lang),
      getCategories(),
    ]);
    const html = await renderProduct(lang as Lang, slug, settings, products, catMap);
    if (!html) {
      return new Response(
        `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>404</title></head>
<body style="font-family:system-ui;text-align:center;padding:4rem"><h1>404</h1><p><a href="/${lang}">Continental Automobile</a></p></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } },
      );
    }
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('product render failed', err);
    return new Response('<h1>Service temporarily unavailable</h1>', {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }
};

export const config = {
  path: ['/en/product/:slug', '/fr/product/:slug', '/zh/product/:slug'],
};
