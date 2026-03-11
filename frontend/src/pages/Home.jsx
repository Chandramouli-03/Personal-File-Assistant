import HeroSection from '../components/HeroSection';
import QuickActions from '../components/QuickActions';
import RecentActivity from '../components/RecentActivity';

export default function Home({ onNavigate }) {
  const handleSearch = (query) => {
    onNavigate?.('search-results', { query });
  };

  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark relative flex flex-col items-center">
      <HeroSection onSearch={handleSearch} />

      {/* Quick Actions & Recent Activity */}
      <section className="w-full max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <QuickActions />
          <RecentActivity />
        </div>
      </section>
    </main>
  );
}
