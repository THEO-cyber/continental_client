import { getSitemapData } from './_lib/api';
import { renderSitemap } from './_lib/render';

export default async (): Promise<Response> => {
  try {
    const products = await getSitemapData();
    const xml = await renderSitemap(products);
    return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  } catch (err) {
    console.error('sitemap render failed', err);
    return new Response('<?xml version="1.0"?><error/>', {
      status: 502,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
};

export const config = { path: '/sitemap.xml' };
