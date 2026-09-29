'use client';

import React, { useState, useEffect } from 'react';
import { BotIcon } from '@/components/icons';
import { Card } from '@/components/ui/Card';
import { AiChatPanel } from '@/components/AiChatPanel';
import { usePrefs } from '@/components/PrefsProvider';
import { markdownToPlainText } from '@/lib/markdownText';

export function AiTipCard() {
  const { t } = usePrefs();
  const [tip, setTip] = useState<string>(
    'আপনার হ্যাবিটগুলো নিয়মমাফিক অনুশীলন করুন। নিয়মিত ছোট প্রচেষ্টাই দীর্ঘমেয়াদী সফলতা আনে।'
  );
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    // Non-blocking fetch of latest AI coach tip or greeting
    fetch('/api/ai-agent')
      .then((res) => res.json())
      .then((data) => {
        if (data.logs && data.logs.length > 0) {
          const lastAssistant = [...data.logs]
            .reverse()
            .find((l: { role: string }) => l.role === 'assistant');
          if (lastAssistant && lastAssistant.content) {
            // Strip Markdown and truncate on a word boundary. The previous
            // `slice(0, 160) + '...'` leaked raw `##` / `**` markers into the
            // card and cut mid-word.
            const clean = markdownToPlainText(lastAssistant.content, 170);
            if (clean) setTip(clean);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Card padding="md" className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <BotIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                {t('ai.tipTitle')}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-primary)] mt-0.5 leading-relaxed">
              {tip}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsChatOpen(true)}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
        >
          {t('ai.chat')}
        </button>
      </Card>

      <AiChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}
