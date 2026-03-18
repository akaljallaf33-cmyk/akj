// Well History Tab — select a platform + well to view all interventions chronologically
import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { PLATFORM_WELLS, PLATFORM_NAMES, getWellsForPlatform } from '@/lib/platformWells';
import { SERVICE_LINE_LABELS, WellJob } from '@/lib/types';
import WellPlanningSection from '@/components/WellPlanningSection';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, History, TrendingUp, TrendingDown, Minus, CalendarClock } from 'lucide-react';

function statusColor(status: WellJob['status']) {
  if (status === 'Successful') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'Partially Successful') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function statusDot(status: WellJob['status']) {
  if (status === 'Successful') return 'bg-emerald-500';
  if (status === 'Partially Successful') return 'bg-amber-500';
  return 'bg-red-500';
}

export default function WellHistoryTab({ selectedYear }: { selectedYear?: number }) {
  const { jobs: allJobs } = useData();
  const year = selectedYear ?? new Date().getFullYear();
  const jobs = allJobs.filter(j => j.startDate.startsWith(String(year)));
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedWell, setSelectedWell] = useState<string>('');

  // Derive which platforms actually have jobs
  const platformsWithJobs = useMemo(() => {
    const set = new Set(jobs.map(j => j.platform));
    return PLATFORM_NAMES.filter(p => set.has(p));
  }, [jobs]);

  // Wells for the selected platform that actually have jobs
  const wellsForPlatform = useMemo(() => {
    if (!selectedPlatform) return [];
    const allWells = getWellsForPlatform(selectedPlatform);
    const jobWells = new Set(
      jobs.filter(j => j.platform === selectedPlatform).map(j => j.wellNumber)
    );
    // Show wells that have jobs first, then all wells from master list
    const withJobs = allWells.filter(w => jobWells.has(w));
    const withoutJobs = allWells.filter(w => !jobWells.has(w));
    return [...withJobs, ...withoutJobs];
  }, [selectedPlatform, jobs]);

  // Jobs for the selected well, sorted chronologically
  const wellJobs = useMemo(() => {
    if (!selectedPlatform || !selectedWell) return [];
    return [...jobs]
      .filter(j => j.platform === selectedPlatform && j.wellNumber === selectedWell)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
  }, [jobs, selectedPlatform, selectedWell]);

  // Chart data
  const chartData = useMemo(() => {
    return wellJobs.map((job, idx) => {
      const dateLabel = new Date(job.endDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
      return {
        label: `Job ${idx + 1}\n${dateLabel}`,
        shortLabel: `J${idx + 1} (${dateLabel})`,
        before: job.productionBefore,
        after: job.productionAfter,
        plus30: job.production30Days,
      };
    });
  }, [wellJobs]);

  const netRecovery = useMemo(() => {
    return wellJobs.reduce((sum, job) => {
      if (job.productionBefore !== null && job.productionAfter !== null) {
        return sum + (job.productionAfter - job.productionBefore);
      }
      return sum;
    }, 0);
  }, [wellJobs]);

  const hasChart = chartData.some(d => d.before !== null || d.after !== null);

  const handlePlatformChange = (val: string) => {
    setSelectedPlatform(val);
    setSelectedWell('');
  };

  // Count jobs per well for the selected platform (for well selector hint)
  const jobCountByWell = useMemo(() => {
    const map: Record<string, number> = {};
    jobs.filter(j => j.platform === selectedPlatform).forEach(j => {
      map[j.wellNumber] = (map[j.wellNumber] || 0) + 1;
    });
    return map;
  }, [jobs, selectedPlatform]);

  return (
    <div className="space-y-6">
      {/* Well Planning Section */}
      <WellPlanningSection selectedYear={year} />

      {/* Selector Card — Well History */}
      <div className="flex items-center gap-2 pt-2">
        <History className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Intervention History</h3>
      </div>

      {/* Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-[#073674]" />
          <h3 className="text-sm font-bold text-[#073674] uppercase tracking-wider">
            Select Well
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Platform selector */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Platform
            </label>
            <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:border-[#073674]">
                <SelectValue placeholder="Choose a platform…" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_NAMES.map(p => {
                  const count = jobs.filter(j => j.platform === p).length;
                  return (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{p}</span>
                        {count > 0 && (
                          <span className="text-xs text-slate-400 font-mono">{count} job{count !== 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Well selector */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Well Number
            </label>
            <Select
              value={selectedWell}
              onValueChange={setSelectedWell}
              disabled={!selectedPlatform}
            >
              <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:border-[#073674] disabled:opacity-50">
                <SelectValue placeholder={selectedPlatform ? 'Choose a well…' : 'Select platform first'} />
              </SelectTrigger>
              <SelectContent>
                {wellsForPlatform.map(w => {
                  const count = jobCountByWell[w] || 0;
                  return (
                    <SelectItem key={w} value={w}>
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>Well {w}</span>
                        {count > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">{count} job{count !== 1 ? 's' : ''}</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Empty state — nothing selected */}
      {!selectedWell && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Select a platform and well above</p>
          <p className="text-slate-300 text-sm mt-1">
            Intervention history and production trend will appear here
          </p>
        </div>
      )}

      {/* Selected well — no jobs */}
      {selectedWell && wellJobs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            No interventions recorded for Well {selectedWell} on {selectedPlatform}
          </p>
          <p className="text-slate-300 text-sm mt-1">
            Jobs added via the CT or Wireline tabs will appear here
          </p>
        </div>
      )}

      {/* Well history content */}
      {selectedWell && wellJobs.length > 0 && (
        <div className="space-y-5">
          {/* Summary header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#073674]">
                  {selectedPlatform} — Well {selectedWell}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {wellJobs.length} intervention{wellJobs.length !== 1 ? 's' : ''} recorded in 2026
                </p>
              </div>
              <div className="flex items-center gap-2">
                {netRecovery > 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                ) : netRecovery < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : (
                  <Minus className="w-5 h-5 text-slate-400" />
                )}
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    netRecovery > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : netRecovery < 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Net: {netRecovery >= 0 ? '+' : ''}{netRecovery.toLocaleString()} bbl/d
                </span>
              </div>
            </div>

            {/* Mini stats row */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(['Successful', 'Partially Successful', 'Failed'] as const).map(s => {
                const count = wellJobs.filter(j => j.status === s).length;
                const color =
                  s === 'Successful' ? 'text-emerald-600 bg-emerald-50' :
                  s === 'Partially Successful' ? 'text-amber-600 bg-amber-50' :
                  'text-red-600 bg-red-50';
                return (
                  <div key={s} className={`rounded-lg p-2 text-center ${color}`}>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs font-medium leading-tight">{s}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Production Trend Chart */}
          {hasChart && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                Production Trend (bbl/d)
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
                    formatter={(val: any) => (val != null ? [`${val} bbl/d`] : ['—'])}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Line
                    type="monotone"
                    dataKey="before"
                    name="Before Job"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#94a3b8' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="after"
                    name="After Job"
                    stroke="#073674"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#073674' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="plus30"
                    name="+30 Days"
                    stroke="#0891b2"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ r: 4, fill: '#0891b2' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Intervention Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Intervention Timeline
            </p>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-4">
                {wellJobs.map((job, idx) => {
                  const recovery =
                    job.productionBefore !== null && job.productionAfter !== null
                      ? job.productionAfter - job.productionBefore
                      : null;
                  return (
                    <div key={job.id} className="flex items-start gap-4 pl-8 relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${statusDot(job.status)}`}
                      />
                      <div className="flex-1 bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-700">
                                Job {idx + 1}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                {SERVICE_LINE_LABELS[job.serviceLine]}
                              </span>
                              {job.unit && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#073674]/10 text-[#073674] font-semibold">
                                  {job.unit}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">{job.jobType}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-mono">
                              {new Date(job.startDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {job.startDate !== job.endDate &&
                                ` → ${new Date(job.endDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}`}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0 ${statusColor(job.status)}`}
                          >
                            {job.status}
                          </span>
                        </div>

                        {/* Production figures */}
                        <div className="mt-3 flex flex-wrap gap-4 text-xs">
                          {job.productionBefore !== null && (
                            <div className="flex flex-col">
                              <span className="text-slate-400 font-medium">Before</span>
                              <span className="font-bold text-slate-700 font-mono">
                                {job.productionBefore.toLocaleString()} bbl/d
                              </span>
                            </div>
                          )}
                          {job.productionAfter !== null && (
                            <div className="flex flex-col">
                              <span className="text-slate-400 font-medium">After</span>
                              <span className="font-bold text-slate-700 font-mono">
                                {job.productionAfter.toLocaleString()} bbl/d
                              </span>
                            </div>
                          )}
                          {job.production30Days !== null && (
                            <div className="flex flex-col">
                              <span className="text-slate-400 font-medium">+30 Days</span>
                              <span className="font-bold text-slate-700 font-mono">
                                {job.production30Days.toLocaleString()} bbl/d
                              </span>
                            </div>
                          )}
                          {recovery !== null && (
                            <div className="flex flex-col">
                              <span className="text-slate-400 font-medium">Recovery</span>
                              <span
                                className={`font-bold font-mono ${
                                  recovery >= 0 ? 'text-emerald-600' : 'text-red-500'
                                }`}
                              >
                                {recovery >= 0 ? '+' : ''}
                                {recovery.toLocaleString()} bbl/d
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {job.notes && (
                          <p className="text-xs text-slate-500 mt-3 italic border-l-2 border-slate-200 pl-3 leading-relaxed">
                            {job.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
