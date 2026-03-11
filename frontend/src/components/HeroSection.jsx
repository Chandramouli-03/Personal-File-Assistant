import { useState } from 'react';
import { MdLaptopMac, MdDevicesOther, MdSmartphone, MdPictureAsPdf, MdImage, MdDescription, MdSearch, MdArrowForward } from 'react-icons/md';

export default function HeroSection({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
    }
  };

  return (
    <section className="w-full max-w-4xl px-6 pt-16 pb-12 flex flex-col items-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
          Search across all your devices
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
          Find any file, anywhere, using natural language.
        </p>
      </div>

      {/* Central Visual Illustration */}
      <div className="relative w-full max-w-lg aspect-video mb-12 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-50"></div>
        <div className="relative flex items-center justify-between w-full px-12">
          {/* Laptop Device */}
          <div className="z-10 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-primary/10">
            <span className="text-4xl text-primary flex">
              <MdLaptopMac />
            </span>
          </div>

          {/* Center Core */}
          <div className="z-20 bg-primary p-6 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center">
            <span className="text-4xl text-white flex">
              <MdDevicesOther />
            </span>
          </div>

          {/* Phone Device */}
          <div className="z-10 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-primary/10">
            <span className="text-4xl text-primary flex">
              <MdSmartphone />
            </span>
          </div>

          {/* Background Decorative Connectors */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        </div>

        {/* Floating File Icons */}
        <div className="absolute top-10 left-1/4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-primary/5">
          <span className="text-primary text-sm flex">
            <MdPictureAsPdf />
          </span>
        </div>
        <div className="absolute bottom-10 right-1/4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-primary/5">
          <span className="text-primary text-sm flex">
            <MdImage />
          </span>
        </div>
        <div className="absolute top-20 right-1/3 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-md border border-primary/5">
          <span className="text-primary text-sm flex">
            <MdDescription />
          </span>
        </div>
      </div>

      {/* Massive Search Bar */}
      <form onSubmit={handleSearch} className="w-full group">
        <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-transparent focus-within:border-primary transition-all p-2">
          <div className="pl-4 text-primary">
            <MdSearch className="text-2xl" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-lg md:text-xl py-4 px-4 text-slate-800 dark:text-white placeholder:text-slate-400 outline-none"
            placeholder="Find my resume pdf or Photos from last month..."
            type="text"
          />
          <button type="submit" className="bg-primary text-white py-3 px-8 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2">
            <span>Search</span>
            <MdArrowForward className="text-sm" />
          </button>
        </div>
      </form>
    </section>
  );
}
