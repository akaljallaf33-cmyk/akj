// Well Intervention Dashboard — Data Types
// Design: Dragon Oil corporate branding, white & blue (#073674)

export type ServiceLine = 'coiled-tubing' | 'wireline' | 'pumping';

export type JobStatus = 'Successful' | 'Partially Successful' | 'Failed';

export type JobType = {
  'coiled-tubing': string[];
  'wireline': string[];
  'pumping': string[];
};

export const JOB_TYPES: JobType = {
  'coiled-tubing': [
    'Cleanout / Milling',
    'Nitrogen Lift',
    'Stimulation / Acidizing',
    'Logging',
    'Plug Setting',
    'Plug Retrieval',
    'Scale Removal',
    'Sand Cleanout',
    'Other',
  ],
  'wireline': [
    'Perforation',
    'Plug Setting',
    'Plug Retrieval',
    'Production Logging',
    'Casing Inspection',
    'Gauge Run',
    'Slickline Fishing',
    'Tubing Inspection',
    'Other',
  ],
  'pumping': [
    'Acid Stimulation',
    'Matrix Acidizing',
    'Hydraulic Fracturing',
    'Cementing',
    'Nitrogen Pumping',
    'Scale Squeeze',
    'Water Shut-off',
    'Chemical Injection',
    'Other',
  ],
};

export interface WellJob {
  id: string;
  serviceLine: ServiceLine;
  platform: string;
  wellNumber: string;
  jobType: string;
  jobDate: string; // ISO date string YYYY-MM-DD
  productionBefore: number | null; // bbl/d
  productionAfter: number | null;  // bbl/d
  production30Days: number | null; // bbl/d at +30 days
  status: JobStatus;
  notes?: string;
}

export interface MonthlyImpact {
  month: string; // "2026-01" format
  serviceLine: ServiceLine;
  totalUplift: number; // net bbl/d gained (positive) or lost (negative)
}

export const SERVICE_LINE_LABELS: Record<ServiceLine, string> = {
  'coiled-tubing': 'Coiled Tubing',
  'wireline': 'Wireline',
  'pumping': 'Pumping',
};

export const MONTHS_2026 = [
  { value: '2026-01', label: 'January 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-04', label: 'April 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-06', label: 'June 2026' },
  { value: '2026-07', label: 'July 2026' },
  { value: '2026-08', label: 'August 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'October 2026' },
  { value: '2026-11', label: 'November 2026' },
  { value: '2026-12', label: 'December 2026' },
];
