import { useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Devices from './pages/Devices';
import DeviceRegister from './pages/DeviceRegister';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'devices':
        return <Devices onNavigate={setCurrentPage} />;
      case 'device-register':
        return <DeviceRegister />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
    </div>
  );
}

export default App;
