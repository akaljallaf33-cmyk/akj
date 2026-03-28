// Well Intervention Dashboard — Overview Tab
// Combined KPIs, monthly production impact, and charts for all service lines

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell
} from 'recharts';
import { useData } from '@/contexts/DataContext';
import { SERVICE_LINE_LABELS, ServiceLine, MONTHS_2026, WellJob } from '@/lib/types';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, AlertCircle, XCircle, Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const SL_COLORS: Record<ServiceLine, string> = {
  'coiled-tubing': '#073674',
  'wireline': '#0d6efd',
};

const SL_LIST: ServiceLine[] = ['coiled-tubing', 'wireline'];



function MonthlyImpactChart() {
  const { jobs } = useData();

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data = useMemo(() => {
    return MONTHS_2026.map((m, idx) => {
      const monthJobs = jobs.filter(j => j.endDate.startsWith(m.value));
      const uplift = monthJobs.reduce((sum, j) => {
        if (j.productionBefore !== null && j.productionAfter !== null) {
          return sum + (j.productionAfter - j.productionBefore);
        }
        return sum;
      }, 0);
      const uplift30 = monthJobs.reduce((sum, j) => {
        if (j.productionBefore !== null && j.production30Days !== null) {
          return sum + (j.production30Days - j.productionBefore);
        }
        return sum;
      }, 0);
      return {
        month: MONTH_LABELS[idx],
        recoveryAfterJob: uplift,
        recoveryPlus30: uplift30,
        jobs: monthJobs.length,
      };
    });
  }, [jobs]);

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider">
          Monthly Production Recovery (bbl/d)
        </CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">Net production recovery per month across all service lines</p>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={2} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toLocaleString()} bbl/d`, 'Production Recovery']}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="recoveryAfterJob" name="Recovery After Job" fill="#073674" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.recoveryAfterJob >= 0 ? '#073674' : '#ef4444'} />
              ))}
            </Bar>
            <Bar dataKey="recoveryPlus30" name="Recovery +30 Days" fill="#0891b2" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.recoveryPlus30 >= 0 ? '#0891b2' : '#f97316'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Production Recovery Leaderboard ─────────────────────────────────────────

