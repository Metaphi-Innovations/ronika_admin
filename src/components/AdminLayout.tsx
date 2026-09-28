import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  FolderKanban,
  Layers,
  Image as ImageIcon,
  ShoppingBag,
  User,
  Users,
  Mail,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfileModal } from './UserProfileModal';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

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

  const isFullAdmin = user?.role === 'admin';

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
    if (path === '/profile') return 'Admin Profile';
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

        {/* Sidebar Footer with Unified User Profile & Dropdown */}
        <div className="sidebar-footer" ref={userMenuRef}>
          {/* User Options Dropdown Popover */}
          {userMenuOpen && (
            <div className="sidebar-user-dropdown-menu">
              <button
                type="button"
                className="sidebar-user-dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  setProfileModalOpen(true);
                }}
              >
                <User size={15} />
                <span>Profile</span>
              </button>
              <div className="sidebar-user-dropdown-divider" />
              <button
                type="button"
                className="sidebar-user-dropdown-item text-danger"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Interactive User Badge */}
          <div
            className={`user-profile-badge ${userMenuOpen ? 'active' : ''}`}
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title={sidebarCollapsed ? `${user?.name || 'Admin'} (${user?.role || 'Admin'})` : 'Click to view options'}
          >
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
                  <span className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Admin'}
                  </span>
                  <span className="user-role">{user?.role ? user.role.toUpperCase() : 'ADMIN'}</span>
                </div>
                <ChevronUp
                  size={14}
                  style={{
                    color: '#888888',
                    transition: 'transform 0.2s ease',
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </>
            )}
          </div>
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
            <div
              className="topbar-user-pill"
              onClick={() => setProfileModalOpen(true)}
              style={{ cursor: 'pointer' }}
              title="Click to view profile details"
            >
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

      {/* Profile Details Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </div>
  );
};
