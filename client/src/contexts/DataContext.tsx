// Well Intervention Dashboard — Data Context
// Uses tRPC + database for persistent, cross-device storage

import React, { createContext, useContext, useCallback } from 'react';
import { WellJob, ServiceLine } from '@/lib/types';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Map DB row to WellJob — includes all cost fields
function rowToJob(row: {
  id: number;
  serviceLine: 'coiled-tubing' | 'wireline' | 'pumping';
  platform: string;
  wellNumber: string;
  unit?: string | null;
  jobType: string;
  startDate: string;
  endDate: string;
  productionBefore: number | null;
  productionAfter: number | null;
  production30Days: number | null;
  status: 'Complete' | 'Incomplete';
  notes?: string | null;
  // Cost fields
  ct1DailyRate?: number | null;
  operationalDays?: number | null;
  badWeatherDays?: number | null;
  onRig?: boolean | number | null;
  rigDailyRate?: number | null;
  rigOperationalDays?: number | null;
  rigBadWeatherDays?: number | null;
  wlEquipmentRentPerDay?: number | null;
  wlRentalDays?: number | null;
  nptDays?: number | null;
  nptNotes?: string | null;
  jobBill?: number | null;
}): WellJob {
  return {
    id: String(row.id),
    serviceLine: row.serviceLine as ServiceLine,
    platform: row.platform,
    wellNumber: row.wellNumber,
    unit: row.unit ?? undefined,
    jobType: row.jobType,
    startDate: row.startDate,
    endDate: row.endDate,
    productionBefore: row.productionBefore ?? null,
    productionAfter: row.productionAfter ?? null,
    production30Days: row.production30Days ?? null,
    status: row.status,
    notes: row.notes ?? undefined,
    // Cost fields
    ct1DailyRate: row.ct1DailyRate ?? undefined,
    operationalDays: row.operationalDays ?? undefined,
    badWeatherDays: row.badWeatherDays ?? undefined,
    onRig: row.onRig ? true : false,
    rigDailyRate: row.rigDailyRate ?? undefined,
    rigOperationalDays: row.rigOperationalDays ?? undefined,
    rigBadWeatherDays: row.rigBadWeatherDays ?? undefined,
    wlEquipmentRentPerDay: row.wlEquipmentRentPerDay ?? undefined,
    wlRentalDays: row.wlRentalDays ?? undefined,
    nptDays: row.nptDays ?? undefined,
    nptNotes: row.nptNotes ?? undefined,
    jobBill: row.jobBill ?? undefined,
  };
}

interface DataContextType {
  jobs: WellJob[];
  isLoading: boolean;
  addJob: (job: Omit<WellJob, 'id'>) => Promise<void>;
  updateJob: (id: string, job: Partial<WellJob>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  getJobsByServiceLine: (sl: ServiceLine) => WellJob[];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.wellJobs.list.useQuery(undefined, {
    staleTime: 30_000,
  });

  const jobs: WellJob[] = rows.map(rowToJob);

  const createMutation = trpc.wellJobs.create.useMutation({
    onSuccess: () => {
      utils.wellJobs.list.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to save job: ' + err.message);
    },
  });

  const updateMutation = trpc.wellJobs.update.useMutation({
    onSuccess: () => {
      utils.wellJobs.list.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to update job: ' + err.message);
    },
  });

  const deleteMutation = trpc.wellJobs.delete.useMutation({
    onSuccess: () => {
      utils.wellJobs.list.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to delete job: ' + err.message);
    },
  });

  const addJob = useCallback(async (job: Omit<WellJob, 'id'>) => {
    await createMutation.mutateAsync({
      serviceLine: job.serviceLine,
      platform: job.platform,
      wellNumber: job.wellNumber,
      unit: job.unit,
      jobType: job.jobType,
      startDate: job.startDate,
      endDate: job.endDate,
      productionBefore: job.productionBefore,
      productionAfter: job.productionAfter,
      production30Days: job.production30Days,
      status: job.status,
      notes: job.notes,
      // Cost fields
      ct1DailyRate: job.ct1DailyRate,
      operationalDays: job.operationalDays,
      badWeatherDays: job.badWeatherDays,
      onRig: job.onRig,
      rigDailyRate: job.rigDailyRate,
      rigOperationalDays: job.rigOperationalDays,
      rigBadWeatherDays: job.rigBadWeatherDays,
      wlEquipmentRentPerDay: job.wlEquipmentRentPerDay,
      wlRentalDays: job.wlRentalDays,
      nptDays: job.nptDays,
      nptNotes: job.nptNotes,
      jobBill: job.jobBill,
    });
  }, [createMutation]);

  const updateJob = useCallback(async (id: string, updates: Partial<WellJob>) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return;
    await updateMutation.mutateAsync({
      id: numId,
      ...(updates.serviceLine !== undefined && { serviceLine: updates.serviceLine }),
      ...(updates.platform !== undefined && { platform: updates.platform }),
      ...(updates.wellNumber !== undefined && { wellNumber: updates.wellNumber }),
      ...(updates.unit !== undefined && { unit: updates.unit }),
      ...(updates.jobType !== undefined && { jobType: updates.jobType }),
      ...(updates.startDate !== undefined && { startDate: updates.startDate }),
      ...(updates.endDate !== undefined && { endDate: updates.endDate }),
      ...(updates.productionBefore !== undefined && { productionBefore: updates.productionBefore }),
      ...(updates.productionAfter !== undefined && { productionAfter: updates.productionAfter }),
      ...(updates.production30Days !== undefined && { production30Days: updates.production30Days }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      // Cost fields
      ...(updates.ct1DailyRate !== undefined && { ct1DailyRate: updates.ct1DailyRate }),
      ...(updates.operationalDays !== undefined && { operationalDays: updates.operationalDays }),
      ...(updates.badWeatherDays !== undefined && { badWeatherDays: updates.badWeatherDays }),
      ...(updates.onRig !== undefined && { onRig: updates.onRig }),
      ...(updates.rigDailyRate !== undefined && { rigDailyRate: updates.rigDailyRate }),
      ...(updates.rigOperationalDays !== undefined && { rigOperationalDays: updates.rigOperationalDays }),
      ...(updates.rigBadWeatherDays !== undefined && { rigBadWeatherDays: updates.rigBadWeatherDays }),
      ...(updates.wlEquipmentRentPerDay !== undefined && { wlEquipmentRentPerDay: updates.wlEquipmentRentPerDay }),
      ...(updates.wlRentalDays !== undefined && { wlRentalDays: updates.wlRentalDays }),
      ...(updates.nptDays !== undefined && { nptDays: updates.nptDays }),
      ...(updates.nptNotes !== undefined && { nptNotes: updates.nptNotes }),
      ...(updates.jobBill !== undefined && { jobBill: updates.jobBill }),
    });
  }, [updateMutation]);

  const deleteJob = useCallback(async (id: string) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return;
    await deleteMutation.mutateAsync({ id: numId });
  }, [deleteMutation]);

  const getJobsByServiceLine = useCallback((sl: ServiceLine) => {
    return jobs.filter(j => j.serviceLine === sl);
  }, [jobs]);

  return (
    <DataContext.Provider value={{ jobs, isLoading, addJob, updateJob, deleteJob, getJobsByServiceLine }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
