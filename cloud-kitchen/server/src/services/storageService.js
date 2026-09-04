import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'food-images';

export const storageService = {
  async uploadImage(file, menuItemId) {
    const ext = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = `${menuItemId}/${fileName}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new Error(`Image upload failed: ${error.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  },

  async deleteImage(filePath) {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Image deletion failed:', error.message);
    }
  },

  async deleteMenuItemImages(menuItemId) {
    const { data: files } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(menuItemId);

    if (files && files.length > 0) {
      const paths = files.map(f => `${menuItemId}/${f.name}`);
      await supabaseAdmin.storage.from(BUCKET).remove(paths);
    }
  },
};
