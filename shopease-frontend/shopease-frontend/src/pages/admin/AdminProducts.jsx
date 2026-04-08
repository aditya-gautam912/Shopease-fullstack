/**
 * src/pages/admin/AdminProducts.jsx
 * Admin product management: searchable table, add/edit modal,
 * delete confirmation. Validation fires on submit only.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { productService } from '../../services/productService';
import { fmtPrice }       from '../../utils/helpers';
import Modal              from '../../components/common/Modal';
import PageSpinner        from '../../components/common/PageSpinner';

const CATEGORIES = ['electronics', 'fashion', 'home', 'sports', 'beauty'];
const FALLBACK   = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=60';
const API_BASE   = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

// ── ImageField ─────────────────────────────────────────────
// Lets the admin either upload a file OR paste a URL.
// Shows a live preview as soon as an image is selected/pasted.
function ImageField({ currentUrl, onUrl, error }) {
  const [uploading, setUploading] = useState(false);
  const [urlInput,  setUrlInput]  = useState(currentUrl || '');
  const inputRef = useRef(null);

  // Keep the text box in sync when the parent resets (openEdit / openAdd)
  React.useEffect(() => { setUrlInput(currentUrl || ''); }, [currentUrl]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await productService.uploadImage(file);
      // url is like /uploads/product-xxx.jpg — prepend the API host
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
      setUrlInput(fullUrl);
      onUrl(fullUrl);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected if needed
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleUrlChange = (e) => {
    setUrlInput(e.target.value);
    onUrl(e.target.value);
  };

  // Resolve display URL — local uploads need the API host prepended
  const displayUrl = urlInput
    ? (urlInput.startsWith('http') ? urlInput : `${API_BASE}${urlInput}`)
    : '';

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
        Product Image *
      </label>

      {/* Preview */}
      {displayUrl && (
        <div className="mb-3 relative inline-block">
          <img
            src={displayUrl}
            alt="preview"
            onError={(e) => { e.target.src = FALLBACK; }}
            className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100"
          />
          <button
            type="button"
            onClick={() => { setUrlInput(''); onUrl(''); }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3 mb-2">
        <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed text-sm font-semibold transition-colors ${
          uploading
            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
            : 'border-primary-300 text-primary-500 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
        }`}>
          {uploading
            ? <><span className="w-4 h-4 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" /> Uploading…</>
            : <>📁 Upload Image</>}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        <span className="text-xs text-gray-400">JPG, PNG, WebP, GIF — max 5 MB</span>
      </div>

      {/* URL fallback */}
      <div>
        <p className="text-xs text-gray-400 mb-1">Or paste a URL:</p>
        <input
          type="text"
          value={urlInput}
          onChange={handleUrlChange}
          placeholder="https://images.unsplash.com/…"
          className={`form-input text-sm py-2 ${error ? 'error' : ''}`}
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function AdminProducts() {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);  // null = add mode, obj = edit mode
  const [deleting,  setDeleting]  = useState(null);  // product to delete
  const [search,    setSearch]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [imageUrl,  setImageUrl]  = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const load = () => {
    setLoading(true);
    productService.getProducts({ limit: 100 })
      .then(({ products: p }) => setProducts(p))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setImageUrl('');
    reset({ title: '', description: '', price: '', oldPrice: '', category: 'electronics', image: '', stock: 100 });
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setImageUrl(product.image || '');
    reset({
      title:       product.title,
      description: product.description,
      price:       product.price,
      oldPrice:    product.oldPrice || '',
      category:    product.category,
      image:       product.image,
      stock:       product.stock,
    });
    setShowModal(true);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        price:    parseFloat(data.price),
        oldPrice: data.oldPrice ? parseFloat(data.oldPrice) : null,
        stock:    parseInt(data.stock, 10),
      };
      if (editing) {
        const updated = await productService.updateProduct(editing._id, payload);
        setProducts((ps) => ps.map((p) => p._id === updated._id ? updated : p));
        toast.success('Product updated!');
      } else {
        const created = await productService.createProduct(payload);
        setProducts((ps) => [created, ...ps]);
        toast.success('Product created!');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await productService.deleteProduct(deleting._id);
      setProducts((ps) => ps.filter((p) => p._id !== deleting._id));
      toast.success('Product deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const Field = ({ name, label, type = 'text', placeholder, rules, children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</label>
      {children || (
        <input type={type} placeholder={placeholder}
          className={`form-input text-sm py-2 ${errors[name] ? 'error' : ''}`}
          {...register(name, rules)} />
      )}
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} total listings</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm py-2 px-5 flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="form-input max-w-sm text-sm py-2" />
      </div>

      {/* Table */}
      {loading ? <PageSpinner /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((p) => (
                    <motion.tr key={p._id} layout
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.image} alt={p.title}
                            onError={(e) => { e.target.src = FALLBACK; }}
                            className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 max-w-[200px]">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="capitalize text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full font-semibold">{p.category}</span>
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{fmtPrice(p.price)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold ${p.stock > 10 ? 'text-green-600' : p.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 ml-1">{p.rating?.rate}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setDeleting(p)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-12 text-sm">No products found</p>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field name="title" label="Product Title *"
                placeholder="e.g. Premium Wireless Headphones"
                rules={{ required: 'Title is required' }} />
            </div>

            <Field name="price" label="Price ($) *" type="number" placeholder="89.99"
              rules={{ required: 'Price is required', min: { value: 0, message: 'Must be positive' } }} />

            <Field name="oldPrice" label="Original Price ($)" type="number" placeholder="129.99" rules={{}} />

            <Field name="category" label="Category *" rules={{ required: 'Category is required' }}>
              <select className="form-input text-sm py-2"
                {...register('category', { required: 'Category is required' })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </Field>

            <Field name="stock" label="Stock" type="number" placeholder="100" rules={{ min: { value: 0, message: 'Cannot be negative' } }} />

            <div className="sm:col-span-2">
              <ImageField
                currentUrl={imageUrl}
                onUrl={(url) => { setImageUrl(url); setValue('image', url); }}
                error={errors.image?.message}
              />
              <input type="hidden" {...register('image', { required: 'Image is required' })} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Description *</label>
              <textarea rows={3}
                className={`form-input text-sm py-2 resize-none ${errors.description ? 'error' : ''}`}
                placeholder="Describe the product…"
                {...register('description', { required: 'Description is required' })} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 justify-center text-sm">
              {saving
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{editing ? 'Saving…' : 'Creating…'}</span>
                : editing ? 'Save Changes' : 'Create Product'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-outline py-2.5 px-5 text-sm">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} maxWidth="max-w-sm">
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Product?</h3>
          <p className="text-sm text-gray-500 mb-6">
            "<span className="font-semibold text-gray-700 dark:text-gray-200">{deleting?.title}</span>" will be removed. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={confirmDelete}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors">
              Yes, Delete
            </button>
            <button onClick={() => setDeleting(null)} className="btn-outline py-2.5 px-5 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}