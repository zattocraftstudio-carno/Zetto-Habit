import React from 'react';
import { getRpgState, getWeeklyBoard, claimWeekly } from '@/actions/rpg';
import { getPreferences } from '@/actions/preferences';
import { SHOP_ITEMS, ACHIEVEMENTS } from '@/lib/rpg';
import { RewardsClient } from '@/components/RewardsClient';

export default async function RewardsPage() {
  const [rpgRes, boardRes, claimRes, prefsRes] = await Promise.all([
    getRpgState(),
    getWeeklyBoard(),
    claimWeekly(),
    getPreferences(),
  ]);
  const prefs = prefsRes.success ? prefsRes.data : null;
  const bn = (prefs?.language ?? 'bn') === 'bn';

  return (
    <RewardsClient
      rpg={rpgRes.success ? rpgRes.data : null}
      board={boardRes.success ? boardRes.data : null}
      claimMsg={claimRes.success ? claimRes.data : null}
      shop={SHOP_ITEMS}
      achievements={ACHIEVEMENTS}
      bn={bn}
    />
  );
}
