'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { DownloadIcon } from '@/components/icons';
import { usePrefs } from '@/components/PrefsProvider';
import { exportAnalyticsCsv } from '@/actions/analytics';
import { RangeKey } from '@/lib/analytics';
import { AnalyticsBundle } from '@/lib/analytics';

export function DashboardExport({ data }: { data: AnalyticsBundle | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const params = useSearchParams();
  const [csvLoading, setCsvLoading] = useState(false);

  const range = (params.get('range') || 'month') as RangeKey;
  const from = params.get('from') || undefined;
  const to = params.get('to') || undefined;
  const today = data?.range.end;

  const download = (content: string, mime: string, ext: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${range}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!data) return;
    download(
      JSON.stringify(
        {
          range: data.range,
          overview: data.overview,
          patterns: data.patterns,
          categories: data.categories,
          correlation: data.correlation,
          series: data.series,
        },
        null,
        2
      ),
      'application/json',
      'json'
    );
  };

  const exportCsv = async () => {
    setCsvLoading(true);
    try {
      const res = await exportAnalyticsCsv(range, from, to, today);
      if (res.success) {
        download(res.data, 'text/csv;charset=utf-8', 'csv');
      }
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={exportJson}
        disabled={!data}
        className="gap-1.5"
      >
        <DownloadIcon size={16} />
        <span>JSON</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={exportCsv}
        isLoading={csvLoading}
        disabled={!data}
        className="gap-1.5"
      >
        <DownloadIcon size={16} />
        <span>CSV</span>
      </Button>
      <span className="text-[11px] text-[var(--color-text-secondary)] hidden sm:inline">
        {bn ? 'বর্তমান ভিউ' : 'current view'}
      </span>
    </div>
  );
}
