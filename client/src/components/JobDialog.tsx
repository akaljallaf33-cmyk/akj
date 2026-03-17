// Well Intervention Dashboard — Add/Edit Job Dialog
// Dragon Oil brand: #073674 blue, white, clean corporate style

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WellJob, ServiceLine, JOB_TYPES, SERVICE_LINE_LABELS } from '@/lib/types';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

interface JobDialogProps {
  open: boolean;
  onClose: () => void;
  serviceLine: ServiceLine;
  editJob?: WellJob | null;
}

const defaultForm = (sl: ServiceLine): Omit<WellJob, 'id'> => ({
  serviceLine: sl,
  platform: '',
  wellNumber: '',
  unit: '',
  jobType: '',
  jobDate: new Date().toISOString().split('T')[0],
  productionBefore: null,
  productionAfter: null,
  production30Days: null,
  status: 'Successful',
  notes: '',
  ct1DailyRate: null,
  operationalDays: null,
  badWeatherDays: null,
  onRig: false,
  rigDailyRate: null,
  rigOperationalDays: null,
  rigBadWeatherDays: null,
  jobBill: null,
});

export default function JobDialog({ open, onClose, serviceLine, editJob }: JobDialogProps) {
  const { addJob, updateJob } = useData();
  const [form, setForm] = useState<Omit<WellJob, 'id'>>(defaultForm(serviceLine));

  useEffect(() => {
    if (editJob) {
      const { id, ...rest } = editJob;
      setForm({ ...defaultForm(serviceLine), ...rest });
    } else {
      setForm(defaultForm(serviceLine));
    }
  }, [editJob, serviceLine, open]);

  const set = (key: keyof Omit<WellJob, 'id'>, value: string | number | boolean | null) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const parseNum = (v: string) => v === '' ? null : parseFloat(v);

  const isCT = serviceLine === 'coiled-tubing';
  const isCT1 = isCT && form.unit === 'CT-1';
  const isCT2 = isCT && form.unit === 'CT-2';

  // Calculate total cost for preview
  const calcTotalCost = (): number | null => {
    if (!isCT) return null;
    let total = 0;
    if (isCT1) {
      const rate = form.ct1DailyRate ?? 0;
      const opDays = form.operationalDays ?? 0;
      const bwDays = form.badWeatherDays ?? 0;
      total += rate * opDays + rate * 0.5 * bwDays;
    }
    if (isCT2 && form.onRig) {
      const rate = form.rigDailyRate ?? 0;
      const opDays = form.rigOperationalDays ?? 0;
      const bwDays = form.rigBadWeatherDays ?? 0;
      total += rate * opDays + rate * 0.5 * bwDays;
    }
    total += form.jobBill ?? 0;
    return total > 0 ? total : null;
  };

  const totalCost = calcTotalCost();

  const handleSubmit = () => {
    if (!form.platform.trim()) { toast.error('Platform is required'); return; }
    if (!form.wellNumber.trim()) { toast.error('Well Number is required'); return; }
    if (!form.jobType) { toast.error('Job Type is required'); return; }
    if (!form.jobDate) { toast.error('Job Date is required'); return; }

    if (editJob) {
      updateJob(editJob.id, form);
      toast.success('Job record updated successfully');
    } else {
      addJob(form);
      toast.success('Job record added successfully');
    }
    onClose();
  };

  const jobTypes = JOB_TYPES[serviceLine];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#073674] text-xl font-bold">
            {editJob ? 'Edit' : 'Add New'} Job — {SERVICE_LINE_LABELS[serviceLine]}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Platform */}
          <div className="space-y-1.5">
            <Label htmlFor="platform" className="text-sm font-semibold text-slate-700">Platform *</Label>
            <Input
              id="platform"
              placeholder="e.g. Platform A"
              value={form.platform}
              onChange={e => set('platform', e.target.value)}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Well Number */}
          <div className="space-y-1.5">
            <Label htmlFor="wellNumber" className="text-sm font-semibold text-slate-700">Well Number *</Label>
            <Input
              id="wellNumber"
              placeholder="e.g. A-01"
              value={form.wellNumber}
              onChange={e => set('wellNumber', e.target.value)}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Unit — only for Coiled Tubing */}
          {isCT && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">CT Unit *</Label>
              <Select value={form.unit ?? ''} onValueChange={v => set('unit', v)}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CT-1">CT-1</SelectItem>
                  <SelectItem value="CT-2">CT-2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Job Type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Job Type *</Label>
            <Select value={form.jobType} onValueChange={v => set('jobType', v)}>
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map(jt => (
                  <SelectItem key={jt} value={jt}>{jt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Date */}
          <div className="space-y-1.5">
            <Label htmlFor="jobDate" className="text-sm font-semibold text-slate-700">Job Date *</Label>
            <Input
              id="jobDate"
              type="date"
              value={form.jobDate}
              onChange={e => set('jobDate', e.target.value)}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Production Before */}
          <div className="space-y-1.5">
            <Label htmlFor="prodBefore" className="text-sm font-semibold text-slate-700">Production Before Job (bbl/d)</Label>
            <Input
              id="prodBefore"
              type="number"
              min="0"
              placeholder="0"
              value={form.productionBefore ?? ''}
              onChange={e => set('productionBefore', parseNum(e.target.value))}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Production After */}
          <div className="space-y-1.5">
            <Label htmlFor="prodAfter" className="text-sm font-semibold text-slate-700">Production After Job (bbl/d)</Label>
            <Input
              id="prodAfter"
              type="number"
              min="0"
              placeholder="0"
              value={form.productionAfter ?? ''}
              onChange={e => set('productionAfter', parseNum(e.target.value))}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Production +30 Days */}
          <div className="space-y-1.5">
            <Label htmlFor="prod30" className="text-sm font-semibold text-slate-700">Production at +30 Days (bbl/d)</Label>
            <Input
              id="prod30"
              type="number"
              min="0"
              placeholder="Leave empty — fill in after 30 days"
              value={form.production30Days ?? ''}
              onChange={e => set('production30Days', parseNum(e.target.value))}
              className="border-slate-300 focus:border-[#073674]"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Job Status *</Label>
            <Select value={form.status} onValueChange={v => set('status', v as WellJob['status'])}>
              <SelectTrigger className="border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Successful">Successful</SelectItem>
                <SelectItem value="Partially Successful">Partially Successful</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ─── CT-1 Cost Section ─────────────────────────────── */}
          {isCT1 && (
            <div className="col-span-2">
              <div className="border border-[#073674]/20 rounded-xl p-4 bg-blue-50/40 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#073674]" />
                  <h3 className="text-sm font-bold text-[#073674] uppercase tracking-wide">CT-1 Jack-Up Cost</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Jack-Up Daily Rate (USD/day)</Label>
                    <Input
                      type="number" min="0" placeholder="e.g. 45000"
                      value={form.ct1DailyRate ?? ''}
                      onChange={e => set('ct1DailyRate', parseNum(e.target.value))}
                      className="border-slate-300 focus:border-[#073674] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Operational Days (full rate)</Label>
                    <Input
                      type="number" min="0" step="0.5" placeholder="e.g. 3"
                      value={form.operationalDays ?? ''}
                      onChange={e => set('operationalDays', parseNum(e.target.value))}
                      className="border-slate-300 focus:border-[#073674] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Bad Weather Days (50% rate)</Label>
                    <Input
                      type="number" min="0" step="0.5" placeholder="e.g. 1"
                      value={form.badWeatherDays ?? ''}
                      onChange={e => set('badWeatherDays', parseNum(e.target.value))}
                      className="border-slate-300 focus:border-[#073674] text-sm"
                    />
                  </div>
                </div>
                {/* Jack-up cost preview */}
                {(form.ct1DailyRate || form.operationalDays || form.badWeatherDays) && (
                  <div className="text-xs text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-200">
                    Jack-Up Cost = ({form.ct1DailyRate ?? 0} × {form.operationalDays ?? 0}) + ({form.ct1DailyRate ?? 0} × 50% × {form.badWeatherDays ?? 0}) = <span className="font-bold text-[#073674]">${((form.ct1DailyRate ?? 0) * (form.operationalDays ?? 0) + (form.ct1DailyRate ?? 0) * 0.5 * (form.badWeatherDays ?? 0)).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── CT-2 Cost Section ─────────────────────────────── */}
          {isCT2 && (
            <div className="col-span-2">
              <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-600" />
                  <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wide">CT-2 Cost</h3>
                </div>

                {/* On Rig toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set('onRig', !form.onRig)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.onRig ? 'bg-teal-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.onRig ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <Label className="text-sm font-semibold text-slate-700 cursor-pointer" onClick={() => set('onRig', !form.onRig)}>
                    Job performed on a Rig
                  </Label>
                </div>

                {/* Rig cost fields — shown only when on rig */}
                {form.onRig && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Rig Daily Rate (USD/day)</Label>
                      <Input
                        type="number" min="0" placeholder="e.g. 60000"
                        value={form.rigDailyRate ?? ''}
                        onChange={e => set('rigDailyRate', parseNum(e.target.value))}
                        className="border-slate-300 focus:border-teal-600 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Operational Days (full rate)</Label>
                      <Input
                        type="number" min="0" step="0.5" placeholder="e.g. 2"
                        value={form.rigOperationalDays ?? ''}
                        onChange={e => set('rigOperationalDays', parseNum(e.target.value))}
                        className="border-slate-300 focus:border-teal-600 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Bad Weather Days (50% rate)</Label>
                      <Input
                        type="number" min="0" step="0.5" placeholder="e.g. 0"
                        value={form.rigBadWeatherDays ?? ''}
                        onChange={e => set('rigBadWeatherDays', parseNum(e.target.value))}
                        className="border-slate-300 focus:border-teal-600 text-sm"
                      />
                    </div>
                    {/* Rig cost preview */}
                    {(form.rigDailyRate || form.rigOperationalDays || form.rigBadWeatherDays) && (
                      <div className="col-span-3 text-xs text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-200">
                        Rig Cost = ({form.rigDailyRate ?? 0} × {form.rigOperationalDays ?? 0}) + ({form.rigDailyRate ?? 0} × 50% × {form.rigBadWeatherDays ?? 0}) = <span className="font-bold text-teal-700">${((form.rigDailyRate ?? 0) * (form.rigOperationalDays ?? 0) + (form.rigDailyRate ?? 0) * 0.5 * (form.rigBadWeatherDays ?? 0)).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Job Bill (shared for all CT jobs) ─────────────── */}
          {isCT && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Job Bill (USD)</Label>
              <Input
                type="number" min="0" placeholder="e.g. 120000"
                value={form.jobBill ?? ''}
                onChange={e => set('jobBill', parseNum(e.target.value))}
                className="border-slate-300 focus:border-[#073674]"
              />
            </div>
          )}

          {/* ─── Total Cost Preview ─────────────────────────────── */}
          {isCT && totalCost !== null && (
            <div className="space-y-1.5 flex items-end">
              <div className="w-full bg-[#073674] text-white rounded-xl px-4 py-3 text-center">
                <p className="text-xs font-medium opacity-80 uppercase tracking-wide">Total Job Cost</p>
                <p className="text-xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional remarks..."
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="border-slate-300 focus:border-[#073674] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#073674] hover:bg-[#052a5c] text-white"
          >
            {editJob ? 'Update Job' : 'Add Job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
