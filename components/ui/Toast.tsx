'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckIcon, CloseIcon } from '@/components/icons';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: ToastAction;
}

interface ToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info', opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success', opts?: ToastOptions) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, action: opts?.action }]);

      // Auto-dismiss (action toasts stay a bit longer for Undo)
      setTimeout(() => {
        removeToast(id);
      }, opts?.durationMs ?? (opts?.action ? 5000 : 3000));
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        role="region"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded border shadow-lg text-sm transition-all duration-300 ${
              t.type === 'success'
                ? 'bg-[var(--color-primary)] text-white border-transparent'
                : t.type === 'error'
                ? 'bg-[var(--color-danger)] text-white border-transparent'
                : 'bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border-[var(--color-border)]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckIcon size={18} className="shrink-0" />}
              <span className="break-words">{t.message}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    t.type === 'info'
                      ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 hover:opacity-80 rounded"
                aria-label="Dismiss toast"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
