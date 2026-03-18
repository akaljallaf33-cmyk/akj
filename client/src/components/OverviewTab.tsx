// Well Intervention Dashboard — Overview Tab
// Combined KPIs, monthly production impact, and charts for all service lines

import { useMemo, useState } from 'react';
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
              const statusColor = job.status === 'Successful' ? 'bg-emerald-100 text-emerald-800'
                : job.status === 'Partially Successful' ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800';
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
  const [statusFilter, setStatusFilter] = useState<'Failed' | 'Partially Successful' | null>(null);
  const totalJobs = jobs.length;
  const totalSuccessful = jobs.filter(j => j.status === 'Successful').length;
  const totalPartial = jobs.filter(j => j.status === 'Partially Successful').length;
  const totalFailed = jobs.filter(j => j.status === 'Failed').length;

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

  const kpis = [
    { label: 'Total Jobs 2026', value: totalJobs, icon: Activity, color: '#073674', sub: 'All service lines' },
    { label: 'Successful Jobs', value: totalSuccessful, icon: CheckCircle2, color: '#059669', sub: `${totalJobs > 0 ? ((totalSuccessful/totalJobs)*100).toFixed(0) : 0}% success rate` },
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

      {/* Status Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Successful', count: totalSuccessful, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', status: 'Successful' as const, clickable: false },
          { label: 'Partially Succ.', count: totalPartial, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', status: 'Partially Successful' as const, clickable: true },
          { label: 'Failed', count: totalFailed, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', status: 'Failed' as const, clickable: true },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.07 }}>
            <div
              className={`rounded-xl border px-4 py-4 flex items-center gap-3 transition-all ${
                s.clickable && s.count > 0 ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
              } ${s.bg}`}
              onClick={() => s.clickable && s.count > 0 && setStatusFilter(s.status as 'Failed' | 'Partially Successful')}
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