function ProductionRecoveryLeaderboard() {
  const { jobs } = useData();

  const ranked = useMemo(() => {
    return jobs
      .filter(j => j.productionBefore !== null && j.productionAfter !== null)
      .map(j => ({
        platform: j.platform,
        wellNumber: j.wellNumber,
        serviceLine: j.serviceLine,
        upliftAfter: (j.productionAfter ?? 0) - (j.productionBefore ?? 0),
        uplift30: j.production30Days != null ? (j.production30Days - (j.productionBefore ?? 0)) : null,
        status: j.status,
      }))
      .sort((a, b) => b.upliftAfter - a.upliftAfter)
      .slice(0, 8);
  }, [jobs]);

  const medalColors = ['#f59e0b', '#94a3b8', '#cd7f32'];

  if (ranked.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Top Wells — Production Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-slate-400">
          <Trophy className="w-8 h-8 mb-2 text-slate-200" />
          <p className="text-sm">No production data yet</p>
          <p className="text-xs mt-1">Add jobs with Before/After production to see rankings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top Wells — Production Recovery (bbl/d)
        </CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">Ranked by production uplift after intervention</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {ranked.map((row, idx) => {
            const isPositive = row.upliftAfter >= 0;
            const barWidth = Math.min(100, Math.abs(row.upliftAfter) / Math.max(...ranked.map(r => Math.abs(r.upliftAfter))) * 100);
            return (
              <motion.div
                key={`${row.platform}-${row.wellNumber}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 px-5 py-3"
              >
                {/* Rank badge */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: idx < 3 ? medalColors[idx] : '#f1f5f9',
                    color: idx < 3 ? 'white' : '#64748b',
                  }}
                >
                  {idx + 1}
                </div>

                {/* Well info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-800 font-mono">{row.wellNumber}</span>
                    <span className="text-xs text-slate-400">{row.platform}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: SL_COLORS[row.serviceLine] + '18',
                        color: SL_COLORS[row.serviceLine],
                      }}
                    >
                      {SERVICE_LINE_LABELS[row.serviceLine].split(' ')[0]}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        background: isPositive ? '#073674' : '#ef4444',
                      }}
                    />
                  </div>
                </div>

                {/* Values */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold font-mono ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{row.upliftAfter.toLocaleString()}
                  </p>
                  {row.uplift30 != null && (
                    <p className="text-xs text-slate-400 font-mono">
                      +30d: {row.uplift30 >= 0 ? '+' : ''}{row.uplift30.toLocaleString()}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionRecoveryByServiceLine() {
  const { jobs } = useData();
  const data = SL_LIST.map(sl => {
    const slJobs = jobs.filter(j => j.serviceLine === sl);
    const recoveryAfter = slJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
      return sum;
    }, 0);
    const recovery30 = slJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
      return sum;
    }, 0);
    return { name: SERVICE_LINE_LABELS[sl].replace(' ', '\n'), recoveryAfter, recovery30 };
  });

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider">
          Production Recovery by Service Line (bbl/d)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toLocaleString()} bbl/d`, 'Production Recovery']}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="recoveryAfter" name="Recovery After Job" fill="#073674" radius={[3, 3, 0, 0]} />
            <Bar dataKey="recovery30" name="Recovery +30 Days" fill="#0891b2" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── This Month Jobs Dialog ──────────────────────────────────────────────────
function ThisMonthJobsDialog({ open, onClose, jobs, monthLabel }: {
  open: boolean;
  onClose: () => void;
  jobs: WellJob[];
  monthLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#073674] text-lg font-bold">
            {monthLabel} — {jobs.length} Job{jobs.length !== 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        {jobs.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No jobs this month.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job, idx) => {
              const recovery = job.productionBefore !== null && job.productionAfter !== null
                ? job.productionAfter - job.productionBefore : null;
              const statusColor = job.status === 'Complete' ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800';
              return (
                <div key={job.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#073674]/10 text-[#073674] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 font-mono">{job.platform} / {job.wellNumber}</span>
                        <span className="text-xs text-slate-500">{SERVICE_LINE_LABELS[job.serviceLine]}</span>
                        {job.unit && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#073674]/10 text-[#073674] font-medium">{job.unit}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{job.jobType}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(job.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {job.startDate !== job.endDate && ` → ${new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                      </p>
                      {recovery !== null && (
                        <p className={`text-xs font-semibold mt-0.5 ${recovery >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {recovery >= 0 ? '+' : ''}{recovery.toLocaleString()} bbl/d recovery
                        </p>
                      )}
                      {job.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">
                          {job.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusColor}`}>
                    {job.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OverviewTab({ selectedYear }: { selectedYear?: number }) {
  const { jobs: allJobs } = useData();
  const year = selectedYear ?? new Date().getFullYear();
  const jobs = allJobs.filter(j => j.startDate.startsWith(String(year)));
  const [showThisMonthJobs, setShowThisMonthJobs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Incomplete' | null>(null);
  const [showExpectedPlans, setShowExpectedPlans] = useState(false);

  // Fetch well plans for the current year to compute expected recovery this month
  const { data: wellPlans = [] } = trpc.wellPlans.list.useQuery({ year });
  const totalJobs = jobs.length;
  const totalSuccessful = jobs.filter(j => j.status === 'Complete').length;
  const totalIncomplete = jobs.filter(j => j.status === 'Incomplete').length;

  const calcRecovery = (sl: ServiceLine) => ({
    after: jobs.filter(j => j.serviceLine === sl).reduce((sum, j) => {
      if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
      return sum;
    }, 0),
    days30: jobs.filter(j => j.serviceLine === sl).reduce((sum, j) => {
      if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
      return sum;
    }, 0),
    count: jobs.filter(j => j.serviceLine === sl).length,
  });
  const ctRecovery = calcRecovery('coiled-tubing');
  const wlRecovery = calcRecovery('wireline');

  // This month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthJobs = jobs.filter(j => j.endDate.startsWith(thisMonth));
  const thisMonthRecovery = thisMonthJobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
    return sum;
  }, 0);

  // Expected recovery this month from ALL planned wells (including completed ones — stays visible)
  const expectedThisMonthPlans = useMemo(() => {
    return wellPlans.filter(p => p.plannedDate && p.plannedDate.startsWith(thisMonth));
  }, [wellPlans, thisMonth]);

  const expectedThisMonth = useMemo(() => {
    return expectedThisMonthPlans.reduce((sum, p) => sum + (p.expectedRecovery ?? 0), 0);
  }, [expectedThisMonthPlans]);

  // CT total investment
  const ctJobs = jobs.filter(j => j.serviceLine === 'coiled-tubing');
  const ctTotalCost = ctJobs.reduce((sum, j) => {
    let cost = 0;
    if (j.unit === 'CT-1' && j.ct1DailyRate) {
      cost += (j.operationalDays ?? 0) * j.ct1DailyRate + (j.badWeatherDays ?? 0) * j.ct1DailyRate * 0.5;
    }
    const onRig = j.onRig === true || (j.onRig as unknown) === 1;
    if (j.unit === 'CT-2' && onRig && j.rigDailyRate) {
      cost += (j.rigOperationalDays ?? 0) * j.rigDailyRate + (j.rigBadWeatherDays ?? 0) * j.rigDailyRate * 0.5;
    }
    cost += j.jobBill ?? 0;
    return sum + cost;
  }, 0);

  // Total production recovery $ (flat: recovery × $70 avg × days to year end)
  const YEAR_END = new Date('2026-12-31');
  const ctProdRecoveryUSD = ctJobs.reduce((sum, j) => {
    if (j.production30Days == null || j.productionBefore == null) return sum;
    const recovery = j.production30Days - j.productionBefore;
    if (recovery <= 0) return sum;
    const stableDate = new Date(j.endDate);
    stableDate.setDate(stableDate.getDate() + 30);
    const days = Math.max(1, Math.ceil((YEAR_END.getTime() - stableDate.getTime()) / (1000 * 60 * 60 * 24)));
    return sum + recovery * 70 * days;
  }, 0);

  // NPT summary
  const totalNPTDays = ctJobs.reduce((sum, j) => sum + (j.nptDays ?? 0), 0);
  const totalBadWeatherDays = ctJobs.reduce((sum, j) => sum + (j.badWeatherDays ?? 0) + (j.rigBadWeatherDays ?? 0), 0);
  const badWeatherSaved = ctJobs.reduce((sum, j) => {
    const ct1Save = (j.badWeatherDays ?? 0) * (j.ct1DailyRate ?? 0) * 0.5;
    const ct2Save = (j.rigBadWeatherDays ?? 0) * (j.rigDailyRate ?? 0) * 0.5;
    return sum + ct1Save + ct2Save;
  }, 0);
  const nptSpent = ctJobs.reduce((sum, j) => {
    const rate = j.ct1DailyRate ?? j.rigDailyRate ?? 0;
    return sum + (j.nptDays ?? 0) * rate;
  }, 0);

  const fmtUSD = (n: number) => n > 0 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';

  const kpis = [
    { label: 'Total Jobs 2026', value: totalJobs, icon: Activity, color: '#073674', sub: 'All service lines' },
    { label: 'Complete Jobs', value: totalSuccessful, icon: CheckCircle2, color: '#059669', sub: `${totalJobs > 0 ? ((totalSuccessful/totalJobs)*100).toFixed(0) : 0}% completion rate` },
  ];

  return (
    <div className="space-y-6">
      {/* This Month Banner — clickable */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowThisMonthJobs(true)}
        className={`rounded-xl px-6 py-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${thisMonthRecovery >= 0 ? 'bg-emerald-50 border border-emerald-200 hover:border-emerald-400' : 'bg-red-50 border border-red-200 hover:border-red-400'}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">
            This Month — {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{thisMonthJobs.length}</span> intervention{thisMonthJobs.length !== 1 ? 's' : ''} performed
          </p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
            Tap to see details <ChevronRight className="w-3 h-3" />
          </p>
        </div>
        <div className="flex items-center gap-3">
          {thisMonthRecovery >= 0
            ? <TrendingUp className="w-8 h-8 text-emerald-500" />
            : <TrendingDown className="w-8 h-8 text-red-500" />
          }
          <div className="text-right">
            <p className={`text-3xl font-bold font-mono ${thisMonthRecovery >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {thisMonthRecovery >= 0 ? '+' : ''}{thisMonthRecovery.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">bbl/d {thisMonthRecovery >= 0 ? 'added to' : 'lost from'} production</p>
          </div>
        </div>
      </motion.div>

      {/* Expected Recovery This Month — tappable strip */}
      {expectedThisMonth > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowExpectedPlans(true)}
          className="w-full text-left -mt-3 rounded-b-xl rounded-t-none border border-t-0 border-blue-200 bg-blue-50 px-6 py-3 flex items-center justify-between hover:bg-blue-100 active:bg-blue-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#073674]" />
            <p className="text-xs font-semibold text-[#073674]">
              Expected to recover this month
            </p>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-bold font-mono text-[#073674]">
              +{expectedThisMonth.toLocaleString()} bbl/d
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-[#073674]" />
          </div>
        </motion.button>
      )}

      {/* Expected Plans Popup */}
      <Dialog open={showExpectedPlans} onOpenChange={setShowExpectedPlans}>
        <DialogContent className="max-w-md w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#073674] text-base font-bold">
              Planned Wells — {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Pending */}
            {(() => {
              const pending = expectedThisMonthPlans.filter(p => {
                const matched = jobs.filter(j =>
                  j.platform === p.platform &&
                  j.wellNumber === p.wellNumber &&
                  j.serviceLine === p.serviceLine
                );
                return matched.length === 0;
              });
              const done = expectedThisMonthPlans.filter(p => {
                const matched = jobs.filter(j =>
                  j.platform === p.platform &&
                  j.wellNumber === p.wellNumber &&
                  j.serviceLine === p.serviceLine
                );
                return matched.length > 0;
              });
              return (
                <>
                  {pending.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Pending ({pending.length})</p>
                      <div className="space-y-2">
                        {pending.map(p => (
                          <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800">{p.platform} — Well {p.wellNumber}</p>
                              <p className="text-xs text-slate-500">{p.serviceLine === 'coiled-tubing' ? 'Coiled Tubing' : 'Wireline'}{p.plannedJobType ? ` · ${p.plannedJobType}` : ''}</p>
                              {p.expectedRecovery != null && (
                                <p className="text-xs font-semibold text-[#073674] mt-0.5">Expected: +{p.expectedRecovery} bbl/d</p>
                              )}
                              {p.plannedDate && (
                                <p className="text-xs text-slate-400 font-mono mt-0.5">Target: {new Date(p.plannedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {done.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Done ({done.length})</p>
                      <div className="space-y-2">
                        {done.map(p => {
                          const matchedJobs = jobs.filter(j =>
                            j.platform === p.platform &&
                            j.wellNumber === p.wellNumber &&
                            j.serviceLine === p.serviceLine
                          );
                          const actualRecovery = matchedJobs.reduce((sum, j) => {
                            if (j.productionBefore !== null && j.productionAfter !== null) {
                              return sum + (j.productionAfter - j.productionBefore);
                            }
                            return sum;
                          }, 0);
                          const delta = p.expectedRecovery != null ? actualRecovery - p.expectedRecovery : null;
                          return (
                            <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800">{p.platform} — Well {p.wellNumber}</p>
                                <p className="text-xs text-slate-500">{p.serviceLine === 'coiled-tubing' ? 'Coiled Tubing' : 'Wireline'}{p.plannedJobType ? ` · ${p.plannedJobType}` : ''}</p>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {p.expectedRecovery != null && (
                                    <p className="text-xs text-slate-500">Expected: <span className="font-semibold text-[#073674]">+{p.expectedRecovery} bbl/d</span></p>
                                  )}
                                  <p className="text-xs text-slate-500">Actual: <span className={`font-semibold ${actualRecovery >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{actualRecovery >= 0 ? '+' : ''}{actualRecovery} bbl/d</span></p>
                                  {delta !== null && (
                                    <span className={`text-xs font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} bbl/d
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {pending.length === 0 && done.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">No planned wells for this month</p>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* This Month Jobs Dialog */}
      <ThisMonthJobsDialog
        open={showThisMonthJobs}
        onClose={() => setShowThisMonthJobs(false)}
        jobs={thisMonthJobs}
        monthLabel={now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
      />

      {/* KPI Cards — top row */}
      <div className="grid grid-cols-2 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{kpi.label}</p>
                  <kpi.icon className="w-4 h-4 mt-0.5" style={{ color: kpi.color }} />
                </div>
                <p className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Production Recovery — 4 individual boxes */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'CT Recovery After Job', value: ctRecovery.after, sub: `${ctRecovery.count} CT job${ctRecovery.count !== 1 ? 's' : ''}`, color: '#073674', dot: '#073674' },
          { label: 'CT Recovery at +30 Days', value: ctRecovery.days30, sub: 'Coiled Tubing', color: '#073674', dot: '#073674' },
          { label: 'WL Recovery After Job', value: wlRecovery.after, sub: `${wlRecovery.count} WL job${wlRecovery.count !== 1 ? 's' : ''}`, color: '#0d6efd', dot: '#0d6efd' },
          { label: 'WL Recovery at +30 Days', value: wlRecovery.days30, sub: 'Wireline', color: '#0d6efd', dot: '#0d6efd' },
        ].map((box, i) => (
          <motion.div key={box.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06 }}>
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-4 pb-4 px-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: box.dot }} />
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 leading-tight">{box.label}</p>
                </div>
                <p className={`text-2xl font-bold font-mono ${box.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {box.value >= 0 ? '+' : ''}{box.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">bbl/d &middot; {box.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* CT Finance & NPT Summary */}
      {(ctTotalCost > 0 || totalNPTDays > 0 || ctProdRecoveryUSD > 0) && (
        <div className="space-y-3">
          {/* CT Cost + Production Recovery $ */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-[#073674]" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 leading-tight">CT Total Investment</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-[#073674]">{fmtUSD(ctTotalCost)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ctJobs.length} CT job{ctJobs.length !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 leading-tight">Total Avg Production Recovery $</p>
                  </div>
                  <p className="text-2xl font-bold font-mono text-emerald-600">{ctProdRecoveryUSD > 0 ? fmtUSD(ctProdRecoveryUSD) : '—'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">CT · recovery × $70 × days to year-end</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* NPT Summary */}
          {(totalNPTDays > 0 || totalBadWeatherDays > 0) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-0 shadow-sm bg-white border-l-4 border-l-orange-400">
                <CardContent className="pt-4 pb-4 px-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-3">NPT & Weather Summary — CT</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Total NPT Days</p>
                      <p className="text-xl font-bold font-mono text-orange-600">{totalNPTDays}</p>
                      <p className="text-xs text-slate-400">days non-productive</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Bad Weather Days</p>
                      <p className="text-xl font-bold font-mono text-blue-600">{totalBadWeatherDays}</p>
                      <p className="text-xs text-slate-400">days weather standby</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">$ Saved (Weather Discount)</p>
                      <p className="text-xl font-bold font-mono text-emerald-600">{fmtUSD(badWeatherSaved)}</p>
                      <p className="text-xs text-slate-400">50% rate on weather days</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">$ Spent on NPT</p>
                      <p className="text-xl font-bold font-mono text-red-500">{fmtUSD(nptSpent)}</p>
                      <p className="text-xs text-slate-400">full rate × NPT days</p>
                    </div>
                  </div>
                  {/* NPT Notes per job */}
                  {ctJobs.filter(j => j.nptDays && j.nptDays > 0 && j.nptNotes).length > 0 && (
                    <div className="mt-3 border-t border-orange-100 pt-3">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">NPT Reasons</p>
                      <div className="space-y-2">
                        {ctJobs
                          .filter(j => j.nptDays && j.nptDays > 0 && j.nptNotes)
                          .map(j => (
                            <div key={j.id} className="flex items-start gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 shrink-0 bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-mono font-semibold">
                                {j.platform} {j.wellNumber}
                              </span>
                              <span className="text-slate-600">
                                <span className="font-semibold text-orange-600">{j.nptDays}d NPT</span> — {j.nptNotes}
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Status Summary Row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Complete', count: totalSuccessful, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', status: null, clickable: false },
          { label: 'Incomplete', count: totalIncomplete, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', status: 'Incomplete' as const, clickable: true },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.07 }}>
            <div
              className={`rounded-xl border px-4 py-4 flex items-center gap-3 transition-all ${
                s.clickable && s.count > 0 ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
              } ${s.bg}`}
              onClick={() => s.clickable && s.count > 0 && s.status && setStatusFilter(s.status as 'Incomplete')}
            >
              <s.icon className={`w-6 h-6 flex-shrink-0 ${s.color}`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold font-mono text-slate-800">{s.count}</p>
                <p className="text-xs text-slate-500 font-medium leading-tight">{s.label}</p>
                {s.clickable && s.count > 0 && (
                  <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">tap <ChevronRight className="w-3 h-3" /></p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Jobs Dialog */}
      {statusFilter && (
        <ThisMonthJobsDialog
          open={!!statusFilter}
          onClose={() => setStatusFilter(null)}
          jobs={jobs.filter(j => j.status === statusFilter)}
          monthLabel={`${statusFilter} Jobs`}
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyImpactChart />
        <div className="space-y-4">
          <ProductionRecoveryLeaderboard />
          <ProductionRecoveryByServiceLine />
        </div>
      </div>
    </div>
  );
}
