// Well Intervention Dashboard 2026 — Main Page
// Dragon Oil brand: #073674 blue, white
// Design: Tab buttons at top (Overview | CT | WL | Pumping), each shows only that section

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Layers, Radio, Droplets, LogOut, DollarSign } from 'lucide-react';
import OverviewTab from '@/components/OverviewTab';
import ServiceLineTab from '@/components/ServiceLineTab';
import Finance from '@/pages/Finance';
import { ServiceLine } from '@/lib/types';
import { toast } from 'sonner';
import { clearWiToken } from '@/components/AuthGuard';

type Tab = 'overview' | ServiceLine | 'finance';

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'overview',       label: 'Overview',      icon: Activity,    color: '#073674' },
  { id: 'coiled-tubing',  label: 'Coiled Tubing', icon: Layers,      color: '#073674' },
  { id: 'wireline',       label: 'Wireline',      icon: Radio,       color: '#0d6efd' },
  { id: 'pumping',        label: 'Pumping',        icon: Droplets,    color: '#0891b2' },
  { id: 'finance',        label: 'Finance & ROI',  icon: DollarSign,  color: '#059669' },
];

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310419663030863467/P8RX3svmXia4vbzjKeD7oZ/dragon-oil-logo-white_d772dc57.png';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const handleSignOut = () => {
    clearWiToken();
    toast.success('Signed out successfully');
    // Trigger the AuthGuard logout via the global handler
    if (typeof (window as any).__wiLogout === 'function') {
      (window as any).__wiLogout();
    } else {
      window.location.reload();
    }
  };

  const activeTabDef = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col">
      {/* ── Header ── */}
      <header className="bg-[#073674] shadow-lg">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-4">
              <img
                src={LOGO_URL}
                alt="Dragon Oil"
                className="h-10 w-auto object-contain"
              />
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-white font-bold text-base leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Well Intervention Dashboard
                </h1>
                <p className="text-blue-200 text-xs font-medium tracking-wide">2026 Annual Forecast & Performance</p>
              </div>
            </div>
            {/* Year badge + Logout */}
            <div className="flex items-center gap-3">
              <span className="hidden md:inline bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                FY 2026
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-white/10"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
                    transition-all duration-200 whitespace-nowrap select-none
                    ${isActive
                      ? 'bg-[#073674] text-white shadow-md shadow-[#073674]/20'
                      : 'text-slate-500 hover:text-[#073674] hover:bg-blue-50'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/40 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Page Title Strip ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: activeTabDef.color }}
            />
            <div>
              <h2 className="text-lg font-bold text-[#073674]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {activeTabDef.label}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'overview'
                  ? 'Full year summary across all service lines'
                  : activeTab === 'finance'
                  ? 'Job costs, investment tracking, and ROI calculations for CT operations'
                  : `${activeTabDef.label} interventions — well-by-well production tracking`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 container py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'coiled-tubing' && <ServiceLineTab serviceLine="coiled-tubing" />}
            {activeTab === 'wireline' && <ServiceLineTab serviceLine="wireline" />}
            {activeTab === 'pumping' && <ServiceLineTab serviceLine="pumping" />}
            {activeTab === 'finance' && <Finance />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#073674] mt-auto">
        <div className="container py-3 flex items-center justify-between">
          <p className="text-blue-200 text-xs">© 2026 Dragon Oil — Well Intervention Department</p>
          <p className="text-blue-300 text-xs">Confidential — For Internal Use Only</p>
        </div>
      </footer>
    </div>
  );
}
