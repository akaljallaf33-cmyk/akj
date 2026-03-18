// Well Planning Section — add upcoming wells with expected recovery targets
// Auto-links to actual CT/WL jobs once they are added
import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { PLATFORM_NAMES, getWellsForPlatform } from '@/lib/platformWells';
import { SERVICE_LINE_LABELS } from '@/lib/types';
import { useData } from '@/contexts/DataContext';
import { useRole } from '@/hooks/useRole';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CalendarClock, Plus, Pencil, Trash2, TrendingUp, TrendingDown,
  Minus, CheckCircle2, Clock, AlertCircle, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ServiceLine = 'coiled-tubing' | 'wireline' | 'pumping';

interface PlanFormState {
  platform: string;
  wellNumber: string;
  serviceLine: ServiceLine;
  plannedJobType: string;
  expectedRecovery: string;
  plannedDate: string;
  notes: string;
}

const EMPTY_FORM: PlanFormState = {
  platform: '',
  wellNumber: '',
  serviceLine: 'coiled-tubing',
  plannedJobType: '',
  expectedRecovery: '',
  plannedDate: '',
  notes: '',
};

function RecoveryDelta({ expected, actual }: { expected: number | null; actual: number | null }) {
  if (expected === null || actual === null) return null;
  const diff = actual - expected;
  const pct = expected !== 0 ? ((diff / expected) * 100).toFixed(0) : null;
  if (diff > 0) return (
    <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
      <TrendingUp className="w-3 h-3" />+{diff} bbl/d {pct && <span className="text-emerald-500 font-normal">(+{pct}%)</span>}
    </span>
  );
  if (diff < 0) return (
    <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
      <TrendingDown className="w-3 h-3" />{diff} bbl/d {pct && <span className="text-red-400 font-normal">({pct}%)</span>}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-slate-500 text-xs">
      <Minus className="w-3 h-3" />On target
    </span>
  );
}

