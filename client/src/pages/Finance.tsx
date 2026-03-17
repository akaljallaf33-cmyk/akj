// Well Intervention Dashboard — Finance & ROI Page
// Dragon Oil brand: #073674 blue, white, clean corporate style

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { MONTHS_2026 } from '@/lib/types';

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

function calcROI(
  production30Days: number | null | undefined,
  productionBefore: number | null | undefined,
  oilPrice: number | null | undefined,
  totalCost: number | null
): number | null {
  if (production30Days == null || productionBefore == null || oilPrice == null || !totalCost) return null;
  const recovery = production30Days - productionBefore;
  if (recovery <= 0) return null;
  const annualValue = recovery * oilPrice * 365;
  return (annualValue / totalCost) * 100;
}

// ─── Monthly Oil Price Panel ──────────────────────────────────────────────────

function OilPricePanel() {
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
      <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Monthly Average Brent Crude Oil Price (USD/bbl)
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">Enter the monthly average Brent crude price for each month. Used to calculate ROI for all jobs.</p>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {MONTHS_2026.map(m => {
            const shortLabel = m.label.split(' ')[0].substring(0, 3);
            const price = priceMap[m.value];
            const isEditing = editing === m.value;
            return (
              <div key={m.value} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{shortLabel}</span>
                {isEditing ? (
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
                    onClick={() => startEdit(m.value)}
                    className={`w-full text-center rounded-lg border px-2 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      price
                        ? 'bg-[#073674]/5 border-[#073674]/20 text-[#073674] hover:bg-[#073674]/10'
                        : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:bg-slate-100'
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
    </Card>
  );
}

// ─── ROI Table ────────────────────────────────────────────────────────────────

function ROITable() {
  const { data: jobs = [], isLoading: jobsLoading } = trpc.wellJobs.list.useQuery();
  const { data: oilPrices = [] } = trpc.finance.listOilPrices.useQuery();

  const oilPriceMap = useMemo(() => {
    const m: Record<string, number> = {};
    oilPrices.forEach(p => { m[p.month] = p.avgPrice; });
    return m;
  }, [oilPrices]);

  // Only show CT jobs
  const ctJobs = useMemo(() =>
    jobs.filter(j => j.serviceLine === 'coiled-tubing').sort((a, b) => a.jobDate.localeCompare(b.jobDate)),
    [jobs]
  );

  const rows = useMemo(() => ctJobs.map(job => {
    const month = job.jobDate.substring(0, 7);
    const oilPrice = oilPriceMap[month] ?? null;
    const totalCost = calcJobTotalCost(job);
    const roi = calcROI(job.production30Days, job.productionBefore, oilPrice, totalCost);
    const recovery = (job.production30Days != null && job.productionBefore != null)
      ? job.production30Days - job.productionBefore
      : null;

    // Jack-up cost breakdown for display
    let jackUpCost: number | null = null;
    if (job.unit === 'CT-1' && job.ct1DailyRate) {
      jackUpCost = (job.operationalDays ?? 0) * job.ct1DailyRate + (job.badWeatherDays ?? 0) * job.ct1DailyRate * 0.5;
    }
    const onRig = !!job.onRig;
    let rigCost: number | null = null;
    if (job.unit === 'CT-2' && onRig && job.rigDailyRate) {
      rigCost = (job.rigOperationalDays ?? 0) * job.rigDailyRate + (job.rigBadWeatherDays ?? 0) * job.rigDailyRate * 0.5;
    }

    return { job, oilPrice, totalCost, roi, recovery, jackUpCost, rigCost };
  }), [ctJobs, oilPriceMap]);

  const totalCostSum = rows.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const totalRecovery = rows.reduce((s, r) => s + (r.recovery ?? 0), 0);
  const avgROI = (() => {
    const valid = rows.filter(r => r.roi != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + (r.roi ?? 0), 0) / valid.length;
  })();

  if (jobsLoading) return <div className="py-12 text-center text-slate-400">Loading...</div>;

  return (
    <>
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
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
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Average ROI (Annual)</p>
            <p className={`text-2xl font-bold ${avgROI != null ? (avgROI >= 100 ? 'text-emerald-600' : 'text-amber-600') : 'text-slate-400'}`}>
              {avgROI != null ? `${fmt(avgROI, 1)}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Table */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Coiled Tubing — ROI per Well
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            ROI = (Production Recovery at +30 Days × Monthly Oil Price × 365) ÷ Total Job Cost × 100%
            &nbsp;|&nbsp; Cost data is entered when adding/editing a CT job.
          </p>
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
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Rig / Jack-Up Cost</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Job Bill</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Cost</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Recovery +30d</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Oil Price</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">ROI (Annual)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ job, oilPrice, totalCost, roi, recovery, jackUpCost, rigCost }, idx) => {
                    const displayRigCost = jackUpCost ?? rigCost;
                    const roiColor = roi == null ? 'text-slate-400' : roi >= 200 ? 'text-emerald-600 font-bold' : roi >= 100 ? 'text-emerald-500' : 'text-amber-500';
                    const hasCost = totalCost != null;

                    return (
                      <TableRow key={job.id} className="border-b border-slate-50 hover:bg-blue-50/40">
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
                        <TableCell className="text-sm text-slate-500 font-mono whitespace-nowrap">
                          {new Date(job.jobDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                          {oilPrice ? `$${oilPrice}` : <span className="text-amber-400 text-xs">No price set</span>}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          <span className={roiColor}>
                            {roi != null ? `${fmt(roi, 1)}%` : (
                              <span className="flex items-center justify-end gap-1 text-slate-300 text-xs">
                                <Clock className="w-3 h-3" />
                                {!hasCost ? 'No cost data' : !oilPrice ? 'No oil price' : 'No +30d data'}
                              </span>
                            )}
                          </span>
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

export default function Finance() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-[#073674] flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#073674]">Finance & ROI</h2>
          <p className="text-sm text-slate-500">Track job costs, investment, and return on investment for Coiled Tubing operations. Cost data is entered directly when adding or editing a CT job.</p>
        </div>
      </div>

      {/* Oil Price Panel */}
      <OilPricePanel />

      {/* ROI Table */}
      <ROITable />
    </div>
  );
}
