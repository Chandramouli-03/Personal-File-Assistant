export default function QRRegistrationSection({ qrData, loading }) {
  return (
    <section className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-primary/10 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center justify-center size-8 rounded-full bg-primary text-white font-bold text-sm">1</span>
        <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">QR Registration</h2>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="p-4 bg-white rounded-xl border-2 border-slate-100 dark:border-slate-800">
          <div className="size-64 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ff6b6b_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {loading ? (
              <div className="z-10 flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-slate-500">Generating QR code...</p>
              </div>
            ) : qrData?.qr_code_base64 ? (
              <div className="z-10 bg-white p-2 rounded-md shadow-sm">
                <img
                  src={`data:image/png;base64,${qrData.qr_code_base64}`}
                  alt="Device Registration QR Code"
                  className="size-48"
                />
              </div>
            ) : (
              <div className="z-10 bg-white p-2 rounded-md shadow-sm">
                <div className="size-48 bg-slate-200 flex items-center justify-center">
                  <p className="text-slate-400 text-sm text-center px-4">QR code unavailable</p>
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 w-full h-1 bg-primary/40"></div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-slate-900 dark:text-slate-100 font-medium">Scan with mobile to auto-connect</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {qrData?.device_name
              ? `Connect to "${qrData.device_name}"`
              : 'Open browser on another device and scan this QR code'}
          </p>
        </div>
      </div>
    </section>
  );
}
