import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useDashboard } from '../hooks/useDashboard.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const periods = [
  { value: 'weekly', label: 'Weekly', caption: 'Last 12 weeks', groupBy: 'Week' },
  { value: 'monthly', label: 'Monthly', caption: 'Last 12 months', groupBy: 'Month' },
  { value: 'yearly', label: 'Yearly', caption: 'Last 5 years', groupBy: 'Year' },
];

const fallbackKpis = [
  { label: 'Signups', value: '-', delta: '', tone: 'muted' },
  { label: 'Active Users', value: '-', delta: '', tone: 'muted' },
  { label: 'Paid Subscribers', value: '-', delta: '', tone: 'muted' },
  { label: 'Revenue', value: '-', delta: '', tone: 'muted' },
];

function titleize(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, suffix = '') {
  const parsed = toNumber(value);
  if (parsed === null) return value === undefined || value === null || value === '' ? '-' : String(value);
  const formatted = new Intl.NumberFormat('en', {
    maximumFractionDigits: suffix === '%' ? 1 : 0,
  }).format(parsed);
  return `${formatted}${suffix}`;
}

function formatCurrency(value) {
  const parsed = toNumber(value);
  if (parsed === null) return '-';
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(parsed);
}

function formatDateLabel(value, period) {
  if (!value) return '';
  const str = String(value);

  // Label by the data's actual granularity (parse locally to avoid the
  // UTC-shift that turns "2025-11" into October in behind-UTC timezones).

  // Year bucket: "2026"
  if (/^\d{4}$/.test(str)) return str;

  // Month bucket: "2026-05" -> "May 2026"
  const month = /^(\d{4})-(\d{2})$/.exec(str);
  if (month) {
    const date = new Date(Number(month[1]), Number(month[2]) - 1, 1);
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date);
  }

  // Day bucket: "2026-05-21" -> "May 21"
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (day) {
    const date = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }

  // Fallback for ISO timestamps or anything else.
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;
  const options = period === 'yearly'
    ? { month: 'short', year: 'numeric' }
    : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en', options).format(date);
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function pickArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  const object = asObject(value);
  for (const key of ['items', 'trend', 'series', 'data', 'results', 'rows', ...keys]) {
    if (Array.isArray(object[key])) return object[key];
  }
  for (const key of keys) {
    const nested = asObject(object[key]);
    for (const nestedKey of ['items', 'trend', 'series', 'data', 'results', 'rows']) {
      if (Array.isArray(nested[nestedKey])) return nested[nestedKey];
    }
  }
  return [];
}

function valueFrom(item, keys) {
  const object = asObject(item);
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
}

function normalizeKpis(overview) {
  const source = asObject(overview);
  const sourceArray = Array.isArray(overview)
    ? overview
    : pickArray(source, ['cards', 'kpis', 'metrics', 'overview']);

  if (sourceArray.length) {
    return sourceArray.slice(0, 4).map((item, index) => {
      const rawDelta = valueFrom(item, ['delta', 'change', 'changePercent', 'percentChange', 'changePercentage', 'percentageChange', 'rate']);
      const deltaNumber = toNumber(rawDelta);
      return {
        label: valueFrom(item, ['label', 'title', 'name', 'key']) || fallbackKpis[index]?.label || 'Metric',
        value: formatNumber(valueFrom(item, ['value', 'total', 'count', 'current', 'amount']), valueFrom(item, ['suffix', 'unit']) || ''),
        delta: rawDelta === undefined ? '' : `${deltaNumber !== null && deltaNumber > 0 ? '+' : ''}${formatNumber(rawDelta, '%')} vs previous`,
        tone: deltaNumber === null ? 'muted' : deltaNumber >= 0 ? 'up' : 'down',
      };
    });
  }

  const entries = Object.entries(source).filter(([, value]) => value !== null && value !== undefined);
  const cards = entries.slice(0, 4).map(([key, value], index) => {
    const metric = asObject(value);
    const rawValue = Object.keys(metric).length
      ? valueFrom(metric, ['value', 'total', 'count', 'current', 'amount', 'rate'])
      : value;
    const suffix = valueFrom(metric, ['suffix', 'unit']) || (String(key).toLowerCase().includes('rate') ? '%' : '');
    const rawDelta = valueFrom(metric, ['delta', 'change', 'changePercent', 'percentChange', 'changePercentage', 'percentageChange']);
    const deltaNumber = toNumber(rawDelta);
    return {
      label: valueFrom(metric, ['label', 'title', 'name']) || titleize(key),
      value: formatNumber(rawValue, suffix),
      delta: rawDelta === undefined ? '' : `${deltaNumber !== null && deltaNumber > 0 ? '+' : ''}${formatNumber(rawDelta, '%')} vs previous`,
      tone: deltaNumber === null ? 'muted' : deltaNumber >= 0 ? 'up' : 'down',
      index,
    };
  });

  return cards.length ? cards : fallbackKpis;
}

