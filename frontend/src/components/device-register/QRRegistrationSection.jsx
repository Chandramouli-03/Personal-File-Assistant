export default function QRRegistrationSection() {
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
            <div className="z-10 bg-white p-2 rounded-md shadow-sm">
              <div
                className="size-48 bg-slate-200"
                style={{
                  backgroundImage: 'url(https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=FileStream-Device-Register-2026)',
                  backgroundSize: 'cover',
                }}
              ></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/40"></div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-slate-900 dark:text-slate-100 font-medium">Scan with mobile to auto-connect</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Open FileStream app on your phone and tap 'Scan QR'</p>
        </div>
      </div>
    </section>
  );
}
