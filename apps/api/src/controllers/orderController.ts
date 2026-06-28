import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { PaymentMethod } from '../models/PaymentMethod';
import { Member } from '../models/Member';
import { Promotion } from '../models/Promotion';
import { User } from '../models/User';
import { Closing } from '../models/Closing';
import { calculateCartPromotions, CartItem } from '../services/promotionEngine';
import { calculateTaxes, TaxLineItem } from '../services/taxEngine';
import { calculatePayment, calculateSplitPayment, loadRoundingConfig, InvoiceTotals, PaymentAllocation } from '../services/paymentEngine';

export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const { items, paymentMethod, paymentMethods, cashAmount, cardLastFour, promoCode, memberId, tableNumber, customerName, outlet: outletId, transactionType, status, splitGroup, splitIndex, closeOpenBillId } = req.body;
    const isOpen = status === 'open';

    const isSplitPayment = !isOpen && Array.isArray(paymentMethods) && paymentMethods.length > 0;

    // ─── Open bill: skip payment validation ──────────────────────────────
    if (!isOpen && !isSplitPayment && !paymentMethod) {
      return res.status(400).json({ message: 'Payment method required' });
    }

    if (!isOpen) {
      if (isSplitPayment) {
        for (const pmAlloc of paymentMethods) {
          const pm = await PaymentMethod.findById(pmAlloc.paymentMethodId);
          if (!pm) return res.status(400).json({ message: `Payment method ${pmAlloc.paymentMethodId} not found` });
        }
      } else {
        const pm = await PaymentMethod.findById(paymentMethod);
        if (!pm) return res.status(400).json({ message: 'Payment method not found' });
      }
    }
    await loadRoundingConfig();

    const cashierUser = await User.findById(req.user!.id).populate('outlets', 'name');
    if (!cashierUser) return res.status(404).json({ message: 'User not found' });

    const userOutlets = cashierUser.outlets as any as { _id: string; name: string }[];
    let outletName = '';
    if (req.user!.role === 'admin') {
      if (outletId) {
        const outlet = userOutlets.find((o) => String(o._id) === outletId);
        outletName = outlet?.name || '';
      }
    } else {
      if (!outletId) return res.status(400).json({ message: 'Outlet harus dipilih' });
      const outlet = userOutlets.find((o) => String(o._id) === outletId);
      if (!outlet) return res.status(403).json({ message: 'Anda tidak memiliki akses ke outlet ini' });
      outletName = outlet.name;
    }

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
    const taxLineItems: TaxLineItem[] = [];
    const orderProducts: any[] = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate(['category', 'taxes.tax']);
      if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });
      if (product.stockManagement && product.stock < item.qty) {
        return res.status(400).json({ message: `Stok ${product.name} tidak mencukupi` });
      }

      const modTotal = (item.modifiers || []).reduce((s: number, m: any) => s + (m.price || 0), 0);
      const effectivePrice = product.price + modTotal;
      const lineTotal = effectivePrice * item.qty;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        qty: item.qty,
        price: effectivePrice,
        subtotal: lineTotal,
        modifiers: item.modifiers || [],
      });

      const cat = product.category as any;
      cartItems.push({
        product: {
          _id: String(product._id),
          name: product.name,
          price: effectivePrice,
          category: cat?._id ? String(cat._id) : String(product.category),
        },
        qty: item.qty,
      });

      const productTaxes = (product as any).taxes || [];
      const taxOverrides = productTaxes
        .filter((pt: any) => pt.tax && pt.included !== undefined)
        .map((pt: any) => ({
          taxId: String(pt.tax._id || pt.tax),
          included: pt.included,
        }));

      taxLineItems.push({
        productId: String(product._id),
        productName: product.name,
        qty: item.qty,
        unitPrice: effectivePrice,
        modifiersTotal: modTotal,
        lineTotal,
        categoryId: cat?._id ? String(cat._id) : undefined,
        categoryName: cat?.name || undefined,
        productTaxOverrides: taxOverrides.length > 0 ? taxOverrides : undefined,
      });

      orderProducts.push(product);
    }

    const cashierName = cashierUser.name;

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

    // Tax calculation using TaxEngine
    const taxResult = await calculateTaxes({
      items: taxLineItems,
      subtotal,
      discountTotal: totalDiscount,
      transactionType: transactionType || undefined,
      outletId: outletId || undefined,
      customerTier: customerCtx?.tier,
      date: new Date(),
    });

    const { taxTotalExcluded, taxDetails, grandTotal } = taxResult;

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

    // ─── Open bill: skip payment engine ──────────────────────────────────────
    if (isOpen) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const todayCount = await Order.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      });
      let orderNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;
      if (splitGroup && splitIndex) {
        orderNumber = `${orderNumber}/${splitIndex}`;
      }

      const serializedTaxDetails = taxDetails.map(td => ({
        taxId: td.taxId,
        taxCode: td.taxCode,
        name: td.taxName,
        rate: td.rate,
        effectiveRate: td.effectiveRate,
        dppType: td.dppType,
        dppFraction: td.dppFraction,
        dppAmount: td.dppAmount,
        taxableAmount: td.taxableAmount,
        amount: td.taxAmount,
        amountRounded: td.taxAmountRounded,
        included: td.included,
        taxExcludedRounded: td.taxExcludedRounded,
        taxIncludedRounded: td.taxIncludedRounded,
        rounding: td.rounding,
        roundingPrecision: td.roundingPrecision,
        perItem: td.perItem.map(pi => ({
          productId: pi.productId,
          productName: pi.productName,
          dpp: pi.dpp,
          taxAmount: pi.taxAmount,
          included: pi.included,
        })),
      }));

      const order = await Order.create({
        orderNumber,
        items: orderItems,
        cashier: req.user!.id,
        cashierName,
        outlet: outletId,
        outletName,
        member: memberData?._id,
        memberName: memberData?.name,
        memberTier: memberData?.tier,
        tableNumber: tableNumber || undefined,
        customerName: customerName || undefined,
        transactionType: transactionType || undefined,
        subtotal,
        discountTotal: totalDiscount,
        dppTotal: dpp,
        taxTotal: taxTotalExcluded,
        taxDetails: serializedTaxDetails,
        promotions: promoBreakdown,
        total: grandTotal,
        originalTotal: grandTotal,
        roundedPayable: grandTotal,
        roundingAdjustment: 0,
        roundingMethod: 'no_rounding',
        status: 'open',
      });

      return res.status(201).json(order);
    }

    // ─── Payment Engine ──────────────────────────────────────────────────────
    const invoiceTotals: InvoiceTotals = {
      subtotal,
      discountTotal: totalDiscount,
      serviceCharge: 0,
      serviceChargeRate: 0,
      taxTotalExcluded,
      taxTotalIncluded: 0,
      grandTotal,
    };

    let originalTotal: number;
    let roundedPayable: number;
    let roundingAdjustment: number;
    let roundingMethod: string;
    let cashReceived: number;
    let change: number;
    let paymentBreakdown: any[];
    let primaryPaymentMethodId: any;
    let primaryPaymentMethodCode: string;
    let primaryPaymentMethodName: string;

    if (isSplitPayment) {
      const pmDocs = await PaymentMethod.find({ _id: { $in: paymentMethods.map((p: any) => p.paymentMethodId) } });
      const pmMap = new Map(pmDocs.map((p) => [String(p._id), p]));

      const allocations: PaymentAllocation[] = paymentMethods.map((p: any) => {
        const pm = pmMap.get(p.paymentMethodId)!;
        return {
          paymentMethodId: p.paymentMethodId,
          paymentMethodCode: pm.code,
          paymentMethodName: pm.name,
          type: pm.type,
          amount: Number(p.amount),
          cardLastFour: pm.requiresCardLastFour ? p.cardLastFour : undefined,
        };
      });

      const splitResult = calculateSplitPayment(invoiceTotals, allocations);
      if (splitResult.isUnderpayment) {
        return res.status(400).json({
          message: `Pembayaran kurang Rp ${splitResult.shortfall.toLocaleString()}`,
          shortfall: splitResult.shortfall,
          roundedPayable: splitResult.roundedPayable,
        });
      }

      originalTotal = splitResult.originalTotal;
      roundedPayable = splitResult.roundedPayable;
      roundingAdjustment = splitResult.roundingAdjustment;
      roundingMethod = splitResult.roundingMethod;
      cashReceived = splitResult.cashReceived;
      change = splitResult.change;
      paymentBreakdown = splitResult.paymentBreakdown;
      primaryPaymentMethodId = paymentMethods[0].paymentMethodId;
      primaryPaymentMethodCode = allocations[0].paymentMethodCode;
      primaryPaymentMethodName = allocations[0].paymentMethodName;
    } else {
      const pm = await PaymentMethod.findById(paymentMethod);
      if (!pm) return res.status(400).json({ message: 'Payment method not found' });

      const paymentResult = calculatePayment({
        invoice: invoiceTotals,
        paymentMethodId: String(pm._id),
        paymentMethodCode: pm.code,
        paymentMethodName: pm.name,
        cashAmount: pm.type === 'cash' ? (cashAmount ? Number(cashAmount) : undefined) : undefined,
        cardLastFour,
      });

      if (paymentResult.isUnderpayment) {
        return res.status(400).json({
          message: `Pembayaran kurang Rp ${paymentResult.shortfall.toLocaleString()}`,
          shortfall: paymentResult.shortfall,
          roundedPayable: paymentResult.roundedPayable,
        });
      }

      originalTotal = paymentResult.originalTotal;
      roundedPayable = paymentResult.roundedPayable;
      roundingAdjustment = paymentResult.roundingAdjustment;
      roundingMethod = paymentResult.roundingMethod;
      cashReceived = paymentResult.cashReceived;
      change = paymentResult.change;
      paymentBreakdown = paymentResult.paymentBreakdown;
      primaryPaymentMethodId = pm._id;
      primaryPaymentMethodCode = pm.code;
      primaryPaymentMethodName = pm.name;
    }

    // ─── Generate order number ──────────────────────────────────────────────
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    let orderNumber: string;

    if (splitGroup && splitIndex) {
      const firstInGroup = await Order.findOne({ splitGroup }).sort({ createdAt: 1 }).select('orderNumber');
      if (firstInGroup && firstInGroup.orderNumber) {
        const base = firstInGroup.orderNumber.replace(/\/\d+$/, '');
        orderNumber = `${base}/${splitIndex}`;
      } else {
        const todayCount = await Order.countDocuments({
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        });
        orderNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(4, '0')}/${splitIndex}`;
      }
    } else {
      const todayCount = await Order.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      });
      orderNumber = `INV-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;
    }

    const serializedTaxDetails = taxDetails.map(td => ({
      taxId: td.taxId,
      taxCode: td.taxCode,
      name: td.taxName,
      rate: td.rate,
      effectiveRate: td.effectiveRate,
      dppType: td.dppType,
      dppFraction: td.dppFraction,
      dppAmount: td.dppAmount,
      taxableAmount: td.taxableAmount,
      amount: td.taxAmount,
      amountRounded: td.taxAmountRounded,
      included: td.included,
      taxExcludedRounded: td.taxExcludedRounded,
      taxIncludedRounded: td.taxIncludedRounded,
      rounding: td.rounding,
      roundingPrecision: td.roundingPrecision,
      perItem: td.perItem.map(pi => ({
        productId: pi.productId,
        productName: pi.productName,
        dpp: pi.dpp,
        taxAmount: pi.taxAmount,
        included: pi.included,
      })),
    }));

    const serializedPaymentBreakdown = paymentBreakdown.map(pb => ({
      paymentMethodId: pb.paymentMethodId,
      paymentMethodCode: pb.paymentMethodCode,
      paymentMethodName: pb.paymentMethodName,
      amount: pb.amount,
      roundedAmount: pb.roundedAmount,
      type: pb.type,
    }));

    // Determine if there's any cash in the split for cashAmount/change fields
    const hasCashPayment = paymentBreakdown.some((pb: any) => pb.type === 'cash');
    const firstCardEntry = isSplitPayment
      ? paymentMethods.find((p: any) => p.cardLastFour)
      : null;

    const order = await Order.create({
      orderNumber,
      items: orderItems,
      total: roundedPayable,
      originalTotal,
      roundedPayable,
      roundingAdjustment,
      roundingMethod,
      subtotal,
      dppTotal: dpp,
      taxTotal: taxTotalExcluded,
      taxDetails: serializedTaxDetails,
      discountTotal: totalDiscount,
      promotions: promoBreakdown,
      paymentMethod: primaryPaymentMethodId,
      paymentMethodCode: primaryPaymentMethodCode,
      paymentMethodName: primaryPaymentMethodName,
      paymentBreakdown: serializedPaymentBreakdown,
      cashAmount: hasCashPayment ? cashReceived : undefined,
      change: hasCashPayment ? change : undefined,
      cardLastFour: firstCardEntry?.cardLastFour || cardLastFour,
      cashier: req.user!.id,
      cashierName,
      outlet: outletId || undefined,
      outletName,
      member: memberData?._id,
      memberName: memberData?.name,
      memberTier: memberData?.tier,
      tableNumber: tableNumber || undefined,
      customerName: customerName || undefined,
      transactionType: transactionType || undefined,
      splitGroup: splitGroup || undefined,
      splitIndex: splitIndex || undefined,
    });

    if (memberData) {
      await Member.findByIdAndUpdate(memberData._id, {
        $inc: { totalOrders: 1, totalSpend: originalTotal },
      });
    }

    if (promoBreakdown.length > 0) {
      for (const p of promoBreakdown) {
        await Promotion.findOneAndUpdate({ code: p.code }, { $inc: { usedCount: 1 } });
      }
    }

    for (const item of orderItems) {
      if (item.price > 0) {
        const prod = await Product.findById(item.product).select('stockManagement');
        if (prod && prod.stockManagement) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
        }
      }
    }

    if (closeOpenBillId) {
      await Order.findByIdAndUpdate(closeOpenBillId, { status: 'completed' });
    }

    const populated = await order.populate(['items.product', 'paymentMethod', 'cashier', 'member']);
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getOrders(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, outlet, cashier, search, status, page = '1', limit = '20' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;

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

export async function closeOpenBill(req: AuthRequest, res: Response) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'open') return res.status(400).json({ message: 'Order is not an open bill' });

    order.status = 'completed';
    await order.save();

    res.json({ message: 'Open bill closed', order });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function payOpenBill(req: AuthRequest, res: Response) {
  try {
    const { paymentMethod, cashAmount, cardLastFour } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'open') return res.status(400).json({ message: 'Order is not an open bill' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });

    const pm = await PaymentMethod.findById(paymentMethod);
    if (!pm) return res.status(400).json({ message: 'Payment method not found' });

    await loadRoundingConfig();

    const invoiceTotals: InvoiceTotals = {
      subtotal: order.subtotal || 0,
      discountTotal: order.discountTotal || 0,
      serviceCharge: order.serviceCharge || 0,
      serviceChargeRate: order.serviceChargeRate || 0,
      taxTotalExcluded: order.taxTotal || 0,
      taxTotalIncluded: 0,
      grandTotal: order.total || 0,
    };

    const paymentResult = calculatePayment({
      invoice: invoiceTotals,
      paymentMethodId: String(pm._id),
      paymentMethodCode: pm.code,
      paymentMethodName: pm.name,
      cashAmount: pm.type === 'cash' ? (cashAmount ? Number(cashAmount) : undefined) : undefined,
      cardLastFour,
    });

    if (paymentResult.isUnderpayment) {
      return res.status(400).json({
        message: `Pembayaran kurang Rp ${paymentResult.shortfall.toLocaleString()}`,
        shortfall: paymentResult.shortfall,
        roundedPayable: paymentResult.roundedPayable,
      });
    }

    const serializedPaymentBreakdown = paymentResult.paymentBreakdown.map((pb: any) => ({
      paymentMethodId: pb.paymentMethodId,
      paymentMethodCode: pb.paymentMethodCode,
      paymentMethodName: pb.paymentMethodName,
      amount: pb.amount,
      roundedAmount: pb.roundedAmount,
      type: pb.type,
    }));

    order.paymentMethod = pm._id;
    order.paymentMethodCode = pm.code;
    order.paymentMethodName = pm.name;
    order.cashAmount = paymentResult.cashReceived || undefined;
    order.change = paymentResult.change || undefined;
    order.cardLastFour = cardLastFour || undefined;
    order.roundedPayable = paymentResult.roundedPayable;
    order.roundingAdjustment = paymentResult.roundingAdjustment;
    order.roundingMethod = paymentResult.roundingMethod;
    order.paymentBreakdown = serializedPaymentBreakdown as any;
    order.status = 'completed';

    await order.save();
    const populated = await Order.findById(order._id).populate(['items.product', 'paymentMethod', 'cashier']);
    res.json(populated);
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
    const { reason, supervisorId, voidedByName } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'voided') return res.status(400).json({ message: 'Order sudah di-void' });

    for (const item of order.items) {
      const alreadyVoidedQty = (order.voidedItems || [])
        .filter((vi) => String(vi.itemId) === String((item as any)._id))
        .reduce((s, vi) => s + vi.qty, 0);
      const remainingQty = item.qty - alreadyVoidedQty;
      if (remainingQty > 0 && item.price > 0) {
        const prod = await Product.findById(item.product).select('stockManagement');
        if (prod && prod.stockManagement) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: remainingQty } });
        }
      }
    }

    const voidedById = supervisorId || req.user!.id;

    await Order.findByIdAndUpdate(req.params.id, {
      $set: {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: voidedById,
        voidedByName: voidedByName || '',
        voidReason: reason || '',
      },
    });

    const updated = await Order.findById(req.params.id).populate(['items.product', 'paymentMethod', 'cashier', 'voidedBy']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function voidItem(req: AuthRequest, res: Response) {
  try {
    const { itemId, qty, reason, supervisorId, voidedByName } = req.body;
    const order = await Order.findById(req.params.id).populate<{ items: any[] }>('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'voided') return res.status(400).json({ message: 'Order sudah di-void' });

    const orderItem = order.items.find((i) => String(i._id) === itemId);
    if (!orderItem) return res.status(404).json({ message: 'Item tidak ditemukan di order' });

    const voidQty = qty || orderItem.qty;
    if (voidQty <= 0) return res.status(400).json({ message: 'Qty void harus lebih dari 0' });

    const alreadyVoided = order.voidedItems
      ?.filter((vi) => String(vi.itemId) === itemId)
      ?.reduce((s, vi) => s + vi.qty, 0) || 0;
    const remainingAvail = orderItem.qty - alreadyVoided;
    if (voidQty > remainingAvail) {
      return res.status(400).json({ message: `Hanya ${remainingAvail} item tersisa untuk di-void` });
    }

    const voidedById = supervisorId || req.user!.id;
    const voidedByNameValue = voidedByName || '';

    const voidedEntry = {
      itemId: orderItem._id,
      product: orderItem.product._id,
      productName: (orderItem.product as any)?.name || '',
      qty: voidQty,
      price: orderItem.price,
      reason: reason || '',
      voidedAt: new Date(),
      voidedBy: voidedById,
      voidedByName: voidedByNameValue,
    };

    order.voidedItems = [...(order.voidedItems || []), voidedEntry as any];

    const allFullyVoided = order.items.every((item) => {
      const voided = order.voidedItems
        ?.filter((vi) => String(vi.itemId) === String(item._id))
        ?.reduce((s, vi) => s + vi.qty, 0) || 0;
      return voided >= item.qty;
    });
    order.status = allFullyVoided ? 'voided' : 'partially-voided';

    if (allFullyVoided) {
      order.voidedAt = new Date();
      order.voidedBy = voidedById as any;
      order.voidedByName = voidedByNameValue;
      order.voidReason = reason || '';
    }

    await order.save();

    if (orderItem.price > 0) {
      const prod = await Product.findById(orderItem.product._id).select('stockManagement');
      if (prod && prod.stockManagement) {
        await Product.findByIdAndUpdate(orderItem.product._id, { $inc: { stock: voidQty } });
      }
    }

    const updated = await Order.findById(order._id).populate(['items.product', 'paymentMethod', 'cashier', 'voidedItems.voidedBy']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function voidPayment(req: AuthRequest, res: Response) {
  try {
    const { reason, supervisorId, voidedByName } = req.body;
    const order = await Order.findById(req.params.id).populate<{ items: any[] }>('items.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'completed') return res.status(400).json({ message: 'Hanya order completed yang bisa di-void payment' });

    const voidedById = supervisorId || req.user!.id;

    for (const item of order.items) {
      const alreadyVoidedQty = (order.voidedItems || [])
        .filter((vi) => String(vi.itemId) === String((item as any)._id))
        .reduce((s, vi) => s + vi.qty, 0);
      const remainingQty = item.qty - alreadyVoidedQty;
      if (remainingQty > 0 && item.price > 0) {
        const prod = await Product.findById(item.product).select('stockManagement');
        if (prod && prod.stockManagement) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stock: remainingQty } });
        }
      }
    }

    const voidedEntries = order.items
      .filter((item) => {
        const alreadyVoided = (order.voidedItems || [])
          .filter((vi) => String(vi.itemId) === String((item as any)._id))
          .reduce((s, vi) => s + vi.qty, 0);
        return item.qty - alreadyVoided > 0;
      })
      .map((item) => ({
        itemId: (item as any)._id,
        product: item.product,
        productName: (item.product as any)?.name || '',
        qty: item.qty,
        price: item.price,
        reason: `Void payment: ${reason || ''}`,
        voidedAt: new Date(),
        voidedBy: voidedById,
        voidedByName: voidedByName || '',
      }));

    order.voidedItems = [...(order.voidedItems || []), ...voidedEntries] as any;
    order.status = 'voided';
    order.voidedAt = new Date();
    order.voidedBy = voidedById as any;
    order.voidedByName = voidedByName || '';
    order.voidReason = `Void payment: ${reason || ''}`;
    await order.save();

    const updated = await Order.findById(order._id).populate(['items.product', 'paymentMethod', 'cashier']);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