function normalizeSignups(data, period) {
  return pickArray(data).map((item, index) => ({
    label: formatDateLabel(valueFrom(item, ['date', 'period', 'month', 'week', 'day']), period)
      || valueFrom(item, ['label'])
      || String(index + 1),
    count: toNumber(valueFrom(item, ['count', 'total', 'value', 'signups'])) ?? 0,
  }));
}

function normalizePaidVsFree(data, period) {
  const source = asObject(data);
  const rows = pickArray(data);

  let totalSignups = 0;
  let totalPaid = 0;
  let totalFreeExplicit = 0;
  let hasExplicitFree = false;

  const trend = rows.map((item, index) => {
    const label = formatDateLabel(valueFrom(item, ['date', 'period', 'month', 'week', 'day']), period)
      || valueFrom(item, ['label'])
      || String(index + 1);

    // Explicit paid/free if the backend sends them; otherwise derive from
    // signups/newPaid: paid = conversions, free = signups that didn't convert.
    const explicitPaid = toNumber(valueFrom(item, ['paid', 'paidUsers', 'paidSubscribers', 'premium']));
    const explicitFree = toNumber(valueFrom(item, ['free', 'freeUsers', 'freeSubscribers', 'unpaid']));
    const signups = toNumber(valueFrom(item, ['signups', 'count', 'total'])) ?? 0;
    const newPaid = toNumber(valueFrom(item, ['newPaid', 'paidConversions'])) ?? explicitPaid ?? 0;

    const paid = explicitPaid ?? newPaid;
    const free = explicitFree ?? Math.max(0, signups - newPaid);

    totalSignups += signups;
    totalPaid += paid;
    if (explicitFree !== null) {
      hasExplicitFree = true;
      totalFreeExplicit += explicitFree;
    }

    return { label, paid: Math.max(0, paid), free: Math.max(0, free) };
  });

  // Donut = totals across the whole period. Prefer an explicit snapshot, then
  // summed explicit free, else derive free as (total signups - total paid).
  const snapshot = asObject(source.snapshot || source.totals || source.summary);
  const snapshotPaid = toNumber(valueFrom(snapshot, ['paid', 'paidUsers', 'paidSubscribers', 'premium', 'subscribed']));
  const snapshotFree = toNumber(valueFrom(snapshot, ['free', 'freeUsers', 'freeSubscribers', 'unpaid']));

  const donutPaid = snapshotPaid ?? totalPaid;
  const donutFree = snapshotFree ?? (hasExplicitFree ? totalFreeExplicit : Math.max(0, totalSignups - totalPaid));

  return {
    paid: Math.max(0, donutPaid),
    free: Math.max(0, donutFree),
    trend,
  };
}

function normalizeRevenue(data, period) {
  const source = asObject(data);
  const points = pickArray(data, ['revenue', 'chart']).map((item, index) => ({
    label: formatDateLabel(valueFrom(item, ['date', 'period', 'month', 'week', 'day']), period)
      || valueFrom(item, ['label'])
      || String(index + 1),
    revenue: toNumber(valueFrom(item, ['revenue', 'mrr', 'amount', 'total', 'value'])) ?? 0,
  }));

  const periodTotal = points.reduce((sum, point) => sum + point.revenue, 0);
  // Use an explicit MRR if the backend provides one; otherwise show the
  // period's total revenue (summing the trend), not just the last day.
  const explicitMrr = toNumber(valueFrom(source, ['mrr', 'currentMrr', 'monthlyRecurringRevenue', 'totalMrr']));
  const total = explicitMrr ?? periodTotal;

  return {
    total,
    isMrr: explicitMrr !== null,
    trend: points,
  };
}

