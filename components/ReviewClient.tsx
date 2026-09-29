'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePrefs } from '@/components/PrefsProvider';

export function ReviewClient({
  weekLabel,
  summary,
  bn,
}: {
  weekLabel: string;
  summary: string;
  bn: boolean;
}) {
  const { prefs } = usePrefs();
  const [comment, setComment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getComment = async () => {
    setLoading(true);
    setError(null);
    try {
      const ask = bn
        ? `গত সপ্তাহের (${weekLabel}) রিভিউ দাও। ডেটা: ${summary}। সংক্ষেপে: কী ভালো হয়েছে, কী ঠিক করতে হবে, ২টা পরামর্শ।`
        : `Review my last week (${weekLabel}). Data: ${summary}. Briefly: what went well, what to fix, 2 tips.`;
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ask,
          model: 'auto',
          language: prefs.language,
          length: prefs.ai.replyLength,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setComment(data.reply);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {bn ? 'AI-র মন্তব্য' : 'AI comment'}
        </h2>
        <Button variant="primary" size="sm" onClick={getComment} isLoading={loading}>
          {bn ? 'মন্তব্য আনুন' : 'Get comment'}
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {comment ? (
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{comment}</p>
      ) : (
        !loading && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'বাটন চাপলে AI এই সপ্তাহের ডেটা দেখে মন্তব্য দেবে।' : 'Press the button and the AI will comment on this week.'}
          </p>
        )
      )}
    </Card>
  );
}
