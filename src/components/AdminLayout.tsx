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
  ChevronDown,
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
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const userPanelRef = useRef<HTMLDivElement>(null);

  // Close mobile menu and user panel on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserPanelOpen(false);
  }, [location.pathname]);

  // Click outside listener: close user panel when clicking anywhere else
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userPanelRef.current && !userPanelRef.current.contains(e.target as Node)) {
        setUserPanelOpen(false);
      }
    };
    if (userPanelOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [userPanelOpen]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

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
                    onClick={() => setMobileMenuOpen(false)}
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

        {/* Sidebar Footer with Upper-Side User Menu */}
        <div className="sidebar-footer">
          <div className="sidebar-user-panel-wrapper" ref={userPanelRef}>
            {/* Popover Menu: Opens on the UPPER SIDE of the user section */}
            {userPanelOpen && (
              <div className="sidebar-user-upper-popover">
                {/* Profile Link Button - renders profile on the page */}
                <button
                  type="button"
                  className={`sidebar-user-popover-item ${location.pathname === '/profile' ? 'active-link' : ''}`}
                  onClick={() => {
                    setUserPanelOpen(false);
                    navigate('/profile');
                    setMobileMenuOpen(false);
                  }}
                >
                  <User size={15} />
                  <span>Profile</span>
                </button>

                <div className="sidebar-user-popover-divider" />

                {/* Logout Button */}
                <button
                  type="button"
                  className="sidebar-user-popover-item logout-item"
                  onClick={() => {
                    setUserPanelOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Interactive User Name Button */}
            <div
              className={`user-profile-badge ${userPanelOpen ? 'active' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) {
                  setSidebarCollapsed(false);
                  setUserPanelOpen(true);
                } else {
                  setUserPanelOpen((prev) => !prev);
                }
              }}
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
                  <ChevronDown
                    size={14}
                    style={{
                      color: '#888888',
                      transition: 'transform 0.2s ease',
                      transform: userPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </>
              )}
            </div>
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
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="View Admin Profile"
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
    </div>
  );
};
