// Well Intervention Dashboard — Finance & ROI Page
// Dragon Oil brand: #073674 blue, white, clean corporate style

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Pencil, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
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

function calcTotalCost(finance: {
  ct1DailyRate?: number | null;
  operationalDays?: number | null;
  badWeatherDays?: number | null;
  jobBill?: number | null;
} | null | undefined): number | null {
  if (!finance) return null;
  const bill = finance.jobBill ?? 0;
  const rate = finance.ct1DailyRate;
  const opDays = finance.operationalDays ?? 0;
  const bwDays = finance.badWeatherDays ?? 0;

  if (rate != null) {
    // CT-1: jack-up rate applies
    return (opDays * rate) + (bwDays * rate * 0.5) + bill;
  }
  // CT-2 or others: only job bill
  return bill > 0 ? bill : null;
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

// ─── Finance Dialog ───────────────────────────────────────────────────────────

interface FinanceDialogProps {
  open: boolean;
  onClose: () => void;
  job: {
    id: number;
    platform: string;
    wellNumber: string;
    unit?: string | null;
    jobDate: string;
  };
  existing?: {
    ct1DailyRate?: number | null;
    operationalDays?: number | null;
    badWeatherDays?: number | null;
    jobBill?: number | null;
    notes?: string | null;
  } | null;
  onSaved: () => void;
}

function FinanceDialog({ open, onClose, job, existing, onSaved }: FinanceDialogProps) {
  const isCT1 = job.unit === 'CT-1';

  const [ct1DailyRate, setCt1DailyRate] = useState(String(existing?.ct1DailyRate ?? ''));
  const [opDays, setOpDays] = useState(String(existing?.operationalDays ?? ''));
  const [bwDays, setBwDays] = useState(String(existing?.badWeatherDays ?? ''));
  const [jobBill, setJobBill] = useState(String(existing?.jobBill ?? ''));
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const upsertMutation = trpc.finance.upsertJobFinance.useMutation({
    onSuccess: () => { onSaved(); onClose(); toast.success('Finance data saved'); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const rate = isCT1 ? (parseInt(ct1DailyRate, 10) || null) : null;
    const op = isCT1 ? (parseInt(opDays, 10) || null) : null;
    const bw = isCT1 ? (parseInt(bwDays, 10) || null) : null;
    const bill = parseInt(jobBill, 10) || null;

    if (!bill && !rate) { toast.error('Please enter at least a job bill or daily rate'); return; }

    upsertMutation.mutate({
      wellJobId: job.id,
      ct1DailyRate: rate,
      operationalDays: op,
      badWeatherDays: bw,
      jobBill: bill,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#073674] text-lg font-bold">
            Finance Details — {job.platform} / {job.wellNumber}
            {job.unit && <span className="ml-2 text-sm font-normal text-slate-500">({job.unit})</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isCT1 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-[#073674] mb-3 uppercase tracking-wider">CT-1 Jack-Up Costs</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Daily Rate (USD)</Label>
                  <Input type="number" min="0" placeholder="e.g. 45000" value={ct1DailyRate}
                    onChange={e => setCt1DailyRate(e.target.value)}
                    className="border-slate-300 focus:border-[#073674] h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Operational Days</Label>
                  <Input type="number" min="0" placeholder="e.g. 3" value={opDays}
                    onChange={e => setOpDays(e.target.value)}
                    className="border-slate-300 focus:border-[#073674] h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Bad Weather Days</Label>
                  <Input type="number" min="0" placeholder="e.g. 1" value={bwDays}
                    onChange={e => setBwDays(e.target.value)}
                    className="border-slate-300 focus:border-[#073674] h-9 text-sm" />
                  <p className="text-xs text-slate-400">Charged at 50% rate</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm font-semibold text-slate-700">Job Bill (USD)</Label>
            <Input type="number" min="0" placeholder="e.g. 120000" value={jobBill}
              onChange={e => setJobBill(e.target.value)}
              className="border-slate-300 focus:border-[#073674]" />
            <p className="text-xs text-slate-400">Additional cost for the specific job/service</p>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold text-slate-700">Notes (optional)</Label>
            <Textarea placeholder="Any additional finance remarks..." value={notes}
              onChange={e => setNotes(e.target.value)} rows={2}
              className="border-slate-300 focus:border-[#073674] resize-none text-sm" />
          </div>

          {/* Live cost preview */}
          {(() => {
            const rate = isCT1 ? (parseInt(ct1DailyRate, 10) || null) : null;
            const op = parseInt(opDays, 10) || 0;
            const bw = parseInt(bwDays, 10) || 0;
            const bill = parseInt(jobBill, 10) || 0;
            const jackUpCost = rate ? (op * rate) + (bw * rate * 0.5) : 0;
            const total = jackUpCost + bill;
            if (!total) return null;
            return (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                <p className="font-semibold text-slate-700 mb-1">Cost Preview</p>
                {isCT1 && rate != null && (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Operational ({op} days × ${rate.toLocaleString()})</span>
                      <span>${(op * rate).toLocaleString()}</span>
                    </div>
                    {bw > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Bad Weather ({bw} days × ${rate.toLocaleString()} × 50%)</span>
                        <span>${(bw * rate * 0.5).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
                {bill > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Job Bill</span>
                    <span>${bill.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#073674] border-t border-slate-200 mt-1 pt-1">
                  <span>Total Cost</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              </div>
            );
          })()}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsertMutation.isPending}
            className="bg-[#073674] hover:bg-[#052a5c] text-white">
            Save Finance Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ROI Table ────────────────────────────────────────────────────────────────

function ROITable() {
  const { data: jobs = [], isLoading: jobsLoading } = trpc.wellJobs.list.useQuery();
  const { data: financeList = [], refetch: refetchFinance } = trpc.finance.listJobFinance.useQuery();
  const { data: oilPrices = [] } = trpc.finance.listOilPrices.useQuery();

  const [dialogJob, setDialogJob] = useState<typeof jobs[0] | null>(null);

  const financeMap = useMemo(() => {
    const m: Record<number, typeof financeList[0]> = {};
    financeList.forEach(f => { m[f.wellJobId] = f; });
    return m;
  }, [financeList]);

  const oilPriceMap = useMemo(() => {
    const m: Record<string, number> = {};
    oilPrices.forEach(p => { m[p.month] = p.avgPrice; });
    return m;
  }, [oilPrices]);

  // Only show CT jobs in ROI table (CT-1 and CT-2)
  const ctJobs = useMemo(() =>
    jobs.filter(j => j.serviceLine === 'coiled-tubing').sort((a, b) => a.jobDate.localeCompare(b.jobDate)),
    [jobs]
  );

  const rows = useMemo(() => ctJobs.map(job => {
    const finance = financeMap[job.id] ?? null;
    const month = job.jobDate.substring(0, 7);
    const oilPrice = oilPriceMap[month] ?? null;
    const totalCost = calcTotalCost(finance);
    const roi = calcROI(job.production30Days, job.productionBefore, oilPrice, totalCost);
    const recovery = (job.production30Days != null && job.productionBefore != null)
      ? job.production30Days - job.productionBefore
      : null;
    return { job, finance, oilPrice, totalCost, roi, recovery };
  }), [ctJobs, financeMap, oilPriceMap]);

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
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Jack-Up Cost</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Job Bill</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Cost</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Recovery +30d</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Oil Price</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">ROI (Annual)</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ job, finance, oilPrice, totalCost, roi, recovery }, idx) => {
                    const jackUpCost = finance && finance.ct1DailyRate != null
                      ? ((finance.operationalDays ?? 0) * finance.ct1DailyRate) + ((finance.badWeatherDays ?? 0) * finance.ct1DailyRate * 0.5)
                      : null;
                    const hasFinance = finance != null;
                    const roiColor = roi == null ? 'text-slate-400' : roi >= 200 ? 'text-emerald-600 font-bold' : roi >= 100 ? 'text-emerald-500' : 'text-amber-500';

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
                        <TableCell className="text-right text-sm font-mono text-slate-600">{fmtUSD(jackUpCost)}</TableCell>
                        <TableCell className="text-right text-sm font-mono text-slate-600">{fmtUSD(finance?.jobBill)}</TableCell>
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
                                {!hasFinance ? 'No cost data' : !oilPrice ? 'No oil price' : 'No +30d data'}
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-blue-50"
                            onClick={() => setDialogJob(job)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
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

      {/* Finance Dialog */}
      {dialogJob && (
        <FinanceDialog
          open={!!dialogJob}
          onClose={() => setDialogJob(null)}
          job={dialogJob}
          existing={financeMap[dialogJob.id]}
          onSaved={refetchFinance}
        />
      )}
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
          <p className="text-sm text-slate-500">Track job costs, investment, and return on investment for Coiled Tubing operations</p>
        </div>
      </div>

      {/* Oil Price Panel */}
      <OilPricePanel />

      {/* ROI Table */}
      <ROITable />
    </div>
  );
}