export function DashboardPage() {
  const [period, setPeriod] = useState('monthly');
  const dashboard = useDashboard(period);
  const { isLoading, isError } = dashboard;
  const signupsRef = useRef(null);
  const paidPieRef = useRef(null);
  const paidTrendRef = useRef(null);
  const revenueRef = useRef(null);

  const selectedPeriod = periods.find((item) => item.value === period) || periods[1];
  const kpis = useMemo(() => normalizeKpis(dashboard.overview), [dashboard.overview]);
  const signups = useMemo(() => normalizeSignups(dashboard.signupsTrend, period), [dashboard.signupsTrend, period]);
  const paidVsFree = useMemo(() => normalizePaidVsFree(dashboard.paidVsFree, period), [dashboard.paidVsFree, period]);
  const revenue = useMemo(() => normalizeRevenue(dashboard.revenue, period), [dashboard.revenue, period]);

  useEffect(() => {
    if (isLoading) return undefined;

    const grid = 'rgba(255,255,255,.06)';
    Chart.defaults.color = '#939aa6';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, sans-serif';

    const charts = [];
    if (signupsRef.current) {
      charts.push(new Chart(signupsRef.current, {
        type: 'line',
        data: {
          labels: signups.map((item) => item.label),
          datasets: [{
            label: 'Signups',
            data: signups.map((item) => item.count),
            borderColor: '#3ddc6f',
            backgroundColor: 'rgba(61,220,111,.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5,
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ${formatNumber(context.raw)}`,
              },
            },
          },
          scales: { x: { grid: { display: false } }, y: { grid: { color: grid }, beginAtZero: true, ticks: { precision: 0, stepSize: 1 } } },
        },
      }));
    }

    if (paidPieRef.current) {
      charts.push(new Chart(paidPieRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Paid', 'Free'],
          datasets: [{
            data: [paidVsFree.paid, paidVsFree.free],
            backgroundColor: ['#3ddc6f', '#5b9dff'],
            borderColor: '#0f1217',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: { legend: { position: 'bottom' } },
        },
      }));
    }

    if (paidTrendRef.current) {
      charts.push(new Chart(paidTrendRef.current, {
        type: 'bar',
        data: {
          labels: paidVsFree.trend.map((item) => item.label),
          datasets: [
            { label: 'Paid', data: paidVsFree.trend.map((item) => item.paid), backgroundColor: '#3ddc6f', borderRadius: 5 },
            { label: 'Free', data: paidVsFree.trend.map((item) => item.free), backgroundColor: '#5b9dff', borderRadius: 5 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ${formatNumber(context.raw)}`,
              },
            },
          },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, grid: { color: grid }, beginAtZero: true, ticks: { precision: 0, stepSize: 1 } },
          },
        },
      }));
    }

    if (revenueRef.current) {
      charts.push(new Chart(revenueRef.current, {
        type: 'bar',
        data: {
          labels: revenue.trend.map((item) => item.label),
          datasets: [{
            data: revenue.trend.map((item) => item.revenue),
            backgroundColor: '#5b9dff',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => ` Revenue: ${formatCurrency(context.raw)}` } },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: grid }, beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } },
          },
        },
      }));
    }

    return () => charts.forEach((chart) => chart.destroy());
  }, [isLoading, signups, paidVsFree, revenue]);

  return (
    <section>
      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin overview for {selectedPeriod.caption.toLowerCase()}.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-auto w-full px-4 py-6 sm:w-[300px]">
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="font-medium">{selectedPeriod.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {selectedPeriod.caption} · Grouped by {selectedPeriod.groupBy}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent className="w-[300px]">
            {periods.map((item) => (
              <SelectItem key={item.value} value={item.value} className="py-2">
                <span className="flex flex-col items-start">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.caption} · Grouped by {item.groupBy}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Unable to load dashboard data. Please try again.
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, index) => (
          <Card key={`dashboard-kpi-skeleton-${index}`}>
            <CardContent className="flex flex-col gap-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        )) : kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex flex-col gap-2 p-5">
              <span className="text-[13px] text-muted-foreground">{kpi.label}</span>
              <span className="text-[28px] font-extrabold leading-tight">{kpi.value}</span>
              <span className={`text-xs font-semibold ${
                kpi.tone === 'up' ? 'text-emerald-400' : kpi.tone === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {kpi.delta || 'No comparison'}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Signups Trend</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{selectedPeriod.label}</span>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : <div className="h-[260px]"><canvas ref={signupsRef} /></div>}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Paid vs Free</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : <div className="h-[260px]"><canvas ref={paidPieRef} /></div>}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Paid vs Free Trend</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : <div className="h-[260px]"><canvas ref={paidTrendRef} /></div>}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Revenue</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              {revenue.isMrr ? 'MRR' : 'Total'} {formatCurrency(revenue.total)}
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : <div className="h-[260px]"><canvas ref={revenueRef} /></div>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
