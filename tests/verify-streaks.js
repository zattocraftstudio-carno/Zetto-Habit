// Unit test script for streak calculations
const assert = require('assert');

// Simulate streaks logic
function isLogCompleted(habit, log) {
  if (!log || log.completed_value === null || log.completed_value === undefined) {
    return false;
  }
  if (habit.goal_type === 'quantity') {
    const target = habit.target_value ?? 1;
    return Number(log.completed_value) >= Number(target);
  }
  return Number(log.completed_value) >= 1;
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function computeCurrentStreak(habit, logs, todayStr) {
  if (!logs || logs.length === 0) return 0;

  const completedDates = new Set();
  for (const log of logs) {
    if (isLogCompleted(habit, log)) {
      completedDates.add(log.log_date);
    }
  }

  if (completedDates.size === 0) return 0;

  const today = parseDate(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  if (habit.frequency_type === 'daily') {
    let streak = 0;
    let checkDate;
    if (completedDates.has(todayStr)) {
      checkDate = new Date(today);
    } else if (completedDates.has(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      return 0;
    }

    while (true) {
      const dStr = formatDate(checkDate);
      if (completedDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  return 0;
}

function computeLongestStreak(habit, logs) {
  if (!logs || logs.length === 0) return 0;

  const completedDates = Array.from(
    new Set(
      logs
        .filter((l) => isLogCompleted(habit, l))
        .map((l) => l.log_date)
    )
  ).sort();

  if (completedDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < completedDates.length; i++) {
    const prev = parseDate(completedDates[i - 1]);
    const curr = parseDate(completedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// RUN TESTS
console.log('--- RUNNING STREAK & LOGIC TESTS ---');

const dailyHabit = {
  id: 'h1',
  name: 'Read Book',
  frequency_type: 'daily',
  goal_type: 'checkbox',
};

const quantityHabit = {
  id: 'h2',
  name: 'Drink Water',
  frequency_type: 'daily',
  goal_type: 'quantity',
  target_value: 8,
};

// Test 1: Zero logs returns 0 streak
assert.strictEqual(computeCurrentStreak(dailyHabit, [], '2026-09-28'), 0, 'Zero logs should return 0 streak');
console.log('✓ Test 1: Zero logs returns 0');

// Test 2: Single completed log today returns 1
const logsToday = [{ habit_id: 'h1', log_date: '2026-09-28', completed_value: 1 }];
assert.strictEqual(computeCurrentStreak(dailyHabit, logsToday, '2026-09-28'), 1);
console.log('✓ Test 2: Completed today returns 1');

// Test 3: Completed yesterday but not yet today keeps streak alive
const logsYesterday = [{ habit_id: 'h1', log_date: '2026-09-27', completed_value: 1 }];
assert.strictEqual(computeCurrentStreak(dailyHabit, logsYesterday, '2026-09-28'), 1);
console.log('✓ Test 3: Completed yesterday keeps streak active');

// Test 4: Consecutive 4 days ending today returns 4
const logsFourDays = [
  { habit_id: 'h1', log_date: '2026-09-25', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-26', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-27', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-28', completed_value: 1 },
];
assert.strictEqual(computeCurrentStreak(dailyHabit, logsFourDays, '2026-09-28'), 4);
console.log('✓ Test 4: Consecutive 4 days returns 4');

// Test 5: Broken streak (missed yesterday) returns 0
const logsBroken = [{ habit_id: 'h1', log_date: '2026-09-26', completed_value: 1 }];
assert.strictEqual(computeCurrentStreak(dailyHabit, logsBroken, '2026-09-28'), 0);
console.log('✓ Test 5: Missed yesterday breaks streak to 0');

// Test 6: Quantity habit requires completed_value >= target_value
const logsQuantityPartial = [{ habit_id: 'h2', log_date: '2026-09-28', completed_value: 5 }]; // target is 8
assert.strictEqual(computeCurrentStreak(quantityHabit, logsQuantityPartial, '2026-09-28'), 0);
console.log('✓ Test 6: Partial quantity (5/8) does NOT count as streak');

const logsQuantityComplete = [{ habit_id: 'h2', log_date: '2026-09-28', completed_value: 8 }];
assert.strictEqual(computeCurrentStreak(quantityHabit, logsQuantityComplete, '2026-09-28'), 1);
console.log('✓ Test 7: Full quantity (8/8) counts as streak');

// Test 8: Longest streak calculation
const logsHistory = [
  { habit_id: 'h1', log_date: '2026-09-01', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-02', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-03', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-04', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-05', completed_value: 1 }, // 5-day streak
  // gap
  { habit_id: 'h1', log_date: '2026-09-27', completed_value: 1 },
  { habit_id: 'h1', log_date: '2026-09-28', completed_value: 1 }, // 2-day streak
];
assert.strictEqual(computeLongestStreak(dailyHabit, logsHistory), 5);
console.log('✓ Test 8: Longest streak correctly computes historical max (5)');

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
