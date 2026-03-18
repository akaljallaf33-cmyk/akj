// Well Intervention Dashboard — Finance & ROI Page
// Dragon Oil brand: #073674 blue, white, clean corporate style

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, ChevronDown, ChevronUp, Info, Timer } from 'lucide-react';
import { MONTHS_2026 } from '@/lib/types';
import { useRole } from '@/hooks/useRole';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtUSD(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calcJobTotalCost(job: {
  unit?: string | null;
  ct1DailyRate?: number | null;
  operationalDays?: number | null;
  badWeatherDays?: number | null;
  onRig?: boolean | number | null;
  rigDailyRate?: number | null;
  rigOperationalDays?: number | null;
  rigBadWeatherDays?: number | null;
  jobBill?: number | null;
}): number | null {
  let total = 0;
  const bill = job.jobBill ?? 0;

  if (job.unit === 'CT-1') {
    const rate = job.ct1DailyRate ?? 0;
    const opDays = job.operationalDays ?? 0;
    const bwDays = job.badWeatherDays ?? 0;
    total += rate * opDays + rate * 0.5 * bwDays;
  }

  const onRig = job.onRig === true || job.onRig === 1;
  if (job.unit === 'CT-2' && onRig) {
    const rate = job.rigDailyRate ?? 0;
    const opDays = job.rigOperationalDays ?? 0;
    const bwDays = job.rigBadWeatherDays ?? 0;
    total += rate * opDays + rate * 0.5 * bwDays;
  }

  total += bill;
  return total > 0 ? total : null;
}

const YEAR_END_2026 = new Date('2026-12-31');

/** Days from End Date + 30 days to 31 Dec 2026 */
function daysUntilYearEnd(endDate: string): number {
  const stableDate = new Date(endDate);
  stableDate.setDate(stableDate.getDate() + 30);
  const diffMs = YEAR_END_2026.getTime() - stableDate.getTime();
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return Math.min(days, 335);
}

/** Months from stable date (endDate + 30 days) to 31 Dec 2026 */
function monthsUntilYearEnd(endDate: string): number {
  const stableDate = new Date(endDate);
  stableDate.setDate(stableDate.getDate() + 30);
  const diffMs = YEAR_END_2026.getTime() - stableDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

/**
 * Flat ROI: recovery stays constant.
 * ROI % = (recovery × oilPrice × days) / cost × 100
 */
function calcFlatROI(
  production30Days: number | null | undefined,
  productionBefore: number | null | undefined,
  oilPrice: number | null | undefined,
  totalCost: number | null,
  endDate?: string
): number | null {
  if (production30Days == null || productionBefore == null || oilPrice == null || !totalCost) return null;
  const recovery = production30Days - productionBefore;
  const days = endDate ? daysUntilYearEnd(endDate) : 0;
  const periodValue = recovery * oilPrice * days;
  return periodValue;
}

/**
 * Decline-adjusted ROI: recovery declines at `monthlyDeclineRate` per month.
 * Total value = Σ (recovery × (1 - r)^m × oilPrice × daysInMonth) for each month m
 * where r = monthly decline rate (0.02 = 2%/month)
 */
function calcDeclineROI(
  production30Days: number | null | undefined,
  productionBefore: number | null | undefined,
  oilPrice: number | null | undefined,
  totalCost: number | null,
  endDate: string | undefined,
  monthlyDeclineRate: number
): number | null {
  if (production30Days == null || productionBefore == null || oilPrice == null || !totalCost || !endDate) return null;
  const recovery = production30Days - productionBefore;

  const stableDate = new Date(endDate);
  stableDate.setDate(stableDate.getDate() + 30);

  let totalValue = 0;
  let current = new Date(stableDate);

  while (current <= YEAR_END_2026) {
    // Days remaining in this month (or until year end)
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // last day of month
    const periodEnd = monthEnd < YEAR_END_2026 ? monthEnd : YEAR_END_2026;
    const daysInPeriod = Math.max(0, (periodEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

    // Month index from stable date
    const monthsElapsed =
      (current.getFullYear() - stableDate.getFullYear()) * 12 +
      (current.getMonth() - stableDate.getMonth());

    const declinedRecovery = recovery * Math.pow(1 - monthlyDeclineRate, monthsElapsed);
    totalValue += declinedRecovery * oilPrice * daysInPeriod;

    // Move to first day of next month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return totalValue;
}

/**
 * Payback period in days: how many days of incremental production at oil price to recover cost.
 * Payback = cost / (recovery_bbl_d × oil_price)
 */
function calcPaybackDays(
  production30Days: number | null | undefined,
  productionBefore: number | null | undefined,
  oilPrice: number | null | undefined,
  totalCost: number | null
): number | null {
  if (production30Days == null || productionBefore == null || oilPrice == null || !totalCost) return null;
  const recovery = production30Days - productionBefore;
  if (recovery === 0) return null; // zero recovery means infinite payback
  const dailyRevenue = recovery * oilPrice;
  if (dailyRevenue <= 0) return null; // negative recovery = no payback possible
  return Math.ceil(totalCost / dailyRevenue);
}

// ─── Decline Rate Setting ─────────────────────────────────────────────────────

function DeclineRateSetting({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String((value * 100).toFixed(1)));

  const save = () => {
    const parsed = parseFloat(input);
    if (isNaN(parsed) || parsed < 0 || parsed > 50) {
      toast.error('Enter a valid decline rate between 0 and 50%');
      return;
    }
    onChange(parsed / 100);
    setEditing(false);
    toast.success('Decline rate updated');
  };

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
        <TrendingUp className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Monthly Production Decline Rate</p>
        <p className="text-xs text-amber-600 mt-0.5">Applied to decline-adjusted ROI calculation (brownfield field-wide rate)</p>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-24 h-8 text-center text-sm border-amber-400 focus:border-amber-600 pr-6"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%/mo</span>
          </div>
          <Button size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3" onClick={save}>Save</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <button
          onClick={() => { setInput(String((value * 100).toFixed(1))); setEditing(true); }}
          className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-4 py-1.5 hover:bg-amber-50 transition-colors cursor-pointer"
        >
          <span className="text-xl font-bold text-amber-700 font-mono">{(value * 100).toFixed(1)}%</span>
          <span className="text-xs text-amber-500">/ month</span>
        </button>
      )}
    </div>
  );
}

// ─── Monthly ROI Chart ────────────────────────────────────────────────────────

function MonthlyROIChart({ jobs, oilPriceMap, monthlyDeclineRate }: {
  jobs: any[];
  oilPriceMap: Record<string, number>;
  monthlyDeclineRate: number;
}) {
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = useMemo(() => {
    return MONTHS_2026.map((m, idx) => {
      const monthJobs = jobs.filter(j => j.endDate.startsWith(m.value));
      const oilPrice = oilPriceMap[m.value] ?? null;

      let totalROIValue = 0;
      let totalDeclineROIValue = 0;
      let hasData = false;

      monthJobs.forEach(job => {
        const totalCost = calcJobTotalCost(job);
        if (!totalCost || !oilPrice || job.production30Days == null || job.productionBefore == null) return;
        const recovery = job.production30Days - job.productionBefore;
        if (recovery <= 0) return;

        // Flat ROI value
        const days = daysUntilYearEnd(job.endDate);
        totalROIValue += recovery * oilPrice * days;

        // Decline-adjusted ROI value (month-by-month)
        const stableDate = new Date(job.endDate);
        stableDate.setDate(stableDate.getDate() + 30);
        let declineVal = 0;
        let current = new Date(stableDate);
        while (current <= YEAR_END_2026) {
          const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          const periodEnd = monthEnd < YEAR_END_2026 ? monthEnd : YEAR_END_2026;
          const daysInPeriod = Math.max(0, (periodEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
          const monthsElapsed = (current.getFullYear() - stableDate.getFullYear()) * 12 + (current.getMonth() - stableDate.getMonth());
          declineVal += recovery * Math.pow(1 - monthlyDeclineRate, monthsElapsed) * oilPrice * daysInPeriod;
          current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
        totalDeclineROIValue += declineVal;
        hasData = true;
      });

      return {
        month: MONTH_LABELS[idx],
        roiValue: hasData ? Math.round(totalROIValue) : 0,
        declineROIValue: hasData ? Math.round(totalDeclineROIValue) : 0,
        hasData,
      };
    });
  }, [jobs, oilPriceMap, monthlyDeclineRate]);

  const hasAnyData = chartData.some(d => d.roiValue > 0);
  const tickFormatter = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Monthly ROI Value (USD $)
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Blue bars = flat ROI (constant recovery). Yellow line = decline-adjusted ROI at {(monthlyDeclineRate * 100).toFixed(1)}%/month. Jobs grouped by End Date month.
        </p>
      </CardHeader>
      <CardContent className="p-4">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <AlertCircle className="w-7 h-7 mb-2 text-slate-300" />
            <p className="text-sm">No ROI data yet — add CT jobs with cost and +30 day production data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={tickFormatter}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                  name === 'roiValue' ? 'Flat ROI' : `Decline ROI (${(monthlyDeclineRate * 100).toFixed(1)}%/mo)`
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend
                formatter={(value) => value === 'roiValue' ? 'Flat ROI' : `Decline ROI (${(monthlyDeclineRate * 100).toFixed(1)}%/mo)`}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="roiValue" name="roiValue" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.roiValue > 0 ? '#073674' : '#e2e8f0'} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="declineROIValue"
                name="declineROIValue"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Oil Price Panel (collapsible) ───────────────────────────────────────────

function OilPricePanel() {
  const { isAdmin } = useRole();
  const { data: oilPrices = [], refetch } = trpc.finance.listOilPrices.useQuery();
  const upsertMutation = trpc.finance.upsertOilPrice.useMutation({
    onSuccess: () => { refetch(); toast.success('Oil price updated'); },
    onError: (e) => toast.error(e.message),
  });

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    oilPrices.forEach(p => { m[p.month] = p.avgPrice; });
    return m;
  }, [oilPrices]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState('');

  const startEdit = (month: string) => {
    setEditing(month);
    setVal(String(priceMap[month] ?? ''));
  };

  const save = (month: string) => {
    const price = parseInt(val, 10);
    if (isNaN(price) || price <= 0) { toast.error('Enter a valid price'); return; }
    upsertMutation.mutate({ month, avgPrice: price });
    setEditing(null);
  };

  return (
    <Card className="border-0 shadow-sm bg-white">
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#073674]" />
          <span className="text-sm font-bold text-[#073674]">Monthly Average Brent Crude Oil Price (USD/bbl)</span>
          {isAdmin && <span className="text-xs text-slate-400 ml-2">— click to edit</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <CardContent className="p-4 border-t border-slate-100">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {MONTHS_2026.map(m => {
              const shortLabel = m.label.split(' ')[0].substring(0, 3);
              const price = priceMap[m.value];
              const isEditing = editing === m.value;
              return (
                <div key={m.value} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{shortLabel}</span>
                  {isAdmin && isEditing ? (
                    <div className="flex flex-col gap-1 w-full">
                      <Input
                        type="number"
                        min="1"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        className="h-8 text-center text-sm border-[#073674] focus:border-[#073674] px-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') save(m.value); if (e.key === 'Escape') setEditing(null); }}
                      />
                      <Button size="sm" className="h-6 text-xs bg-[#073674] hover:bg-[#052a5c] text-white px-2" onClick={() => save(m.value)}>Save</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => isAdmin ? startEdit(m.value) : undefined}
                      className={`w-full text-center rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                        isAdmin ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        price
                          ? 'bg-[#073674]/5 border-[#073674]/20 text-[#073674] hover:bg-[#073674]/10'
                          : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                      }`}
                    >
                      {price ? `$${price}` : '—'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── ROI Table ────────────────────────────────────────────────────────────────

function ROITable({ monthlyDeclineRate }: { monthlyDeclineRate: number }) {
  const { data: jobs = [], isLoading: jobsLoading } = trpc.wellJobs.list.useQuery();
  const { data: oilPrices = [] } = trpc.finance.listOilPrices.useQuery();

  const oilPriceMap = useMemo(() => {
    const m: Record<string, number> = {};
    oilPrices.forEach(p => { m[p.month] = p.avgPrice; });
    return m;
  }, [oilPrices]);

  const ctJobs = useMemo(() =>
    jobs.filter(j => j.serviceLine === 'coiled-tubing').sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [jobs]
  );

  if (jobsLoading) return <div className="py-12 text-center text-slate-400">Loading...</div>;

  const rows = ctJobs.map(job => {
    const month = job.endDate.substring(0, 7);
    const oilPrice = oilPriceMap[month] ?? null;
    const totalCost = calcJobTotalCost(job);
    const flatROI = calcFlatROI(job.production30Days, job.productionBefore, oilPrice, totalCost, job.endDate);
    const declineROI = calcDeclineROI(job.production30Days, job.productionBefore, oilPrice, totalCost, job.endDate, monthlyDeclineRate);
    const paybackDays = calcPaybackDays(job.production30Days, job.productionBefore, oilPrice, totalCost);
    const recovery = (job.production30Days != null && job.productionBefore != null)
      ? job.production30Days - job.productionBefore
      : null;

    let jackUpCost: number | null = null;
    if (job.unit === 'CT-1' && job.ct1DailyRate) {
      jackUpCost = (job.operationalDays ?? 0) * job.ct1DailyRate + (job.badWeatherDays ?? 0) * job.ct1DailyRate * 0.5;
    }
    const onRig = !!job.onRig;
    let rigCost: number | null = null;
    if (job.unit === 'CT-2' && onRig && job.rigDailyRate) {
      rigCost = (job.rigOperationalDays ?? 0) * job.rigDailyRate + (job.rigBadWeatherDays ?? 0) * job.rigDailyRate * 0.5;
    }

    return { job, oilPrice, totalCost, flatROI, declineROI, paybackDays, recovery, jackUpCost, rigCost };
  });

  const totalCostSum = rows.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const totalRecovery = rows.reduce((s, r) => s + (r.recovery ?? 0), 0);

  // Total production loss from jobs with negative recovery (failed/partial)
  const lossRows = rows.filter(r => r.recovery != null && r.recovery < 0);
  const totalLossBbl = lossRows.reduce((s, r) => s + (r.recovery ?? 0), 0);
  const totalLossUSD = lossRows.reduce((r, row) => {
    const oilPrice = row.oilPrice;
    if (!oilPrice || row.recovery == null) return r;
    return r + row.recovery * oilPrice * daysUntilYearEnd(row.job.endDate);
  }, 0);

  const totalFlatROIValue = (() => {
    let total = 0;
    rows.forEach(row => {
      const month = row.job.endDate.substring(0, 7);
      const oilPrice = oilPriceMap[month] ?? null;
      if (!oilPrice || row.job.production30Days == null || row.job.productionBefore == null || !row.totalCost) return;
      const recovery = row.job.production30Days - row.job.productionBefore;
      if (recovery <= 0) return;
      total += recovery * oilPrice * daysUntilYearEnd(row.job.endDate);
    });
    return total > 0 ? total : null;
  })();

  const totalDeclineROIValue = (() => {
    let total = 0;
    rows.forEach(row => {
      const month = row.job.endDate.substring(0, 7);
      const oilPrice = oilPriceMap[month] ?? null;
      if (!oilPrice || row.job.production30Days == null || row.job.productionBefore == null || !row.totalCost) return;
      const recovery = row.job.production30Days - row.job.productionBefore;
      if (recovery <= 0) return;
      // Recalculate decline value
      const stableDate = new Date(row.job.endDate);
      stableDate.setDate(stableDate.getDate() + 30);
      let val = 0;
      let current = new Date(stableDate);
      while (current <= YEAR_END_2026) {
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const periodEnd = monthEnd < YEAR_END_2026 ? monthEnd : YEAR_END_2026;
        const daysInPeriod = Math.max(0, (periodEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        const monthsElapsed = (current.getFullYear() - stableDate.getFullYear()) * 12 + (current.getMonth() - stableDate.getMonth());
        val += recovery * Math.pow(1 - monthlyDeclineRate, monthsElapsed) * oilPrice * daysInPeriod;
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
      total += val;
    });
    return total > 0 ? total : null;
  })();

  const roiColor = (roi: number | null) => {
    if (roi == null) return 'text-slate-400';
    if (roi >= 1_000_000) return 'text-emerald-600 font-bold';
    if (roi >= 500_000) return 'text-emerald-500';
    return 'text-amber-500';
  };

  return (
    <>
      <MonthlyROIChart jobs={ctJobs} oilPriceMap={oilPriceMap} monthlyDeclineRate={monthlyDeclineRate} />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Total CT Investment</p>
            <p className="text-2xl font-bold text-[#073674]">{fmtUSD(totalCostSum || null)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Total Production Recovery</p>
            <p className="text-2xl font-bold text-emerald-600">{totalRecovery > 0 ? `+${fmt(totalRecovery)} bbl/d` : '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Flat ROI Value (to 31 Dec)</p>
            <p className={`text-2xl font-bold ${totalFlatROIValue != null ? 'text-emerald-600' : 'text-slate-400'}`}>
              {totalFlatROIValue != null ? fmtUSD(totalFlatROIValue) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Decline-Adj. ROI ({(monthlyDeclineRate * 100).toFixed(1)}%/mo)
            </p>
            <p className={`text-2xl font-bold ${totalDeclineROIValue != null ? 'text-amber-600' : 'text-slate-400'}`}>
              {totalDeclineROIValue != null ? fmtUSD(totalDeclineROIValue) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>


      {/* ROI Table */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Coiled Tubing — ROI & Payback per Well
          </CardTitle>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#073674]" />
              <strong>Flat ROI</strong>: Recovery at +30 Days stays constant until 31 Dec 2026
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
              <strong>Decline-Adj. ROI</strong>: Recovery declines at {(monthlyDeclineRate * 100).toFixed(1)}%/month (brownfield decline)
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <strong>Payback</strong>: Days needed to recover total job cost from incremental production
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ctJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
              <p className="font-medium text-slate-500">No CT jobs recorded yet</p>
              <p className="text-sm mt-1">Add CT jobs in the Coiled Tubing tab first</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 w-8">#</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Well</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Unit</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Rig/Jack-Up</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Job Bill</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Cost</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Recovery +30d</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Oil Price</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Timer className="w-3 h-3" /> Payback
                      </span>
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-[#073674] text-right bg-blue-50">Flat ROI</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-amber-700 text-right bg-amber-50">
                      Decline ROI ({(monthlyDeclineRate * 100).toFixed(1)}%/mo)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ job, oilPrice, totalCost, flatROI, declineROI, paybackDays, recovery, jackUpCost, rigCost }, idx) => {
                    const displayRigCost = jackUpCost ?? rigCost;
                    const hasCost = totalCost != null;
                    const missingReason = !hasCost ? 'No cost data' : !oilPrice ? 'No oil price' : 'No +30d data';

                    return (
                      <TableRow key={job.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                        <TableCell className="text-slate-400 text-xs font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-700 text-sm">{job.platform}</TableCell>
                        <TableCell className="font-mono text-sm text-[#073674] font-semibold">{job.wellNumber}</TableCell>
                        <TableCell>
                          {job.unit ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#073674]/10 text-[#073674] border border-[#073674]/20">
                              {job.unit}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {job.status === 'Successful' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">✓ OK</span>
                          ) : job.status === 'Partially Successful' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">⚠ Partial</span>
                          ) : job.status === 'Failed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">✗ Failed</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 font-mono whitespace-nowrap">
                          {new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-slate-600">{fmtUSD(displayRigCost)}</TableCell>
                        <TableCell className="text-right text-sm font-mono text-slate-600">{fmtUSD(job.jobBill)}</TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold text-slate-800">{fmtUSD(totalCost)}</TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {recovery != null ? (
                            <span className={recovery >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                              {recovery >= 0 ? '+' : ''}{fmt(recovery)} bbl/d
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-slate-600">
                          {oilPrice ? `$${oilPrice}` : <span className="text-amber-400 text-xs">No price</span>}
                        </TableCell>
                        {/* Payback Period */}
                        <TableCell className="text-right text-sm font-mono">
                          {paybackDays != null ? (
                            <span className={`font-semibold ${paybackDays <= 30 ? 'text-emerald-600' : paybackDays <= 90 ? 'text-amber-500' : 'text-orange-500'}`}>
                              {paybackDays} days
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1 text-slate-300 text-xs">
                              <Clock className="w-3 h-3" />{missingReason}
                            </span>
                          )}
                        </TableCell>
                        {/* Flat ROI */}
                        <TableCell className="text-right text-sm font-mono bg-blue-50/40">
                          <span className={roiColor(flatROI)}>
                            {flatROI != null ? fmtUSD(flatROI) : (
                              <span className="text-slate-300 text-xs">{missingReason}</span>
                            )}
                          </span>
                        </TableCell>
                        {/* Decline-Adjusted ROI */}
                        <TableCell className="text-right text-sm font-mono bg-amber-50/40">
                          <div>
                            <span className={declineROI != null ? 'text-amber-600 font-semibold' : 'text-slate-300 text-xs'}>
                              {declineROI != null ? fmtUSD(declineROI) : missingReason}
                            </span>
                            {flatROI != null && declineROI != null && (
                              <p className="text-xs text-slate-400 font-normal">
                                Δ {fmtUSD(declineROI - flatROI)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ─── Main Finance Page ────────────────────────────────────────────────────────

export default function Finance({ selectedYear }: { selectedYear?: number }) {
  const [monthlyDeclineRate, setMonthlyDeclineRate] = useState(0.02); // default 2%/month

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-[#073674] flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#073674]">Finance & ROI</h2>
          <p className="text-sm text-slate-500">Track job costs, payback period, and return on investment for Coiled Tubing operations. Jobs grouped by End Date month.</p>
        </div>
      </div>

      {/* Decline Rate Setting */}
      <DeclineRateSetting value={monthlyDeclineRate} onChange={setMonthlyDeclineRate} />

      {/* ROI Table + Charts */}
      <ROITable monthlyDeclineRate={monthlyDeclineRate} />

      {/* Oil Price Panel */}
      <OilPricePanel />
    </div>
  );
}
