import { API_BASE } from './config';

export interface PublicProduct {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string;
  category: string;
  brand: string;
  image: string;
  inStock: boolean;
}

export interface PublicSettings {
  settings: {
    phone: string; whatsapp: string; email: string;
    address: string; hours: string; facebook: string;
  };
  business: {
    name: string; legalName: string; city: string; region: string;
    country: string; countryCode: string; latitude: number; longitude: number;
  };
}

export type CategoryMap = Record<string, { en: string; fr: string; zh: string }>;

const TIMEOUT_MS = 8000;

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getSettings(): Promise<PublicSettings> {
  return get<PublicSettings>('/api/public/settings');
}

export async function getProducts(lang: string): Promise<PublicProduct[]> {
  const { products } = await get<{ products: PublicProduct[] }>(
    `/api/public/products?lang=${encodeURIComponent(lang)}`,
  );
  return products;
}

export async function getCategories(): Promise<CategoryMap> {
  const { categories } = await get<{
    categories: Array<{ key: string; name_en: string; name_fr: string; name_zh: string }>;
  }>('/api/public/categories');
  const map: CategoryMap = {};
  for (const c of categories) map[c.key] = { en: c.name_en, fr: c.name_fr, zh: c.name_zh };
  return map;
}

export async function getSitemapData(): Promise<Array<{ slug: string; updatedAt: string }>> {
  const { products } = await get<{ products: Array<{ slug: string; updatedAt: string }> }>(
    '/api/public/sitemap-data',
  );
  return products;
}
