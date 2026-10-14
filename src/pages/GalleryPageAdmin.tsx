import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Layers,
  Upload,
  Save,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreVertical,
  Eye,
  RotateCcw,
  Edit2,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import {
  getGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  replaceGalleryImage,
  reorderGalleryImages,
  deleteGalleryImage,
  discardDraftImages,
  getCategoryImages,
  uploadCategoryImages,
  saveCategoryImages,
  IGalleryImage,
} from '../services/galleryApi';
import { getCategories, ICategory } from '../services/projectApi';
import { getSiteSettings, updateSiteSettings } from '../services/contentApi';
import { RichTextEditor } from '../components/RichTextEditor';
import { ConfirmModal } from '../components/ConfirmModal';
import { MediaGridEditor } from '../components/MediaGridEditor';
import { StatusBadge } from '../components/StatusBadge';
import { Loader } from '../components/Loader';
import { AdminSection } from '../components/AdminSection';
import { countReadableChars, MAX_GALLERY_INTRO_CHARS } from '../utils/richText';
import { useAlert } from '../context/AlertContext';
import { useLiveResource } from '../context/LiveSyncContext';
import { getImageUrl } from '../utils/imageUrl';
import {
  findNextAvailableSlot,
  normalizeLayoutItem,
  DEFAULT_ITEM_W,
  DEFAULT_ITEM_H,
  RGL_COLS,
} from '../utils/gridLayout';
import './GalleryAdmin.css';

interface StagedUploadFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export const GalleryPageAdmin: React.FC = () => {
  const alert = useAlert();

  // 1. Authoritative Server State
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [savedImages, setSavedImages] = useState<IGalleryImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 2. Per-Category Draft State
  // Keys: 'all' or category ID (String(cat._id))
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, IGalleryImage[]>>({});
  const [pendingDeletions, setPendingDeletions] = useState<Record<string, string[]>>({});
  const [stagedDraftImageIds, setStagedDraftImageIds] = useState<string[]>([]);
  const stagedDraftImageIdsRef = useRef<string[]>([]);
  stagedDraftImageIdsRef.current = stagedDraftImageIds;

  const [savingOrder, setSavingOrder] = useState(false);
  const [arrangeViewport, setArrangeViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Preview Modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Editorial Intro state
  const [galleryHeader, setGalleryHeader] = useState(
    "Here's a compilation of my Work including Personal as well as Client Projects."
  );
  const [savingHeader, setSavingHeader] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState<{ id: string; title: string } | null>(null);

  // Multi-Image Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDestinationCatId, setUploadDestinationCatId] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit Metadata Modal State
  const [editTarget, setEditTarget] = useState<IGalleryImage | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editingImage, setEditingImage] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<{
    url: string;
    name: string;
  } | null>(null);

