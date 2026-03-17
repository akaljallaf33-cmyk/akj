// Well Intervention Dashboard — Data Context
// Uses tRPC + database for persistent, cross-device storage

import React, { createContext, useContext, useCallback } from 'react';
import { WellJob, ServiceLine } from '@/lib/types';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Map DB row (numeric id) to WellJob (string id) for compatibility with existing UI
function rowToJob(row: {
  id: number;
  serviceLine: 'coiled-tubing' | 'wireline' | 'pumping';
  platform: string;
  wellNumber: string;
  jobType: string;
  jobDate: string;
  productionBefore: number | null;
  productionAfter: number | null;
  production30Days: number | null;
  status: 'Successful' | 'Partially Successful' | 'Failed';
  notes?: string | null;
}): WellJob {
  return {
    id: String(row.id),
    serviceLine: row.serviceLine,
    platform: row.platform,
    wellNumber: row.wellNumber,
    jobType: row.jobType,
    jobDate: row.jobDate,
    productionBefore: row.productionBefore ?? null,
    productionAfter: row.productionAfter ?? null,
    production30Days: row.production30Days ?? null,
    status: row.status,
    notes: row.notes ?? undefined,
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
      jobType: job.jobType,
      jobDate: job.jobDate,
      productionBefore: job.productionBefore,
      productionAfter: job.productionAfter,
      production30Days: job.production30Days,
      status: job.status,
      notes: job.notes,
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
      ...(updates.jobType !== undefined && { jobType: updates.jobType }),
      ...(updates.jobDate !== undefined && { jobDate: updates.jobDate }),
      ...(updates.productionBefore !== undefined && { productionBefore: updates.productionBefore }),
      ...(updates.productionAfter !== undefined && { productionAfter: updates.productionAfter }),
      ...(updates.production30Days !== undefined && { production30Days: updates.production30Days }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
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
