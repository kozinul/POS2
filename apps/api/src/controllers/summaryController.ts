import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Outlet } from '../models/Outlet';
import { Product } from '../models/Product';
import { Promotion } from '../models/Promotion';

export async function getSummary(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, activeOutlets, activePromos] = await Promise.all([
      Order.find({ createdAt: { $gte: today, $lt: tomorrow } }),
      Outlet.find({ status: 'active' }),
      Promotion.find({
        active: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] },
          { $or: [{ endDate: null }, { endDate: { $gte: new Date() } }] },
        ],
      }).select('name code description requiresCode outlets').sort({ priority: 1 }).limit(20),
    ]);

    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalTransactions = todayOrders.length;

    // Aggregate per-outlet stats & global product sales
    const outletStats = new Map<string, { revenue: number; txCount: number; cashiers: Set<string>; items: Map<string, number> }>();
    const globalProductQty = new Map<string, number>();

    for (const order of todayOrders) {
      const oid = order.outlet ? String(order.outlet) : '__none__';
      if (!outletStats.has(oid)) {
        outletStats.set(oid, { revenue: 0, txCount: 0, cashiers: new Set(), items: new Map() });
      }
      const entry = outletStats.get(oid)!;
      entry.revenue += order.total;
      entry.txCount += 1;
      if (order.cashierName) entry.cashiers.add(order.cashierName);
      for (const item of order.items) {
        const pid = String(item.product);
        entry.items.set(pid, (entry.items.get(pid) || 0) + item.qty);
        globalProductQty.set(pid, (globalProductQty.get(pid) || 0) + item.qty);
      }
    }

    // Resolve product names & category/family info
    const allPids = [...globalProductQty.keys()];
    const products = await Product.find({ _id: { $in: allPids } }).populate({
      path: 'category',
      populate: { path: 'family', select: 'name' },
    });
    const productNameMap = new Map<string, string>();
    const productFamilyMap = new Map<string, { familyId: string; familyName: string }>();

    for (const p of products) {
      const pid = String(p._id);
      productNameMap.set(pid, p.name);
      const cat = p.category as any;
      const fam = cat?.family;
      if (fam) {
        productFamilyMap.set(pid, {
          familyId: String(fam._id || fam),
          familyName: fam.name || '',
        });
      }
    }

    // Build top products by family
    const familyProducts = new Map<string, { productName: string; qty: number }[]>();
    const familyNameMap = new Map<string, string>();

    for (const [pid, qty] of globalProductQty) {
      const familyInfo = productFamilyMap.get(pid);
      const fId = familyInfo?.familyId || '__no_family__';
      if (!familyProducts.has(fId)) {
        familyProducts.set(fId, []);
        familyNameMap.set(fId, familyInfo?.familyName || 'Tanpa Family');
      }
      familyProducts.get(fId)!.push({
        productName: productNameMap.get(pid) || pid,
        qty,
      });
    }

    const topProductsByFamily = [...familyProducts.entries()].map(([fId, items]) => {
      items.sort((a, b) => b.qty - a.qty);
      return {
        familyId: fId,
        familyName: familyNameMap.get(fId) || 'Tanpa Family',
        products: items.slice(0, 5),
      };
    });

    // Build response for all active outlets
    const onlineOutlets = activeOutlets.map((outlet) => {
      const oid = String(outlet._id);
      const data = outletStats.get(oid);

      let bestProduct = '';
      let bestQty = 0;
      if (data) {
        for (const [pid, qty] of data.items) {
          if (qty > bestQty) {
            bestQty = qty;
            bestProduct = productNameMap.get(pid) || pid;
          }
        }
      }

      // Filter promos for this outlet
      const outletPromos = activePromos.filter((p) => {
        const po = (p as any).outlets;
        return !po || po.length === 0 || po.some((o: any) => String(o) === oid);
      });

      return {
        outletId: oid,
        outletName: outlet.name,
        cashiers: data ? [...data.cashiers] : [],
        revenue: data?.revenue || 0,
        transactions: data?.txCount || 0,
        bestSellingProduct: bestProduct || '-',
        bestSellingQty: bestQty,
        promotions: outletPromos.map((p) => ({
          name: p.name,
          code: p.code,
          requiresCode: p.requiresCode,
        })),
      };
    });

    onlineOutlets.sort((a, b) => b.revenue - a.revenue);

    const now = new Date();
    res.json({
      date: now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      totalRevenue,
      totalTransactions,
      onlineOutlets,
      topProductsByFamily,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
}
