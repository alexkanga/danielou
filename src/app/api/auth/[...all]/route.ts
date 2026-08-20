import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

function getHandler() {
  return toNextJsHandler(getAuth());
}

export async function GET(request: Request) {
  const { GET } = getHandler();
  return GET(request);
}

export async function POST(request: Request) {
  const { POST } = getHandler();
  return POST(request);
}
