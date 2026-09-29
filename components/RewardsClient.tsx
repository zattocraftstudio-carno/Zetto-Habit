'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  buyShopItem,
  drinkPotion,
  openMysteryBox,
  RpgState,
} from '@/actions/rpg';
import type { ShopItem, AchievementDef, getLeaderboard } from '@/lib/rpg';

type Board = Awaited<ReturnType<typeof getLeaderboard>>;

export function RewardsClient({
  rpg,
  board,
  claimMsg,
  shop,
  achievements,
  bn,
}: {
  rpg: RpgState | null;
  board: Board | null;
  claimMsg: string | null;
  shop: ShopItem[];
  achievements: AchievementDef[];
  bn: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<'shop' | 'boxes' | 'board' | 'ach'>('shop');
  const [busy, setBusy] = useState(false);
  const [boxResult, setBoxResult] = useState<string | null>(null);

  if (!rpg) {
    return (
      <Card padding="md" className="text-center py-10 text-sm text-[var(--color-text-secondary)]">
        {bn ? 'লোড করা যায়নি।' : 'Could not load.'}
      </Card>
    );
  }
  const p = rpg.profile;
  const unlocked = new Set(rpg.achievements);

  const buy = async (key: string) => {
    setBusy(true);
    try {
      const res = await buyShopItem(key);
      if (res.success) {
        toast(`🛍️ ${res.data}`, 'success');
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast('Failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setBusy(true);
    try {
      const res = await openMysteryBox();
      if (res.success) {
        setBoxResult(bn ? res.data.labelBn : res.data.label);
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast('Failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: 'shop', label: bn ? '🛍️ দোকান' : '🛍️ Shop' },
    { id: 'boxes', label: `🎁 ${bn ? 'বক্স' : 'Boxes'} (${p.mystery_boxes})` },
    { id: 'board', label: bn ? '🏆 লিডারবোর্ড' : '🏆 Leaderboard' },
    { id: 'ach', label: `🏅 ${bn ? 'অর্জন' : 'Achievements'} (${unlocked.size}/${achievements.length})` },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
          {bn ? 'রিওয়ার্ড' : 'Rewards'}
        </h1>
        <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-[var(--color-accent)]/15 text-[#D97724] dark:text-[#F4A259]">
          🪙 {p.coins_total}
        </span>
      </div>

      {claimMsg && (
        <Card padding="md" className="border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 text-sm font-medium">
          {claimMsg}
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${
              tab === tb.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shop.map((item) => (
            <Card key={item.key} padding="md" className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{item.emoji}</span>
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">{bn ? item.nameBn : item.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{bn ? item.descBn : item.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-[#D97724] dark:text-[#F4A259]">🪙 {item.price}</span>
                <Button variant="primary" size="sm" disabled={busy || p.coins_total < item.price} onClick={() => buy(item.key)}>
                  {bn ? 'কিনুন' : 'Buy'}
                </Button>
              </div>
            </Card>
          ))}
          {p.xp_potions > 0 && (
            <Card padding="md" className="flex items-center justify-between">
              <p className="text-sm font-semibold">🧪 XP Potion × {p.xp_potions}</p>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const res = await drinkPotion();
                  if (res.success) {
                    toast(bn ? '২× XP চালু (১ ঘণ্টা)!' : '2× XP active (1 hour)!', 'success');
                    router.refresh();
                  } else toast(res.error, 'error');
                }}
              >
                {bn ? 'পান করুন' : 'Drink'}
              </Button>
            </Card>
          )}
        </div>
      )}

      {tab === 'boxes' && (
        <Card padding="lg" className="text-center">
          <div className="text-6xl mb-3">🎁</div>
          <p className="font-bold text-lg text-[var(--color-text-primary)]">
            {p.mystery_boxes} {bn ? 'বক্স আছে' : 'boxes available'}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-5">
            {bn ? `খোলা হয়েছে: ${p.boxes_opened}` : `Opened: ${p.boxes_opened}`}
          </p>
          <Button variant="primary" size="md" disabled={busy || p.mystery_boxes <= 0} onClick={open}>
            {bn ? 'বক্স খুলুন' : 'Open a box'}
          </Button>
        </Card>
      )}

      {tab === 'board' && (
        <Card padding="md">
          <h2 className="font-semibold mb-1 text-[var(--color-text-primary)]">
            {bn ? 'সাপ্তাহিক লিডারবোর্ড' : 'Weekly Leaderboard'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {bn ? 'এই সপ্তাহের XP — প্রতি সোমবার রিসেট' : 'This week’s XP — resets every Monday'}
            {board && board.myRank > 0 && ` • ${bn ? 'আপনার rank' : 'Your rank'} #${board.myRank}`}
          </p>
          {!board || board.top.length === 0 ? (
            <p className="text-xs text-[var(--color-text-secondary)] text-center py-6">
              {bn ? 'এখনো কেউ XP পায়নি।' : 'No XP yet this week.'}
            </p>
          ) : (
            <ol className="space-y-2">
              {board.top.map((r, i) => (
                <li
                  key={r.username}
                  className={`flex items-center gap-3 p-2.5 rounded border ${
                    r.you ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'
                  }`}
                >
                  <span className="w-7 text-center font-bold tabular-nums">
                    {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="flex-1 font-semibold truncate">
                    {r.username} {r.you && <span className="text-[10px] text-[var(--color-primary)]">(you)</span>}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">Lv{r.level}</span>
                  <span className="font-bold tabular-nums text-[var(--color-primary)]">{r.weeklyXp} XP</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {tab === 'ach' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((a) => {
            const has = unlocked.has(a.key);
            const show = has || !a.hidden;
            return (
              <Card key={a.key} padding="md" className={has ? 'border-[var(--color-primary)]/40' : 'opacity-70'}>
                <p className="font-semibold text-sm text-[var(--color-text-primary)]">
                  {show ? (bn ? a.nameBn : a.name) : '❓ Secret'}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {show ? a.desc : bn ? 'লুকানো অর্জন — খুঁজে বের করুন!' : 'Hidden — discover it!'}
                </p>
                {has && <p className="text-[11px] font-bold text-[var(--color-primary)] mt-1.5">✓ Unlocked</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={boxResult !== null} onClose={() => setBoxResult(null)} title={bn ? 'মিস্ট্রি বক্স!' : 'Mystery Box!'}>
        <div className="text-center py-6">
          <div className="text-6xl mb-4 animate-habit-pop">🎉</div>
          <p className="text-xl font-bold">{boxResult}</p>
          <div className="mt-6">
            <Button variant="primary" size="md" onClick={() => setBoxResult(null)}>
              {bn ? 'দারুণ!' : 'Awesome!'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
