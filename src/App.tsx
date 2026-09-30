import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';

// Dynamic lazy imports for code splitting & minimal initial bundle
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectEditor = lazy(() => import('./pages/ProjectEditor').then(m => ({ default: m.ProjectEditor })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const GalleryPageAdmin = lazy(() => import('./pages/GalleryPageAdmin').then(m => ({ default: m.GalleryPageAdmin })));
const ShopProductsPage = lazy(() => import('./pages/ShopProductsPage').then(m => ({ default: m.ShopProductsPage })));
const HomePageEditor = lazy(() => import('./pages/HomePageEditor').then(m => ({ default: m.HomePageEditor })));
const AboutPageEditor = lazy(() => import('./pages/AboutPageEditor').then(m => ({ default: m.AboutPageEditor })));
const ContactPageEditor = lazy(() => import('./pages/ContactPageEditor').then(m => ({ default: m.ContactPageEditor })));
const SettingsPageEditor = lazy(() => import('./pages/SettingsPageEditor').then(m => ({ default: m.SettingsPageEditor })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

// Sleek fallback while chunk loads
const PageLoader: React.FC = () => (
  <div
    style={{
      minHeight: '55vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--admin-text-muted, #777)',
    }}
  >
    <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      Loading Module...
    </span>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/users" element={<UserManagementPage />} />
                  <Route path="/content/home" element={<HomePageEditor />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/new" element={<ProjectEditor />} />
                  <Route path="/projects/:id" element={<ProjectEditor />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/gallery" element={<GalleryPageAdmin />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/shop" element={<ShopProductsPage />} />
                  <Route path="/about" element={<AboutPageEditor />} />
                  <Route path="/contact" element={<ContactPageEditor />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/settings" element={<SettingsPageEditor />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Fallback Redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
};

export default App;
