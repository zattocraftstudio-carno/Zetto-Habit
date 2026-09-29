'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getFeedbackFlags, setFeedbackFlags, FeedbackFlags } from '@/actions/feedback';
import { completionFeedback, primeAudio } from '@/lib/feedback';

interface FeedbackContextType extends FeedbackFlags {
  ready: boolean;
  setFlags: (p: { soundEnabled?: boolean; hapticsEnabled?: boolean }) => Promise<boolean>;
  celebrate: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeedbackFlags>({
    soundEnabled: true,
    hapticsEnabled: true,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getFeedbackFlags()
      .then((res) => {
        if (!alive) return;
        if (res.success) setFlags(res.data);
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Unlock audio on the first real gesture (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      primeAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const setFlag = useCallback(
    async (p: { soundEnabled?: boolean; hapticsEnabled?: boolean }) => {
      const before = { ...flags };
      // optimistic
      setFlags((prev) => ({ ...prev, ...p }));
      const res = await setFeedbackFlags(p);
      if (res.success) {
        setFlags(res.data);
        return true;
      }
      setFlags(before);
      return false;
    },
    [flags]
  );

  const celebrate = useCallback(() => {
    completionFeedback({ sound: flags.soundEnabled, haptics: flags.hapticsEnabled });
  }, [flags.soundEnabled, flags.hapticsEnabled]);

  return (
    <FeedbackContext.Provider
      value={{ ...flags, ready, setFlags: setFlag, celebrate }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
