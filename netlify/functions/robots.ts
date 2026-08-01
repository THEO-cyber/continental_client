import { renderRobots } from './_lib/render';

export default async (): Promise<Response> =>
  new Response(renderRobots(), { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export const config = { path: '/robots.txt' };
