import { getSettings, getProducts, getCategories } from './_lib/api';
import { renderHome } from './_lib/render';
import { isLang, type Lang } from './_lib/config';

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const lang = url.pathname.slice(1);
  if (!isLang(lang)) return new Response('Not found', { status: 404 });

  try {
    const [settings, products, catMap] = await Promise.all([
      getSettings(),
      getProducts(lang),
      getCategories(),
    ]);
    const html = await renderHome(lang as Lang, settings, products, catMap);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  } catch (err) {
    console.error('home render failed', err);
    return new Response('<h1>Service temporarily unavailable</h1>', {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }
};

export const config = { path: ['/en', '/fr', '/zh'] };
