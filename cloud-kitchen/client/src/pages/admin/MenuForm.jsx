import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUpload, FiX } from 'react-icons/fi';

export default function MenuForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ name: '', description: '', category: '', price: '' });
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getMenuItem(id).then(({ data }) => {
        setForm({ name: data.name, description: data.description, category: data.category, price: data.price.toString() });
        setExistingImages(data.images || []);
      });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('price', form.price);
      if (removeImages.length > 0) formData.append('removeImages', JSON.stringify(removeImages));
      newFiles.forEach(f => formData.append('images', f));

      if (isEdit) {
        await api.updateMenuItem(id, formData);
        toast.success('Menu item updated');
      } else {
        await api.createMenuItem(formData);
        toast.success('Menu item created');
      }
      navigate('/admin/menu');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length - removeImages.length + newFiles.length + files.length;
    if (totalImages > 3) { toast.error('Maximum 3 images'); return; }
    setNewFiles(prev => [...prev, ...files]);
  };

  const markForRemoval = (path) => {
    setRemoveImages(prev => [...prev, path]);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={100} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required maxLength={500} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required maxLength={50} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (₹)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium mb-2">Images (max 3)</label>
          <div className="flex gap-3 flex-wrap mb-3">
            {existingImages.filter(img => !removeImages.includes(img.path)).map(img => (
              <div key={img.path} className="relative w-24 h-24">
                <img src={img.url} alt="" className="w-full h-full rounded-lg object-cover" />
                <button type="button" onClick={() => markForRemoval(img.path)} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                  <FiX size={12} />
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className="relative w-24 h-24">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full rounded-lg object-cover" />
                <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-600 font-medium cursor-pointer hover:text-brand-700">
            <FiUpload size={16} /> Upload Images
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item')}
          </button>
          <button type="button" onClick={() => navigate('/admin/menu')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
