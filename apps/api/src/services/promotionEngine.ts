import { Promotion, IRule, IPromotionDoc } from '../models/Promotion';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

export interface CartItem {
  product: {
    _id: string;
    name: string;
    price: number;
    category: string | { _id: string; name: string };
    barcode?: string;
  };
  qty: number;
}

export interface RuleContext {
  cart: { items: CartItem[]; subtotal: number; total: number };
  customer?: { id: string; name: string; tier?: string; totalOrders?: number; totalSpend?: number };
  paymentMethodId?: string;
  outletId?: string;
  date: Date;
}

export interface RuleResult {
  matched: boolean;
  discount?: number;
  discountItems?: { productId: string; discount: number; label: string }[];
  freeItems?: { productId: string; qty: number }[];
  modifications?: { productId: string; newPrice: number }[];
}

type RuleEvaluator = (rule: IRule, ctx: RuleContext) => RuleResult;

function getProductCategoryId(prod: CartItem['product']): string {
  return typeof prod.category === 'object' ? prod.category._id : prod.category;
}

const evaluators: Record<string, RuleEvaluator> = {
  percentage: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(i.product._id));
    if (c.scope === 'category' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(getProductCategoryId(i.product)));
    if (c.scope === 'all') items = items;
    const discount = items.reduce((s, i) => s + Math.round(i.product.price * i.qty * (c.value || 0) / 100), 0);
    return {
      matched: discount > 0,
      discount,
      discountItems: items.map((i) => ({
        productId: i.product._id,
        discount: Math.round(i.product.price * i.qty * (c.value || 0) / 100),
        label: `${c.value}% off`,
      })),
    };
  },

  nominal: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(i.product._id));
    const discount = items.reduce((s, i) => s + Math.min((c.value || 0) * i.qty, i.product.price * i.qty), 0);
    return {
      matched: discount > 0,
      discount,
      discountItems: items.map((i) => ({
        productId: i.product._id,
        discount: Math.min((c.value || 0) * i.qty, i.product.price * i.qty),
        label: `Rp ${c.value} off`,
      })),
    };
  },

  special_price: (rule, ctx) => {
    const c = rule.conditions;
    const target = ctx.cart.items.find((i) => i.product._id === (c as any).productId);
    if (!target) return { matched: false };
    const originalTotal = target.product.price * target.qty;
    const newTotal = (c.price || 0) * target.qty;
    if (newTotal >= originalTotal) return { matched: false };
    return {
      matched: true,
      discount: originalTotal - newTotal,
      modifications: [{ productId: target.product._id, newPrice: c.price || 0 }],
    };
  },

  quantity_range: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(i.product._id));
    let discount = 0;
    const discountItems: RuleResult['discountItems'] = [];
    for (const item of items) {
      if (item.qty >= (c.minQty || 0) && item.qty <= (c.maxQty || Infinity)) {
        const d = Math.round(item.product.price * item.qty * (c.value || 0) / 100);
        discount += d;
        discountItems.push({ productId: item.product._id, discount: d, label: `Qty ${c.minQty}-${c.maxQty} diskon ${c.value}%` });
      }
    }
    return { matched: discount > 0, discount, discountItems };
  },

  min_quantity: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(i.product._id));
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    if (totalQty < (c.minQty || 0)) return { matched: false };
    const discount = items.reduce((s, i) => s + Math.round(i.product.price * i.qty * (c.value || 0) / 100), 0);
    return { matched: true, discount, discountItems: items.map((i) => ({ productId: i.product._id, discount: Math.round(i.product.price * i.qty * (c.value || 0) / 100), label: `Min ${c.minQty} item diskon ${c.value}%` })) };
  },

  nth_item: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(i.product._id));
    const nth = c.every || 1;
    const discount = items.reduce((s, i) => {
      if (i.qty >= nth) {
        return s + Math.round(i.product.price * (c.value || 0) / 100);
      }
      return s;
    }, 0);
    return { matched: discount > 0, discount };
  },

  bundle: (rule, ctx) => {
    const c = rule.conditions;
    const bundleItems = c.items || [];
    const matched = bundleItems.every((bi) => {
      const inCart = ctx.cart.items.find((ci) => ci.product._id === bi.productId);
      return inCart && inCart.qty >= bi.qty;
    });
    if (!matched) return { matched: false };
    const originalTotal = bundleItems.reduce((s, bi) => {
      const item = ctx.cart.items.find((ci) => ci.product._id === bi.productId);
      return s + (item ? item.product.price * bi.qty : 0);
    }, 0);
    const bundlePrice = c.bundlePrice || 0;
    const discount = originalTotal - bundlePrice;
    if (discount <= 0) return { matched: false };
    return { matched: true, discount, discountItems: bundleItems.map((bi) => ({ productId: bi.productId, discount: 0, label: `Bundle ${c.bundlePrice ? `Rp ${c.bundlePrice}` : ''}` })) };
  },

  buy_x_get_y: (rule, ctx) => {
    const c = rule.conditions;
    let buyItems = ctx.cart.items;
    if (c.scope === 'product' && c.targetIds?.length) buyItems = buyItems.filter((i) => c.targetIds!.includes(i.product._id));
    if (c.scope === 'category' && c.targetIds?.length) buyItems = buyItems.filter((i) => c.targetIds!.includes(getProductCategoryId(i.product)));
    const totalBought = buyItems.reduce((s, i) => s + i.qty, 0);
    const buyQty = c.buyQty || 1;
    const freeQty = c.freeQty || 1;
    if (totalBought < buyQty) return { matched: false };
    const times = Math.floor(totalBought / buyQty);
    const totalFree = times * freeQty;

    // If a specific gift product is set, use it
    if (c.giftProductId) {
      const inCart = ctx.cart.items.find((i) => i.product._id === c.giftProductId);
      if (!inCart) {
        return { matched: true, discount: 0, freeItems: [{ productId: c.giftProductId, qty: totalFree }] };
      }
      const discount = Math.min(inCart.product.price * totalFree, inCart.product.price * inCart.qty);
      return { matched: true, discount, freeItems: [{ productId: c.giftProductId, qty: totalFree }] };
    }

    // Fallback: cheapest item in scope
    const cheapest = buyItems.length > 0 ? buyItems.reduce((a, b) => a.product.price < b.product.price ? a : b) : null;
    if (!cheapest) return { matched: false };
    const discount = cheapest.product.price * Math.min(totalFree, cheapest.qty);
    return { matched: true, discount, freeItems: [{ productId: cheapest.product._id, qty: Math.min(totalFree, cheapest.qty) }] };
  },

  buy_x_pay_y: (rule, ctx) => {
    const c = rule.conditions;
    let items = ctx.cart.items;
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const buyQty = c.buyQty || 1;
    const payQty = c.payQty || 1;
    if (totalQty < buyQty) return { matched: false };
    const totalPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const discount = totalPrice - Math.round(totalPrice * payQty / buyQty);
    return { matched: discount > 0, discount };
  },

  free_gift: (rule, ctx) => {
    const c = rule.conditions;
    let eligible = true;
    if (c.minAmount && ctx.cart.subtotal < c.minAmount) eligible = false;
    if (c.minQty) {
      let items = ctx.cart.items;
      if (c.scope === 'category' && c.targetIds?.length) items = items.filter((i) => c.targetIds!.includes(getProductCategoryId(i.product)));
      const totalQty = items.reduce((s, i) => s + i.qty, 0);
      if (totalQty < c.minQty) eligible = false;
    }
    if (!eligible) return { matched: false };
    return { matched: true, freeItems: [{ productId: c.giftProductId || '', qty: c.giftQty || 1 }] };
  },

  min_spend: (rule, ctx) => {
    const c = rule.conditions;
    if (ctx.cart.subtotal < (c.minAmount || 0)) return { matched: false };
    const discount = c.unit === 'percentage'
      ? Math.round(ctx.cart.subtotal * (c.value || 0) / 100)
      : Math.min(c.value || 0, ctx.cart.subtotal);
    return { matched: true, discount, discountItems: [{ productId: 'all', discount, label: `Min belanja Rp ${c.minAmount}` }] };
  },

  multiplier: (rule, ctx) => {
    const c = rule.conditions;
    const every = c.every || 0;
    if (every <= 0 || ctx.cart.subtotal < every) return { matched: false };
    const times = Math.floor(ctx.cart.subtotal / every);
    const bonusQty = times * (c.giftQty || 1);
    if (bonusQty <= 0) return { matched: false };
    return { matched: true, freeItems: [{ productId: c.giftProductId || '', qty: bonusQty }] };
  },

  member_tier: (rule, ctx) => {
    const c = rule.conditions;
    if (!ctx.customer?.tier || !c.tiers?.length || !c.tiers.includes(ctx.customer.tier)) return { matched: false };
    const discount = c.unit === 'percentage'
      ? Math.round(ctx.cart.subtotal * (c.value || 0) / 100)
      : Math.min(c.value || 0, ctx.cart.subtotal);
    return { matched: true, discount, discountItems: [{ productId: 'all', discount, label: `Member ${ctx.customer.tier}` }] };
  },

  payment_method: (rule, ctx) => {
    const c = rule.conditions;
    const paymentMethodIds = c.paymentMethodIds || [];
    if (ctx.paymentMethodId && paymentMethodIds.length > 0 && !paymentMethodIds.includes(ctx.paymentMethodId)) return { matched: false };
    const discount = c.unit === 'percentage'
      ? Math.round(ctx.cart.subtotal * (c.value || 0) / 100)
      : Math.min(c.value || 0, ctx.cart.subtotal);
    return { matched: true, discount, discountItems: [{ productId: 'all', discount, label: 'Promo pembayaran' }] };
  },

  time_window: (rule, ctx) => {
    const c = rule.conditions;
    const now = ctx.date;
    if (c.daysOfWeek?.length && !c.daysOfWeek.includes(now.getDay())) return { matched: false };
    if (c.startTime || c.endTime) {
      const mins = now.getHours() * 60 + now.getMinutes();
      const startMins = c.startTime ? parseTime(c.startTime) : 0;
      const endMins = c.endTime ? parseTime(c.endTime) : 1440;
      if (mins < startMins || mins > endMins) return { matched: false };
    }
    return { matched: true };
  },

  customer_match: (rule, ctx) => {
    const c = rule.conditions;
    if (!ctx.customer) return { matched: false };
    const fieldVal = ctx.customer[c.field as keyof typeof ctx.customer] as number || 0;
    const op = c.operator || 'gte';
    const match = op === 'gte' ? fieldVal >= (c.value || 0) : fieldVal <= (c.value || 0);
    if (!match) return { matched: false };
    const discount = c.unit === 'percentage'
      ? Math.round(ctx.cart.subtotal * (c.value || 0) / 100)
      : Math.min(c.value || 0, ctx.cart.subtotal);
    return { matched: true, discount, discountItems: [{ productId: 'all', discount, label: `Customer ${op} ${c.value}` }] };
  },
};

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function evaluatePromotion(promo: IPromotionDoc, ctx: RuleContext): RuleResult | null {
  if (!promo.active) return null;
  if (promo.startDate && ctx.date < new Date(promo.startDate)) return null;
  if (promo.endDate && ctx.date > new Date(promo.endDate)) return null;
  if (promo.minCartValue > 0 && ctx.cart.subtotal < promo.minCartValue) return null;

  const results = promo.rules.map((rule) => {
    const fn = evaluators[rule.type];
    return fn ? fn(rule, ctx) : { matched: false };
  });

  const allMatched = results.every((r) => r.matched);
  const someMatched = results.some((r) => r.matched);

  if (promo.ruleLogic === 'AND' && !allMatched) return null;
  if (promo.ruleLogic === 'OR' && !someMatched) return null;

  const merged = results.reduce(
    (acc, r) => ({
      matched: acc.matched || r.matched,
      discount: (acc.discount || 0) + (r.discount || 0),
      discountItems: [...(acc.discountItems || []), ...(r.discountItems || [])],
      freeItems: [...(acc.freeItems || []), ...(r.freeItems || [])],
      modifications: [...(acc.modifications || []), ...(r.modifications || [])],
    }),
    { matched: false } as RuleResult
  );

  return merged;
}

