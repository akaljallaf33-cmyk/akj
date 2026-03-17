import { trpc } from '@/lib/trpc';
import Login from '@/pages/Login';

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const { data, isLoading, refetch } = trpc.dashboard.check.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

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

  if (!data?.authenticated) {
    return <Login onSuccess={() => refetch()} />;
  }

  return <>{children}</>;
}
