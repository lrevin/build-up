import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import SitesPage from '../pages/SitesPage';
import SiteDetailPage from '../pages/SiteDetailPage';
import ReportsPage from '../pages/ReportsPage';
import PhotosPage from '../pages/PhotosPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="sites/:siteId" element={<SiteDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="photos" element={<PhotosPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