export async function calculateCartPromotions(ctx: RuleContext, promoCode?: string) {
  const query: any = { active: true };

  if (promoCode) {
    query.$or = [
      { code: promoCode },
      { name: { $regex: promoCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];
  } else {
    query.requiresCode = { $ne: true };
    query.$and = [
      { $or: [{ outlets: ctx.outletId }, { outlets: { $size: 0 } }] },
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: ctx.date } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: ctx.date } }] },
    ];
  }

  const promos = await Promotion.find(query).sort({ priority: 1, createdAt: -1 });

  // Filter out promos that have reached their usage limit
  const available = promos.filter((p) => {
    const limit = p.usageLimit?.perPromotion || 0;
    return limit === 0 || p.usedCount < limit;
  });

  const exclusivePromo = available.find((p) => p.exclusive);
  const stackablePromos = available.filter((p) => p.stackable && !p.exclusive);

  let totalDiscount = 0;
  let totalFreeItems: { productId: string; qty: number }[] = [];
  let breakdown: { name: string; code: string; discount: number; freeItems?: { productId: string; qty: number }[] }[] = [];

  if (exclusivePromo) {
    const res = evaluatePromotion(exclusivePromo, ctx);
    if (res && res.matched) {
      totalDiscount = res.discount || 0;
      if (res.freeItems) totalFreeItems.push(...res.freeItems);
      breakdown.push({ name: exclusivePromo.name, code: exclusivePromo.code, discount: res.discount || 0, freeItems: res.freeItems });
    }
  } else {
    for (const promo of stackablePromos) {
      const res = evaluatePromotion(promo, ctx);
      if (res && res.matched) {
        totalDiscount += res.discount || 0;
        if (res.freeItems) totalFreeItems.push(...res.freeItems);
        breakdown.push({ name: promo.name, code: promo.code, discount: res.discount || 0, freeItems: res.freeItems });
      }
    }
  }

  return { totalDiscount, totalFreeItems, breakdown };
}
