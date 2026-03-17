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
});

export default function JobDialog({ open, onClose, serviceLine, editJob }: JobDialogProps) {
  const { addJob, updateJob } = useData();
  const [form, setForm] = useState<Omit<WellJob, 'id'>>(defaultForm(serviceLine));

  useEffect(() => {
    if (editJob) {
      const { id, ...rest } = editJob;
      setForm(rest);
    } else {
      setForm(defaultForm(serviceLine));
    }
  }, [editJob, serviceLine, open]);

  const set = (key: keyof Omit<WellJob, 'id'>, value: string | number | null) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const parseNum = (v: string) => v === '' ? null : parseFloat(v);

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
          {serviceLine === 'coiled-tubing' && (
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
              placeholder="0"
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
