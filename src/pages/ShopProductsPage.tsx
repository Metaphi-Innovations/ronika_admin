import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronDown,
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
import { getSiteSettings, updateSiteSettings, ISiteSettings } from '../services/contentApi';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminSection, PageHeader } from '../components/AdminSection';
import { Loader } from '../components/Loader';
import { RichTextEditor } from '../components/RichTextEditor';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';
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

      // Strict 1:1 Aspect Ratio Check: width and height must be identical
      if (Math.abs(width - height) > 1) {
        return resolve({
          valid: false,
          width,
          height,
          error: `Image must be a strict 1:1 square ratio (equal width and height). Current image is ${width} × ${height} px. Please upload a square image.`,
        });
      }

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

  // Settings state
  const [settings, setSettings] = useState<ISiteSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isHeaderSettingsOpen, setIsHeaderSettingsOpen] = useState(false);

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
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [galleryDrafts, setGalleryDrafts] = useState<
    { id: string; file: File; previewUrl: string; width: number; height: number; name: string }[]
  >([]);
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
    setBulletPoints(bulletPoints.filter((_, i) => i !== index));
  };

  const fetchData = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      const [catsRes, prodsRes, settingsRes] = await Promise.all([
        getShopCategories(),
        getShopProducts(), // Fetch all products so category product counts are always 100% accurate
        getSiteSettings(),
      ]);
      if (catsRes.success) setCategories(catsRes.data);
      if (prodsRes.success) setProducts(prodsRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
    } catch (err: any) {
      if (isInitial) setError(err.message || 'Error loading shop data');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setSavingSettings(true);
      const { _id, __v, createdAt, updatedAt, ...cleanSettings } = settings as any;
      const res = await updateSiteSettings(cleanSettings);
      if (res.success) {
        setSettings({
          ...res.data,
          shopHeaderTitle: res.data.shopHeaderTitle ?? cleanSettings.shopHeaderTitle,
          shopHeaderSubtitle: res.data.shopHeaderSubtitle ?? cleanSettings.shopHeaderSubtitle
        });
        alert.success('Shop header settings saved successfully!');
      } else {
        alert.error(res.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      alert.error(err.message || 'An error occurred while saving.');
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  useLiveResource('shop', () => {
    fetchData(false);
  });

  useLiveResource('shopCategories', () => {
    fetchData(false);
  });

  const getCategoryCount = (catId: string) => {
    return products.filter((p) => {
      const pCatId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
      return pCatId === catId;
    }).length;
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    return products.filter((p) => {
      const catId = typeof p.category === 'object' && p.category ? (p.category as any)._id : p.category;
      return catId === selectedCategory;
    });
  }, [products, selectedCategory]);

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
    setBulletPoints([]);
    setSelectedFile(null);
    galleryDrafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setGalleryDrafts([]);
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
      ? prod.details.bulletPoints.filter(Boolean)
      : [];
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
    galleryDrafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setGalleryDrafts([]);
    setShowProdModal(true);
  };

  const handleCloseProdModal = () => {
    setShowProdModal(false);
    setEditingProduct(null);
    if (imagePreview?.url && selectedFile) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setSelectedFile(null);
    galleryDrafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    setGalleryDrafts([]);
    setName('');
    setCategoryId('');
    setDescription('');
    setBulletPoints([]);
  };

  const handleRemoveGalleryDraft = (id: string) => {
    setGalleryDrafts((prev) => {
      const item = prev.find((d) => d.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
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

    const newDrafts: { id: string; file: File; previewUrl: string; width: number; height: number; name: string }[] = [];
    for (const file of Array.from(files)) {
      const val = await validateShopImage(file, 600, 600);
      if (!val.valid) {
        alert.error(val.error || `File "${file.name}" rejected.`, 'Image Validation');
        continue;
      }
      newDrafts.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        width: val.width || 0,
        height: val.height || 0,
        name: file.name,
      });
    }

    if (newDrafts.length > 0) {
      setGalleryDrafts((prev) => [...prev, ...newDrafts]);
    }
    // Reset file input so user can add more photos again
    e.target.value = '';
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
      alert.warning('Please provide a product description.', 'Missing Description');
      return;
    }
    if (!editingProduct && !selectedFile) {
      alert.warning('Please upload a product artwork image.', 'Missing Image');
      return;
    }
    if (editingProduct && !selectedFile && !imagePreview?.url) {
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
      if (!editingProduct && galleryDrafts.length > 0) {
        galleryDrafts.forEach((draft) => {
          formData.append('shop_gallery', draft.file);
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

      {/* SHOP PAGE HEADER SETTINGS */}
      <div style={{ marginBottom: '24px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid var(--admin-border-color, #E5E5E0)', overflow: 'hidden' }}>
        <div
          onClick={() => setIsHeaderSettingsOpen(!isHeaderSettingsOpen)}
          style={{
            padding: '12px 16px',
            background: '#FAFAF8',
            borderBottom: isHeaderSettingsOpen ? '1px solid var(--admin-border-color, #E5E5E0)' : 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF8')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--admin-text-main, #111)' }}>
              Shop Page Header Settings
            </span>
            <ChevronDown
              size={15}
              style={{
                color: 'var(--admin-text-main, #111)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHeaderSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>

        {isHeaderSettingsOpen && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <RichTextEditor
                    label="Title"
                    value={settings?.shopHeaderTitle || ''}
                    maxChars={50}
                    onChange={(val) => setSettings(settings ? { ...settings, shopHeaderTitle: val } : null)}
                  />
                </div>
              </div>
              <div style={{ flex: '2 1 400px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <RichTextEditor
                    label="Subtitle"
                    value={settings?.shopHeaderSubtitle || ''}
                    maxChars={100}
                    onChange={(val) => setSettings(settings ? { ...settings, shopHeaderSubtitle: val } : null)}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings || !settings}
                className="admin-btn primary"
              >
                <span>{savingSettings ? 'Saving...' : 'Save Shop Header'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

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
              {cat.name} ({getCategoryCount(cat._id)})
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
          <Loader text="Loading catalog products..." minHeight="200px" />
        ) : filteredProducts.length === 0 ? (
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
              {selectedCategory === 'ALL' ? 'No products yet' : 'No products in this category'}
            </h3>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '12.5px', margin: '0 0 1rem 0' }}>
              {selectedCategory === 'ALL'
                ? 'Add items to your public store catalog.'
                : 'Switch categories or add a new product to this category.'}
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
                {filteredProducts.map((prod, index) => {
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
            style={{
              width: 'min(94vw, 540px)',
              padding: '1.25rem',
              maxHeight: '90dvh',
              overflowY: 'auto',
              borderRadius: '10px',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.625rem',
                borderBottom: '1px solid var(--admin-border-color)',
              }}
            >
              <h3
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--admin-text-main)',
                }}
              >
                {editingProduct ? 'Edit Catalog Product' : 'New Catalog Product'}
              </h3>
              <button
                type="button"
                onClick={handleCloseProdModal}
                className="admin-btn-icon"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} noValidate>
              {/* Product Name & Category */}
              <div
                className="admin-two-col-grid"
                style={{
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
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
                  />
                </div>
                <div>
                  <label className="admin-label">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="admin-input"
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

              {/* Description */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="admin-label">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="admin-input"
                  style={{ minHeight: '56px', height: '60px', resize: 'vertical' }}
                  rows={2}
                  placeholder="Brief description of the product artwork..."
                />
              </div>

              {/* Product Highlights / Bullet Points */}
              <div style={{ marginBottom: '0.875rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}
                >
                  <label className="admin-label" style={{ margin: 0 }}>
                    Product Highlights (Optional)
                  </label>
                  {bulletPoints.length < 5 && (
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

                {bulletPoints.length === 0 ? (
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: 'var(--admin-text-muted)',
                      fontStyle: 'italic',
                      padding: '4px 0',
                    }}
                  >
                    No bullet points added. Click "+ Add Point" to add features (dimensions, paper stock, etc.).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {bulletPoints.map((point, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            color: 'var(--admin-text-muted)',
                            width: '12px',
                            textAlign: 'center',
                            flexShrink: 0,
                          }}
                        >
                          •
                        </span>
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => handleBulletPointChange(idx, e.target.value)}
                          className="admin-input"
                          style={{ margin: 0, fontSize: '12px', padding: '5px 8px' }}
                          placeholder={`Highlight ${idx + 1} (e.g. 300gsm cotton rag stock)`}
                        />
                        <button
                          type="button"
                          onClick={() => removeBulletPoint(idx)}
                          className="admin-btn-icon danger"
                          style={{ padding: '3px', flexShrink: 0 }}
                          title="Remove point"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Artwork Image */}
              <div style={{ marginBottom: '0.875rem' }}>
                <label className="admin-label">
                  Product Image {editingProduct ? '' : '*'}
                </label>

                {imagePreview ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border-color)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FAFAF8',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <img
                        src={getImageUrl(imagePreview.url)}
                        alt="Preview"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          border: '1px solid var(--admin-border-color)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--admin-text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '220px',
                          }}
                        >
                          {imagePreview.name}
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10.5px',
                            color: '#2E7D32',
                            fontWeight: 500,
                          }}
                        >
                          <CheckCircle2 size={11} />
                          {imagePreview.width > 0 ? `${imagePreview.width} × ${imagePreview.height} px` : 'Selected'}
                        </span>
                      </div>
                    </div>
                    <label
                      className="admin-btn secondary"
                      style={{ cursor: 'pointer', padding: '3px 8px', fontSize: '11px', flexShrink: 0 }}
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
                      border: '1.5px dashed var(--admin-border-color)',
                      borderRadius: '6px',
                      padding: '1rem',
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
                    <Upload size={16} color="var(--admin-text-main)" />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--admin-text-main)',
                      }}
                    >
                      Click to choose product image
                    </span>
                    <div style={{ display: 'inline-block', padding: '6px 12px', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '11.5px', color: 'var(--admin-text-main)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                      <strong style={{ color: '#E65100', marginRight: '6px' }}>REQUIRED:</strong>
                      <span>Strict 1:1 Square (Min: 600 × 600 px)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp, image/avif"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Gallery Photos (Visual Thumbnails) */}
              <div
                style={{
                  marginBottom: '1rem',
                  paddingTop: '0.625rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
                {editingProduct ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                        Gallery Photos ({editingProduct.images?.length || 0})
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <label
                          className="admin-btn secondary"
                          style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px', gap: '4px' }}
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
                        <button
                          type="button"
                          onClick={() => {
                            setShowProdModal(false);
                            handleOpenGalleryModal(editingProduct);
                          }}
                          className="admin-btn secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', gap: '4px' }}
                          title="Open dedicated gallery manager"
                        >
                          <ImageIcon size={12} />
                          Manage
                        </button>
                      </div>
                    </div>

                    {editingProduct.images && editingProduct.images.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          padding: '4px 0',
                          alignItems: 'center',
                        }}
                      >
                        {editingProduct.images.map((img: any, idx: number) => (
                          <div
                            key={img._id || idx}
                            style={{
                              position: 'relative',
                              width: '48px',
                              height: '48px',
                              borderRadius: '5px',
                              overflow: 'hidden',
                              border: '1px solid var(--admin-border-color)',
                              background: '#FAFAF8',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={getImageUrl(img.url)}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {editingProduct.images.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteGalleryImage(editingProduct._id, img._id)}
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  background: 'rgba(211, 47, 47, 0.9)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title="Remove photo"
                              >
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', fontStyle: 'italic' }}>
                        No additional photos yet. Click "+ Add Photos" to add.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <label className="admin-label" style={{ margin: 0, fontWeight: 600 }}>
                        Additional Photos ({galleryDrafts.length})
                      </label>
                      <label
                        className="admin-btn secondary"
                        style={{ cursor: 'pointer', fontSize: '11px', padding: '3px 8px', gap: '4px' }}
                      >
                        <Plus size={12} /> Add Photos
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg, image/png, image/webp, image/avif"
                          onChange={handleCreateGallerySelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    {galleryDrafts.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          padding: '4px 0',
                          alignItems: 'center',
                        }}
                      >
                        {galleryDrafts.map((draft) => (
                          <div
                            key={draft.id}
                            style={{
                              position: 'relative',
                              width: '48px',
                              height: '48px',
                              borderRadius: '5px',
                              overflow: 'hidden',
                              border: '1px solid var(--admin-border-color)',
                              background: '#FAFAF8',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={draft.previewUrl}
                              alt={draft.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryDraft(draft.id)}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                background: 'rgba(211, 47, 47, 0.9)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title="Remove photo"
                            >
                              <X size={9} />
                            </button>
                          </div>
                        ))}

                      </div>
                    ) : (
                      <label
                        style={{
                          border: '1.5px dashed var(--admin-border-color)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          background: '#FAFAF8',
                          fontSize: '11.5px',
                          color: 'var(--admin-text-main)',
                        }}
                      >
                        <Plus size={13} />
                        <span>Add additional 1:1 gallery photos (Optional)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg, image/png, image/webp, image/avif"
                          onChange={handleCreateGallerySelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                  paddingTop: '0.625rem',
                  borderTop: '1px solid var(--admin-border-color)',
                }}
              >
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
                  disabled={submitting}
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
                <div style={{ display: 'inline-block', padding: '6px 12px', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '20px', fontSize: '11.5px', color: 'var(--admin-text-main)', marginTop: '8px', textAlign: 'center', lineHeight: '1.5' }}>
                  <strong style={{ color: '#E65100', marginRight: '6px' }}>REQUIRED:</strong>
                  <span>Strict 1:1 Square (Min: 600 × 600 px)</span>
                </div>
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
