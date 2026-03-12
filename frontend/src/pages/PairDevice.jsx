import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MdTerminal, MdComputer, MdPhoneAndroid, MdCheck, MdClose, MdAdd, MdDelete } from 'react-icons/md';
import { getPairingStatus, completePairing } from '../services/api';

const DEVICE_TYPE_ICONS = {
  linux: MdTerminal,
  windows: MdComputer,
  mobile: MdPhoneAndroid,
};

const DEVICE_TYPE_NAMES = {
  linux: 'Linux',
  windows: 'Windows',
  mobile: 'Mobile',
};

export default function PairDevice() {
  const { code } = useParams();
  const pairingCode = code;
  const [step, setStep] = useState('loading'); // loading, form, success, error
  const [pairingInfo, setPairingInfo] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [scanPaths, setScanPaths] = useState(['']);
  const [osType, setOsType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Detect OS
  useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();

    if (platform.includes('win') || userAgent.includes('windows')) {
      setOsType('windows');
      setScanPaths(['C:\\Users\\' + (navigator.userAgent.includes('Windows') ? 'User' : 'User') + '\\Documents']);
    } else if (platform.includes('linux') || userAgent.includes('linux')) {
      setOsType('linux');
      setScanPaths([`${process.env.HOME || '/home/user'}/Documents`]);
    } else if (platform.includes('android') || userAgent.includes('android')) {
      setOsType('android');
      setScanPaths(['/sdcard/Documents', '/sdcard/Download']);
    } else {
      setOsType('unknown');
      setScanPaths(['']);
    }
  }, []);

  // Fetch pairing info
  useEffect(() => {
    const fetchPairingInfo = async () => {
      try {
        const data = await getPairingStatus(pairingCode);
        setPairingInfo(data);
        setStep('form');
      } catch (err) {
        if (err.message?.includes('410') || err.message?.includes('expired')) {
          setError('This pairing code has expired. Please generate a new one on your primary device.');
        } else if (err.message?.includes('404')) {
          setError('Invalid pairing code. Please check and try again.');
        } else {
          setError(err.message || 'Failed to verify pairing code');
        }
        setStep('error');
      }

      // if (!pairingCode) {
      //   setError('No pairing code provided');
      //   setStep('error');
      //   return;
      // }
    };

    fetchPairingInfo();
  }, [pairingCode]);

  const handleAddPath = () => {
    setScanPaths([...scanPaths, '']);
  };

  const handleRemovePath = (index) => {
    setScanPaths(scanPaths.filter((_, i) => i !== index));
  };

  const handlePathChange = (index, value) => {
    const newPaths = [...scanPaths];
    newPaths[index] = value;
    setScanPaths(newPaths);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validPaths = scanPaths.filter(p => p.trim() !== '');
      const data = await completePairing(pairingCode, {
        name: deviceName.trim(),
        scan_paths: validPaths,
        os_type: osType,
      });

      setResult(data);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to complete pairing');
    } finally {
      setLoading(false);
    }
  };

  const DeviceIcon = pairingInfo?.device_type ? DEVICE_TYPE_ICONS[pairingInfo.device_type] : MdComputer;

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Verifying pairing code...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MdClose className="text-4xl text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Pairing Failed
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {error}
          </p>
          <p className="text-sm text-slate-400">
            Go back to your primary device and generate a new pairing code.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-green-200 dark:border-green-800 shadow-lg text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MdCheck className="text-4xl text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Device Paired Successfully!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            <strong>{result?.device_name}</strong> has been connected to your primary device.
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Your files will be indexed and searchable from your primary device.
          </p>
          {result?.primary_url && (
            <a
              href={result.primary_url}
              className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-transform active:scale-95"
            >
              Open Primary Device
            </a>
          )}
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <DeviceIcon className="text-3xl text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Pair {DEVICE_TYPE_NAMES[pairingInfo?.device_type] || 'Device'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Enter your device details to complete pairing
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Pairing code: <span className="font-mono font-bold">{pairingCode}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Device Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Device Name
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="My Laptop"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* OS Type (readonly) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Operating System
            </label>
            <input
              type="text"
              value={osType.charAt(0).toUpperCase() + osType.slice(1)}
              readOnly
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
            />
          </div>

          {/* Scan Paths */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Folders to Index (optional)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              These folders will be scanned for files on this device
            </p>
            <div className="space-y-2">
              {scanPaths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handlePathChange(index, e.target.value)}
                    placeholder="/home/user/Documents"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {scanPaths.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePath(index)}
                      className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <MdDelete />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddPath}
              className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <MdAdd /> Add another folder
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !deviceName.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Pairing...
              </>
            ) : (
              <>
                <MdCheck />
                Complete Pairing
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
