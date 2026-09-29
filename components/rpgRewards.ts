'use client';

import { RpgRewardPayload } from '@/lib/offlineQueue';

type ToastFn = (
  message: string,
  type?: 'success' | 'error' | 'info',
  opts?: { action?: { label: string; onClick: () => void }; durationMs?: number }
) => void;

/** Celebration toasts for RPG rewards earned from a log. Call after success. */
export function showRpgRewards(rpg: RpgRewardPayload | undefined, toast: ToastFn, bn: boolean) {
  if (!rpg) return;
  if (rpg.xp > 0 || rpg.coins > 0) {
    const parts: string[] = [];
    if (rpg.xp > 0) parts.push(`+${rpg.xp} XP`);
    if (rpg.coins > 0) parts.push(`+${rpg.coins} 🪙`);
    toast(`${bn ? 'পুরস্কার' : 'Reward'}: ${parts.join(' ')}`, 'success');
  }
  for (const q of rpg.questsDone.slice(0, 3)) {
    toast(`⚔️ ${bn ? 'কোয়েস্ট শেষ' : 'Quest done'}: ${q}`, 'success');
  }
  for (const a of rpg.achievements.slice(0, 3)) {
    toast(`🏅 ${bn ? 'অর্জন' : 'Achievement'}: ${a}`, 'success');
  }
  if (rpg.boxesEarned > 0) {
    toast(`🎁 ${rpg.boxesEarned} ${bn ? 'মিস্ট্রি বক্স পেয়েছেন!' : 'mystery box earned!'}`, 'success');
  }
  if (rpg.leveledUp && rpg.newLevel) {
    toast(
      `🎉 LEVEL UP! ${rpg.newLevel.emoji} ${bn ? rpg.newLevel.nameBn : rpg.newLevel.name} — ${bn ? 'নতুন থিম আনলক!' : 'new theme unlocked!'}`,
      'success',
      { durationMs: 6000 }
    );
  }
}
