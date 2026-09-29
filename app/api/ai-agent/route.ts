import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { callAIAgent, clearAiHistory, resolveModelChoice, resolveLanguage } from '@/lib/aiAgent';
import { getDbClient } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userMessage = body.message?.trim();
    if (!userMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const model = resolveModelChoice(body.model);
    const language = resolveLanguage(body.language);
    const reportMode = body.report === true;
    const replyLength = body.length === 'short' || body.length === 'detailed' ? body.length : 'normal';
    const { reply, modelUsed, actions, prefsChanged } = await callAIAgent(session.userId, userMessage, model, {
      language,
      reportMode,
      replyLength,
    });
    return NextResponse.json({ reply, modelUsed, actions, prefsChanged });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An error occurred with the AI Coach';
    // Temporary upstream outage (all models throttled/down) is a 503,
    // not a 500 — friendly message only, no stack trace or raw HTTP status.
    const isTemporary =
      /temporarily unavailable|rate limit reached/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isTemporary ? 503 : 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbClient();
    const res = await db.rpc('app_get_recent_ai_logs', {
      p_user_id: session.userId,
      p_limit: 20,
    });

    return NextResponse.json({ logs: (res.data?.logs || []).reverse() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve AI logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearAiHistory(session.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear chat history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
