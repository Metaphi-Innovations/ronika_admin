import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  FolderKanban,
  Layers,
  Image as ImageIcon,
  Wrench,
  ShoppingBag,
  User,
  Users,
  Mail,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setMobileMenuOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const nextState = !prev;
        try {
          localStorage.setItem('admin_sidebar_collapsed', String(nextState));
        } catch {
          // ignore
        }
        return nextState;
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        ...(isFullAdmin
          ? [{ label: 'User Management', path: '/users', icon: Users }]
          : []),
      ],
    },
    {
      title: 'CONTENT',
      items: [
        { label: 'Home Page', path: '/content/home', icon: Home },
        { label: 'Portfolio Projects', path: '/projects', icon: FolderKanban },
        { label: 'Project Categories', path: '/categories', icon: Layers },
        { label: 'Gallery Artwork', path: '/gallery', icon: ImageIcon },
        { label: 'About / Bio', path: '/about', icon: User },
        { label: 'Contact Details', path: '/contact', icon: Mail },
      ],
    },
    {
      title: 'COMMERCE',
      items: [
        { label: 'Shop Catalog', path: '/shop', icon: ShoppingBag },
        { label: 'Client Messages', path: '/messages', icon: MessageSquare },
      ],
    },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/projects/new')) return 'New Project';
    if (path.startsWith('/projects/')) return 'Edit Project';
    if (path === '/projects') return 'Portfolio Projects';
    if (path === '/categories') return 'Categories';
    if (path === '/gallery') return 'Gallery Artwork';
    if (path === '/services') return 'Services';
    if (path === '/shop') return 'Shop Catalog';
    if (path === '/content/home') return 'Home Page';
    if (path === '/about') return 'About & Bio';
    if (path === '/contact') return 'Contact & Social';
    if (path === '/messages') return 'Client Messages';
    if (path === '/settings') return 'Site Settings';
    if (path === '/users') return 'User Management';
    return 'Dashboard';
  };

  return (
    <div className="admin-app-layout">
      {/* Mobile Drawer Overlay Backdrop with smooth fade */}
      <div
        className={`admin-mobile-backdrop ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand-expanded">
            <span className="sidebar-title">Ronika Bhatia</span>
            <span className="sidebar-subtitle">Admin Panel</span>
          </div>
          <div className="sidebar-brand-collapsed" title="Ronika Bhatia CMS">
            <span className="sidebar-brand-monogram">RB</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="admin-mobile-close-btn"
            aria-label="Close sidebar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="sidebar-section">
              <div className="sidebar-section-title">{sec.title}</div>
              {sec.items.map((item) => {
                const IconComp = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <IconComp size={16} />
                    <span className="sidebar-link-text">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-profile-badge"
            title={sidebarCollapsed ? `${user?.name || 'Admin'} (${user?.role || 'Superadmin'})` : undefined}
          >
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Admin'}</span>
              <span className="user-role">{user?.role || 'Superadmin'}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Sign out of CMS"
          >
            <LogOut size={14} />
            <span className="btn-logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-viewport">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={toggleSidebar}
              className={`admin-hamburger-btn ${sidebarCollapsed ? 'is-collapsed' : ''}`}
              aria-label="Toggle navigation sidebar"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={16} />
            </button>
            <h2 className="topbar-page-title">{getPageTitle()}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="topbar-user-pill">
              <span className="topbar-user-avatar">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </span>
              <span className="topbar-user-name">{user?.name || user?.email || 'Admin'}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-btn-icon"
              title="Sign out of CMS"
              aria-label="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
