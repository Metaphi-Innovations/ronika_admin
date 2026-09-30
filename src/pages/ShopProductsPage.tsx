import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Layers,
  Upload,
  CheckCircle2,
  Edit2,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import {
  getShopCategories,
  createShopCategory,
  deleteShopCategory,
  getShopProducts,
  createShopProduct,
  updateShopProduct,
  deleteShopProduct,
  uploadShopProductImages,
  deleteShopProductImage,
  IShopCategory,
  IShopProduct,
} from '../services/shopApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { useAlert } from '../context/AlertContext';
import { getImageUrl } from '../utils/imageUrl';

const validateShopImage = (
  file: File,
  minWidth = 600,
  minHeight = 600
): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      if (width < minWidth || height < minHeight) {
        return resolve({
          valid: false,
          width,
          height,
          error: `Product artwork dimensions (${width} × ${height} px) are below the minimum requirement of ${minWidth} × ${minHeight} px.`,
        });
      }
      return resolve({ valid: true, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: 'Could not process image file. Please provide a valid JPG, PNG, or WebP image.',
      });
    };
    img.src = objectUrl;
  });
};

export const ShopProductsPage: React.FC = () => {
  const alert = useAlert();
  const [categories, setCategories] = useState<IShopCategory[]>([]);
  const [products, setProducts] = useState<IShopProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete Targets for ConfirmModal
  const [deleteCatTarget, setDeleteCatTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteProdTarget, setDeleteProdTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modals state
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [showProdModal, setShowProdModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IShopProduct | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [bulletPoints, setBulletPoints] = useState<string[]>(['', '', '']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const [galleryModalProduct, setGalleryModalProduct] = useState<IShopProduct | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    width: number;
    height: number;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleBulletPointChange = (index: number, val: string) => {
    const updated = [...bulletPoints];
    updated[index] = val;
    setBulletPoints(updated);
  };

  const addBulletPoint = () => {
    if (bulletPoints.length < 6) {
      setBulletPoints([...bulletPoints, '']);
    }
  };

  const removeBulletPoint = (index: number) => {
    if (bulletPoints.length > 1) {
      setBulletPoints(bulletPoints.filter((_, i) => i !== index));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsRes, prodsRes] = await Promise.all([
        getShopCategories(),
        getShopProducts({ category: selectedCategory === 'ALL' ? undefined : selectedCategory }),
      ]);
      if (catsRes.success) setCategories(catsRes.data);
      if (prodsRes.success) setProducts(prodsRes.data);
    } catch (err: any) {
      setError(err.message || 'Error loading shop data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await createShopCategory({ name: newCatName.trim() });
      if (res.success) {
        setCategories([...categories, res.data]);
        setNewCatName('');
        setShowCatModal(false);
        alert.success(`Shop category "${res.data.name}" created successfully.`);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to create category');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      setDeleting(true);
      await deleteShopCategory(deleteCatTarget.id);
      setCategories(categories.filter((c) => c._id !== deleteCatTarget.id));
      alert.info(`Shop category "${deleteCatTarget.name}" deleted.`);
      setDeleteCatTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateShopImage(file, 600, 600);
    if (!validation.valid) {
      alert.error(validation.error || 'Image resolution is too low.', 'Dimension Warning');
      e.target.value = '';
      return;
    }

    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);

    setSelectedFile(file);
    setImagePreview({
      url: URL.createObjectURL(file),
      width: validation.width || 0,
      height: validation.height || 0,
      name: file.name,
    });
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId('');
    setDescription('');
    setBulletPoints(['', '', '']);
    setSelectedFile(null);
    setSelectedGalleryFiles([]);
    setImagePreview(null);
    setShowProdModal(true);
  };

  const handleEditProduct = (prod: IShopProduct) => {
    setEditingProduct(prod);
    setName(prod.name);
    const catId = typeof prod.category === 'object' && prod.category ? (prod.category as any)._id : (prod.category || '');
    setCategoryId(catId);
    setDescription(prod.description || prod.shortDescription || '');
    const bullets = prod.details?.bulletPoints && prod.details.bulletPoints.length > 0
      ? prod.details.bulletPoints
      : ['', '', ''];
    setBulletPoints(bullets);

    const existingImgUrl = prod.mainImage?.url || prod.images?.[0]?.url || '';
    if (existingImgUrl) {
      setImagePreview({
        url: existingImgUrl,
        width: prod.mainImage?.width || 800,
        height: prod.mainImage?.height || 800,
        name: prod.mainImage?.filename || 'Current Artwork Image',
      });
    } else {
      setImagePreview(null);
    }
    setSelectedFile(null);
    setSelectedGalleryFiles([]);
    setShowProdModal(true);
  };

  const handleCloseProdModal = () => {
    setShowProdModal(false);
    setEditingProduct(null);
    if (imagePreview?.url && selectedFile) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setSelectedFile(null);
    setSelectedGalleryFiles([]);
    setName('');
    setCategoryId('');
    setDescription('');
    setBulletPoints(['', '', '']);
  };

  const handleOpenGalleryModal = (prod: IShopProduct) => {
    setGalleryModalProduct(prod);
  };

  const handleGalleryFilesUpload = async (productId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingGallery(true);
      const validFiles: File[] = [];
      for (const file of Array.from(files)) {
        const val = await validateShopImage(file, 600, 600);
        if (!val.valid) {
          alert.error(val.error || `File "${file.name}" resolution is too low.`, 'Image Rejected');
          return;
        }
        validFiles.push(file);
      }

      const formData = new FormData();
      validFiles.forEach((file) => {
        formData.append('shop_gallery', file);
      });

      const res = await uploadShopProductImages(productId, formData);
      if (res.success) {
        alert.success(`${validFiles.length} image(s) added to gallery.`);
        setProducts((prev) => prev.map((p) => (p._id === productId ? res.data : p)));
        if (galleryModalProduct && galleryModalProduct._id === productId) {
          setGalleryModalProduct(res.data);
        }
        if (editingProduct && editingProduct._id === productId) {
          setEditingProduct(res.data);
        }
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to upload gallery images.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGalleryImage = async (productId: string, imageId: string) => {
    try {
      const res = await deleteShopProductImage(productId, imageId);
      if (res.success) {
        alert.info('Image removed from gallery.');
        setProducts((prev) => prev.map((p) => (p._id === productId ? res.data : p)));
        if (galleryModalProduct && galleryModalProduct._id === productId) {
          setGalleryModalProduct(res.data);
        }
        if (editingProduct && editingProduct._id === productId) {
          setEditingProduct(res.data);
        }
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to remove image.');
    }
  };

  const handleCreateGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const val = await validateShopImage(file, 600, 600);
      if (!val.valid) {
        alert.error(val.error || `File "${file.name}" resolution is too low.`, 'Image Rejected');
        e.target.value = '';
        return;
      }
      validFiles.push(file);
    }
    setSelectedGalleryFiles(validFiles);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert.warning('Please enter a product title.', 'Missing Title');
      return;
    }
    if (!categoryId) {
      alert.warning('Please select a category.', 'Missing Category');
      return;
    }
    if (!description.trim()) {
      alert.warning('Please provide a description.', 'Missing Description');
      return;
    }
    if (!editingProduct && !selectedFile) {
      alert.warning('Please upload a product artwork image.', 'Missing Image');
      return;
    }

    try {
      setSubmitting(true);
      const activeBullets = bulletPoints.map((b) => b.trim()).filter(Boolean);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', categoryId);
      formData.append('price', '0');
      formData.append('shortDescription', description.trim());
      formData.append('description', description.trim());
      formData.append('stockQuantity', '1');
      formData.append('details', JSON.stringify({ bulletPoints: activeBullets }));
      if (selectedFile) {
        formData.append('shop_main', selectedFile);
      }
      if (!editingProduct && selectedGalleryFiles.length > 0) {
        selectedGalleryFiles.forEach((file) => {
          formData.append('shop_gallery', file);
        });
      }

      if (editingProduct) {
        const res = await updateShopProduct(editingProduct._id, formData);
        if (res.success) {
          handleCloseProdModal();
          alert.success(`Product "${res.data?.name || name}" updated successfully.`);
          fetchData();
        }
      } else {
        const res = await createShopProduct(formData);
        if (res.success) {
          handleCloseProdModal();
          alert.success(`Product "${res.data?.name || name}" created successfully.`);
          fetchData();
        }
      }
    } catch (err: any) {
      alert.error(err.message || `Failed to ${editingProduct ? 'update' : 'create'} product`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (prod: IShopProduct) => {
    try {
      const res = await updateShopProduct(prod._id, { published: !prod.published });
      if (res.success) {
        setProducts(
          products.map((p) => (p._id === prod._id ? { ...p, published: !prod.published } : p))
        );
        alert.success(`Product is now ${!prod.published ? 'published' : 'draft'}.`);
      }
    } catch (err: any) {
      alert.error(err.message || 'Failed to toggle status');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProdTarget) return;
    try {
      setDeleting(true);
      await deleteShopProduct(deleteProdTarget.id);
      setProducts(products.filter((p) => p._id !== deleteProdTarget.id));
      alert.info(`Product "${deleteProdTarget.name}" deleted.`);
      setDeleteProdTarget(null);
    } catch (err: any) {
      alert.error(err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="SHOP CATALOG"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowCatModal(true)} className="admin-btn secondary">
              <Layers size={14} />
              <span>Shop Category</span>
            </button>
            <button onClick={handleOpenCreateModal} className="admin-btn primary">
              <Plus size={14} />
              <span>New Product</span>
            </button>
          </div>
        }
      />

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#FFEBEE',
            color: 'var(--admin-danger)',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #FFCDD2',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Category Pills Filter */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`admin-btn ${selectedCategory === 'ALL' ? 'primary' : 'secondary'}`}
          style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '18px' }}
        >
          All Products ({products.length})
        </button>
        {categories.map((cat) => (
          <div key={cat._id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={() => setSelectedCategory(cat._id)}
              className={`admin-btn ${selectedCategory === cat._id ? 'primary' : 'secondary'}`}
              style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '18px' }}
            >
              {cat.name}
            </button>
            <button
              onClick={() => setDeleteCatTarget({ id: cat._id, name: cat.name })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--admin-text-muted)',
                padding: '2px',
              }}
              title="Delete Category"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Product Data Grid Table */}
      <AdminSection noPadding>
        {loading ? (
          <div
            style={{
              padding: '3.5rem',
              textAlign: 'center',
              color: 'var(--admin-text-muted)',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Loading catalog products...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <ShoppingBag
              size={32}
              color="var(--admin-border-color)"
              style={{ marginBottom: '0.5rem' }}
            />
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--admin-text-main)',
                marginBottom: '0.25rem',
              }}
            >
              No products yet
            </h3>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '12.5px', margin: '0 0 1rem 0' }}>
              Add items to your public store catalog.
            </p>
            <button onClick={handleOpenCreateModal} className="admin-btn primary">
              <Plus size={14} /> Add Product
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-data-grid">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>S.No.</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Gallery</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod, index) => {
                  const catName =
                    prod.category && typeof prod.category === 'object' && prod.category.name
                      ? prod.category.name
                      : 'General';
                  return (
                    <tr key={prod._id}>
                      <td>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--admin-text-muted)',
                          }}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </td>
                      <td style={{ minWidth: '180px', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '5px',
                              overflow: 'hidden',
                              background: '#FAFAF8',
                              border: '1px solid var(--admin-border-color)',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={getImageUrl(prod.images?.[0]?.url) || '/placeholder.png'}
                              alt={prod.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: '13.5px',
                                color: 'var(--admin-text-main)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={prod.name}
                            >
                              {prod.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--admin-text-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                wordBreak: 'break-all',
                              }}
                              title={prod.shortDescription || prod.description || `/${prod.slug}`}
                            >
                              {prod.shortDescription || prod.description || `/${prod.slug}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11.5px',
                            background: '#F0F0EE',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {catName}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleOpenGalleryModal(prod)}
                          className="admin-btn secondary"
                          style={{ padding: '3px 8px', fontSize: '11.5px', gap: '4px' }}
                          title="Manage images shown on product view more page"
                        >
                          <ImageIcon size={12} />
                          <span>{prod.images?.length || 1} Photo{(prod.images?.length || 1) !== 1 ? 's' : ''}</span>
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleTogglePublish(prod)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <StatusBadge status={prod.published ? 'published' : 'draft'} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            onClick={() => handleOpenGalleryModal(prod)}
                            className="admin-btn-icon"
                            title="Manage Gallery Images"
                          >
                            <ImageIcon size={15} />
                          </button>
                          <button
                            onClick={() => handleEditProduct(prod)}
                            className="admin-btn-icon"
                            title="Edit Product"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteProdTarget({ id: prod._id, name: prod.name })}
                            className="admin-btn-icon danger"
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={Boolean(deleteCatTarget)}
        title="Delete Shop Category?"
        message={`Are you sure you want to delete "${deleteCatTarget?.name}"?`}
        confirmLabel="Delete Category"
        isLoading={deleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setDeleteCatTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteProdTarget)}
        title="Delete Product?"
        message={`Are you sure you want to delete "${deleteProdTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Product"
        isLoading={deleting}
        onConfirm={confirmDeleteProduct}
        onClose={() => setDeleteProdTarget(null)}
      />

      {/* Category Modal */}
      {showCatModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="admin-card" style={{ width: '380px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.875rem' }}>
              CREATE SHOP CATEGORY
            </h3>
            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="admin-label">Category Name *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="admin-input"
                  placeholder="e.g. Prints, Artworks, Objects"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProdModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            style={{ width: 'min(94vw, 560px)', padding: '1.25rem', maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.875rem' }}>
              {editingProduct ? 'EDIT CATALOG PRODUCT' : 'NEW CATALOG PRODUCT'}
            </h3>
            <form onSubmit={handleSaveProduct}>
              <div
                className="admin-two-col-grid"
                style={{
                  gap: '0.875rem',
                  marginBottom: '0.875rem',
                }}
              >
                <div>
                  <label className="admin-label">Product Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="admin-input"
                    placeholder="e.g. Bombay Textures Print"
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="admin-input"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.875rem' }}>
                <label className="admin-label">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="admin-input"
                  style={{ minHeight: '60px', height: '65px', resize: 'vertical' }}
                  rows={2}
                  placeholder="e.g. High quality art print exploring street typography and visual culture."
                  required
                />
              </div>

              {/* Bullet Points Section */}
              <div style={{ marginBottom: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label className="admin-label" style={{ margin: 0 }}>
                    Product Highlights / Bullet Points (3-4 Points)
                  </label>
                  {bulletPoints.length < 6 && (
                    <button
                      type="button"
                      onClick={addBulletPoint}
                      className="admin-btn secondary"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      <Plus size={11} /> Add Point
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {bulletPoints.map((point, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 900,
                          color: 'var(--admin-text-main)',
                          width: '16px',
                          textAlign: 'center',
                          flexShrink: 0,
                          lineHeight: 1,
                        }}
                      >
                        •
                      </span>
                      <input
                        type="text"
                        value={point}
                        onChange={(e) => handleBulletPointChange(idx, e.target.value)}
                        className="admin-input"
                        style={{ margin: 0, fontSize: '12.5px' }}
                        placeholder={`Point ${idx + 1} (e.g. ${idx === 0
                            ? 'Handcrafted archival quality print'
                            : idx === 1
                              ? 'Printed on 300gsm cotton rag stock'
                              : idx === 2
                                ? 'Signed & numbered limited edition'
                                : 'Carefully packed and shipped safely'
                          })`}
                      />
                      {bulletPoints.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulletPoint(idx)}
                          className="admin-btn-icon danger"
                          style={{ padding: '4px', flexShrink: 0 }}
                          title="Remove point"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Image Upload Dropcard */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="admin-label">
                  Product Artwork Image {editingProduct ? '(Optional to Change)' : '*'}
                </label>
                <div
                  style={{
                    marginBottom: '6px',
                    padding: '4px 8px',
                    background: '#FAFAF8',
                    border: '1px solid var(--admin-border-color)',
                    borderRadius: '5px',
                    fontSize: '11px',
                    color: '#444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ color: '#E65100', fontWeight: 700 }}>
                    {editingProduct ? 'OPTIONAL:' : 'REQUIRED:'}
                  </span>
                  <span>Min: 600 × 600 px (Optimal: 1200 × 1200 px or higher)</span>
                </div>

                {imagePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border-color)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#FAFAF8',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid var(--admin-border-color)',
                      }}
                    >
                      <img
                        src={getImageUrl(imagePreview.url)}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--admin-text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {imagePreview.name}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: '#2E7D32',
                          fontWeight: 500,
                          marginTop: '2px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        {imagePreview.width} × {imagePreview.height} px
                      </span>
                    </div>
                    <label
                      className="admin-btn secondary"
                      style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '11px' }}
                    >
                      Change
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp, image/avif"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <label
                    style={{
                      border: '2px dashed var(--admin-border-color)',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      background: '#FAFAF8',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={18} color="var(--admin-text-main)" />
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--admin-text-main)',
                      }}
                    >
                      Click to choose product image
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                      Min: 600 × 600 px (Square or 4:3)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp, image/avif"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      required={!editingProduct}
                    />
                  </label>
                )}
              </div>

              {/* Additional Gallery Images Section */}
              <div style={{ marginBottom: '1.25rem', paddingTop: '0.875rem', borderTop: '1px solid var(--admin-border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                    Additional Gallery Images (View More Left-Side Thumbnails)
                  </label>
                  {editingProduct && (
                    <label
                      className="admin-btn secondary"
                      style={{ cursor: 'pointer', fontSize: '11.5px', padding: '3px 8px', gap: '4px' }}
                    >
                      <Plus size={12} />
                      {uploadingGallery ? 'Uploading...' : 'Add Photos'}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg, image/png, image/webp, image/avif"
                        onChange={(e) => handleGalleryFilesUpload(editingProduct._id, e.target.files)}
                        disabled={uploadingGallery}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                  Photos added here will display in the left-side thumbnail column on the product's "View More" detail page.
                </div>

                {editingProduct ? (
                  editingProduct.images && editingProduct.images.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px' }}>
                      {editingProduct.images.map((img: any, idx: number) => (
                        <div
                          key={img._id || idx}
                          style={{
                            position: 'relative',
                            aspectRatio: '1/1',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            border: '1px solid var(--admin-border-color)',
                            background: '#fafaf8'
                          }}
                        >
                          <img
                            src={getImageUrl(img.url)}
                            alt={img.alt || 'Gallery photo'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {editingProduct.images.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(editingProduct._id, img._id)}
                              style={{
                                position: 'absolute',
                                top: '3px',
                                right: '3px',
                                background: 'rgba(255, 0, 0, 0.85)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Delete photo"
                            >
                              <X size={10} />
                            </button>
                          )}
                          {img.url === editingProduct.mainImage?.url && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.7)',
                                color: '#fff',
                                fontSize: '8.5px',
                                textAlign: 'center',
                                padding: '1px 0'
                              }}
                            >
                              Main
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                      No additional images yet. Click "Add Photos" above to add more images.
                    </div>
                  )
                ) : (
                  <div>
                    <label
                      style={{
                        border: '1px dashed var(--admin-border-color)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        background: '#FAFAF8',
                        fontSize: '12px',
                        color: 'var(--admin-text-main)'
                      }}
                    >
                      <Plus size={14} />
                      <span>
                        {selectedGalleryFiles.length > 0
                          ? `${selectedGalleryFiles.length} additional image(s) selected`
                          : 'Choose additional gallery images (Optional)'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg, image/png, image/webp, image/avif"
                        onChange={handleCreateGallerySelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseProdModal}
                  className="admin-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={submitting || (!editingProduct && !selectedFile)}
                >
                  {submitting
                    ? (editingProduct ? 'Saving...' : 'Creating...')
                    : (editingProduct ? 'Update Product' : 'Save Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Gallery Modal */}
      {galleryModalProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            style={{ width: 'min(94vw, 620px)', padding: '1.25rem', maxHeight: '90dvh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>
                  PRODUCT GALLERY: {galleryModalProduct.name}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                  Manage photos displayed in the "View More" left-side thumbnail strip &amp; image carousel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryModalProduct(null)}
                className="admin-btn-icon"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Images Grid */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="admin-label" style={{ marginBottom: '8px' }}>
                Current Gallery Photos ({galleryModalProduct.images?.length || 0})
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '12px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                {(galleryModalProduct.images || []).map((img, idx) => (
                  <div
                    key={img._id || idx}
                    style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid var(--admin-border-color)',
                      background: '#FAFAF8',
                    }}
                  >
                    <img
                      src={getImageUrl(img.url)}
                      alt={img.alt || 'Product image'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        background: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      #{idx + 1}
                    </div>

                    {img.url === galleryModalProduct.mainImage?.url ? (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: '#2E7D32',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        Main
                      </div>
                    ) : null}

                    {galleryModalProduct.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGalleryImage(galleryModalProduct._id, img._id || '')}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(211, 47, 47, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}
                        title="Delete photo"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Zone */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="admin-label">Upload Additional Photos</label>
              <label
                style={{
                  border: '2px dashed var(--admin-border-color)',
                  borderRadius: '6px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: uploadingGallery ? 'wait' : 'pointer',
                  background: '#FAFAF8',
                  textAlign: 'center',
                }}
              >
                <Upload size={20} color="var(--admin-text-main)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--admin-text-main)' }}>
                  {uploadingGallery ? 'Uploading Photos...' : 'Click to select additional images (Multi-select)'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Min: 600 × 600 px (Supports JPG, PNG, WebP)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg, image/png, image/webp, image/avif"
                  onChange={(e) => handleGalleryFilesUpload(galleryModalProduct._id, e.target.files)}
                  disabled={uploadingGallery}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setGalleryModalProduct(null)}
                className="admin-btn primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
