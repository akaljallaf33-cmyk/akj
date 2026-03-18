import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WellJob, SERVICE_LINE_LABELS } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface WellHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  platform: string;
  wellNumber: string;
  jobs: WellJob[]; // all jobs for this well, sorted by endDate
}

function statusColor(status: WellJob["status"]) {
  if (status === "Successful") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "Partially Successful") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function statusDot(status: WellJob["status"]) {
  if (status === "Successful") return "bg-emerald-500";
  if (status === "Partially Successful") return "bg-amber-500";
  return "bg-red-500";
}

export default function WellHistoryDialog({
  open,
  onClose,
  platform,
  wellNumber,
  jobs,
}: WellHistoryDialogProps) {
  // Sort jobs by endDate ascending
  const sorted = [...jobs].sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  );

  // Build production trend chart data
  // Each job contributes up to 3 points: Before, After, +30d
  const chartData: { label: string; before: number | null; after: number | null; plus30: number | null }[] = [];

  sorted.forEach((job, idx) => {
    const dateLabel = new Date(job.endDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    const jobLabel = `Job ${idx + 1} (${dateLabel})`;

    chartData.push({
      label: jobLabel,
      before: job.productionBefore,
      after: job.productionAfter,
      plus30: job.production30Days,
    });
  });

  const netRecovery = sorted.reduce((sum, job) => {
    if (job.productionBefore !== null && job.productionAfter !== null) {
      return sum + (job.productionAfter - job.productionBefore);
    }
    return sum;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#073674] text-lg font-bold">
            Well History — {platform} / {wellNumber}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              {sorted.length} intervention{sorted.length !== 1 ? "s" : ""}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                netRecovery > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : netRecovery < 0
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Net: {netRecovery >= 0 ? "+" : ""}
              {netRecovery.toLocaleString()} bbl/d
            </span>
          </div>
        </DialogHeader>

        {sorted.length === 0 ? (
          <p className="text-slate-400 text-sm py-6 text-center">No jobs found for this well.</p>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Production Trend Chart */}
            {chartData.some((d) => d.before !== null || d.after !== null) && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Production Trend (bbl/d)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }}
                      formatter={(val) =>
                        val != null ? [`${val} bbl/d`] : ["—"]
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#e2e8f0" />
                    <Line
                      type="monotone"
                      dataKey="before"
                      name="Before Job"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#94a3b8" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="after"
                      name="After Job"
                      stroke="#073674"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#073674" }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="plus30"
                      name="+30 Days"
                      stroke="#0891b2"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={{ r: 4, fill: "#0891b2" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Job Timeline */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Intervention Timeline
              </p>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100" />
                <div className="space-y-4">
                  {sorted.map((job, idx) => {
                    const recovery =
                      job.productionBefore !== null && job.productionAfter !== null
                        ? job.productionAfter - job.productionBefore
                        : null;
                    return (
                      <div key={job.id} className="flex items-start gap-4 pl-8 relative">
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${statusDot(job.status)}`}
                        />
                        <div className="flex-1 bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-700">
                                  Job {idx + 1}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {SERVICE_LINE_LABELS[job.serviceLine]}
                                </span>
                                {job.unit && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#073674]/10 text-[#073674] font-medium">
                                    {job.unit}
                                  </span>
                                )}
                                <span className="text-xs text-slate-400">{job.jobType}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                                {new Date(job.startDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                                {job.startDate !== job.endDate &&
                                  ` → ${new Date(job.endDate).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}`}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${statusColor(job.status)}`}
                            >
                              {job.status}
                            </span>
                          </div>

                          {/* Production figures */}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono">
                            {job.productionBefore !== null && (
                              <span className="text-slate-500">
                                Before: <span className="font-semibold text-slate-700">{job.productionBefore} bbl/d</span>
                              </span>
                            )}
                            {job.productionAfter !== null && (
                              <span className="text-slate-500">
                                After:{" "}
                                <span className="font-semibold text-slate-700">
                                  {job.productionAfter} bbl/d
                                </span>
                              </span>
                            )}
                            {job.production30Days !== null && (
                              <span className="text-slate-500">
                                +30d:{" "}
                                <span className="font-semibold text-slate-700">
                                  {job.production30Days} bbl/d
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Net recovery badge */}
                          {recovery !== null && (
                            <p
                              className={`text-xs font-semibold mt-1 ${
                                recovery >= 0 ? "text-emerald-600" : "text-red-500"
                              }`}
                            >
                              {recovery >= 0 ? "+" : ""}
                              {recovery.toLocaleString()} bbl/d recovery
                            </p>
                          )}

                          {/* Notes */}
                          {job.notes && (
                            <p className="text-xs text-slate-500 mt-1.5 italic border-l-2 border-slate-200 pl-2">
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
      </DialogContent>
    </Dialog>
  );
}
