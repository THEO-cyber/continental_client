import { pickLang } from './_lib/config';

export default async (req: Request): Promise<Response> => {
  const lang = pickLang(req.headers.get('accept-language') || '');
  return new Response(null, { status: 302, headers: { Location: `/${lang}` } });
};

export const config = { path: '/' };