export default function WellPlanningSection({ selectedYear }: { selectedYear: number }) {
  const { jobs: allJobs } = useData();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [formWells, setFormWells] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch plans for the selected year
  const { data: plans = [], isLoading } = trpc.wellPlans.list.useQuery(
    { year: selectedYear },
    { refetchOnWindowFocus: false }
  );

  const createPlan = trpc.wellPlans.create.useMutation({
    onSuccess: () => {
      utils.wellPlans.list.invalidate();
      toast.success('Planned well added');
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePlan = trpc.wellPlans.update.useMutation({
    onSuccess: () => {
      utils.wellPlans.list.invalidate();
      toast.success('Plan updated');
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePlan = trpc.wellPlans.delete.useMutation({
    onSuccess: () => {
      utils.wellPlans.list.invalidate();
      toast.success('Plan removed');
    },
    onError: (e) => toast.error(e.message),
  });

  // Match each plan to actual jobs (same platform + wellNumber + year)
  const yearJobs = useMemo(
    () => allJobs.filter(j => j.startDate.startsWith(String(selectedYear))),
    [allJobs, selectedYear]
  );

  const matchedPlans = useMemo(() => {
    return plans.map(plan => {
      const matched = yearJobs.filter(
        j => j.platform === plan.platform && j.wellNumber === plan.wellNumber &&
          (plan.serviceLine === 'coiled-tubing' ? j.serviceLine === 'coiled-tubing' : j.serviceLine === plan.serviceLine)
      );
      const latestJob = matched.length > 0
        ? matched.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
        : null;
      const actualRecovery = latestJob && latestJob.productionBefore !== null && latestJob.productionAfter !== null
        ? latestJob.productionAfter - latestJob.productionBefore
        : null;
      return { ...plan, matchedJobs: matched, latestJob, actualRecovery };
    });
  }, [plans, yearJobs]);

  // Stats
  const stats = useMemo(() => {
    const total = matchedPlans.length;
    const done = matchedPlans.filter(p => p.matchedJobs.length > 0).length;
    const pending = total - done;
    const totalExpected = matchedPlans.reduce((s, p) => s + (p.expectedRecovery ?? 0), 0);
    const totalActual = matchedPlans.reduce((s, p) => s + (p.actualRecovery ?? 0), 0);
    return { total, done, pending, totalExpected, totalActual };
  }, [matchedPlans]);

  function handlePlatformChange(val: string) {
    setForm(f => ({ ...f, platform: val, wellNumber: '' }));
    setFormWells(getWellsForPlatform(val));
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormWells([]);
    setShowForm(true);
  }

  function openEdit(plan: typeof matchedPlans[0]) {
    setEditingId(plan.id);
    setForm({
      platform: plan.platform,
      wellNumber: plan.wellNumber,
      serviceLine: plan.serviceLine as ServiceLine,
      plannedJobType: plan.plannedJobType ?? '',
      expectedRecovery: plan.expectedRecovery != null ? String(plan.expectedRecovery) : '',
      plannedDate: plan.plannedDate ?? '',
      notes: plan.notes ?? '',
    });
    setFormWells(getWellsForPlatform(plan.platform));
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.platform || !form.wellNumber) {
      toast.error('Platform and well number are required');
      return;
    }
    const payload = {
      platform: form.platform,
      wellNumber: form.wellNumber,
      serviceLine: form.serviceLine,
      plannedJobType: form.plannedJobType || undefined,
      expectedRecovery: form.expectedRecovery ? parseInt(form.expectedRecovery) : null,
      plannedDate: form.plannedDate || undefined,
      notes: form.notes || undefined,
    };
    if (editingId !== null) {
      updatePlan.mutate({ id: editingId, ...payload });
    } else {
      createPlan.mutate({ year: selectedYear, ...payload });
    }
  }

  function handleDelete(id: number) {
    if (!confirm('Remove this planned well?')) return;
    deletePlan.mutate({ id });
  }

  const isBusy = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#073674]" />
          <h3 className="text-sm font-bold text-[#073674] uppercase tracking-wider">
            Well Planning — {selectedYear}
          </h3>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={openAdd}
            className="bg-[#073674] hover:bg-[#0a4a9e] text-white text-xs h-8 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Planned Well
          </Button>
        )}
      </div>

      {/* Stats row */}
      {matchedPlans.length > 0 && (
        <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: 'Total Planned', value: stats.total, color: 'text-[#073674]' },
            { label: 'Completed', value: stats.done, color: 'text-emerald-600' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
            { label: 'Expected Gain', value: `+${stats.totalExpected} bbl/d`, color: 'text-slate-700' },
          ].map(s => (
            <div key={s.label} className="px-4 py-3 text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-100"
          >
            <div className="p-5 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700">
                  {editingId !== null ? 'Edit Planned Well' : 'Add Planned Well'}
                </p>
                <button
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Platform */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Platform</Label>
                  <Select value={form.platform} onValueChange={handlePlatformChange}>
                    <SelectTrigger className="bg-white border-slate-200 text-sm h-9">
                      <SelectValue placeholder="Select platform…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_NAMES.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Well */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Well Number</Label>
                  <Select
                    value={form.wellNumber}
                    onValueChange={v => setForm(f => ({ ...f, wellNumber: v }))}
                    disabled={!form.platform}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-sm h-9 disabled:opacity-50">
                      <SelectValue placeholder={form.platform ? 'Select well…' : 'Select platform first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {formWells.map(w => (
                        <SelectItem key={w} value={w}>Well {w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Line */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Service Line</Label>
                  <Select value={form.serviceLine} onValueChange={v => setForm(f => ({ ...f, serviceLine: v as ServiceLine }))}>
                    <SelectTrigger className="bg-white border-slate-200 text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coiled-tubing">Coiled Tubing</SelectItem>
                      <SelectItem value="wireline">Wireline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Planned Job Type */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Planned Job Type</Label>
                  <Input
                    value={form.plannedJobType}
                    onChange={e => setForm(f => ({ ...f, plannedJobType: e.target.value }))}
                    placeholder="e.g. SCO + PP + N2"
                    className="bg-white border-slate-200 text-sm h-9"
                  />
                </div>

                {/* Expected Recovery */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Expected Recovery (bbl/d)</Label>
                  <Input
                    type="number"
                    value={form.expectedRecovery}
                    onChange={e => setForm(f => ({ ...f, expectedRecovery: e.target.value }))}
                    placeholder="e.g. 50"
                    className="bg-white border-slate-200 text-sm h-9"
                  />
                </div>

                {/* Planned Date */}
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Target Date</Label>
                  <Input
                    type="date"
                    value={form.plannedDate}
                    onChange={e => setForm(f => ({ ...f, plannedDate: e.target.value }))}
                    className="bg-white border-slate-200 text-sm h-9"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes…"
                    className="bg-white border-slate-200 text-sm h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isBusy}
                  className="bg-[#073674] hover:bg-[#0a4a9e] text-white text-xs h-8"
                >
                  {isBusy ? 'Saving…' : editingId !== null ? 'Update' : 'Add Plan'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan List */}
      <div className="divide-y divide-slate-50">
        {isLoading && (
          <div className="p-8 text-center text-slate-400 text-sm">Loading plans…</div>
        )}

        {!isLoading && matchedPlans.length === 0 && (
          <div className="p-10 text-center">
            <CalendarClock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">No planned wells for {selectedYear}</p>
            {isAdmin && (
              <p className="text-slate-300 text-xs mt-1">
                Tap "Add Planned Well" to start building your intervention plan
              </p>
            )}
          </div>
        )}

        {matchedPlans.map(plan => {
          const isDone = plan.matchedJobs.length > 0;
          const isExpanded = expandedId === plan.id;

          return (
            <div key={plan.id} className="px-5 py-4">
              {/* Row header */}
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  isDone ? 'bg-emerald-100' : 'bg-amber-50'
                }`}>
                  {isDone
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Clock className="w-4 h-4 text-amber-400" />
                  }
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">
                      {plan.platform} — Well {plan.wellNumber}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      plan.serviceLine === 'coiled-tubing'
                        ? 'bg-[#073674]/10 text-[#073674]'
                        : 'bg-teal-100 text-teal-700'
                    }`}>
                      {SERVICE_LINE_LABELS[plan.serviceLine as keyof typeof SERVICE_LINE_LABELS] ?? plan.serviceLine}
                    </span>
                    {plan.plannedJobType && (
                      <span className="text-xs text-slate-400">{plan.plannedJobType}</span>
                    )}
                  </div>

                  {/* Target date + expected */}
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {plan.plannedDate && (
                      <span className="text-xs text-slate-400 font-mono">
                        Target: {new Date(plan.plannedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {plan.expectedRecovery != null && (
                      <span className="text-xs text-slate-500">
                        Expected: <span className="font-semibold text-[#073674]">+{plan.expectedRecovery} bbl/d</span>
                      </span>
                    )}
                  </div>

                  {/* Actual vs Expected */}
                  {isDone && (
                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      {plan.actualRecovery !== null && (
                        <span className="text-xs text-slate-500">
                          Actual: <span className={`font-semibold ${plan.actualRecovery >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {plan.actualRecovery >= 0 ? '+' : ''}{plan.actualRecovery} bbl/d
                          </span>
                        </span>
                      )}
                      {plan.expectedRecovery != null && plan.actualRecovery !== null && (
                        <RecoveryDelta expected={plan.expectedRecovery} actual={plan.actualRecovery} />
                      )}
                      <span className="text-xs text-emerald-600 font-medium">
                        {plan.matchedJobs.length} job{plan.matchedJobs.length !== 1 ? 's' : ''} completed
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {plan.matchedJobs.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#073674] hover:bg-blue-50 transition-colors"
                      title="View matched jobs"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(plan)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#073674] hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded matched jobs */}
              <AnimatePresence>
                {isExpanded && plan.matchedJobs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 ml-10 space-y-2">
                      {plan.matchedJobs
                        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
                        .map((job, idx) => {
                          const recovery = job.productionBefore !== null && job.productionAfter !== null
                            ? job.productionAfter - job.productionBefore
                            : null;
                          return (
                            <div key={job.id} className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 text-xs">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-700">Job {idx + 1}</span>
                                  <span className="text-slate-400">{job.jobType}</span>
                                  {job.unit && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#073674]/10 text-[#073674] font-semibold">{job.unit}</span>
                                  )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                                  job.status === 'Successful' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                  job.status === 'Partially Successful' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                  'bg-red-100 text-red-800 border-red-200'
                                }`}>{job.status}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-1.5 text-slate-400">
                                <span className="font-mono">
                                  {new Date(job.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                {recovery !== null && (
                                  <span className={`font-semibold ${recovery >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {recovery >= 0 ? '+' : ''}{recovery} bbl/d
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
