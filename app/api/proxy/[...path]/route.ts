import { NextRequest, NextResponse } from 'next/server';

const BACKEND = 'http://localhost:8000';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = new URL(req.url);
  const backendUrl = `${BACKEND}/${path}${url.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((val, key) => {
    if (!['host', 'connection'].includes(key.toLowerCase())) {
      headers[key] = val;
    }
  });

  let body: BodyInit | null = null;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    body = await req.arrayBuffer() as BodyInit;
  }

  try {
    const res = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
    });

    const resHeaders = new Headers();
    res.headers.forEach((val, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        resHeaders.set(key, val);
      }
    });

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, { status: res.status, headers: resHeaders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return NextResponse.json({ error: msg, backend: backendUrl }, { status: 502 });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
