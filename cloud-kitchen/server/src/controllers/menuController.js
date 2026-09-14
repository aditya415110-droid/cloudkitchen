import MenuItem from '../models/MenuItem.js';
import { storageService } from '../services/storageService.js';

export const menuController = {
  // Public: get all available menu items
  async getAll(req, res) {
    const items = await MenuItem.find({ isAvailable: true });
    res.json({ success: true, data: items });
  },

  // Public: get single menu item
  async getById(req, res) {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
    res.json({ success: true, data: item });
  },

  // Admin: get all items including unavailable
  async adminGetAll(req, res) {
    const items = await MenuItem.find();
    res.json({ success: true, data: items });
  },

  // Admin: create menu item
  async create(req, res) {
    try {
      const { name, description, category, price } = req.body;
      const item = new MenuItem({
        name,
        description,
        category,
        price: parseFloat(price),
        images: [],
      });

      // Upload images if provided
      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(file =>
          storageService.uploadImage(file, item._id.toString())
        );
        item.images = await Promise.all(uploadPromises);
      }

      await item.save();
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      console.error('Create menu item error:', error);
      // Surface the real reason: a generic message leaves the admin with no way
      // to tell a storage rejection from a validation problem.
      res.status(500).json({
        success: false,
        message: `Failed to create menu item: ${error.message}`,
      });
    }
  },

  // Admin: update menu item
  async update(req, res) {
    try {
      const item = await MenuItem.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

      const { name, description, category, price, removeImages } = req.body;
      if (name) item.name = name;
      if (description) item.description = description;
      if (category) item.category = category;
      if (price !== undefined) item.price = parseFloat(price);

      // Remove specified images
      if (removeImages) {
        const toRemove = JSON.parse(removeImages);
        for (const path of toRemove) {
          await storageService.deleteImage(path);
          item.images = item.images.filter(img => img.path !== path);
        }
      }

      // Upload new images
      if (req.files && req.files.length > 0) {
        if (item.images.length + req.files.length > 3) {
          return res.status(400).json({ success: false, message: 'Maximum 3 images per item.' });
        }
        const uploadPromises = req.files.map(file =>
          storageService.uploadImage(file, item._id.toString())
        );
        const newImages = await Promise.all(uploadPromises);
        item.images.push(...newImages);
      }

      await item.save();
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Update menu item error:', error);
      res.status(500).json({
        success: false,
        message: `Failed to update menu item: ${error.message}`,
      });
    }
  },

  // Admin: toggle availability
  async updateStatus(req, res) {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

    item.isAvailable = req.body.isAvailable;
    await item.save();
    res.json({ success: true, data: item });
  },

  // Admin: soft delete
  async delete(req, res) {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

    item.isDeleted = true;
    item.isAvailable = false;
    await item.save();
    res.json({ success: true, message: 'Menu item deleted.' });
  },
};
