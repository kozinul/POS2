import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Tax } from '../models/Tax';
import { PaymentMethod } from '../models/PaymentMethod';
import { Member } from '../models/Member';
import { Promotion } from '../models/Promotion';
import { User } from '../models/User';
import { Closing } from '../models/Closing';
import { calculateCartPromotions, CartItem } from '../services/promotionEngine';

export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const { items, paymentMethod, cashAmount, cardLastFour, promoCode, memberId, tableNumber, customerName, outlet: outletId } = req.body;

    const pm = await PaymentMethod.findById(paymentMethod);
    if (!pm) return res.status(400).json({ message: 'Payment method not found' });

    // Validate outlet
    const cashierUser = await User.findById(req.user!.id).populate('outlets', 'name');
    if (!cashierUser) return res.status(404).json({ message: 'User not found' });

    const userOutlets = cashierUser.outlets as any as { _id: string; name: string }[];
    let outletName = '';
    if (req.user!.role === 'admin') {
      // Admin can set any outlet
      if (outletId) {
        const outlet = userOutlets.find((o) => String(o._id) === outletId);
        outletName = outlet?.name || '';
      }
    } else {
      // Cashier must pick from their assigned outlets
      if (!outletId) return res.status(400).json({ message: 'Outlet harus dipilih' });
      const outlet = userOutlets.find((o) => String(o._id) === outletId);
      if (!outlet) return res.status(403).json({ message: 'Anda tidak memiliki akses ke outlet ini' });
      outletName = outlet.name;
    }

    // Cek shift aktif untuk cashier
    if (req.user!.role === 'cashier') {
      const activeShift = await Closing.findOne({
        cashier: req.user!.id,
        outlet: outletId,
        status: 'open',
      });
      if (!activeShift) {
        return res.status(400).json({ message: 'Tidak ada shift aktif. Buka shift dulu.' });
      }
    }

    let subtotal = 0;
    const orderItems = [];
    const cartItems: CartItem[] = [];

    // Fetch all active taxes
    const activeTaxes = await Tax.find({ active: true });

    const orderProducts: any[] = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate(['category', 'taxes.tax']);
      if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });
      if (product.stock < item.qty) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const lineTotal = product.price * item.qty;
      subtotal += lineTotal;
      orderItems.push({
        product: product._id,
        qty: item.qty,
        price: product.price,
        subtotal: lineTotal,
      });
      const cat = product.category as any;
      cartItems.push({
        product: {
          _id: String(product._id),
          name: product.name,
          price: product.price,
          category: cat?._id ? String(cat._id) : String(product.category),
        },
        qty: item.qty,
      });
      orderProducts.push(product);
    }

    const cashierName = cashierUser.name;

    // Look up member if provided (before promo calc, for member-based promos)
    let customerCtx: { id: string; name: string; tier?: string; totalOrders?: number; totalSpend?: number } | undefined;
    let memberData: any = null;
    if (memberId) {
      memberData = await Member.findById(memberId);
      if (memberData) {
        customerCtx = {
          id: String(memberData._id),
          name: memberData.name,
          tier: memberData.tier,
          totalOrders: memberData.totalOrders,
          totalSpend: memberData.totalSpend,
        };
      }
    }

    // Calculate promotions first to determine DPP
    let totalDiscount = 0;
    let totalFreeItems: { productId: string; qty: number }[] = [];
    let promoBreakdown: { name: string; code: string; discount: number; freeItems?: { productId: string; qty: number }[] }[] = [];

    if (promoCode) {
      const promoResult = await calculateCartPromotions({
        cart: { items: cartItems, subtotal, total: subtotal },
        customer: customerCtx,
        paymentMethodId: paymentMethod,
        outletId,
        date: new Date(),
      }, promoCode);
      totalDiscount = promoResult.totalDiscount;
      totalFreeItems = promoResult.totalFreeItems;
      promoBreakdown = promoResult.breakdown;
    }

    const dpp = Math.max(0, subtotal - totalDiscount);

    // Per-item tax: calculated on DPP (discounted subtotal)
    let taxTotal = 0;
    const taxDetails = activeTaxes.map((t) => {
      let amount = 0;
      let included = false;
      for (const item of items) {
        const p = orderProducts.find((x) => String(x._id) === item.product);
        if (!p) continue;
        const pt = (p.taxes || []).find((x: any) => x.tax && String(x.tax._id) === String(t._id));
        const itemTotal = p.price * item.qty;
        const itemDpp = Math.max(0, itemTotal - Math.round(totalDiscount * itemTotal / subtotal));
        if (pt && pt.included) {
          included = true;
          amount += Math.round(itemDpp * t.rate / (100 + t.rate));
        } else {
          const tax = Math.round(itemDpp * t.rate / 100);
          amount += tax;
          taxTotal += tax;
        }
      }
      return { name: t.name, rate: t.rate, amount, included };
    });

    // Apply promotion modifications (e.g., special_price)
    for (const cartItem of cartItems) {
      const mod = totalFreeItems.find((f) => f.productId === cartItem.product._id);
      if (mod) {
        orderItems.push({
          product: cartItem.product._id as any,
          qty: mod.qty,
          price: 0,
          subtotal: 0,
        });
      }
    }

    const totalAfterDiscount = dpp + taxTotal;

    let change: number | undefined;
    if (pm.type === 'cash' && cashAmount) {
      change = cashAmount - totalAfterDiscount;
      if (change < 0) return res.status(400).json({ message: 'Insufficient cash amount' });
    }

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const todayCount = await Order.countDocuments({
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      },
    });
    const orderNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;

    const order = await Order.create({
      orderNumber,
      items: orderItems,
      total: totalAfterDiscount,
      subtotal,
      taxTotal,
      taxDetails,
      discountTotal: totalDiscount,
      promotions: promoBreakdown,
      paymentMethod: pm._id,
      paymentMethodCode: pm.code,
      paymentMethodName: pm.name,
      cashAmount: pm.type === 'cash' ? cashAmount : undefined,
      change,
      cardLastFour: pm.requiresCardLastFour ? cardLastFour : undefined,
      cashier: req.user!.id,
      cashierName,
      outlet: outletId || undefined,
      outletName,
      member: memberData?._id,
      memberName: memberData?.name,
      memberTier: memberData?.tier,
      tableNumber: tableNumber || undefined,
      customerName: customerName || undefined,
    });

    // Update member stats
    if (memberData) {
      await Member.findByIdAndUpdate(memberData._id, {
        $inc: { totalOrders: 1, totalSpend: totalAfterDiscount },
      });
    }

    // Increment promo usage count
    if (promoBreakdown.length > 0) {
      for (const p of promoBreakdown) {
        await Promotion.findOneAndUpdate({ code: p.code }, { $inc: { usedCount: 1 } });
      }
    }

    for (const item of orderItems) {
      if (item.price > 0) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    const populated = await order.populate(['items.product', 'paymentMethod', 'cashier', 'member']);
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOrders(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, outlet, cashier, search, page = '1', limit = '20' } = req.query;
    const filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (outlet) filter.outlet = outlet;
    if (cashier) filter.cashier = cashier;

    if (req.user!.role === 'cashier') {
      filter.cashier = req.user!.id;
    }

    if (search) {
      const s = String(search);
      const $or = [
        { orderNumber: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { cashierName: { $regex: s, $options: 'i' } },
        { memberName: { $regex: s, $options: 'i' } },
        { tableNumber: { $regex: s, $options: 'i' } },
        { 'items.product': { $in: [] as string[] } },
      ];

      // Also search by product names
      if (s.length >= 2) {
        const products = await Product.find({ name: { $regex: s, $options: 'i' } }).select('_id');
        const productIds = products.map((p) => String(p._id));
        if (productIds.length > 0) {
          $or.push({ 'items.product': { $in: productIds } });
        }
      }

      filter.$or = $or.filter((cond) => {
        if (cond['items.product'] && '$in' in cond['items.product'] && (cond['items.product'] as any).$in.length === 0) return false;
        return true;
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(['items.product', 'paymentMethod', 'cashier'])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOrder(req: AuthRequest, res: Response) {
  try {
    const order = await Order.findById(req.params.id).populate(['items.product', 'paymentMethod', 'cashier']);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getDailyReport(_req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;

    res.json({ date: today.toISOString().split('T')[0], totalRevenue, totalOrders });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function voidOrder(req: AuthRequest, res: Response) {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'voided') return res.status(400).json({ message: 'Order sudah di-void' });

    // Restore stock for each item (skip already-voided items)
    for (const item of order.items) {
      const alreadyVoidedQty = (order.voidedItems || [])
        .filter((vi) => String(vi.itemId) === String((item as any)._id))
        .reduce((s, vi) => s + vi.qty, 0);
      const remainingQty = item.qty - alreadyVoidedQty;
      if (remainingQty > 0 && item.price > 0) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: remainingQty } });
      }
    }

    await Order.findByIdAndUpdate(req.params.id, {
      $set: {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: req.user!.id,
        voidReason: reason || '',
      },
    });

    const updated = await Order.findById(req.params.id).populate(['items.product', 'paymentMethod', 'cashier']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function voidItem(req: AuthRequest, res: Response) {
  try {
    const { itemId, qty, reason } = req.body;
    const order = await Order.findById(req.params.id).populate<{ items: any[] }>('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'voided') return res.status(400).json({ message: 'Order sudah di-void' });

    const orderItem = order.items.find((i) => String(i._id) === itemId);
    if (!orderItem) return res.status(404).json({ message: 'Item tidak ditemukan di order' });

    const voidQty = qty || orderItem.qty;
    if (voidQty <= 0) return res.status(400).json({ message: 'Qty void harus lebih dari 0' });

    // Check how many of this item are already voided
    const alreadyVoided = order.voidedItems
      ?.filter((vi) => String(vi.itemId) === itemId)
      ?.reduce((s, vi) => s + vi.qty, 0) || 0;
    const remainingAvail = orderItem.qty - alreadyVoided;
    if (voidQty > remainingAvail) {
      return res.status(400).json({ message: `Hanya ${remainingAvail} item tersisa untuk di-void` });
    }

    const user = await User.findById(req.user!.id);
    const voidedEntry = {
      itemId: orderItem._id,
      product: orderItem.product._id,
      productName: (orderItem.product as any)?.name || '',
      qty: voidQty,
      price: orderItem.price,
      reason: reason || '',
      voidedAt: new Date(),
      voidedBy: req.user!.id,
      voidedByName: user?.name || '',
    };

    order.voidedItems = [...(order.voidedItems || []), voidedEntry as any];

    // Determine new status
    const allFullyVoided = order.items.every((item) => {
      const voided = order.voidedItems
        ?.filter((vi) => String(vi.itemId) === String(item._id))
        ?.reduce((s, vi) => s + vi.qty, 0) || 0;
      return voided >= item.qty;
    });
    order.status = allFullyVoided ? 'voided' : 'partially-voided';

    await order.save();

    // Restore stock
    if (orderItem.price > 0) {
      await Product.findByIdAndUpdate(orderItem.product._id, { $inc: { stock: voidQty } });
    }

    const updated = await Order.findById(order._id).populate(['items.product', 'paymentMethod', 'cashier', 'voidedItems.voidedBy']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function reopenOrder(req: AuthRequest, res: Response) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'voided') return res.status(400).json({ message: 'Hanya order yang di-void bisa dibuka ulang' });

    // Restore stock back (re-consume)
    for (const item of order.items) {
      if (item.price > 0) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    // Clear void data
    order.status = 'completed';
    order.voidedAt = undefined;
    order.voidedBy = undefined;
    order.voidReason = undefined;
    order.voidedItems = [];
    await order.save();

    const updated = await Order.findById(order._id).populate(['items.product', 'paymentMethod', 'cashier']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
