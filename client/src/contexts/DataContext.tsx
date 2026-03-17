// Well Intervention Dashboard — Data Context
// Persists all well job data in localStorage for offline-first use

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WellJob, ServiceLine } from '@/lib/types';
import { nanoid } from 'nanoid';

interface DataContextType {
  jobs: WellJob[];
  addJob: (job: Omit<WellJob, 'id'>) => void;
  updateJob: (id: string, job: Partial<WellJob>) => void;
  deleteJob: (id: string) => void;
  getJobsByServiceLine: (sl: ServiceLine) => WellJob[];
}

const DataContext = createContext<DataContextType | null>(null);

const STORAGE_KEY = 'wi_dashboard_jobs_2026';

// Sample demo data so the dashboard is not empty on first load
const DEMO_JOBS: WellJob[] = [
  {
    id: 'demo-1',
    serviceLine: 'coiled-tubing',
    platform: 'Platform A',
    wellNumber: 'A-01',
    jobType: 'Cleanout / Milling',
    jobDate: '2026-01-15',
    productionBefore: 320,
    productionAfter: 580,
    production30Days: 540,
    status: 'Successful',
  },
  {
    id: 'demo-2',
    serviceLine: 'coiled-tubing',
    platform: 'Platform B',
    wellNumber: 'B-03',
    jobType: 'Sand Cleanout',
    jobDate: '2026-02-08',
    productionBefore: 210,
    productionAfter: 410,
    production30Days: 390,
    status: 'Successful',
  },
  {
    id: 'demo-3',
    serviceLine: 'wireline',
    platform: 'Platform A',
    wellNumber: 'A-05',
    jobType: 'Perforation',
    jobDate: '2026-01-22',
    productionBefore: 150,
    productionAfter: 480,
    production30Days: 460,
    status: 'Successful',
  },
  {
    id: 'demo-4',
    serviceLine: 'wireline',
    platform: 'Platform C',
    wellNumber: 'C-02',
    jobType: 'Production Logging',
    jobDate: '2026-02-14',
    productionBefore: 300,
    productionAfter: 290,
    production30Days: 285,
    status: 'Partially Successful',
  },
  {
    id: 'demo-5',
    serviceLine: 'pumping',
    platform: 'Platform B',
    wellNumber: 'B-07',
    jobType: 'Acid Stimulation',
    jobDate: '2026-01-30',
    productionBefore: 180,
    productionAfter: 520,
    production30Days: 490,
    status: 'Successful',
  },
  {
    id: 'demo-6',
    serviceLine: 'pumping',
    platform: 'Platform A',
    wellNumber: 'A-09',
    jobType: 'Matrix Acidizing',
    jobDate: '2026-03-05',
    productionBefore: 95,
    productionAfter: 60,
    production30Days: 55,
    status: 'Failed',
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<WellJob[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEMO_JOBS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const addJob = useCallback((job: Omit<WellJob, 'id'>) => {
    setJobs(prev => [...prev, { ...job, id: nanoid() }]);
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<WellJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  }, []);

  const deleteJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  const getJobsByServiceLine = useCallback((sl: ServiceLine) => {
    return jobs.filter(j => j.serviceLine === sl);
  }, [jobs]);

  return (
    <DataContext.Provider value={{ jobs, addJob, updateJob, deleteJob, getJobsByServiceLine }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
