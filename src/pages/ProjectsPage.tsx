import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Edit, Trash2, Image as ImageIcon, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { getProjects, updateProject, deleteProject, IProject } from '../services/projectApi';
import { getHomeContent } from '../services/contentApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { getImageUrl } from '../utils/imageUrl';

export const ProjectsPage: React.FC = () => {
  const alert = useAlert();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const [res, homeRes] = await Promise.all([getProjects(), getHomeContent()]);
      if (res.success) {
        const homeFeaturedIds = new Set(
          (homeRes?.data?.featuredProjects || []).map((p: any) =>
            typeof p === 'object' && p ? String(p._id) : String(p)
          ).filter(Boolean)
        );
        const syncedProjects = (res.data || []).map((proj: IProject) => ({
          ...proj,
          featured: homeFeaturedIds.has(String(proj._id)),
        }));
        setProjects(syncedProjects);
      } else {
        setError('Failed to load projects');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleTogglePublish = async (project: IProject) => {
    if (!project._id || togglingId) return;
    const newStatus = !project.published;
    try {
      setTogglingId(project._id);
      const res = await updateProject(project._id, { published: newStatus });
      if (res.success) {
        setProjects((prev) =>
          prev.map((p) => {
            if (p._id === project._id) {
              return {
                ...p,
                published: newStatus,
                // If unpublished, project is removed from featured showcase
                featured: newStatus ? p.featured : false,
              };
            }
            return p;
          })
        );
        alert.success(
          newStatus
            ? `✓ Project "${project.title}" is now published and live on the portfolio.`
            : `Project "${project.title}" is now set to Draft (hidden from portfolio).`,
          newStatus ? 'Project Published' : 'Project Unpublished'
        );
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to update publication status.', 'Status Update Failed');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await deleteProject(deleteTarget.id);
      if (res.success) {
        setProjects(projects.filter((p) => p._id !== deleteTarget.id));
        alert.success(`Project "${deleteTarget.title}" deleted successfully.`, 'Deleted');
        setDeleteTarget(null);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete project', 'Delete Failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="PORTFOLIO PROJECTS"
        actions={
          <button
            onClick={() => navigate('/projects/new')}
            className="admin-btn primary"
          >
            <Plus size={15} />
            <span>New Project</span>
          </button>
        }
      />

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '6px', marginBottom: '1.125rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <AdminSection noPadding>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1rem', fontSize: '14px' }}>
              No projects yet.
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="admin-btn primary"
            >
              <Plus size={14} />
              <span>Add Project</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Media</th>
                  <th>Publication Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {project.heroImage?.url ? (
                          <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: '#FAFAF8', border: '1px solid var(--admin-border-color)' }}>
                            <img
                              src={getImageUrl(project.heroImage.url)}
                              alt={project.title}
                              loading="lazy"
                              decoding="async"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#FAFAF8', border: '1px solid var(--admin-border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={20} color="var(--admin-text-light)" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--admin-text-main)' }}>{project.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginTop: '2px', fontFamily: 'var(--admin-font-accent)' }}>/{project.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {project.category && typeof project.category === 'object' && (project.category as any).name ? (
                        <span style={{ fontSize: '12px', background: '#F0F0EE', padding: '3px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          {(project.category as any).name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#D84315', background: '#FBE9E7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', background: '#FAFAF8', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--admin-border-color)' }}>
                        {project.images?.length || 0} images
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Interactive Clickable Publish Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(project)}
                          disabled={togglingId === project._id}
                          title={
                            project.published
                              ? 'Live on portfolio. Click to set to Draft (unpublish).'
                              : 'Draft (hidden). Click to publish live on portfolio.'
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: togglingId === project._id ? 'wait' : 'pointer',
                            transition: 'all 0.18s ease',
                            border: project.published ? '1px solid #A5D6A7' : '1px solid #E0E0E0',
                            background: project.published ? '#E8F5E9' : '#F5F5F5',
                            color: project.published ? '#2E7D32' : '#616161',
                            opacity: togglingId === project._id ? 0.6 : 1,
                            userSelect: 'none',
                          }}
                        >
                          {togglingId === project._id ? (
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : project.published ? (
                            <Eye size={13} color="#2E7D32" />
                          ) : (
                            <EyeOff size={13} color="#757575" />
                          )}
                          <span>{project.published ? 'Published' : 'Draft'}</span>
                        </button>

                        {/* Automatic Featured Indicator based on Home Page Selection */}
                        {project.featured && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '14px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: '#FFF8E1',
                              color: '#B78103',
                              border: '1px solid #FFE082',
                            }}
                            title="Active in Home Page Featured Showcase (managed in Home Page editor)"
                          >
                            <Sparkles size={11} />
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link
                          to={`/projects/${project._id}`}
                          className="admin-btn-icon"
                          title="Edit Project"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: project._id!, title: project.title })}
                          className="admin-btn-icon danger"
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Project?"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Project"
        isLoading={deleting}
        onConfirm={confirmDeleteProject}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
