import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban,
  Layers,
  Wrench,
  MessageSquare,
  Plus,
  Eye,
  CheckCircle,
  Database,
  Cloud,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Projects', value: '4', icon: FolderKanban, color: '#111' },
    { label: 'Project Categories', value: '3', icon: Layers, color: '#333' },
    { label: 'Services Offered', value: '4', icon: Wrench, color: '#555' },
    { label: 'Inquiries / Messages', value: '0', icon: MessageSquare, color: '#777' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0.5rem 0 0 0', fontSize: '14px' }}>
            Here is an overview of your portfolio content and CMS health.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="admin-btn secondary"
          >
            <Eye size={16} />
            <span>View Live Site</span>
          </a>
          <Link to="/projects" className="admin-btn primary">
            <Plus size={16} />
            <span>Add New Project</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stat-cards-grid">
        {stats.map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <div key={idx} className="stat-card">
              <div>
                <div className="stat-val">{stat.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: 600, marginTop: '8px' }}>
                  {stat.label}
                </div>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#FAFAF8',
                  color: stat.color,
                  border: '1px solid var(--admin-border-color)'
                }}
              >
                <IconComp size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture & Status Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* System Health */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">System Status & Health</h3>
            <ShieldCheck size={18} color="var(--admin-success)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#FAFAF8',
                borderRadius: '8px',
                border: '1px solid var(--admin-border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={18} color="var(--admin-success)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>MongoDB Atlas Cluster</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Connected securely</div>
                </div>
              </div>
              <span className="status-badge published">
                Active
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#FAFAF8',
                borderRadius: '8px',
                border: '1px solid var(--admin-border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={18} color="var(--admin-success)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>HTTP-Only Cookie Auth</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>JWT verified</div>
                </div>
              </div>
              <span className="status-badge published">
                Enforced
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: '#FAFAF8',
                borderRadius: '8px',
                border: '1px solid var(--admin-border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FolderKanban size={18} color="#111111" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Local Filesystem Storage</div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>/backend/uploads</div>
                </div>
              </div>
              <span className="status-badge draft">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Quick Management Links */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Quick Actions</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/projects"
              style={{
                padding: '1rem',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--admin-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; e.currentTarget.style.borderColor = '#111'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--admin-border-color)'; }}
            >
              <span>Manage Projects & Image Layouts</span>
              <FolderKanban size={16} color="var(--admin-text-muted)" />
            </Link>

            <Link
              to="/categories"
              style={{
                padding: '1rem',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--admin-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; e.currentTarget.style.borderColor = '#111'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--admin-border-color)'; }}
            >
              <span>Manage Categories & Display Orders</span>
              <Layers size={16} color="var(--admin-text-muted)" />
            </Link>

            <Link
              to="/services"
              style={{
                padding: '1rem',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--admin-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; e.currentTarget.style.borderColor = '#111'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--admin-border-color)'; }}
            >
              <span>Update Services Offered & Disciplines</span>
              <Wrench size={16} color="var(--admin-text-muted)" />
            </Link>

            <Link
              to="/messages"
              style={{
                padding: '1rem',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'var(--admin-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 500,
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FAFAF8'; e.currentTarget.style.borderColor = '#111'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--admin-border-color)'; }}
            >
              <span>View Client Contact Submissions</span>
              <MessageSquare size={16} color="var(--admin-text-muted)" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
