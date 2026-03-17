import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Login from '@/pages/Login';

const WI_TOKEN_KEY = 'wi_dashboard_token';

export function getWiToken(): string | null {
  return localStorage.getItem(WI_TOKEN_KEY);
}

export function setWiToken(token: string) {
  localStorage.setItem(WI_TOKEN_KEY, token);
}

export function clearWiToken() {
  localStorage.removeItem(WI_TOKEN_KEY);
}

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const [token, setToken] = useState<string | null>(() => getWiToken());

  const { data, isLoading } = trpc.dashboard.check.useQuery(
    { token: token ?? undefined },
    {
      retry: false,
      staleTime: 60_000,
      enabled: true,
    }
  );

  const handleLoginSuccess = (newToken: string) => {
    setWiToken(newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    clearWiToken();
    setToken(null);
  };

  // Expose logout handler globally so Dashboard can call it
  useEffect(() => {
    (window as any).__wiLogout = handleLogout;
    return () => { delete (window as any).__wiLogout; };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#073674]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-white/70 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!token || !data?.authenticated) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  return <>{children}</>;
}
