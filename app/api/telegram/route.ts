import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'info';
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      status: 'disabled',
      configured: false,
      message: 'TELEGRAM_BOT_TOKEN environment variable is not set. Set it in .env.local to activate real Telegram bot functionality.',
      instructions: [
        '1. Create a Telegram bot via @BotFather on Telegram.',
        '2. Copy the HTTP API Bot Token.',
        '3. Add TELEGRAM_BOT_TOKEN="<your_token>" to .env.local.',
        '4. Set webhook via POST /api/telegram with { "webhookUrl": "https://your-domain.com/api/telegram/webhook" }.',
      ],
    });
  }

  try {
    if (action === 'getMe') {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'getWebhookInfo') {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Default info response
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    return NextResponse.json({
      status: 'active',
      configured: true,
      bot: meData.result || null,
      webhookEndpoint: '/api/telegram/webhook',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to query Telegram Bot API' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const webhookUrl = body.webhookUrl;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl parameter required in JSON body' }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to set Telegram webhook' }, { status: 500 });
  }
}
