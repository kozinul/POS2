import { Request, Response } from 'express';
import { Order } from '../models/Order';

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildDateMatch(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return {};
  const match: any = {};
  if (startDate) match.$gte = parseLocalDate(startDate);
  if (endDate) {
    const e = parseLocalDate(endDate);
    e.setDate(e.getDate() + 1);
    match.$lt = e;
  }
  return match;
}

export async function getSalesReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, outletId } = req.query;

    const match: any = {};
    const dateMatch = buildDateMatch(startDate as string, endDate as string);
    if (Object.keys(dateMatch).length) match.createdAt = dateMatch;

    const pipeline: any[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          totalRounding: { $sum: { $ifNull: ['$roundingAdjustment', 0] } },
          roundingCount: { $sum: { $cond: [{ $ne: ['$roundingAdjustment', 0] }, 1, 0] } },
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    const summary = result[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalRounding: 0, roundingCount: 0 };

    // Tax breakdown
    const taxAgg = await Order.aggregate([
      { $match: match },
      { $unwind: { path: '$taxDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { code: '$taxDetails.taxCode', name: '$taxDetails.name' },
          amount: { $sum: { $ifNull: ['$taxDetails.amountRounded', '$taxDetails.amount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          code: '$_id.code',
          name: '$_id.name',
          amount: 1,
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Daily breakdown
    const daily = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          rounding: { $sum: { $ifNull: ['$roundingAdjustment', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Payment method breakdown
    const byPayment = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          rounding: { $sum: { $ifNull: ['$roundingAdjustment', 0] } },
        },
      },
    ]);

    res.json({ summary, taxBreakdown: taxAgg, daily, byPayment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCashierReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const match: any = { status: { $ne: 'voided' } };
    const dateMatch = buildDateMatch(startDate as string, endDate as string);
    if (Object.keys(dateMatch).length) match.createdAt = dateMatch;

    const data = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { cashierName: '$cashierName', paymentMethod: '$paymentMethodName', paymentCode: '$paymentMethodCode' },
          total: { $sum: '$total' },
          count: { $sum: 1 },
          roundingAdj: { $sum: { $ifNull: ['$roundingAdjustment', 0] } },
        },
      },
      {
        $group: {
          _id: { cashierName: '$_id.cashierName' },
          totalSales: { $sum: '$total' },
          totalTransactions: { $sum: '$count' },
          roundingAdjustment: { $sum: '$roundingAdj' },
          paymentBreakdown: {
            $push: {
              method: '$_id.paymentMethod',
              code: '$_id.paymentCode',
              total: '$total',
              count: '$count',
              rounding: '$roundingAdj',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          cashierName: '$_id.cashierName',
          totalSales: 1,
          totalTransactions: 1,
          roundingAdjustment: 1,
          paymentBreakdown: 1,
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    // Tax breakdown per cashier
    const taxByCashier = await Order.aggregate([
      { $match: match },
      { $unwind: { path: '$taxDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { cashierName: '$cashierName', code: '$taxDetails.taxCode', name: '$taxDetails.name' },
          amount: { $sum: { $ifNull: ['$taxDetails.amountRounded', '$taxDetails.amount', 0] } },
        },
      },
      {
        $group: {
          _id: { cashierName: '$_id.cashierName' },
          taxes: {
            $push: {
              code: '$_id.code',
              name: '$_id.name',
              amount: '$amount',
            },
          },
        },
      },
    ]);

    // Merge tax data into cashier data
    const taxMap = new Map(taxByCashier.map(t => [t._id.cashierName, t.taxes]));
    for (const c of data) {
      (c as any).taxBreakdown = taxMap.get(c.cashierName) || [];
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFinanceReport(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const match: any = {};
    const dateMatch = buildDateMatch(startDate as string, endDate as string);
    if (Object.keys(dateMatch).length) match.createdAt = dateMatch;

    // Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Total orders
    const orderCount = await Order.countDocuments(match);

    // Actual tax breakdown from orders
    const taxAgg = await Order.aggregate([
      { $match: match },
      { $unwind: { path: '$taxDetails', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: { code: '$taxDetails.taxCode', name: '$taxDetails.name' },
          amount: { $sum: { $ifNull: ['$taxDetails.amountRounded', '$taxDetails.amount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          code: '$_id.code',
          name: '$_id.name',
          amount: 1,
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Rounding total
    const roundingAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRounding: { $sum: { $ifNull: ['$roundingAdjustment', 0] } },
          roundingCount: { $sum: { $cond: [{ $ne: ['$roundingAdjustment', 0] }, 1, 0] } },
        },
      },
    ]);
    const totalRounding = roundingAgg[0]?.totalRounding || 0;
    const roundingCount = roundingAgg[0]?.roundingCount || 0;

    const totalTax = taxAgg.reduce((s: number, t: any) => s + t.amount, 0);

    res.json({
      totalRevenue,
      totalOrders: orderCount,
      taxBreakdown: taxAgg,
      totalTax,
      totalRounding,
      roundingCount,
      netRevenue: totalRevenue - totalTax,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
