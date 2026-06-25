import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Closing } from '../models/Closing';
import { Order } from '../models/Order';
import { User } from '../models/User';

export async function openClosing(req: AuthRequest, res: Response) {
  try {
    const { outlet, startingCash } = req.body;

    const active = await Closing.findOne({
      cashier: req.user!.id,
      outlet,
      status: 'open',
    });
    if (active) return res.status(400).json({ message: 'Sudah ada shift yang aktif' });

    const closing = await Closing.create({
      cashier: req.user!.id,
      outlet,
      startingCash: startingCash || 0,
      openedAt: new Date(),
      status: 'open',
    });

    const populated = await closing.populate(['outlet', 'cashier']);
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function pickupCash(req: AuthRequest, res: Response) {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Jumlah harus lebih dari 0' });

    const closing = await Closing.findById(req.params.id);
    if (!closing) return res.status(404).json({ message: 'Shift tidak ditemukan' });
    if (closing.status !== 'open') return res.status(400).json({ message: 'Shift sudah ditutup' });

    const user = await User.findById(req.user!.id);

    closing.cashPickups.push({
      amount,
      reason: reason || 'Tarik uang',
      pickedAt: new Date(),
      pickedBy: new mongoose.Types.ObjectId(req.user!.id),
      pickedByName: user?.name || '',
    });
    closing.totalCashPickups = (closing.totalCashPickups || 0) + amount;

    await closing.save();
    const populated = await closing.populate(['outlet', 'cashier']);
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function closeClosing(req: AuthRequest, res: Response) {
  try {
    const closing = await Closing.findById(req.params.id);
    if (!closing) return res.status(404).json({ message: 'Closing not found' });
    if (closing.status !== 'open') return res.status(400).json({ message: 'Shift sudah ditutup' });

    const { physicalCash } = req.body;

    // Hitung total penjualan selama shift ini
    const orders = await Order.find({
      cashier: req.user!.id,
      outlet: closing.outlet,
      createdAt: { $gte: closing.openedAt },
      status: { $in: ['completed', 'partially-voided'] },
    }).populate('paymentMethod');

    let totalSales = 0;
    let cashSales = 0;
    let nonCashSales = 0;
    const breakdownMap = new Map<string, { method: string; code: string; total: number }>();

    // Also get voided orders to subtract refunded amounts
    const voidedOrders = await Order.find({
      cashier: req.user!.id,
      outlet: closing.outlet,
      createdAt: { $gte: closing.openedAt },
      status: 'voided',
    });

    let voidedTotal = 0;
    for (const order of voidedOrders) {
      voidedTotal += order.total;
    }

    for (const order of orders) {
      totalSales += order.total;
      const pm = order.paymentMethod as any;
      const code = pm?.code || order.paymentMethodCode || 'UNKNOWN';
      const method = pm?.name || order.paymentMethodName || 'Unknown';

      if (code === 'CASH') {
        cashSales += order.total;
      } else {
        nonCashSales += order.total;
      }

      const existing = breakdownMap.get(code);
      if (existing) {
        existing.total += order.total;
      } else {
        breakdownMap.set(code, { method, code, total: order.total });
      }
    }

    const totalCashPickups = closing.totalCashPickups || 0;
    const expectedCash = closing.startingCash + cashSales - totalCashPickups;
    const difference = (physicalCash || 0) - expectedCash;

    closing.physicalCash = physicalCash || 0;
    closing.expectedCash = expectedCash;
    closing.difference = difference;
    closing.totalSales = totalSales;
    closing.cashSales = cashSales;
    closing.nonCashSales = nonCashSales;
    closing.totalTransactions = orders.length + voidedOrders.length;
    closing.paymentBreakdown = [...breakdownMap.values()];
    closing.closedAt = new Date();
    closing.status = 'closed';

    await closing.save();

    const populated = await closing.populate(['outlet', 'cashier']);
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getActiveClosing(req: AuthRequest, res: Response) {
  try {
    const { outlet } = req.query;
    const filter: any = { cashier: req.user!.id, status: 'open' };
    if (outlet) filter.outlet = outlet;
    const closing = await Closing.findOne(filter).populate('outlet');
    res.json(closing);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getClosings(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, outlet, page = '1', limit = '20' } = req.query;
    const filter: any = { status: 'closed' };

    if (startDate || endDate) {
      filter.closedAt = {};
      if (startDate) filter.closedAt.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.closedAt.$lte = end;
      }
    }

    if (outlet) filter.outlet = outlet;

    const skip = (Number(page) - 1) * Number(limit);
    const [closings, total] = await Promise.all([
      Closing.find(filter)
        .populate(['outlet', 'cashier'])
        .sort({ closedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Closing.countDocuments(filter),
    ]);

    res.json({ closings, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCashierReport(req: AuthRequest, res: Response) {
  try {
    const { outlet } = req.query;
    const cashierId = req.user!.id;

    // Get active shift
    const filter: any = { cashier: cashierId, status: 'open' };
    if (outlet) filter.outlet = outlet;
    const closing = await Closing.findOne(filter).populate('outlet');

    if (!closing) {
      return res.status(404).json({ message: 'Tidak ada shift aktif' });
    }

    // Calculate sales from orders during this shift
    const orders = await Order.find({
      cashier: cashierId,
      outlet: closing.outlet,
      createdAt: { $gte: closing.openedAt },
      status: { $in: ['completed', 'partially-voided'] },
    }).populate('paymentMethod');

    const voidedOrders = await Order.find({
      cashier: cashierId,
      outlet: closing.outlet,
      createdAt: { $gte: closing.openedAt },
      status: 'voided',
    });

    let totalSales = 0;
    let cashSales = 0;
    let nonCashSales = 0;
    const breakdownMap = new Map<string, { method: string; code: string; total: number; count: number }>();

    for (const order of orders) {
      totalSales += order.total;
      const pm = order.paymentMethod as any;
      const code = pm?.code || order.paymentMethodCode || 'UNKNOWN';
      const method = pm?.name || order.paymentMethodName || 'Unknown';

      if (code === 'CASH') {
        cashSales += order.total;
      } else {
        nonCashSales += order.total;
      }

      const existing = breakdownMap.get(code);
      if (existing) {
        existing.total += order.total;
        existing.count += 1;
      } else {
        breakdownMap.set(code, { method, code, total: order.total, count: 1 });
      }
    }

    let voidedTotal = 0;
    for (const order of voidedOrders) {
      voidedTotal += order.total;
    }

    const totalCashPickups = closing.totalCashPickups || 0;
    const expectedCash = closing.startingCash + cashSales - totalCashPickups;

    res.json({
      shift: {
        id: closing._id,
        openedAt: closing.openedAt,
        startedAt: closing.openedAt,
        outletName: (closing.outlet as any)?.name || '',
      },
      sales: {
        total: totalSales,
        cash: cashSales,
        nonCash: nonCashSales,
        voided: voidedTotal,
        transactionCount: orders.length,
      },
      paymentBreakdown: [...breakdownMap.values()],
      cashDrawer: {
        startingCash: closing.startingCash,
        cashSales,
        totalCashPickups,
        cashPickups: closing.cashPickups || [],
        expectedCash,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
