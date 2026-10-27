import type { APIRoute } from 'astro';
import { localizedUrls } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const urls = localizedUrls(site!, import.meta.env.BASE_URL);
  const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.values(urls).map(url => `<url><loc>${escapeXml(url)}</loc></url>`).join('')}</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
