import MenuItem from '../models/MenuItem.js';
import { storageService } from '../services/storageService.js';

/**
 * Read the add-on list from a multipart form body.
 *
 * The form sends it as a JSON string because multipart cannot carry nested
 * arrays. Returns null when the field is absent, so a partial update leaves
 * existing extras alone rather than wiping them.
 */
const parseAddOns = (body) => {
  if (body.addOns === undefined) return null;

  let parsed;
  try {
    parsed = typeof body.addOns === 'string' ? JSON.parse(body.addOns) : body.addOns;
  } catch {
    throw new Error('addOns must be valid JSON.');
  }
  if (!Array.isArray(parsed)) throw new Error('addOns must be a list.');

  return parsed
    .map(a => ({
      label: String(a.label ?? '').trim().slice(0, 60),
      price: Math.max(0, parseFloat(a.price) || 0),
      maxQuantity: Math.min(20, Math.max(1, parseInt(a.maxQuantity, 10) || 5)),
      enabled: a.enabled === undefined ? true : Boolean(a.enabled),
    }))
    // A nameless extra is a half-filled row, not something to save.
    .filter(a => a.label.length > 0);
};

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
        addOns: parseAddOns(req.body) || [],
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

      const addOns = parseAddOns(req.body);
      if (addOns) item.addOns = addOns;

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

  // Admin: flip one extra on or off after the item already exists
  async updateAddOn(req, res) {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });

    const addOn = item.addOns.id(req.params.addOnId);
    if (!addOn) return res.status(404).json({ success: false, message: 'Add-on not found on this item.' });

    addOn.enabled = Boolean(req.body.enabled);
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
