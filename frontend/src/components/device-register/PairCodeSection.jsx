import { useState } from 'react';
import { MdVerifiedUser, MdCheck, MdError, MdHourglassEmpty } from 'react-icons/md';

export default function PairCodeSection({ onVerify, verifyStatus }) {
  const [code, setCode] = useState('');

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  const handleVerify = () => {
    if (code.length === 6) {
      onVerify?.(code);
    }
  };

  const getButtonContent = () => {
    switch (verifyStatus) {
      case 'verifying':
        return (
          <>
            <MdHourglassEmpty className="text-xl animate-pulse" />
            Verifying...
          </>
        );
      case 'success':
        return (
          <>
            <MdCheck className="text-xl" />
            Verified!
          </>
        );
      case 'error':
        return (
          <>
            <MdError className="text-xl" />
            Invalid Code
          </>
        );
      default:
        return (
          <>
            <MdVerifiedUser className="text-xl" />
            Verify
          </>
        );
    }
  };

  const getButtonClass = () => {
    switch (verifyStatus) {
      case 'verifying':
        return 'bg-slate-500 cursor-wait';
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90';
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-primary/10 shadow-sm flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center size-8 rounded-full bg-primary text-white font-bold text-sm">3</span>
        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Pair Code</h2>
      </div>
      <div className="flex-1 flex flex-col justify-between gap-6">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Enter the 6-digit verification code displayed on your other device.
        </p>
        <div className="space-y-4">
          <div className="flex justify-center">
            <input
              type="text"
              value={code}
              onChange={handleInputChange}
              maxLength={6}
              placeholder="000000"
              disabled={verifyStatus === 'verifying'}
              className={`w-48 text-center tracking-[1em] font-mono text-xl h-12 rounded-lg border-2 outline-none transition-colors ${
                verifyStatus === 'error'
                  ? 'border-red-500 dark:bg-slate-800'
                  : verifyStatus === 'success'
                  ? 'border-green-500 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring-primary'
              }`}
            />
          </div>
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifyStatus === 'verifying'}
            className={`w-full flex items-center justify-center gap-2 rounded-lg h-12 font-bold transition-all ${getButtonClass()}`}
          >
            {getButtonContent()}
          </button>
          <p className="text-center text-slate-500 dark:text-slate-400 text-xs italic">
            Codes expire every 10 minutes
          </p>
        </div>
      </div>
    </section>
  );
}
