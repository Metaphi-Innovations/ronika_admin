import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { getProjects, deleteProject, IProject } from '../services/projectApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';

export const ProjectsPage: React.FC = () => {
  const alert = useAlert();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      if (res.success) {
        setProjects(res.data);
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
                  <th>Status</th>
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
                            <img src={project.heroImage.url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <StatusBadge status={project.published ? 'published' : 'draft'} />
                        {project.featured && <StatusBadge status="featured" />}
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
