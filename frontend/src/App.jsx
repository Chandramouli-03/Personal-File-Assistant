import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Devices from './pages/Devices';
import DeviceRegister from './pages/DeviceRegister';
import AddDevice from './pages/AddDevice';
import PairDevice from './pages/PairDevice';
import SearchResults from './pages/SearchResults';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [pageParams, setPageParams] = useState({});

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    setPageParams(params);
  };

  // Handle URL-based routing for pairing page
  useEffect(() => {
    const path = window.location.pathname;
    const pairMatch = path.match(/^\/pair\/([A-Z0-9]+)$/i);

    if (pairMatch) {
      setCurrentPage('pair');
      setPageParams({ code: pairMatch[1] });
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'devices':
        return <Devices onNavigate={navigateTo} />;
      case 'device-register':
        return <DeviceRegister />;
      case 'add-device':
        return <AddDevice onNavigate={navigateTo} />;
      case 'pair':
        return <PairDevice pairingCode={pageParams.code} onNavigate={navigateTo} />;
      case 'search-results':
        return <SearchResults initialQuery={pageParams.query || ''} />;
      default:
        return <Home onNavigate={navigateTo} />;
    }
  };

  // For pairing page, render without layout
  if (currentPage === 'pair') {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <Layout currentPage={currentPage} onNavigate={navigateTo}>
        {renderPage()}
      </Layout>
    </div>
  );
}

export default App;
