import { handleGenerate } from './_generate';

export const config = { runtime: 'edge' };

export default function handler(req: Request): Promise<Response> {
  return handleGenerate(req, process.env.GEMINI_API_KEY);
}
