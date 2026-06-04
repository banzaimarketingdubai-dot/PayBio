import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('file_id');
    const path = searchParams.get('path');

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response('Telegram Bot Token not configured', { status: 500 });
    }

    let filePath = path;

    if (fileId) {
      // Fetch getFile to retrieve the path
      const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
      if (!getFileRes.ok) {
        return new Response('Failed to get file details from Telegram', { status: 400 });
      }
      const data = await getFileRes.json();
      if (!data.ok || !data.result?.file_path) {
        return new Response('File path not found in Telegram response', { status: 404 });
      }
      filePath = data.result.file_path;
    }

    if (!filePath) {
      return new Response('Missing file_id or path parameter', { status: 400 });
    }

    // Fetch the actual file content
    const fileRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
    if (!fileRes.ok) {
      return new Response('Failed to fetch file from Telegram storage', { status: fileRes.status });
    }

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const fileBuffer = await fileRes.arrayBuffer();

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Telegram file proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
