'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { WhatsAppIcon, ChatIcon } from '@/components/icons';
import { APP_SUPPORT } from '@/lib/support';
import { BnKeys } from '@/lib/i18n/bn';

/**
 * Feedback section.
 *
 * Feedback never touches our database — the message is handed straight to the
 * user's own WhatsApp client, prefilled. That keeps us free of a moderation
 * inbox, keeps user text off our servers, and means the user always keeps a
 * copy of what they sent.
 */
export function FeedbackSection({
  t,
  bn,
  version,
}: {
  t: (k: BnKeys) => string;
  bn: boolean;
  version: string;
}) {
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState<string>('general');
  const [copied, setCopied] = useState(false);

  const TOPICS: { key: string; bn: string; en: string }[] = [
    { key: 'general', bn: 'সাধারণ মতামত', en: 'General feedback' },
    { key: 'bug', bn: 'বাগ রিপোর্ট', en: 'Bug report' },
    { key: 'idea', bn: 'নতুন ফিচার আইডিয়া', en: 'Feature idea' },
    { key: 'issue', bn: 'সমস্যা হচ্ছে', en: 'Something is broken' },
  ];

  function buildLink() {
    const topicLabel = TOPICS.find((x) => x.key === topic);
    const lines = [
      bn ? `*Habit Tracker — ফিডব্যাক* (v${version})` : `*Habit Tracker — Feedback* (v${version})`,
      '',
      `*${bn ? 'বিষয়' : 'Topic'}:* ${topicLabel ? (bn ? topicLabel.bn : topicLabel.en) : ''}`,
      `*${bn ? 'ভাষা' : 'Language'}:* ${bn ? 'বাংলা' : 'English'}`,
    ];
    const body = message.trim();
    if (body) lines.push('', body);
    return APP_SUPPORT.whatsappUrl(lines.join('\n'));
  }

  function openWhatsApp() {
    window.open(buildLink(), '_blank', 'noopener,noreferrer');
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(APP_SUPPORT.whatsappDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the number is visible on screen anyway */
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card padding="md">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] flex items-center justify-center shrink-0">
            <WhatsAppIcon size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {t('settings.feedbackTab')}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {bn
                ? 'আপনার মতামত সরাসরি আমাদের WhatsApp-এ পৌঁছে যাবে — কোনো ফর্ম নয়, কোনো অপেক্ষা নয়।'
                : 'Your message goes straight to our WhatsApp — no forms, no waiting.'}
            </p>
          </div>
        </div>

        {/* What kind of feedback */}
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
          {bn ? 'কী নিয়ে জানাচ্ছেন?' : 'What is this about?'}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TOPICS.map((x) => {
            const active = topic === x.key;
            return (
              <button
                key={x.key}
                type="button"
                onClick={() => setTopic(x.key)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text-primary)]'
                }`}
              >
                {bn ? x.bn : x.en}
              </button>
            );
          })}
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={1200}
          label={bn ? 'আপনার মেসেজ' : 'Your message'}
          placeholder={
            bn
              ? 'যা ভালো লেগেছে, কোথায় সমস্যা হয়েছে, বা কী feature চান — লিখুন…'
              : 'What works well, what broke, or which feature you would love next…'
          }
        />
        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 text-right tabular-nums">
          {message.length}/1200
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
          <Button
            variant="primary"
            size="md"
            onClick={openWhatsApp}
            className="!bg-[#25D366] !text-[#0B3D2C] hover:!bg-[#1EBE5A] gap-2"
          >
            <WhatsAppIcon size={18} />
            {bn ? 'WhatsApp-এ পাঠান' : 'Send on WhatsApp'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={copyNumber}
            className="gap-2 sm:ml-auto"
          >
            <ChatIcon size={16} />
            {copied ? (bn ? 'কপি হয়েছে ✓' : 'Copied ✓') : bn ? 'নম্বর কপি' : 'Copy number'}
          </Button>
        </div>
      </Card>

      {/* The number itself, plainly visible */}
      <Card padding="md">
        <Row
          label={bn ? 'WhatsApp নম্বর' : 'WhatsApp number'}
          right={
            <a
              href={APP_SUPPORT.whatsappUrl(bn ? 'আসসালামু আলাইকুম!' : 'Hello!')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold tabular-nums text-[var(--color-primary)] hover:underline"
            >
              {APP_SUPPORT.whatsappDisplay}
            </a>
          }
        />
        <Row
          label={bn ? 'উত্তরের সময়' : 'Response time'}
          right={
            <span className="text-sm text-[var(--color-text-secondary)]">
              {bn ? 'সাধারণত ২৪ ঘণ্টার মধ্যে' : 'Usually within 24 hours'}
            </span>
          }
        />
        <Row
          label={bn ? 'কী থাকে' : 'What to include'}
          right={
            <span className="text-sm text-[var(--color-text-secondary)]">
              {bn ? 'ফোনের মডেল ও অ্যাপ ভার্সন' : 'Phone model & app version'}
            </span>
          }
        />
      </Card>
    </div>
  );
}

/** Local copy of the shared Row primitive (matches Settings styling). */
function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      {right}
    </div>
  );
}
