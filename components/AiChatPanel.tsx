'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CloseIcon, BotIcon, TrashIcon, DashboardIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { usePrefs } from '@/components/PrefsProvider';
import { renderMarkdown } from '@/components/Markdown';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'en', label: 'EN' },
];

const LANG_STORAGE_KEY = 'ai_coach_lang';

// Minimal markdown renderer for assistant replies & reports:
export function AiChatPanel({ isOpen, onClose }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('auto');
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentAtRef = useRef<number>(0);
  const DEBOUNCE_MS = 800;
  const { prefs } = usePrefs();
  const refreshPrefs = usePrefs().refresh;
  const router = useRouter();

  // Load saved language choice (Settings prefs fill in when untouched)
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
      if (savedLang && LANGUAGE_OPTIONS.some((o) => o.value === savedLang)) {
        setLanguage(savedLang);
      } else if (prefs.ai.language === 'bn' || prefs.ai.language === 'en') {
        setLanguage(prefs.ai.language);
      }
    } catch {
      // localStorage unavailable — keep defaults
    }
  }, [prefs.ai.language]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, value);
    } catch {
      // non-blocking
    }
  };

  // Fetch past conversation history on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetch('/api/ai-agent')
        .then((res) => res.json())
        .then((data) => {
          if (data.logs && Array.isArray(data.logs)) {
            setMessages(
              data.logs.map((l: { id: string; role: 'user' | 'assistant'; content: string }) => ({
                id: l.id,
                role: l.role,
                content: l.content,
              }))
            );
          }
        })
        .catch(() => {
          // Non-blocking
        });
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const sendToAgent = async (userText: string, report: boolean) => {
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, model: 'auto', language, report, length: prefs.ai.replyLength }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get AI coach response');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, actions: data.actions || [] },
      ]);
      if (data.actions && data.actions.length > 0) {
        // AI changed app data (habit/log/archive) — revalidate every page
        // so Home, Track and Dashboard update instantly, not just Dashboard.
        router.refresh();
      }
      if (data.prefsChanged) {
        // AI changed settings server-side — refresh theme/language UI instantly
        await refreshPrefs();
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reaching AI Coach';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Client-side debouncing to avoid rapid-fire requests
    const now = Date.now();
    if (now - lastSentAtRef.current < DEBOUNCE_MS) return;
    lastSentAtRef.current = now;

    await sendToAgent(trimmed, false);
  };

  const handleReport = async () => {
    if (isLoading) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < DEBOUNCE_MS) return;
    lastSentAtRef.current = now;

    // Visible user message so the history reads naturally
    const reportAsk =
      language === 'en'
        ? 'Give me my detailed habit report'
        : 'আমার বিস্তারিত habit রিপোর্ট দাও';
    await sendToAgent(reportAsk, true);
  };

  const handleClearChat = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setIsClearing(true);
    try {
      const res = await fetch('/api/ai-agent', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear chat history');
      }
      setMessages([]);
      setError(null);
      setConfirmClear(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error clearing chat';
      setError(msg);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out side panel */}
      <aside
        className="fixed inset-y-0 right-0 max-w-full w-full sm:w-[420px] bg-[var(--color-card-bg)] border-l border-[var(--color-border)] shadow-2xl flex flex-col pointer-events-auto z-10 transition-transform duration-300"
        role="dialog"
        aria-label="AI Habit Coach"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-card-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
              <BotIcon size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                AI Habit Coach
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {prefs.language === 'en' ? 'Helpful advice & analysis' : 'সহায়ক পরামর্শ ও বিশ্লেষণ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              disabled={isClearing || messages.length === 0}
              className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-missed)]/20 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={confirmClear ? 'Confirm chat deletion' : 'Delete chat history'}
              title={confirmClear ? 'আবার চাপুন মুছে ফেলতে' : 'Chat history মুছুন'}
            >
              <TrashIcon size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20"
              aria-label="Close AI Coach"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Language switch bar */}
        <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-card-bg)] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] shrink-0">
              ভাষা:
            </span>
            <div className="flex gap-1" role="group" aria-label="Reply language">
              {LANGUAGE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleLanguageChange(o.value)}
                  disabled={isLoading}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    language === o.value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-missed)]/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleReport}
              disabled={isLoading}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-[var(--color-accent)]/15 text-[#D97724] dark:text-[#F4A259] hover:bg-[var(--color-accent)]/25 disabled:opacity-40"
              title={prefs.language === 'en' ? 'Detailed progress report' : 'বিস্তারিত progress রিপোর্ট'}
            >
              <DashboardIcon size={14} />
              <span>{prefs.language === 'en' ? 'Report' : 'রিপোর্ট'}</span>
            </button>
          </div>

          {confirmClear && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--color-danger)] font-medium">
                Chat history মুছে যাবে। মুছবেন?
              </span>
              <button
                onClick={handleClearChat}
                disabled={isClearing}
                className="text-[11px] font-bold px-2 py-1 rounded bg-[var(--color-danger)] text-white hover:opacity-90 disabled:opacity-50"
              >
                হ্যাঁ
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[11px] font-semibold px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]"
              >
                না
              </button>
            </div>
          )}
        </div>

        {/* Message Area (history from ai_agent_logs) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--color-text-secondary)]">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-3">
                <BotIcon size={24} />
              </div>
              <p className="font-medium text-[var(--color-text-primary)] mb-1">
                কেমন আছেন? আমি আপনার হ্যাবিট কোচ!
              </p>
              <p className="text-xs max-w-xs">
                Habit বানানো, track করা, রিপোর্ট — সব আমাকে বলুন। যেমন: &quot;প্রতিদিন ৮ গ্লাস পানির habit বানাও&quot;
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%] space-y-1.5">
                  <div
                    className={`rounded-lg p-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[var(--color-primary)] text-white rounded-br-none shadow-xs'
                        : 'bg-[var(--color-missed)]/20 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-bl-none'
                    }`}
                  >
                    {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                  </div>
                  {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {m.actions.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                        >
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Animation (Pulse dots) */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-missed)]/20 border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-1.5 rounded-bl-none">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded border border-[var(--color-danger)]/20">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3.5 border-t border-[var(--color-border)] bg-[var(--color-card-bg)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={prefs.language === 'en' ? 'Build, track, report...' : 'Habit বানাও, track করো, রিপোর্ট চাও...'}
              className="flex-1 min-h-[44px] px-3 py-2 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] focus-visible:outline-[var(--color-primary)]"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !input.trim()}
              className="px-4"
            >
              {prefs.language === 'en' ? 'Send' : 'পাঠান'}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
