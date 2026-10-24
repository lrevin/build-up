import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { HomeRedirect } from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import UserLayout from '../layouts/UserLayout';
import LoginPage from '../pages/LoginPage';
import SignUpPage from '../pages/SignUpPage';
import KakaoCallbackPage from '../pages/KakaoCallbackPage';
import SystemPage from '../pages/SystemPage';
import NotFoundPage from '../pages/NotFoundPage';
// 관리자 페이지 (본사 관계자)
import DashboardPage from '../pages/DashboardPage';
import SitesPage from '../pages/SitesPage';
import SiteDetailPage from '../pages/SiteDetailPage';
import ReportsPage from '../pages/ReportsPage';
import MaterialsPage from '../pages/MaterialsPage';
import PhotosPage from '../pages/PhotosPage';
// 사용자 페이지 (현장 관리자 · 작업자)
import MySitesPage from '../pages/my/MySitesPage';
import MySiteDetailPage from '../pages/my/MySiteDetailPage';
import ReportFormPage from '../pages/my/ReportFormPage';
import MyReportsPage from '../pages/my/MyReportsPage';
import { ADMIN_ROLES, USER_ROLE, USER_ROLES } from '../constants/enums';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/oauth/kakao/callback" element={<KakaoCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={ADMIN_ROLES}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="sites/:siteId" element={<SiteDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="photos" element={<PhotosPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/my"
        element={
          <ProtectedRoute roles={USER_ROLES}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MySitesPage />} />
        <Route path="sites/:siteId" element={<MySiteDetailPage />} />
        <Route path="report/new" element={<ReportFormPage />} />
        <Route path="reports" element={<MyReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/system"
        element={
          <ProtectedRoute roles={[USER_ROLE.SYSTEM]}>
            <SystemPage />
          </ProtectedRoute>
        }
      />

      {/* 예전 주소(/sites, /reports …)로 들어오면 첫 화면으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
