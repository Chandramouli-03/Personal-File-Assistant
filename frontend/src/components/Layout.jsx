import Sidebar from './Sidebar';

export default function Layout({ children, currentPage, onNavigate }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      {children}
    </div>
  );
}
