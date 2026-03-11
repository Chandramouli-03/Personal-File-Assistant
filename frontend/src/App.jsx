import { useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Devices from './pages/Devices';
import DeviceRegister from './pages/DeviceRegister';
import SearchResults from './pages/SearchResults';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'devices':
        return <Devices onNavigate={navigateTo} />;
      case 'device-register':
        return <DeviceRegister />;
      case 'search-results':
        return <SearchResults initialQuery={pageParams.query || ''} />;
      default:
        return <Home onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <Layout currentPage={currentPage} onNavigate={navigateTo}>
        {renderPage()}
      </Layout>
    </div>
  );
}

export default App;
