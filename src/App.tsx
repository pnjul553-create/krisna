import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import JurusanDetailPage from './pages/JurusanDetailPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/app/DashboardPage';
import AbsensiKaryawanPage from './pages/app/AbsensiKaryawanPage';
import AbsensiSiswaPage from './pages/app/AbsensiSiswaPage';
import RekapKaryawanPage from './pages/app/RekapKaryawanPage';
import RekapSiswaPage from './pages/app/RekapSiswaPage';
import DataSiswaPage from './pages/app/DataSiswaPage';
import UserManagementPage from './pages/app/UserManagementPage';
import { UserRole } from './types';

function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/jurusan/:kode" element={<JurusanDetailPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes under /app */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<AbsensiKaryawanPage />} />

            <Route
              path="absensi-siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <AbsensiSiswaPage />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/karyawan"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <RekapKaryawanPage />
                </RoleGuard>
              }
            />

            <Route
              path="rekap/siswa"
              element={
                <RoleGuard allowedRoles={['admin', 'guru']}>
                  <RekapSiswaPage />
                </RoleGuard>
              }
            />

            <Route
              path="data-siswa"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <DataSiswaPage />
                </RoleGuard>
              }
            />

            <Route
              path="users"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
