import DevicesHeader from '../components/devices/DevicesHeader';
import QRRegistrationSection from '../components/device-register/QRRegistrationSection';
import OneClickJoinSection from '../components/device-register/OneClickJoinSection';
import PairCodeSection from '../components/device-register/PairCodeSection';
import DeviceRegisterFooter from '../components/device-register/DeviceRegisterFooter';

export default function DeviceRegister() {
  const handleVerifyCode = (code) => {
    console.log('Verifying code:', code);
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

          {/* QR Registration Section */}
          <QRRegistrationSection />

          {/* One-click Join and Pair Code Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <OneClickJoinSection />
            <PairCodeSection onVerify={handleVerifyCode} />
          </div>

          {/* Footer Help */}
          <DeviceRegisterFooter />
        </div>
      </div>
    </main>
  );
}
