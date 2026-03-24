// ServiceLineTab — Shows all jobs for a specific service line with add/edit/delete and production data
// Includes platform filter that scopes the Well-by-Well chart and job table

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, ArrowUpRight, Clock, Filter, Bell, ChevronDown, ChevronUp, Search, MessageSquare, X } from 'lucide-react';
import { WellJob, ServiceLine, SERVICE_LINE_LABELS, MONTHS_2026 } from '@/lib/types';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/hooks/useRole';
import JobDialog from './JobDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

interface Props {
  serviceLine: ServiceLine;
  selectedYear?: number;
}

function StatusBadge({ status }: { status: WellJob['status'] }) {
  const cls =
    status === 'Complete' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    'bg-amber-100 text-amber-800 border-amber-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

function ProductionRecoveryCell({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) return <span className="text-slate-400 text-sm">—</span>;
  const delta = after - before;
  const pct = before > 0 ? ((delta / before) * 100).toFixed(1) : '—';
  if (delta > 0) return (
    <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
      <TrendingUp className="w-3.5 h-3.5" />+{delta.toLocaleString()} <span className="text-emerald-500 font-normal text-xs">(+{pct}%)</span>
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-1 text-red-500 font-semibold text-sm">
      <TrendingDown className="w-3.5 h-3.5" />{delta.toLocaleString()} <span className="text-red-400 font-normal text-xs">({pct}%)</span>
    </span>
  );
  return <span className="flex items-center gap-1 text-slate-500 text-sm"><Minus className="w-3.5 h-3.5" />0</span>;
}

function NumCell({ val }: { val: number | null }) {
  if (val === null) return <span className="text-slate-400 text-sm font-mono">—</span>;
  return <span className="font-mono text-sm text-slate-800">{val.toLocaleString()}</span>;
}

// Read oil price from localStorage (shared with Finance page)
function getStoredOilPrice(): number {
  try {
    const stored = localStorage.getItem('wi_oil_prices');
    if (!stored) return 75;
    const prices: Record<string, number> = JSON.parse(stored);
    const keys = Object.keys(prices).sort().reverse();
    for (const k of keys) {
      if (prices[k] > 0) return prices[k];
    }
    return 75;
  } catch { return 75; }
}

function calcWLPayback(job: WellJob, oilPrice: number): number | null {
  if (!job.jobBill || job.jobBill <= 0) return null;
  const recovery = job.production30Days !== null && job.productionBefore !== null
    ? job.production30Days - job.productionBefore
    : job.productionAfter !== null && job.productionBefore !== null
    ? job.productionAfter - job.productionBefore
    : null;
  if (recovery === null || recovery <= 0) return null;
  const dailyRevenue = recovery * oilPrice;
  if (dailyRevenue <= 0) return null;
  return Math.ceil(job.jobBill / dailyRevenue);
}

export default function ServiceLineTab({ serviceLine, selectedYear }: Props) {
  const { getJobsByServiceLine, deleteJob } = useData();
  const allJobs = getJobsByServiceLine(serviceLine);
  const year = selectedYear ?? new Date().getFullYear();
  const jobs = allJobs.filter(j => j.startDate.startsWith(String(year)));
  const { isAdmin } = useRole();
  const oilPrice = getStoredOilPrice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJob, setEditJob] = useState<WellJob | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [alertExpanded, setAlertExpanded] = useState(false);
  const [wellSearch, setWellSearch] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Jobs that ended 30+ days ago but still have no +30 Days production entry
  const pending30Jobs = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      if (j.production30Days !== null) return false; // already filled
      const end = new Date(j.endDate);
      const daysSinceEnd = (now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceEnd >= 30;
    }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }, [jobs]);

  const handleEdit = (job: WellJob) => { setEditJob(job); setDialogOpen(true); };
  const handleAdd = () => { setEditJob(null); setDialogOpen(true); };
  const handleDelete = () => {
    if (deleteId) { deleteJob(deleteId); toast.success('Job record deleted'); setDeleteId(null); }
  };

  // Derive unique platforms from jobs (sorted alphabetically)
  const availablePlatforms = useMemo(() => {
    const set = new Set(jobs.map(j => j.platform));
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered jobs for chart and table
  const filteredJobs = useMemo(() => {
    let result = platformFilter === 'all' ? jobs : jobs.filter(j => j.platform === platformFilter);
    if (wellSearch.trim()) {
      const q = wellSearch.trim().toLowerCase();
      result = result.filter(j =>
        j.wellNumber.toLowerCase().includes(q) ||
        j.platform.toLowerCase().includes(q) ||
        j.jobType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, platformFilter, wellSearch]);

  // KPI summary — always across ALL jobs (not filtered)
  const totalJobs = jobs.length;
  const successful = jobs.filter(j => j.status === 'Complete').length;
  const totalRecoveryAfter = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
    return sum;
  }, 0);
  const totalRecovery30 = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
    return sum;
  }, 0);

  const label = SERVICE_LINE_LABELS[serviceLine];
  const accentColor = serviceLine === 'coiled-tubing' ? '#073674' : '#0d6efd';

  // Monthly uplift — always uses ALL jobs (platform-agnostic overview)
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = MONTHS_2026.map((m, idx) => {
    const mJobs = jobs.filter(j => j.endDate.startsWith(m.value));
    const uplift = mJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
      return sum;
    }, 0);
    return { month: MONTH_LABELS[idx], uplift, jobs: mJobs.length };
  });

  // Well-by-Well chart — uses FILTERED jobs
  const wellChartData = useMemo(() => {
    return filteredJobs
      .filter(j => j.productionBefore !== null || j.productionAfter !== null)
      .map(j => ({
        well: j.wellNumber,
        'Before': j.productionBefore ?? 0,
        'After': j.productionAfter ?? 0,
        '+30 Days': j.production30Days ?? 0,
      }));
  }, [filteredJobs]);

  return (
    <div className="space-y-6">

      {/* Pending +30 Days Alert Banner */}
      {pending30Jobs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
            <button
              className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left"
              onClick={() => setAlertExpanded(v => !v)}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm font-semibold text-amber-800">
                  {pending30Jobs.length} job{pending30Jobs.length !== 1 ? 's' : ''} pending +30 Days production update
                </span>
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {pending30Jobs.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
                {alertExpanded ? <><ChevronUp className="w-4 h-4" /> Hide</> : <><ChevronDown className="w-4 h-4" /> Show wells</>}
              </div>
            </button>
            <AnimatePresence>
              {alertExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-amber-200 divide-y divide-amber-100">
                    {pending30Jobs.map(j => {
                      const end = new Date(j.endDate);
                      const daysOverdue = Math.floor((new Date().getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={j.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-semibold text-slate-700 text-sm">{j.platform}</span>
                            <span className="font-mono text-sm text-slate-500">{j.wellNumber}</span>
                            <span className="text-xs text-slate-400 truncate">{j.jobType}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-amber-700">+{daysOverdue} days overdue</span>
                            <p className="text-xs text-slate-400">ended {j.endDate}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-5 py-2 bg-amber-50/80 border-t border-amber-100">
                    <p className="text-xs text-amber-600">Open each job and fill in the +30 Days production value to clear this alert.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Jobs', value: totalJobs, sub: 'in 2026' },
          { label: 'Complete', value: successful, sub: `${totalJobs > 0 ? ((successful/totalJobs)*100).toFixed(0) : 0}% completion rate` },
          {
            label: 'Production Recovery After Job',
            value: (totalRecoveryAfter >= 0 ? '+' : '') + totalRecoveryAfter.toLocaleString(),
            sub: 'bbl/d net gain',
            positive: totalRecoveryAfter >= 0
          },
          {
            label: 'Production Recovery at +30 Days',
            value: (totalRecovery30 >= 0 ? '+' : '') + totalRecovery30.toLocaleString(),
            sub: 'bbl/d sustained',
            positive: totalRecovery30 >= 0
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-4 px-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{kpi.label}</p>
                <p
                  className="text-2xl font-bold font-mono"
                  style={{ color: 'positive' in kpi ? (kpi.positive ? '#059669' : '#dc2626') : accentColor }}
                >
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row: Monthly Recovery + Well-by-Well */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Monthly Production Recovery Chart — all platforms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="bg-white rounded-xl shadow-sm border-0 px-6 pt-5 pb-4 h-full">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>Monthly Production Recovery (bbl/d)</p>
              <p className="text-xs text-slate-400 mb-4">Net production recovery per month — all platforms</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barGap={2}>
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
                  <Bar dataKey="uplift" radius={[3, 3, 0, 0]}>
                    {monthlyData.map((entry, i) => (
                      <Cell key={i} fill={entry.uplift >= 0 ? accentColor : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Well-by-Well chart — filtered by platform */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-white rounded-xl shadow-sm border-0 px-6 pt-5 pb-4 h-full">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Well-by-Well Production (bbl/d)</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Before / After / +30 Days
                    {platformFilter !== 'all' ? ` — ${platformFilter}` : ' — all platforms'}
                  </p>
                </div>
                {/* Platform filter for this chart */}
                {availablePlatforms.length > 1 && (
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="h-7 text-xs w-40 border-slate-200 bg-slate-50 shrink-0">
                      <Filter className="w-3 h-3 mr-1 text-slate-400" />
                      <SelectValue placeholder="All platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      {availablePlatforms.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {wellChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-300 text-sm">
                  No production data for this platform
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={wellChartData}
                    barGap={2}
                    barCategoryGap="25%"
                    margin={{ top: 5, right: 5, left: -10, bottom: wellChartData.length > 6 ? 48 : 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="well"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={wellChartData.length > 6 ? -35 : 0}
                      textAnchor={wellChartData.length > 6 ? 'end' : 'middle'}
                      height={wellChartData.length > 6 ? 52 : 24}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                      formatter={(val: number, name: string) => [`${val.toLocaleString()} bbl/d`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar dataKey="Before" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="After" fill={accentColor} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="+30 Days" fill="#0891b2" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Job Type Breakdown */}
      {jobs.length > 0 && (() => {
        const typeCounts: Record<string, number> = {};
        jobs.forEach(j => {
          typeCounts[j.jobType] = (typeCounts[j.jobType] || 0) + 1;
        });
        const typeData = Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count }));
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="bg-white rounded-xl shadow-sm border-0 px-6 pt-5 pb-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>Job Type Breakdown</p>
              <p className="text-xs text-slate-400 mb-4">Number of interventions performed per job type — {label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {typeData.map(({ type, count }) => (
                  <div
                    key={type}
                    className="flex flex-col items-center justify-center rounded-lg py-4 px-3 text-center"
                    style={{ backgroundColor: `${accentColor}10`, border: `1.5px solid ${accentColor}25` }}
                  >
                    <span className="text-3xl font-bold font-mono" style={{ color: accentColor }}>{count}</span>
                    <span className="text-xs font-semibold text-slate-600 mt-1 leading-tight">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Table Card */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              {label} — Well Jobs 2026
              <span className="ml-1 bg-[#073674]/10 text-[#073674] text-xs font-semibold px-2 py-0.5 rounded-full">
                {filteredJobs.length}{platformFilter !== 'all' ? ` / ${totalJobs}` : ''} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Well search box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search well, platform…"
                  value={wellSearch}
                  onChange={e => setWellSearch(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#073674]/30 w-44"
                />
                {wellSearch && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setWellSearch('')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Platform filter for table */}
              {availablePlatforms.length > 1 && (
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="h-8 text-xs w-44 border-slate-200 bg-slate-50">
                    <Filter className="w-3 h-3 mr-1 text-slate-400" />
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    {availablePlatforms.map(p => {
                      const count = jobs.filter(j => j.platform === p).length;
                      return (
                        <SelectItem key={p} value={p}>
                          {p} <span className="text-slate-400 ml-1">({count})</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {isAdmin && (
                <Button
                  onClick={handleAdd}
                  className="bg-[#073674] hover:bg-[#052a5c] text-white text-sm h-8 px-4 gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Job
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">No jobs recorded yet</p>
              <p className="text-sm mt-1">Click "Add Job" to record your first {label} intervention</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Filter className="w-8 h-8 mb-2 text-slate-200" />
              <p className="font-medium text-slate-500">No jobs for {platformFilter}</p>
              <button
                className="text-xs text-[#073674] mt-2 underline"
                onClick={() => setPlatformFilter('all')}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 w-10">#</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Well No.</TableHead>
                    {serviceLine === 'coiled-tubing' && (
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Unit</TableHead>
                    )}
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Job Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Start / End Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Before (bbl/d)</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">After (bbl/d)</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">+30 Days (bbl/d)</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Production Recovery</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 w-8"></TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                    {serviceLine === 'wireline' && (
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Payback</TableHead>
                    )}
                    {isAdmin && <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredJobs.map((job, idx) => (
                      <React.Fragment key={job.id}>
                      <motion.tr
                        key={`row-${job.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.04 }}
                        className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors"
                      >
                        <TableCell className="text-slate-400 text-xs font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-700 text-sm">{job.platform}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-700 font-semibold">{job.wellNumber}</TableCell>
                        {serviceLine === 'coiled-tubing' && (
                          <TableCell>
                            {job.unit ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#073674]/10 text-[#073674] border border-[#073674]/20">
                                {job.unit}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-slate-600">{job.jobType}</TableCell>
                        <TableCell className="text-sm text-slate-500 font-mono whitespace-nowrap">
                          <span className="block">{new Date(job.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {job.startDate !== job.endDate && (
                            <span className="block text-xs text-slate-400">→ {new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right"><NumCell val={job.productionBefore} /></TableCell>
                        <TableCell className="text-right"><NumCell val={job.productionAfter} /></TableCell>
                        <TableCell className="text-right"><NumCell val={job.production30Days} /></TableCell>
                        <TableCell><ProductionRecoveryCell before={job.productionBefore} after={job.productionAfter} /></TableCell>
                        <TableCell className="text-center">
                          {job.notes ? (
                            <button
                              className={`p-1 rounded transition-colors ${expandedNoteId === job.id ? 'text-[#073674] bg-blue-50' : 'text-slate-400 hover:text-[#073674]'}`}
                              onClick={() => setExpandedNoteId(expandedNoteId === job.id ? null : job.id)}
                              title="Tap to read note"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={job.status} /></TableCell>
                        {serviceLine === 'wireline' && (() => {
                          const payback = calcWLPayback(job, oilPrice);
                          return (
                            <TableCell className="text-right">
                              {payback === null ? (
                                <span className="text-slate-400 text-xs">—</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  payback <= 30 ? 'bg-emerald-100 text-emerald-700' :
                                  payback <= 90 ? 'bg-amber-100 text-amber-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  <Clock className="w-3 h-3" />{payback}d
                                </span>
                              )}
                            </TableCell>
                          );
                        })()}
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-[#073674] hover:bg-blue-50"
                                onClick={() => handleEdit(job)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                onClick={() => setDeleteId(job.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </motion.tr>
                      {/* Expanded note row */}
                      {expandedNoteId === job.id && job.notes && (
                        <tr key={`note-${job.id}`} className="bg-blue-50/60">
                          <td
                            colSpan={20}
                            className="px-6 py-3"
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-[#073674] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-[#073674] mb-0.5">Note</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{job.notes}</p>
                              </div>
                              <button
                                className="ml-auto text-slate-400 hover:text-slate-600 p-1"
                                onClick={() => setExpandedNoteId(null)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <JobDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditJob(null); }}
        serviceLine={serviceLine}
        editJob={editJob}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The job record will be permanently removed from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
