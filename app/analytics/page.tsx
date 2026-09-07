import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import { getStore } from '@/lib/store';

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/dashboard');

  const store = getStore();
  return <AnalyticsDashboard meetings={store.meetings} clients={store.clients} />;
}
