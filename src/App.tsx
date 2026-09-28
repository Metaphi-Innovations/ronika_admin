import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectEditor } from './pages/ProjectEditor';
import { CategoriesPage } from './pages/CategoriesPage';
import { ServicesPage } from './pages/ServicesPage';
import { GalleryPageAdmin } from './pages/GalleryPageAdmin';
import { ShopProductsPage } from './pages/ShopProductsPage';
import { HomePageEditor } from './pages/HomePageEditor';
import { AboutPageEditor } from './pages/AboutPageEditor';
import { ContactPageEditor } from './pages/ContactPageEditor';
import { SettingsPageEditor } from './pages/SettingsPageEditor';
import { MessagesPage } from './pages/MessagesPage';
import { UserManagementPage } from './pages/UserManagementPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AlertProvider>
        <AuthProvider>
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
            </Route>
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </AlertProvider>
    </BrowserRouter>
  );
};

export default App;
