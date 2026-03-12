import { useState, useEffect } from 'react';
import DevicesHeader from '../components/devices/DevicesHeader';
import QRRegistrationSection from '../components/device-register/QRRegistrationSection';
import OneClickJoinSection from '../components/device-register/OneClickJoinSection';
import PairCodeSection from '../components/device-register/PairCodeSection';
import DeviceRegisterFooter from '../components/device-register/DeviceRegisterFooter';
import { getQRData } from '../services/api';

export default function DeviceRegister() {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState(null);

  // Fetch QR code data on mount
  useEffect(() => {
    const fetchQRData = async () => {
      try {
        setLoading(true);
        const data = await getQRData();
        setQrData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch QR data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQRData();
  }, []);

  const handleVerifyCode = async (code) => {
    setVerifyStatus('verifying');

    // TODO: Implement actual pair code verification
    // For now, simulate verification
    setTimeout(() => {
      if (code.length === 6) {
        setVerifyStatus('success');
      } else {
        setVerifyStatus('error');
      }
    }, 1500);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <DevicesHeader />

      <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
        <div className="space-y-8">
          {/* Top Actions Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Add New Device</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Connect your devices to sync files seamlessly across your workspace.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              Failed to load registration data: {error}
            </div>
          )}

          {/* QR Registration Section */}
          <QRRegistrationSection
            qrData={qrData}
            loading={loading}
          />

          {/* One-click Join and Pair Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <OneClickJoinSection
              shareLink={qrData?.registration_url || ''}
            />
            <PairCodeSection
              onVerify={handleVerifyCode}
              verifyStatus={verifyStatus}
            />
          </div>

          {/* Footer Help */}
          <DeviceRegisterFooter />
        </div>
      </div>
    </main>
  );
}
