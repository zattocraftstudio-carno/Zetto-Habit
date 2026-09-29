export type GreetingBracket = 'morning' | 'afternoon' | 'evening' | 'night';

export const GREETING_KEYS: Record<GreetingBracket, { bn: string; en: string }> = {
  morning: { bn: 'শুভ সকাল', en: 'Good morning' },
  afternoon: { bn: 'শুভ দুপুর', en: 'Good afternoon' },
  evening: { bn: 'শুভ সন্ধ্যা', en: 'Good evening' },
  night: { bn: 'শুভ রাত্রি', en: 'Good night' },
};

/**
 * Time-of-day bracket (PRD §2.2):
 *   04:00–11:59 morning · 12:00–16:59 afternoon · 17:00–20:59 evening · 21:00–03:59 night
 * Pure function of an hour so it can be unit-tested with a mocked clock.
 */
export function greetingForHour(hour: number): GreetingBracket {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function greetingText(hour: number, bn: boolean): string {
  const bracket = greetingForHour(hour);
  return bn ? GREETING_KEYS[bracket].bn : GREETING_KEYS[bracket].en;
}

export function greetingForUser(hour: number, username: string, bn: boolean): string {
  return `${greetingText(hour, bn)}, ${username}`;
}
