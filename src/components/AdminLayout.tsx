import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  Wrench,
  User,
  MessageSquare,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Categories', path: '/categories', icon: Layers },
    { label: 'Services', path: '/services', icon: Wrench },
    { label: 'Profile / Bio', path: '/profile', icon: User },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Site Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="admin-app-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-header">
            <span className="sidebar-title">Ronika Bhatia</span>
            <span className="sidebar-subtitle">Admin CMS Control Panel</span>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const IconComp = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconComp size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="sidebar-link"
            style={{ fontSize: '12px', color: '#888' }}
          >
            <ExternalLink size={14} />
            <span>View Live Portfolio</span>
          </a>

          <div className="user-profile-badge">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Admin'}</span>
              <span className="user-role">{user?.role || 'Superadmin'}</span>
            </div>
          </div>

          <button onClick={handleLogout} className="btn-logout" title="Sign out of CMS">
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-viewport">
        <header className="admin-topbar">
          <h2 className="topbar-page-title">Content Management System</h2>
          <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontFamily: 'var(--admin-font-accent)' }}>
            Session Active: <strong>{user?.email}</strong>
          </span>
        </header>

        <main className="admin-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
