import { useState, useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';
import { getFileStats } from '../services/api';
import { formatSize } from '../utils/format';

export default function Home({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch file stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getFileStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSearch = (query) => {
    onNavigate?.('search-results', { query });
  };

  const handleQuickAction = (actionType) => {
    // Map quick actions to search queries
    const actionQueries = {
      resumes: 'resume pdf',
      photos: 'photos images',
      tax: 'tax document',
      videos: 'video mp4',
    };
    const query = actionQueries[actionType];
    if (query) {
      onNavigate?.('search-results', { query });
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark relative flex flex-col items-center">
      <HeroSection
        onSearch={handleSearch}
        stats={stats}
        loading={loading}
      />

      {/* Stats Bar */}
      {!loading && !error && stats && (
        <div className="w-full max-w-5xl px-6 mb-6">
          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <span>{stats.file_count?.toLocaleString() || 0} files indexed</span>
            <span>{formatSize(stats.total_size || 0)} total</span>
            {stats.scan_roots?.length > 0 && (
              <span className="hidden md:inline">
                Scanning: {stats.scan_roots.length} folder{stats.scan_roots.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-5xl px-6 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            Failed to load file stats: {error}
          </div>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <section className="w-full max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <QuickActions onAction={handleQuickAction} />
          <RecentActivity />
        </div>
      </section>
    </main>
  );
}
