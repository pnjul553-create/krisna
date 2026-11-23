import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  Users,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel } from '../lib/api';

const PAGE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/absensi-karyawan': 'Absensi Karyawan',
  '/app/absensi-siswa': 'Absensi Siswa',
  '/app/rekap/karyawan': 'Rekap Absensi Karyawan',
  '/app/rekap/siswa': 'Rekap Absensi Siswa',
  '/app/data-siswa': 'Data Siswa',
  '/app/users': 'User Management',
};

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">Memuat portal absensi...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const role = user.role;
  const isAdmin = role === 'admin';
  const isGuru = role === 'guru';
  const canSeeRekap = isAdmin || isGuru;

  const pageTitle = PAGE_TITLES[location.pathname] || 'Portal Absensi';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-700 text-white'
        : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
    }`;

  const subLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block pl-10 pr-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Block */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link to="/app/dashboard" className="text-base font-extrabold tracking-tight text-red-700 whitespace-nowrap">
          SMK Prima Unggul
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role-based Left Sidebar Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        <NavLink
          to="/app/dashboard"
          className={navLinkClass}
          onClick={() => setMobileMenuOpen(false)}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/app/absensi-karyawan"
          className={navLinkClass}
          onClick={() => setMobileMenuOpen(false)}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {(isAdmin || isGuru) && (
          <NavLink
            to="/app/absensi-siswa"
            className={navLinkClass}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {canSeeRekap && (
          <div>
            <button
              type="button"
              onClick={() => setRekapOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith('/app/rekap')
                  ? 'text-red-700 bg-red-50/70'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 whitespace-nowrap">
                <FileBarChart2 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  rekapOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {rekapOpen && (
              <div className="mt-1 space-y-1">
                {isAdmin && (
                  <NavLink
                    to="/app/rekap/karyawan"
                    className={subLinkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Absensi Karyawan
                  </NavLink>
                )}
                <NavLink
                  to="/app/rekap/siswa"
                  className={subLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Absensi Siswa
                </NavLink>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <>
            <NavLink
              to="/app/data-siswa"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Data Siswa</span>
            </NavLink>

            <NavLink
              to="/app/users"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Quiet Profile Footer inside Sidebar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60">
        <div className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</div>
        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
          <span>{formatRoleLabel(user.role)}</span>
          {user.nip && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono truncate">{user.nip}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar with Breadcrumb on Left & Logout Button on Top-Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-red-700 rounded-lg"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400">Aplikasi</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <h1 className="font-bold text-slate-950 truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-900">{user.full_name}</div>
              <div className="text-[11px] text-slate-500">{formatRoleLabel(user.role)}</div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-700 hover:text-white hover:border-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
