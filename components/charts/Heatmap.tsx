'use client';

import React, { useState } from 'react';

export interface HeatmapDay {
  date: string;
  rate: number;
  completedCount: number;
  totalHabits: number;
}

export function Heatmap({ data }: { data: HeatmapDay[] }) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapDay | null>(null);

  // Group into columns of 7 days (weeks)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];
  data.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === data.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
        No habits created yet to generate heatmap.
      </div>
    );
  }

  return (
    <div>
      {hoveredCell && (
        <div className="mb-3 text-xs font-semibold px-2.5 py-1 rounded bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] inline-block">
          {hoveredCell.date}: {hoveredCell.completedCount}/{hoveredCell.totalHabits} completed ({hoveredCell.rate}%)
        </div>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1.5 min-w-[680px]">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((cell) => {
                const opacity =
                  cell.rate === 0
                    ? 0.15
                    : cell.rate <= 25
                      ? 0.35
                      : cell.rate <= 50
                        ? 0.6
                        : cell.rate <= 75
                          ? 0.8
                          : 1;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onMouseEnter={() => setHoveredCell(cell)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onFocus={() => setHoveredCell(cell)}
                    onBlur={() => setHoveredCell(null)}
                    className="w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 focus-visible:outline-none"
                    style={{
                      backgroundColor:
                        cell.rate === 0
                          ? 'var(--color-missed)'
                          : 'var(--color-primary)',
                      opacity,
                    }}
                    aria-label={`${cell.date}: ${cell.rate}%`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4 text-[11px] text-[var(--color-text-secondary)]">
          <span>Less</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-xs bg-[var(--color-missed)] opacity-40" />
            <span className="w-3 h-3 rounded-xs bg-[var(--color-primary)] opacity-35" />
            <span className="w-3 h-3 rounded-xs bg-[var(--color-primary)] opacity-60" />
            <span className="w-3 h-3 rounded-xs bg-[var(--color-primary)] opacity-80" />
            <span className="w-3 h-3 rounded-xs bg-[var(--color-primary)] opacity-100" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
