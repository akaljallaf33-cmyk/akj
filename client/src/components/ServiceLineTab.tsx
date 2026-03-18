// Well Intervention Dashboard — Service Line Tab
// Shows all jobs for a specific service line with add/edit/delete and production data

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, ArrowUpRight, Clock } from 'lucide-react';
import { WellJob, ServiceLine, SERVICE_LINE_LABELS } from '@/lib/types';
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
import { MONTHS_2026 } from '@/lib/types';

interface Props {
  serviceLine: ServiceLine;
}

function StatusBadge({ status }: { status: WellJob['status'] }) {
  const cls =
    status === 'Successful' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    status === 'Partially Successful' ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-red-100 text-red-800 border-red-200';
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
    // Use the most recent month's price as a proxy for payback calculation
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

export default function ServiceLineTab({ serviceLine }: Props) {
  const { getJobsByServiceLine, deleteJob } = useData();
  const jobs = getJobsByServiceLine(serviceLine);
  const { isAdmin } = useRole();
  const oilPrice = getStoredOilPrice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJob, setEditJob] = useState<WellJob | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (job: WellJob) => { setEditJob(job); setDialogOpen(true); };
  const handleAdd = () => { setEditJob(null); setDialogOpen(true); };
  const handleDelete = () => {
    if (deleteId) { deleteJob(deleteId); toast.success('Job record deleted'); setDeleteId(null); }
  };

  // KPI summary
  const totalJobs = jobs.length;
  const successful = jobs.filter(j => j.status === 'Successful').length;
  const totalRecoveryAfter = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
    return sum;
  }, 0);
  const totalRecovery30 = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
    return sum;
  }, 0);

  const label = SERVICE_LINE_LABELS[serviceLine];
  const accentColor = serviceLine === 'coiled-tubing' ? '#073674' : serviceLine === 'wireline' ? '#0d6efd' : '#0891b2';

  // Monthly uplift data for this service line — always Jan to Dec in order
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = MONTHS_2026.map((m, idx) => {
    const mJobs = jobs.filter(j => j.endDate.startsWith(m.value));
    const uplift = mJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
      return sum;
    }, 0);
    return { month: MONTH_LABELS[idx], uplift, jobs: mJobs.length };
  });

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
    { label: 'Total Jobs', value: totalJobs, sub: 'in 2026' },
        { label: 'Successful', value: successful, sub: `${totalJobs > 0 ? ((successful/totalJobs)*100).toFixed(0) : 0}% success rate` },
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
          {/* Monthly Production Recovery Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="bg-white rounded-xl shadow-sm border-0 px-6 pt-5 pb-4 h-full">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>Monthly Production Recovery (bbl/d)</p>
              <p className="text-xs text-slate-400 mb-4">Net production recovery per month — {label}</p>
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

          {/* Well-by-Well Before vs After vs +30 Days Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-white rounded-xl shadow-sm border-0 px-6 pt-5 pb-4 h-full">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>Well-by-Well Production (bbl/d)</p>
              <p className="text-xs text-slate-400 mb-4">Before job vs After job vs +30 Days — per well</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={jobs
                    .filter(j => j.productionBefore !== null || j.productionAfter !== null)
                    .map(j => ({
                      well: `${j.platform} ${j.wellNumber}`,
                      'Before': j.productionBefore ?? 0,
                      'After': j.productionAfter ?? 0,
                      '+30 Days': j.production30Days ?? 0,
                    }))}
                  barGap={2}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="well"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    formatter={(val: number, name: string) => [`${val.toLocaleString()} bbl/d`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="Before" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="After" fill={accentColor} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="+30 Days" fill="#0891b2" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-6 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-[#073674] flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            {label} — Well Jobs 2026
            <span className="ml-2 bg-[#073674]/10 text-[#073674] text-xs font-semibold px-2 py-0.5 rounded-full">
              {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'}
            </span>
          </CardTitle>
          {isAdmin && (
            <Button
              onClick={handleAdd}
              className="bg-[#073674] hover:bg-[#052a5c] text-white text-sm h-8 px-4 gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Job
            </Button>
          )}
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
                     <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                     {serviceLine === 'wireline' && (
                       <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Payback</TableHead>
                     )}
                     {isAdmin && <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {jobs.map((job, idx) => (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: idx * 0.04 }}
                        className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors"
                      >
                        <TableCell className="text-slate-400 text-xs font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-700 text-sm">{job.platform}</TableCell>
                        <TableCell className="font-mono text-sm text-[#073674] font-semibold">{job.wellNumber}</TableCell>
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
