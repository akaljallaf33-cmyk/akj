// YearContext — global selected year for multi-year dashboard support
// The year is derived from job startDate (YYYY-MM-DD), no DB schema change needed.

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useData } from './DataContext';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | null>(null);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const { jobs } = useData();

  // Derive available years from all jobs + always include current year
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromJobs = jobs.map(j => parseInt(j.startDate.slice(0, 4), 10)).filter(y => !isNaN(y));
    const set = new Set([currentYear, ...yearsFromJobs]);
    return Array.from(set).sort((a, b) => b - a); // descending: newest first
  }, [jobs]);

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useYear must be used within YearProvider');
  return ctx;
}
