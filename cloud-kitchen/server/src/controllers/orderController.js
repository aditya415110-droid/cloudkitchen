import Order from '../models/Order.js';
import MenuItem from '../models/MenuItem.js';
import { generateOrderId, generateQrToken } from '../utils/generateOrderId.js';
import { qrService } from '../services/qrService.js';
import { emailService } from '../services/emailService.js';
import Settings from '../models/Settings.js';
import Coupon from '../models/Coupon.js';
import { resolveCoupon } from './couponController.js';
import { getOpenState } from '../utils/openingHours.js';

export const orderController = {
  // Customer: place order
  async create(req, res) {
    try {
      const { items, couponCode } = req.body; // items: [{menuItemId, quantity}]

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
      }

      // Refuse orders outside the admin-configured opening hours.
      const settings = await Settings.getSettings();
      const openState = getOpenState(settings);
      if (!openState.isOpen) {
        return res.status(409).json({
          success: false,
          message: openState.reason || 'The kitchen is currently closed. Please order during opening hours.',
        });
      }

      // Validate & get current prices from DB
      const menuItemIds = items.map(i => i.menuItemId);
      const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, isAvailable: true, isDeleted: false });

      if (menuItems.length !== menuItemIds.length) {
        return res.status(400).json({ success: false, message: 'Some items are unavailable or do not exist.' });
      }

      const menuMap = new Map(menuItems.map(m => [m._id.toString(), m]));

      // Build order items with server-side prices
      const orderItems = items.map(item => {
        const menuItem = menuMap.get(item.menuItemId);
        return {
          menuItemId: menuItem._id,
          name: menuItem.name,        // snapshot
          price: menuItem.price,      // snapshot from DB, NOT from client
          quantity: Math.max(1, Math.floor(item.quantity)),
        };
      });

      const subtotal = Math.round(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

      // Re-validate the coupon server-side; the client's quoted discount is never trusted.
      let discountAmount = 0;
      let couponSnapshot = { code: null, discountType: null, discountValue: 0 };
      let appliedCoupon = null;

      if (couponCode) {
        const result = await resolveCoupon(couponCode, subtotal, req.user);
        if (!result.ok) {
          return res.status(400).json({ success: false, message: result.message });
        }
        appliedCoupon = result.coupon;
        discountAmount = result.discount;
        couponSnapshot = {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: appliedCoupon.discountValue,
        };
      }

      const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

      const order = await Order.create({
        orderId: generateOrderId(),
        customerId: req.user._id,
        customerEmail: req.user.email,
        customerName: req.user.name,
        items: orderItems,
        subtotal,
        coupon: couponSnapshot,
        discountAmount,
        totalAmount,
        qrToken: generateQrToken(),
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // default 30 min
      });

      if (appliedCoupon) {
        await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } });
      }

      // Generate QR data URL for response
      const qrDataUrl = await qrService.generateQrDataUrl(order.qrToken);

      // Notify the customer and the kitchen (non-blocking; a mail failure must
      // never fail the order that was already written).
      emailService.sendOrderConfirmation(order).then(sent => {
        if (sent) {
          Order.updateOne({ _id: order._id }, { 'emailsSent.confirmation': true }).exec();
        }
      }).catch(err => console.error('Order confirmation email error:', err.message));

      emailService.sendNewOrderAdminNotification(order).then(sent => {
        if (sent) {
          Order.updateOne({ _id: order._id }, { 'emailsSent.adminNewOrder': true }).exec();
        }
      }).catch(err => console.error('Admin new-order email error:', err.message));

      // Emit to admin room
      const io = req.app.get('io');
      if (io) io.to('admin').emit('newOrder', { orderId: order.orderId });

      res.status(201).json({
        success: true,
        data: { ...order.toObject(), qrDataUrl },
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ success: false, message: 'Failed to create order.' });
    }
  },

  // Customer: get own orders
  async getMyOrders(req, res) {
    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-qrToken');
    res.json({ success: true, data: orders });
  },

  // Customer: get single order
  async getById(req, res) {
    const order = await Order.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const qrDataUrl = await qrService.generateQrDataUrl(order.qrToken);
    res.json({ success: true, data: { ...order.toObject(), qrDataUrl } });
  },

  // Admin: get all orders
  async adminGetAll(req, res) {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
      ];
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  },

  // Admin: get single order
  async adminGetById(req, res) {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, data: order });
  },

  // Admin: update order status
  async updateStatus(req, res) {
    const { status } = req.body;
    const validStatuses = Order.ORDER_STATUSES;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a cancelled order.' });
    }
    if (order.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot modify a completed order.' });
    }

    order.status = status;

    // Send ready notification (only once)
    if (status === 'READY_FOR_PICKUP' && !order.emailsSent.ready) {
      emailService.sendOrderReadyNotification(order).then(sent => {
        if (sent) {
          Order.updateOne({ _id: order._id }, { 'emailsSent.ready': true }).exec();
        }
      });
    }

    if (status === 'COMPLETED') {
      order.completedAt = new Date();
      order.qrUsed = true;
    }

    await order.save();

    // Real-time update to customer
    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('orderUpdate', {
        orderId: order.orderId,
        status: order.status,
        estimatedPickupTime: order.estimatedPickupTime,
      });
      io.to('admin').emit('orderStatusChanged', { orderId: order.orderId, status });
    }

    res.json({ success: true, data: order });
  },

  // Admin: update estimated pickup time
  async updateEstimatedTime(req, res) {
    const { estimatedPickupTime } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (['CANCELLED', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot modify this order.' });
    }

    order.estimatedPickupTime = new Date(estimatedPickupTime);
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('orderUpdate', {
        orderId: order.orderId,
        status: order.status,
        estimatedPickupTime: order.estimatedPickupTime,
      });
    }

    res.json({ success: true, data: order });
  },

  // Admin: cancel order
  async cancel(req, res) {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed order.' });
    }
    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled.' });
    }

    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.email;
    order.qrUsed = true; // invalidate QR

    // Give the coupon use back so the customer can redeem it again.
    if (order.coupon?.code) {
      await Coupon.updateOne({ code: order.coupon.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    }

    if (!order.emailsSent.cancellation) {
      emailService.sendOrderCancellationNotification(order).then(sent => {
        if (sent) {
          Order.updateOne({ _id: order._id }, { 'emailsSent.cancellation': true }).exec();
        }
      });
    }

    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('orderUpdate', {
        orderId: order.orderId,
        status: 'CANCELLED',
      });
      io.to('admin').emit('orderStatusChanged', { orderId: order.orderId, status: 'CANCELLED' });
    }

    res.json({ success: true, data: order });
  },

  // Admin: complete order (pickup)
  async complete(req, res) {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cannot complete a cancelled order.' });
    }
    if (order.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed.' });
    }

    order.status = 'COMPLETED';
    order.completedAt = new Date();
    order.qrUsed = true;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order._id}`).emit('orderUpdate', { orderId: order.orderId, status: 'COMPLETED' });
      io.to('admin').emit('orderStatusChanged', { orderId: order.orderId, status: 'COMPLETED' });
    }

    res.json({ success: true, data: order });
  },

  // Public: render an order's QR as a PNG.
  //
  // Email clients cannot display inline cid: attachments consistently (Brevo's
  // HTTP API has no cid support at all), so order emails point their <img> here.
  // The token is the pickup secret, but anyone holding it already has the email
  // that contains it; rendering it as an image leaks nothing further, and
  // redeeming it still requires an authenticated admin.
  async qrImage(req, res) {
    const token = String(req.params.token || '').replace(/\.png$/i, '');
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Invalid QR token.' });
    }

    const order = await Order.findOne({ qrToken: token }).select('_id');
    if (!order) return res.status(404).json({ success: false, message: 'Unknown QR token.' });

    const buffer = await qrService.generateQrBuffer(token);
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': buffer.length,
      // Safe to cache in the recipient's client; never in a shared proxy.
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.send(buffer);
  },

  // Admin: verify QR code
  async verifyQr(req, res) {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ success: false, message: 'QR token is required.' });

    const order = await Order.findOne({ qrToken });
    if (!order) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This order has been cancelled.', data: order });
    }
    if (order.qrUsed || order.status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'This QR code has already been used.', data: order });
    }

    res.json({ success: true, data: order });
  },
};
