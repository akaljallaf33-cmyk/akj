// Well Intervention Dashboard — Overview Tab
// Combined KPIs, monthly production impact, and charts for all service lines

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';
import { useData } from '@/contexts/DataContext';
import { SERVICE_LINE_LABELS, ServiceLine, MONTHS_2026 } from '@/lib/types';
import { TrendingUp, TrendingDown, Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const SL_COLORS: Record<ServiceLine, string> = {
  'coiled-tubing': '#073674',
  'wireline': '#0d6efd',
  'pumping': '#0891b2',
};

const SL_LIST: ServiceLine[] = ['coiled-tubing', 'wireline', 'pumping'];

function MonthlyImpactChart() {
  const { jobs } = useData();

  const data = useMemo(() => {
    return MONTHS_2026.map(m => {
      const monthJobs = jobs.filter(j => j.jobDate.startsWith(m.value));
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
        month: m.label.split(' ')[0].substring(0, 3),
        'Uplift After Job': uplift,
        'Uplift +30 Days': uplift30,
        jobs: monthJobs.length,
      };
    });
  }, [jobs]);

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider">
          Monthly Production Impact (bbl/d)
        </CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">Net production gain/loss per month across all service lines</p>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toLocaleString()} bbl/d`, '']}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="Uplift After Job" fill="#073674" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry['Uplift After Job'] >= 0 ? '#073674' : '#ef4444'} />
              ))}
            </Bar>
            <Bar dataKey="Uplift +30 Days" fill="#0891b2" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry['Uplift +30 Days'] >= 0 ? '#0891b2' : '#f97316'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function JobsByServiceLine() {
  const { jobs } = useData();
  const data = SL_LIST.map(sl => ({
    name: SERVICE_LINE_LABELS[sl],
    value: jobs.filter(j => j.serviceLine === sl).length,
    color: SL_COLORS[sl],
  })).filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider">Jobs by Service Line</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4 px-4">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function UpliftByServiceLine() {
  const { jobs } = useData();
  const data = SL_LIST.map(sl => {
    const slJobs = jobs.filter(j => j.serviceLine === sl);
    const upliftAfter = slJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
      return sum;
    }, 0);
    const uplift30 = slJobs.reduce((sum, j) => {
      if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
      return sum;
    }, 0);
    return { name: SERVICE_LINE_LABELS[sl].replace(' ', '\n'), upliftAfter, uplift30 };
  });

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-2 pt-5 px-6 border-b border-slate-100">
        <CardTitle className="text-sm font-bold text-[#073674] uppercase tracking-wider">
          Production Uplift by Service Line (bbl/d)
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
              formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toLocaleString()} bbl/d`, '']}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="upliftAfter" name="After Job" fill="#073674" radius={[3, 3, 0, 0]} />
            <Bar dataKey="uplift30" name="+30 Days" fill="#0891b2" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function OverviewTab() {
  const { jobs } = useData();

  const totalJobs = jobs.length;
  const totalSuccessful = jobs.filter(j => j.status === 'Successful').length;
  const totalPartial = jobs.filter(j => j.status === 'Partially Successful').length;
  const totalFailed = jobs.filter(j => j.status === 'Failed').length;

  const totalUpliftAfter = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
    return sum;
  }, 0);
  const totalUplift30 = jobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.production30Days !== null) return sum + (j.production30Days - j.productionBefore);
    return sum;
  }, 0);

  // This month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthJobs = jobs.filter(j => j.jobDate.startsWith(thisMonth));
  const thisMonthUplift = thisMonthJobs.reduce((sum, j) => {
    if (j.productionBefore !== null && j.productionAfter !== null) return sum + (j.productionAfter - j.productionBefore);
    return sum;
  }, 0);

  const kpis = [
    { label: 'Total Jobs 2026', value: totalJobs, icon: Activity, color: '#073674', sub: 'All service lines' },
    { label: 'Successful Jobs', value: totalSuccessful, icon: CheckCircle2, color: '#059669', sub: `${totalJobs > 0 ? ((totalSuccessful/totalJobs)*100).toFixed(0) : 0}% success rate` },
    { label: 'Total Uplift After Job', value: `${totalUpliftAfter >= 0 ? '+' : ''}${totalUpliftAfter.toLocaleString()}`, icon: TrendingUp, color: totalUpliftAfter >= 0 ? '#059669' : '#dc2626', sub: 'bbl/d net gain' },
    { label: 'Sustained at +30 Days', value: `${totalUplift30 >= 0 ? '+' : ''}${totalUplift30.toLocaleString()}`, icon: TrendingUp, color: totalUplift30 >= 0 ? '#059669' : '#dc2626', sub: 'bbl/d at 30 days' },
  ];

  return (
    <div className="space-y-6">
      {/* This Month Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl px-6 py-4 flex items-center justify-between ${thisMonthUplift >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">
            This Month — {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{thisMonthJobs.length}</span> intervention{thisMonthJobs.length !== 1 ? 's' : ''} performed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {thisMonthUplift >= 0
            ? <TrendingUp className="w-8 h-8 text-emerald-500" />
            : <TrendingDown className="w-8 h-8 text-red-500" />
          }
          <div className="text-right">
            <p className={`text-3xl font-bold font-mono ${thisMonthUplift >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {thisMonthUplift >= 0 ? '+' : ''}{thisMonthUplift.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">bbl/d {thisMonthUplift >= 0 ? 'added to' : 'lost from'} production</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Status Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Successful', count: totalSuccessful, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Partially Successful', count: totalPartial, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Failed', count: totalFailed, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.07 }}>
            <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${s.bg}`}>
              <s.icon className={`w-7 h-7 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold font-mono text-slate-800">{s.count}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyImpactChart />
        <div className="space-y-4">
          <JobsByServiceLine />
          <UpliftByServiceLine />
        </div>
      </div>
    </div>
  );
}