  // Active Category Resolution
  const activeCategoryObj = useMemo(() => {
    if (selectedCategory === 'ALL') return null;
    return categories.find(
      (c) => String(c._id) === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [categories, selectedCategory]);

  const activeCatObj = activeCategoryObj;
  const activeCatId = activeCategoryObj ? String(activeCategoryObj._id) : '';
  const activeCatName = activeCategoryObj ? activeCategoryObj.name : 'ALL';
  const activeKey = activeCatId ? activeCatId : 'all';

  // Category Name Resolver
  const getCategoryName = useCallback(
    (cat: any) => {
      if (!cat) return 'Uncategorized';
      const catId = typeof cat === 'object' && cat ? cat._id : cat;
      if (catId && typeof catId === 'string' && catId.trim()) {
        const found = categories.find((c) => String(c._id) === String(catId) || c.name === String(catId));
        if (found) return found.name;
        return typeof cat === 'string' ? cat : 'Uncategorized';
      }
      if (cat && typeof cat === 'object' && cat.name) {
        const foundByName = categories.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
        if (foundByName) return foundByName.name;
      }
      return 'Uncategorized';
    },
    [categories]
  );

  // Check if an image belongs to a specific category
  const isImageInCategory = useCallback(
    (img: IGalleryImage, targetCatIdOrName: string) => {
      if (targetCatIdOrName === 'ALL' || targetCatIdOrName === 'all') return true;
      const targetCatObj = categories.find(
        (c) => String(c._id) === targetCatIdOrName || c.name.toLowerCase() === targetCatIdOrName.toLowerCase()
      );
      if (!targetCatObj) {
        const catName = getCategoryName(img.category);
        return catName.toLowerCase() === targetCatIdOrName.toLowerCase();
      }

      // Check ObjectId match
      const imgCatId = typeof img.category === 'object' && img.category ? (img.category as any)._id : img.category;
      if (imgCatId && String(imgCatId) === String(targetCatObj._id)) return true;

      // Check name match
      const imgCatName = getCategoryName(img.category);
      if (imgCatName.toLowerCase() === targetCatObj.name.toLowerCase()) return true;

      return false;
    },
    [categories, getCategoryName]
  );

  // Authoritative Saved Snapshot for a category key
  const getSavedSnapshot = useCallback(
    (key: string): IGalleryImage[] => {
      const filtered = key === 'all' ? savedImages : savedImages.filter((img) => isImageInCategory(img, key));
      const targetCatObj = categories.find((c) => String(c._id) === key || c.name.toLowerCase() === key.toLowerCase());
      const catName = targetCatObj ? targetCatObj.name : key;

      return [...filtered].sort((a, b) => {
        const getCoord = (img: IGalleryImage) => {
          const l = key === 'all'
            ? img.layoutContexts?.['all']?.lg || img.layouts?.lg
            : img.layoutContexts?.[catName]?.lg ||
            (targetCatObj ? img.layoutContexts?.[String(targetCatObj._id)]?.lg : undefined) ||
            img.layoutContexts?.['all']?.lg ||
            img.layouts?.lg;
          return {
            y: typeof l?.y === 'number' ? l.y : 9999,
            x: typeof l?.x === 'number' ? l.x : 9999,
          };
        };
        const posA = getCoord(a);
        const posB = getCoord(b);
        if (posA.y !== posB.y) return posA.y - posB.y;
        if (posA.x !== posB.x) return posA.x - posB.x;
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });
    },
    [savedImages, isImageInCategory, categories]
  );

  // Active Draft for a category key
  const getActiveDraft = useCallback(
    (key: string): IGalleryImage[] => {
      if (categoryDrafts[key]) {
        return categoryDrafts[key];
      }
      return getSavedSnapshot(key);
    },
    [categoryDrafts, getSavedSnapshot]
  );

  // Dirty state checker for any category key
  const isCategoryDirty = useCallback(
    (key: string): boolean => {
      const dels = pendingDeletions[key] || [];
      if (dels.length > 0) return true;

      const draft = categoryDrafts[key];
      if (!draft) return false;

      const saved = getSavedSnapshot(key);

      // Unpersisted staged draft uploads strictly belonging to this category's draft
      if (draft.some((img) => img.isDraft && stagedDraftImageIds.includes(img._id))) {
        return true;
      }

      // Count difference
      if (draft.length !== saved.length) return true;

      // Check order, IDs, coordinates
      const targetCatObj = categories.find((c) => String(c._id) === key || c.name.toLowerCase() === key.toLowerCase());
      const catName = targetCatObj ? targetCatObj.name : key;

      for (let i = 0; i < draft.length; i++) {
        const dImg = draft[i];
        const sImg = saved[i];
        if (!sImg || dImg._id !== sImg._id) return true;

        const dLayout = normalizeLayoutItem(
          key === 'all'
            ? dImg.layoutContexts?.['all']?.lg || dImg.layouts?.lg
            : dImg.layoutContexts?.[catName]?.lg ||
            (targetCatObj ? dImg.layoutContexts?.[String(targetCatObj._id)]?.lg : undefined) ||
            dImg.layouts?.lg
        );
        const sLayout = normalizeLayoutItem(
          key === 'all'
            ? sImg.layoutContexts?.['all']?.lg || sImg.layouts?.lg
            : sImg.layoutContexts?.[catName]?.lg ||
            (targetCatObj ? sImg.layoutContexts?.[String(targetCatObj._id)]?.lg : undefined) ||
            sImg.layouts?.lg
        );

        if (dLayout && sLayout) {
          if (
            dLayout.x !== sLayout.x ||
            dLayout.y !== sLayout.y ||
            dLayout.w !== sLayout.w ||
            dLayout.h !== sLayout.h
          ) {
            return true;
          }
        } else if (Boolean(dLayout) !== Boolean(sLayout)) {
          return true;
        }
      }

      return false;
    },
    [pendingDeletions, categoryDrafts, getSavedSnapshot, stagedDraftImageIds, categories]
  );

  const isCurrentCategoryDirty = isCategoryDirty(activeKey);
  const currentDisplayImages = getActiveDraft(activeKey);

  // Fetch all gallery data
  const fetchData = async (isInitial = true) => {
    try {
      if (isInitial) setLoading(true);
      setError('');
      const [catsRes, imgsRes, settingsRes] = await Promise.all([
        getCategories(),
        getGalleryImages(),
        getSiteSettings(),
      ]);

      if (catsRes.success) {
        const sortedCats = [...(catsRes.data || [])].sort((a: any, b: any) =>
          (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        );
        setCategories(sortedCats);
      }
      if (imgsRes.success) {
        const sorted = [...imgsRes.data].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        const normalized = sorted.map((item) => {
          const catId = typeof item.category === 'object' && item.category ? (item.category as any)._id : item.category;
          const found = catsRes.success
            ? catsRes.data.find((c: any) => String(c._id) === String(catId) || c.name === String(catId))
            : null;
          return {
            ...item,
            category: found ? found.name : typeof item.category === 'string' ? item.category : 'Uncategorized',
          };
        });
        setSavedImages(normalized);
      }
      if (settingsRes.success && settingsRes.data?.galleryHeader) {
        setGalleryHeader(settingsRes.data.galleryHeader);
      }
    } catch (err: any) {
      if (isInitial) setError("Couldn't load gallery.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    return () => {
      // Discard unpersisted drafts if navigating away
      if (stagedDraftImageIdsRef.current.length > 0) {
        discardDraftImages(stagedDraftImageIdsRef.current).catch(() => { });
      }
    };
  }, []);

  useLiveResource('gallery', () => {
    if (!isCurrentCategoryDirty) {
      fetchData(false);
      if (selectedCategory !== 'ALL') {
        getCategoryImages(selectedCategory).then((res) => {
          if (res.success && Array.isArray(res.data)) {
            const targetCat = categories.find(
              (c) => String(c._id) === selectedCategory || c.name.toLowerCase() === selectedCategory.toLowerCase()
            );
            const catName = targetCat ? targetCat.name : (res.category?.name || 'Uncategorized');
            const normalizedCatImages: IGalleryImage[] = res.data.map((item: any) => ({
              ...item,
              category: catName,
            }));
            setSavedImages((prevSaved) => {
              const otherImages = prevSaved.filter((img) => !isImageInCategory(img, selectedCategory));
              return [...otherImages, ...normalizedCatImages];
            });
          }
        }).catch(() => { });
      }
    }
  });

  useLiveResource('galleryCategories', () => {
    if (!isCurrentCategoryDirty) {
      fetchData(false);
    }
  });

  // Browser navigation warning when unsaved changes exist in any category
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const anyDirty = isCategoryDirty('all') || categories.some((c) => isCategoryDirty(String(c._id)));
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return 'You have unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCategoryDirty, categories]);

  // Category-specific network fetching on tab selection
  const [categoryLoading, setCategoryLoading] = useState(false);

  const handleSelectCategory = async (catKey: string) => {
    setSelectedCategory(catKey);

    try {
      setCategoryLoading(true);

      if (catKey === 'ALL') {
        const res = await getGalleryImages();
        if (res.success && Array.isArray(res.data)) {
          const sorted = [...res.data].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
          const normalized = sorted.map((item) => {
            const catId = typeof item.category === 'object' && item.category ? (item.category as any)._id : item.category;
            const found = categories.find((c: any) => String(c._id) === String(catId) || c.name === String(catId));
            return {
              ...item,
              category: found ? found.name : typeof item.category === 'string' ? item.category : 'Uncategorized',
            };
          });
          setSavedImages(normalized);
        }
      } else {
        const targetCat = categories.find(
          (c) => String(c._id) === catKey || c.name.toLowerCase() === catKey.toLowerCase()
        );
        const res = await getCategoryImages(catKey);
        if (res.success && Array.isArray(res.data)) {
          const catName = targetCat ? targetCat.name : (res.category?.name || 'Uncategorized');
          const normalizedCatImages: IGalleryImage[] = res.data.map((item: any) => ({
            ...item,
            category: catName,
          }));

          setSavedImages((prevSaved) => {
            const otherImages = prevSaved.filter((img) => !isImageInCategory(img, catKey));
            return [...otherImages, ...normalizedCatImages];
          });
        }
      }
    } catch (err: any) {
      console.warn('Failed to load category images:', err);
    } finally {
      setCategoryLoading(false);
    }
  };

  // Compute items for MediaGridEditor
  const editorItems = useMemo(() => {
    return currentDisplayImages.map((img) => {
      let resolvedLayout = undefined;
      if (activeKey === 'all') {
        resolvedLayout = img.layoutContexts?.['all'] || img.layouts;
      } else {
        resolvedLayout =
          img.layoutContexts?.[activeCatName] ||
          (activeCatId ? img.layoutContexts?.[activeCatId] : undefined) ||
          img.layoutContexts?.['all'] ||
          img.layouts;
      }

      return {
        id: img._id,
        url: getImageUrl(img.image?.url),
        layouts: resolvedLayout,
        title: img.title,
        categoryName: getCategoryName(img.category),
        published: img.published,
        aspectRatio: img.image?.aspectRatio,
      };
    });
  }, [currentDisplayImages, activeKey, activeCatName, activeCatId, getCategoryName]);

  // Open Upload Modal with Fixed Destination Category
  const handleOpenUploadModal = () => {
    // If active view is a specific category, lock destination to that category's ID
    if (activeCatId) {
      setUploadDestinationCatId(activeCatId);
    } else if (categories.length > 0) {
      setUploadDestinationCatId(String(categories[0]._id));
    }
    setStagedFiles([]);
    setShowUploadModal(true);
  };

  // Close Upload Modal and clean up object URLs
  const handleCloseUploadModal = () => {
    stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setStagedFiles([]);
    setShowUploadModal(false);
  };

  // Select Multiple Files in Upload Dialog
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newStaged: StagedUploadFile[] = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setStagedFiles((prev) => [...prev, ...newStaged]);
    e.target.value = '';
  };

  // Remove One Staged File Preview via Cross Icon (X)
  const handleRemoveStagedFile = (id: string) => {
    const item = stagedFiles.find((f) => f.id === id);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Submit Staged Images to Active Category API (Append-Only Order)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;

    const targetCatId = uploadDestinationCatId || activeCatId;
    if (!targetCatId) {
      alert.error('Please select a destination category.', 'Category Required');
      return;
    }

    if (stagedFiles.length === 0) {
      alert.error('Please select at least one artwork image.', 'Image Required');
      return;
    }

    const targetCatObj = categories.find((c) => String(c._id) === targetCatId);
    const targetCatName = targetCatObj ? targetCatObj.name : 'Uncategorized';
    const targetKey = String(targetCatId);

    try {
      setUploading(true);
      const formData = new FormData();
      stagedFiles.forEach((sf) => {
        formData.append('gallery_images', sf.file);
      });

      const res = await uploadCategoryImages(targetCatId, formData);
      if (res.success && Array.isArray(res.data)) {
        const createdImgs: IGalleryImage[] = res.data;
        const newIds = createdImgs.map((i) => i._id);

        // Keep track of draft IDs
        setStagedDraftImageIds((prev) => [...prev, ...newIds]);

        // Clean up staged files
        stagedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        setStagedFiles([]);
        setShowUploadModal(false);

        const normalizedCreated = createdImgs.map((img) => ({
          ...img,
          category: targetCatName,
        }));

        // Append to category working draft strictly at the end
        setCategoryDrafts((prev) => {
          const currentCatDraft = prev[targetKey] || getSavedSnapshot(targetKey);
          return {
            ...prev,
            [targetKey]: [...currentCatDraft, ...normalizedCreated],
          };
        });

        // Switch active category if user uploaded while filtering elsewhere
        if (selectedCategory !== 'ALL' && selectedCategory !== targetKey && selectedCategory !== targetCatName) {
          setSelectedCategory(targetKey);
        }

        alert.success(
          `${createdImgs.length} artwork(s) added to ${targetCatName} draft. Remember to click Save Changes to publish.`
        );
      } else {
        alert.error(res.message || "Couldn't upload artworks.");
      }
    } catch (err: any) {
      alert.error(err.response?.data?.message || err.message || "Couldn't upload artworks.");
    } finally {
      setUploading(false);
    }
  };

  // Save Category Changes
  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true);

      if (activeKey !== 'all' && activeCatId) {
        // Individual Category Save through Category-Scoped API
        const currentDraft = getActiveDraft(activeKey);
        const dels = pendingDeletions[activeKey] || [];

        const getCoords = (img: IGalleryImage) => {
          const l =
            img.layoutContexts?.[activeCatName]?.lg ||
            (activeCatId ? img.layoutContexts?.[activeCatId]?.lg : undefined) ||
            img.layouts?.lg;
          return {
            y: typeof l?.y === 'number' ? l.y : 9999,
            x: typeof l?.x === 'number' ? l.x : 9999,
          };
        };

        const sortedForSave = [...currentDraft].sort((a, b) => {
          const posA = getCoords(a);
          const posB = getCoords(b);
          if (posA.y !== posB.y) return posA.y - posB.y;
          return posA.x - posB.x;
        });

        const itemsToSave = sortedForSave.map((img, idx) => {
          const catLayout =
            img.layoutContexts?.[activeCatName] || img.layoutContexts?.[activeCatId] || img.layouts;
          return {
            _id: img._id,
            displayOrder: idx + 1,
            layouts: catLayout,
          };
        });

        const res = await saveCategoryImages(activeCatId, {
          items: itemsToSave,
          deletedImageIds: dels,
        });

        if (res.success) {
          alert.success('Changes saved.');

          // Synchronize savedImages immediately with the saved draft
          // This prevents any pre-position flicker/flash before or during background fetch
          setSavedImages((prevSaved) => {
            const currentDraftMap = new Map(currentDraft.map((d) => [String(d._id), d]));
            const deletedSet = new Set(dels.map(String));
            const updated = prevSaved
              .filter((img) => !deletedSet.has(String(img._id)))
              .map((img) => {
                const draftVer = currentDraftMap.get(String(img._id));
                if (draftVer) {
                  return {
                    ...img,
                    ...draftVer,
                    published: true,
                    isDraft: false,
                  };
                }
                return img;
              });
            return updated;
          });

          // Clear pending deletions for this category
          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next[activeKey];
            return next;
          });

          // Reset working draft for this category so it becomes clean
          setCategoryDrafts((prev) => {
            const next = { ...prev };
            delete next[activeKey];
            return next;
          });

          // Remove saved IDs from stagedDraftImageIds
          const savedIds = new Set(itemsToSave.map((i) => i._id));
          dels.forEach((id) => savedIds.add(id));
          setStagedDraftImageIds((prev) => prev.filter((id) => !savedIds.has(id)));

          // Authoritative synchronization with backend in background
          await fetchData(false);
        } else {
          alert.error(res.message || "Couldn't save changes.");
        }
      } else {
        // All View Save
        const currentDraft = getActiveDraft('all');
        const dels = pendingDeletions['all'] || [];

        for (const delId of dels) {
          if (stagedDraftImageIds.includes(delId)) {
            try {
              await discardDraftImages([delId]);
            } catch (e) { }
          } else {
            try {
              await deleteGalleryImage(delId);
            } catch (e) { }
          }
        }

        const getCoords = (img: IGalleryImage) => {
          const l = img.layoutContexts?.['all']?.lg || img.layouts?.lg;
          return {
            y: typeof l?.y === 'number' ? l.y : 9999,
            x: typeof l?.x === 'number' ? l.x : 9999,
          };
        };

        const sortedForSave = [...currentDraft].sort((a, b) => {
          const posA = getCoords(a);
          const posB = getCoords(b);
          if (posA.y !== posB.y) return posA.y - posB.y;
          return posA.x - posB.x;
        });

        const itemsToSave = sortedForSave.map((img, idx) => ({
          _id: img._id,
          displayOrder: idx + 1,
          layouts: img.layoutContexts?.['all'] || img.layouts,
        }));

        const res = await reorderGalleryImages({
          items: itemsToSave,
          contextKey: 'all',
        });

        if (res.success) {
          alert.success('Changes saved.');

          // Synchronize savedImages immediately with the saved draft
          setSavedImages((prevSaved) => {
            const currentDraftMap = new Map(currentDraft.map((d) => [String(d._id), d]));
            const deletedSet = new Set(dels.map(String));
            const updated = prevSaved
              .filter((img) => !deletedSet.has(String(img._id)))
              .map((img) => {
                const draftVer = currentDraftMap.get(String(img._id));
                if (draftVer) {
                  return {
                    ...img,
                    ...draftVer,
                    published: true,
                    isDraft: false,
                  };
                }
                return img;
              });
            return updated;
          });

          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next['all'];
            return next;
          });
          setCategoryDrafts((prev) => {
            const next = { ...prev };
            delete next['all'];
            return next;
          });
          setStagedDraftImageIds([]);
          await fetchData(false);
        } else {
          alert.error(res.message || "Couldn't save changes.");
        }
      }
    } catch (err: any) {
      alert.error(err.response?.data?.message || err.message || "Couldn't save changes.");
    } finally {
      setSavingOrder(false);
    }
  };

  // Discard Category Changes
  const handleDiscardOrder = async () => {
    try {
      const currentDraft = getActiveDraft(activeKey);
      const unpersistedIds = currentDraft
        .filter((img) => img.isDraft && stagedDraftImageIds.includes(img._id))
        .map((img) => img._id);

      if (unpersistedIds.length > 0) {
        try {
          await discardDraftImages(unpersistedIds);
        } catch (e) {
          console.warn('Failed to clean up draft uploads on server:', e);
        }
        setStagedDraftImageIds((prev) => prev.filter((id) => !unpersistedIds.includes(id)));
      }

      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[activeKey];
        return next;
      });

      setCategoryDrafts((prev) => {
        const next = { ...prev };
        delete next[activeKey];
        return next;
      });

      alert.info('Changes discarded.');
    } catch (err: any) {
      alert.error('Failed to discard changes.');
    }
  };

  // Soft-Delete from Draft
  const confirmDeleteImage = () => {
    if (!deleteImageTarget) return;
    const targetId = deleteImageTarget.id;

    // Record pending deletion for active view
    setPendingDeletions((prev) => ({
      ...prev,
      [activeKey]: [...(prev[activeKey] || []), targetId],
    }));

    // Remove from active view draft strictly
    setCategoryDrafts((prev) => {
      const currentDraft = getActiveDraft(activeKey);
      return {
        ...prev,
        [activeKey]: currentDraft.filter((img) => img._id !== targetId),
      };
    });

    alert.info('Artwork removed from draft. Click "Save Changes" to apply.');
    setDeleteImageTarget(null);
  };

  // Replace file handler for edit modal
  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (replacePreview?.url) URL.revokeObjectURL(replacePreview.url);

    setReplaceFile(file);
    setReplacePreview({
      url: URL.createObjectURL(file),
      name: file.name,
    });
  };

  // Edit Image Info
  const openEditModal = (img: IGalleryImage) => {
    setEditTarget(img);
    setEditTitle(img.title || '');

    // Accurately resolve category ID whether img.category is an object, ID string, or name string
    let resolvedCatId = '';
    if (typeof img.category === 'object' && img.category && (img.category as any)._id) {
      resolvedCatId = String((img.category as any)._id);
    } else if (typeof img.category === 'string' && img.category.trim()) {
      const catStr = img.category.trim();
      const matchedCat = categories.find(
        (c) => String(c._id) === catStr || c.name.toLowerCase() === catStr.toLowerCase()
      );
      resolvedCatId = matchedCat ? String(matchedCat._id) : catStr;
    }

    setEditCategoryId(resolvedCatId);
    setReplaceFile(null);
    setReplacePreview(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const chosenCatId = editCategoryId || (categories.length > 0 ? String(categories[0]._id) : '');

    try {
      setEditingImage(true);
      let res;
      if (replaceFile) {
        const formData = new FormData();
        formData.append('gallery_image', replaceFile);
        formData.append('title', editTitle.trim());
        if (chosenCatId) formData.append('category', chosenCatId);
        res = await replaceGalleryImage(editTarget._id, formData);
      } else {
        res = await updateGalleryImage(editTarget._id, {
          title: editTitle.trim(),
          ...(chosenCatId ? { category: chosenCatId } : {}),
        });
      }

      if (res.success) {
        let updatedImage = res.data;
        const catId =
          typeof updatedImage.category === 'object' && updatedImage.category
            ? updatedImage.category._id
            : typeof updatedImage.category === 'string'
              ? updatedImage.category
              : editCategoryId;
        const matchedCat = categories.find((c) => String(c._id) === String(catId) || c.name === String(catId));
        updatedImage = { ...updatedImage, category: matchedCat ? matchedCat.name : (null as any) };

        setSavedImages((prev) => prev.map((item) => (item._id === editTarget._id ? updatedImage : item)));
        setCategoryDrafts((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((item) => (item._id === editTarget._id ? updatedImage : item));
          }
          return next;
        });
        alert.success('Artwork information updated.');
        setEditTarget(null);
      }
    } catch (err: any) {
      alert.error(err.message || "We couldn't update artwork. Please try again.");
    } finally {
      setEditingImage(false);
    }
  };

  // Save Editorial Intro
  const handleSaveHeader = async () => {
    if (countReadableChars(galleryHeader) > MAX_GALLERY_INTRO_CHARS) {
      alert.error(`Gallery editorial introduction exceeds maximum ${MAX_GALLERY_INTRO_CHARS} characters limit.`);
      return;
    }
    try {
      setSavingHeader(true);
      const res = await updateSiteSettings({ galleryHeader });
      if (res.success) {
        alert.success('Gallery introduction updated.');
      }
    } catch (err: any) {
      alert.error("We couldn't save your changes. Please try again.");
    } finally {
      setSavingHeader(false);
    }
  };

  return (
    <div>
      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FFEBEE',
            color: '#B71C1C',
            borderRadius: '6px',
            marginBottom: '1rem',
            border: '1px solid #FFCDD2',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => fetchData(true)}
            className="admin-btn secondary"
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GALLERY MANAGEMENT WORKFLOW                                              */}
      {/* ========================================================================= */}
      <div>
        {/* Editorial Intro Section */}
        <AdminSection
          title="EDITORIAL INTRO TEXT"
          style={{ marginBottom: '1.25rem' }}
          actions={
            <button
              type="button"
              onClick={handleSaveHeader}
              disabled={savingHeader}
              className="admin-btn primary admin-btn-save"
            >
              <Save size={13} />
              <span>{savingHeader ? 'Saving...' : 'Save Intro'}</span>
            </button>
          }
        >
          <RichTextEditor
            label="Gallery Title"
            value={galleryHeader}
            onChange={setGalleryHeader}
            maxChars={MAX_GALLERY_INTRO_CHARS}
          />
        </AdminSection>

        {/* Action Controls: Add Images Button bound to active category */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, color: 'var(--admin-text-main, #111)', fontSize: '13.5px', lineHeight: 1.5 }}>
            <strong>To add gallery images, select a specific category below.</strong>
          </p>
          {activeCatObj && (
            <button onClick={handleOpenUploadModal} className="admin-btn primary" style={{ fontSize: '13px' }}>
              <Plus size={14} />
              <span>Add Images to {activeCatObj.name}</span>
            </button>
          )}
        </div>

        {/* Category Navigation Pills Bar (Always Visible Across All Views) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => handleSelectCategory('ALL')}
              className={`admin-btn ${selectedCategory === 'ALL' ? 'primary' : 'secondary'}`}
              style={{
                padding: '4px 14px',
                fontSize: '12px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>All ({getActiveDraft('all').length})</span>
              {isCategoryDirty('all') && (
                <span
                  style={{ color: '#F59E0B', fontSize: '16px', lineHeight: 1 }}
                  title="Unsaved changes in All"
                >
                  •
                </span>
              )}
            </button>
            {categories.map((cat) => {
              const catKey = String(cat._id);
              const draftCount = getActiveDraft(catKey).length;
              const isDirty = isCategoryDirty(catKey);
              const isSelected = selectedCategory === catKey || selectedCategory === cat.name;

              return (
                <button
                  key={cat._id}
                  onClick={() => handleSelectCategory(catKey)}
                  className={`admin-btn ${isSelected ? 'primary' : 'secondary'}`}
                  style={{
                    padding: '4px 14px',
                    fontSize: '12px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>
                    {cat.name} ({draftCount})
                  </span>
                  {isDirty && (
                    <span
                      style={{ color: '#F59E0B', fontSize: '16px', lineHeight: 1 }}
                      title={`Unsaved changes in ${cat.name}`}
                    >
                      •
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive RGL Grid */}
        {(() => {
          const galleryGridHeader = (
            <div style={{ padding: '12px 14px', background: '#f5f5f5', marginBottom: '14px', borderRadius: '6px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Gallery Grid Layout</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Drag to move, resize from bottom right to stretch.</p>
              </div>
              {isCurrentCategoryDirty && (
                <div className="unsaved-banner" style={{ marginTop: '12px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>
                      Unsaved changes ({activeCatObj ? activeCatObj.name : 'All'})
                    </span>
                    <span style={{ opacity: 0.85 }}>— Remember to save your new layout.</span>
                  </div>
                  <div className="unsaved-banner-actions">
                    <button
                      type="button"
                      onClick={handleDiscardOrder}
                      disabled={savingOrder}
                      className="admin-btn secondary"
                      style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrder}
                      disabled={savingOrder}
                      className="admin-btn primary admin-btn-save"
                    >
                      <Save size={13} />
                      <span>{savingOrder ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );

          if (loading) {
            return <Loader text="Loading artwork..." minHeight="200px" />;
          }

          if (categoryLoading && currentDisplayImages.length === 0) {
            return <Loader text="Loading artwork..." minHeight="200px" />;
          }

          if (currentDisplayImages.length === 0) {
            return (
              <div>
                {galleryGridHeader}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '4rem 1rem',
                    border: '2px dashed var(--admin-border-strong)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--admin-surface-subtle)',
                  }}
                >
                  <ImageIcon size={36} color="var(--admin-text-muted)" style={{ marginBottom: '0.75rem' }} />
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--admin-text-main, #111)',
                      margin: '0 0 1rem 0',
                    }}
                  >
                    No artwork in {activeCatObj ? activeCatObj.name : 'the gallery'} yet.
                  </p>
                </div>
              </div>
            );
          }

          return (
            <MediaGridEditor
              items={editorItems}
              headerContent={galleryGridHeader}
              onChange={(updatedItems) => {
                const currentDraft = getActiveDraft(activeKey);
                const updatedDraft = [...currentDraft];
                let hasChanges = false;

                updatedItems.forEach((u) => {
                  const imgIndex = updatedDraft.findIndex((i) => String(i._id) === String(u.id));
                  if (imgIndex !== -1) {
                    const img = updatedDraft[imgIndex];
                    const existingLayouts =
                      activeKey === 'all'
                        ? img.layoutContexts?.['all'] || img.layouts
                        : img.layoutContexts?.[activeCatName] ||
                        (activeCatId ? img.layoutContexts?.[activeCatId] : undefined);

                    const oldNorm = normalizeLayoutItem(existingLayouts?.lg);
                    const newNorm = normalizeLayoutItem(u.layouts?.lg);

                    if (
                      !oldNorm ||
                      !newNorm ||
                      oldNorm.x !== newNorm.x ||
                      oldNorm.y !== newNorm.y ||
                      oldNorm.w !== newNorm.w ||
                      oldNorm.h !== newNorm.h
                    ) {
                      updatedDraft[imgIndex] = {
                        ...img,
                        layoutContexts: {
                          ...(img.layoutContexts || {}),
                          [activeKey]: u.layouts as any,
                          ...(activeCatName ? { [activeCatName]: u.layouts as any } : {}),
                          ...(activeCatId ? { [activeCatId]: u.layouts as any } : {})
                        } as Record<string, any>,
                        ...(activeKey === 'all' ? { layouts: u.layouts } : {}),
                      };
                      hasChanges = true;
                    }
                  }
                });

                if (hasChanges) {
                  setCategoryDrafts((prev) => ({
                    ...prev,
                    [activeKey]: updatedDraft,
                  }));
                }
              }}
              onDelete={(id) => {
                const target = currentDisplayImages.find((img) => img._id === id);
                if (target) {
                  setDeleteImageTarget({ id: target._id, title: target.title });
                }
              }}
              onEdit={(id) => {
                const target = currentDisplayImages.find((img) => img._id === id);
                if (target) {
                  openEditModal(target);
                }
              }}
            />
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: LIVE PREVIEW MODAL                                                 */}
      {/* ========================================================================= */}
      {showPreviewModal && (
        <div className="preview-modal-backdrop">
          <div className="preview-modal-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>
                LIVE WEBSITE GALLERY PREVIEW
              </span>
              <div className="preview-viewport-switcher">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`preview-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                >
                  <Monitor size={14} /> Desktop (3 Col)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`preview-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                >
                  <Tablet size={14} /> Tablet (2 Col)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`preview-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                >
                  <Smartphone size={14} /> Mobile (1 Col)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="preview-stage-container">
            <div className={`preview-viewport-frame ${previewDevice}`}>
              <div className="preview-website-page">
                <div className="preview-website-container">
                  <div className="preview-gallery-header-block">
                    <h2
                      className="preview-gallery-subtitle-text"
                      dangerouslySetInnerHTML={{ __html: galleryHeader }}
                    />
                  </div>

                  <div className="preview-gallery-wall">
                    {(() => {
                      const colCount = previewDevice === 'mobile' ? 1 : previewDevice === 'tablet' ? 2 : 3;
                      const cols: Array<Array<{ img: IGalleryImage; orderIdx: number }>> = Array.from(
                        { length: colCount },
                        () => []
                      );
                      currentDisplayImages
                        .filter((img) => img.published)
                        .forEach((img, idx) => {
                          cols[idx % colCount].push({ img, orderIdx: idx + 1 });
                        });
                      return cols.map((colGroup, colIdx) => (
                        <div key={colIdx} className="preview-masonry-column">
                          {colGroup.map(({ img, orderIdx }) => (
                            <div key={img._id} className="preview-wall-card">
                              <div className="preview-card-frame">
                                <img
                                  src={getImageUrl(img.image?.url)}
                                  alt={img.title}
                                  className="preview-card-img"
                                />
                                <div className="preview-position-tag">{String(orderIdx).padStart(2, '0')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MULTI-IMAGE ADD ARTWORK MODAL (APPEND-ONLY + CROSS ICON REMOVAL)    */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="admin-card"
            style={{ width: 'min(94vw, 520px)', padding: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>ADD ARTWORK IMAGES</h3>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} noValidate>
              {/* Destination Category Selection */}
              {activeCatObj ? (
                // Fixed category when opened from an active category
                <div
                  style={{
                    marginBottom: '1.25rem',
                    padding: '10px 14px',
                    background: 'var(--admin-surface-subtle)',
                    borderRadius: '6px',
                    border: '1px solid var(--admin-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--admin-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Destination Category
                  </span>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--admin-text-main)',
                      marginTop: '2px',
                    }}
                  >
                    {activeCatObj.name}
                  </div>
                </div>
              ) : (
                // Category dropdown when opened from All view
                <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="admin-form-label">
                    Destination Category <span className="admin-required-asterisk">*</span>
                  </label>
                  <select
                    value={uploadDestinationCatId}
                    onChange={(e) => setUploadDestinationCatId(e.target.value)}
                    className="admin-form-select"
                  >
                    <option value="">Select Destination Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multi-Image File Staging Area */}
              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">
                  Select Artwork Images <span className="admin-required-asterisk">*</span>
                </label>

                {stagedFiles.length > 0 ? (
                  <div
                    style={{
                      border: '1px solid var(--admin-border)',
                      borderRadius: '6px',
                      padding: '12px',
                      backgroundColor: 'var(--admin-surface-subtle)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {stagedFiles.length} image{stagedFiles.length > 1 ? 's' : ''} staged
                      </span>
                      <label
                        className="admin-btn secondary"
                        style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '11px' }}
                      >
                        + Add More
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFilesSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        padding: '2px',
                      }}
                    >
                      {stagedFiles.map((sf) => (
                        <div
                          key={sf.id}
                          style={{
                            position: 'relative',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid var(--admin-border)',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <img
                            src={sf.previewUrl}
                            alt={sf.name}
                            style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                          />
                          {/* Cross Icon (X) to remove pending selection */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedFile(sf.id)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Remove this pending image"
                          >
                            <X size={12} />
                          </button>
                          <div
                            style={{
                              padding: '4px 6px',
                              fontSize: '11px',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={sf.name}
                          >
                            {sf.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label
                    style={{
                      border: '2px dashed var(--admin-border-strong)',
                      borderRadius: '6px',
                      padding: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: 'var(--admin-surface-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={22} color="var(--admin-text-main, #111)" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Click to Select Artwork Images</span>
                    <span style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)' }}>
                      Select one or multiple files at once. All sizes & ratios supported.
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFilesSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={handleCloseUploadModal} className="admin-btn secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={uploading}
                >
                  {uploading
                    ? 'Adding Artworks...'
                    : `Add ${stagedFiles.length > 0 ? `${stagedFiles.length} ` : ''}Artwork${stagedFiles.length > 1 ? 's' : ''
                    }`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT METADATA MODAL                                                */}
      {/* ========================================================================= */}
      {editTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="admin-card" style={{ width: 'min(94vw, 420px)', padding: '1.25rem', maxHeight: '90dvh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '0.875rem' }}>
              EDIT ARTWORK INFORMATION
            </h3>

            <form onSubmit={handleEditSubmit} noValidate>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">Replace Image (Optional)</label>
                <div
                  style={{
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--admin-surface-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <img
                      src={replacePreview ? replacePreview.url : getImageUrl(editTarget?.image?.url)}
                      alt="Artwork Preview"
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '4px',
                        objectFit: 'cover',
                        border: '1px solid var(--admin-border)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
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
                        {replacePreview ? replacePreview.name : editTarget?.image?.filename || 'Current Artwork Image'}
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10.5px',
                          color: replacePreview ? '#2E7D32' : 'var(--admin-text-muted)',
                          fontWeight: 500,
                        }}
                      >
                        {replacePreview ? (
                          <>
                            <CheckCircle2 size={11} />
                            Ready to replace
                          </>
                        ) : (
                          'Current Image'
                        )}
                      </span>
                    </div>
                  </div>
                  <label
                    className="admin-btn-icon"
                    style={{ cursor: 'pointer', padding: '7px', flexShrink: 0 }}
                    title="Replace Artwork Image"
                  >
                    <RefreshCw size={14} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReplaceFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label">
                  Category
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="admin-form-select"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditTarget(null)} className="admin-btn secondary">
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary admin-btn-save" disabled={editingImage}>
                  <Save size={13} />
                  <span>{editingImage ? 'Saving...' : 'Save Info'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRM MODAL (REMOVE FROM DRAFT)                                         */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deleteImageTarget)}
        title="Remove Artwork from Draft?"
        message="Are you sure you want to remove this Artwork from this draft? It will remain on the public site until you click &quot;Save Changes&quot;."
        confirmLabel="Remove from Draft"
        isLoading={false}
        onConfirm={confirmDeleteImage}
        onClose={() => setDeleteImageTarget(null)}
      />
    </div>
  );
};
