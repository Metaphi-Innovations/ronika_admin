import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Edit, Trash2, ExternalLink, Image as ImageIcon, EyeOff } from 'lucide-react';
import { getProjects, deleteProject, IProject } from '../services/projectApi';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        const res = await deleteProject(id);
        if (res.success) {
          setProjects(projects.filter(p => p._id !== id));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete project');
      }
    }
  };

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">Projects Management</h1>
          <p style={{ color: 'var(--admin-text-muted)', margin: '0.25rem 0 0 0', fontSize: '14px' }}>
            Add, edit, reorder, and manage portfolio projects.
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="admin-btn primary"
        >
          <Plus size={16} />
          New Project
        </button>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: '#FFEBEE', color: 'var(--admin-danger)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #FFCDD2', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <FolderKanban size={48} color="var(--admin-border-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.5rem' }}>No projects found</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '1.5rem', fontSize: '14px' }}>
              You haven't added any projects to your portfolio yet.
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="admin-btn primary"
            >
              Add Your First Project
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
                      {typeof project.category === 'object' ? project.category.name : 'Unknown'}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', background: '#FAFAF8', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--admin-border-color)' }}>
                        {project.images?.length || 0} images
                      </span>
                    </td>
                    <td>
                      {project.published ? (
                        <span className="status-badge published">
                          Published
                        </span>
                      ) : (
                        <span className="status-badge draft">
                          <EyeOff size={10} style={{ marginRight: '4px' }} />
                          Draft
                        </span>
                      )}
                      {project.featured && (
                        <span className="status-badge featured" style={{ marginLeft: '8px' }}>
                          Featured
                        </span>
                      )}
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
                          onClick={() => handleDelete(project._id!, project.title)}
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
      </div>
    </div>
  );
};
