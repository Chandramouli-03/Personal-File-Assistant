import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdComputer, MdTerminal, MdPhoneAndroid, MdContentCopy, MdCheck, MdClose, MdRefresh } from 'react-icons/md';
import { createPairing, cancelPairing } from '../services/api';

const DEVICE_TYPES = [
  { id: 'linux', name: 'Linux', icon: MdTerminal, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600', description: 'Ubuntu, Fedora, Debian, etc.' },
  { id: 'windows', name: 'Windows', icon: MdComputer, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600', description: 'Windows 10/11 PC or Laptop' },
  { id: 'mobile', name: 'Mobile', icon: MdPhoneAndroid, color: 'bg-green-100 dark:bg-green-900/30 text-green-600', description: 'Android phone or tablet' },
];

export default function AddDevice() {
  console.log('AddDevice component mounted');
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // select, pairing, success, error
  const [selectedType, setSelectedType] = useState(null);
  const [pairingData, setPairingData] = useState(null);
  const [pairedDevice, setPairedDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSelectType = async (type) => {
    console.log('handleSelectType called - type:', type);
    setSelectedType(type);
    setLoading(true);
    setError(null);

    try {
      const data = await createPairing(type.id);
      console.log("data: ", data)
      console.log('setStep called: pairing - data:', data);
      setPairingData(data);
      setStep('pairing');
    } catch (err) {
      console.log('handleSelectType error:', err);
      console.log('setStep called: error - create pairing failed - err:', err);
      setError(err.message || 'Failed to create pairing session');
      console.log("err: ", err)
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    console.log('handleCopyCode called');
    if (pairingData?.pairing_code) {
      await navigator.clipboard.writeText(pairingData.pairing_code);
      console.log('Code copied to clipboard:', pairingData.pairing_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    console.log('handleCopyLink called');
    if (pairingData?.pairing_url) {
      await navigator.clipboard.writeText(pairingData.pairing_url);
      console.log('Link copied to clipboard:', pairingData.pairing_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCancel = async () => {
    console.log('handleCancel called - pairing_code:', pairingData?.pairing_code);
    if (pairingData?.pairing_code) {
      try {
        await cancelPairing(pairingData.pairing_code);
        console.log('Pairing cancelled successfully');
      } catch (err) {
        console.log('handleCancel error:', err);
        // Ignore errors on cancel
      }
    }
    navigate('/devices');
  };

  const handleRetry = () => {
    console.log('setStep called: select - retry');
    setStep('select');
    setSelectedType(null);
    setPairingData(null);
    setPairedDevice(null);
    setError(null);
  };

  // Step 1: Select device type
  if (step === 'select') {
    console.log('Rendering step: select');
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
          <div className="max-w-2xl mx-auto px-8 space-y-8">
            {/* Header */}
            <div>
              <button
                onClick={() => navigate('/devices')}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 flex items-center gap-2"
              >
                <MdClose /> Cancel
              </button>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Add New Device
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Select the type of device you want to connect
              </p>
            </div>

            {/* Device Type Selection */}
            <div className="space-y-4">
              {DEVICE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleSelectType(type)}
                  disabled={loading}
                  className="w-full bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all flex items-center gap-6 group text-left disabled:opacity-50"
                >
                  <div className={`w-16 h-16 ${type.color} rounded-xl flex items-center justify-center`}>
                    <type.icon className="text-4xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      {type.name}
                    </h3>
                    <p className="text-sm text-slate-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-slate-500">Creating pairing session...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Step 2: Show pairing code
  if (step === 'pairing') {
    console.log('Rendering step: pairing');
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
          <div className="max-w-2xl mx-auto px-8 space-y-8">
            {/* Header */}
            <div>
              <button
                onClick={handleCancel}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-4 flex items-center gap-2"
              >
                <MdClose /> Cancel
              </button>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Pair Your {selectedType?.name} Device
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Open the link below on your {selectedType?.name?.toLowerCase()} device to complete pairing
              </p>
            </div>

            {/* Pairing Code Card */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg text-center">
              {/* Pairing Code */}
              <div className="mb-8">
                <p className="text-sm text-slate-500 mb-2">Pairing Code</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-5xl font-mono font-bold tracking-widest text-slate-900 dark:text-white">
                    {pairingData?.pairing_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Copy code"
                  >
                    {copied ? <MdCheck className="text-green-500 text-xl" /> : <MdContentCopy className="text-xl" />}
                  </button>
                </div>
              </div>

              {/* Pairing Link */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl mb-6">
                <p className="text-xs text-slate-500 mb-2">Or share this link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 truncate">
                    {pairingData?.pairing_url}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    title="Copy link"
                  >
                    {copied ? <MdCheck className="text-green-500 text-xl" /> : <MdContentCopy className="text-xl" />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-left bg-primary/5 p-4 rounded-xl">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Instructions:</h4>
                <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                  <li>1. Open the link above on your {selectedType?.name?.toLowerCase()} device</li>
                  <li>2. Enter a name for your device</li>
                  <li>3. Click "Complete Pairing"</li>
                  <li>4. Come back to this screen to see confirmation</li>
                </ol>
              </div>
            </div>

            {/* Cancel Button at bottom */}
            <div className="flex justify-center py-4">
              <button
                onClick={handleCancel}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-lg font-semibold"
              >
                Cancel and Go to Devices
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Step 3: Success
  if (step === 'success') {
    console.log('Rendering step: success');
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
          <div className="max-w-2xl mx-auto px-8 space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-green-200 dark:border-green-800 shadow-lg text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <MdCheck className="text-4xl text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Device Paired Successfully!
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {pairedDevice?.name} has been added to your devices
              </p>
              <button
                onClick={() => navigate('/devices')}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95"
              >
                View Devices
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (step === 'error') {
    console.log('Rendering step: error');
    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark/50">
          <div className="max-w-2xl mx-auto px-8 space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <MdClose className="text-4xl text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pairing Failed
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {error || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRetry}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
                >
                  <MdRefresh /> Try Again
                </button>
                <button
                  onClick={() => navigate('/devices')}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
