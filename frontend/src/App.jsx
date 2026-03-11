import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Devices from './pages/Devices';
import DeviceRegister from './pages/DeviceRegister';
import AddDevice from './pages/AddDevice';
import PairDevice from './pages/PairDevice';
import SearchResults from './pages/SearchResults';
import './index.css';

// Component for pairing page without layout
function PairingWrapper() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <Routes>
        <Route path="/:code" element={<PairDevice />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pairing route without layout */}
        <Route path="/pair/*" element={<PairingWrapper />} />

        {/* Routes with layout */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="devices" element={<Devices />} />
          <Route path="add-device" element={<AddDevice />} />
          <Route path="device-register" element={<DeviceRegister />} />
          <Route path="search" element={<SearchResults />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
