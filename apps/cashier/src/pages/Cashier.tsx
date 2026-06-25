import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ModifierOption {
  name: string;
  price: number;
}

interface Modifier {
  _id: string;
  name: string;
  options: ModifierOption[];
  required: boolean;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  stockManagement?: boolean;
  image?: string;
  taxes: { tax: { _id: string; name: string; rate: number }; included: boolean }[];
  category: { name: string; family: { _id: string; name: string } } | string;
  modifiers?: Modifier[];
}

interface CartItem {
  product: Product;
  qty: number;
  modifiers?: { name: string; price: number }[];
}

interface Category {
  _id: string;
  name: string;
  family: { _id: string; name: string };
}

interface Family {
  _id: string;
  name: string;
  slug: string;
}

interface PaymentMethod {
  _id: string;
  name: string;
  code: string;
  type: 'cash' | 'non-cash';
  requiresCardLastFour: boolean;
  active: boolean;
}

export default function Cashier() {
  const { user, logout, selectedOutlet, setSelectedOutlet } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [showPopular, setShowPopular] = useState(false);
  const [activeTaxes, setActiveTaxes] = useState<{ _id: string; name: string; rate: number }[]>([]);
  const [activePromos, setActivePromos] = useState<any[]>([]);

  function hasActivePromo(product: Product): boolean {
    const now = new Date();
    return activePromos.some((p: any) => {
      if (!p.active || p.requiresCode) return false;
      if (p.startDate && now < new Date(p.startDate)) return false;
      if (p.endDate && now > new Date(p.endDate)) return false;
      const limit = p.usageLimit?.perPromotion || 0;
      if (limit > 0 && p.usedCount >= limit) return false;
      return p.rules.some((rule: any) => {
        const c = rule.conditions;
        if (!c.scope || c.scope === 'all') return true;
        if (c.scope === 'product') return c.targetIds?.includes(product._id);
        if (c.scope === 'category') {
          const catId = typeof product.category === 'object' ? (product.category as any)._id : product.category;
          return c.targetIds?.includes(catId);
        }
        return false;
      });
    });
  }
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<any>(null);
  const [promoError, setPromoError] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);

  // Shift management
  const [shift, setShift] = useState<any>(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [startingCash, setStartingCash] = useState('');
  const [physicalCash, setPhysicalCash] = useState('');
  const [closeSummary, setCloseSummary] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Transaction History
  const [showHistory, setShowHistory] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidItemSelections, setVoidItemSelections] = useState<{ [itemId: string]: number }>({});
  const [showVoidItemModal, setShowVoidItemModal] = useState(false);
  const [voidItemReason, setVoidItemReason] = useState('');

  // Supervisor verification for void
  const [showSupervisorAuth, setShowSupervisorAuth] = useState(false);
  const [supervisorUserId, setSupervisorUserId] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [supervisorError, setSupervisorError] = useState('');
  const [supervisorData, setSupervisorData] = useState<{ id: string; name: string } | null>(null);
  const [pendingVoidAction, setPendingVoidAction] = useState<'void-all' | 'void-item' | 'void-payment' | null>(null);
  const [historyFilter, setHistoryFilter] = useState('today');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState('');

  // Laporan Kasir
  const [showCashierReport, setShowCashierReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupAmount, setPickupAmount] = useState('');
  const [pickupReason, setPickupReason] = useState('');

  // Modifier selection
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [modifierSelections, setModifierSelections] = useState<{ [modifierId: string]: ModifierOption }>({});

  useEffect(() => {
    fetch('/api/families').then((r) => r.json()).then(setFamilies);
    fetch('/api/categories?active=true').then((r) => r.json()).then(setCategories);
    fetch('/api/payment-methods').then((r) => r.json()).then((methods) => {
      setPaymentMethods(methods);
      if (methods.length > 0) setPaymentMethod(methods[0]._id);
    });
    fetch('/api/taxes?active=true').then((r) => r.json()).then(setActiveTaxes);
    fetch('/api/promotions').then((r) => r.json()).then(setActivePromos);
  }, []);

  useEffect(() => {
    const outlets = user?.outlets;
    if (outlets && outlets.length > 0 && !selectedOutlet) {
      setSelectedOutlet(outlets[0]);
    }
  }, [user, selectedOutlet, setSelectedOutlet]);

  // Check active shift (skip for admin)
  useEffect(() => {
    if (!selectedOutlet?._id) return;
    if (user?.role === 'admin') { setShiftLoading(false); return; }
    const token = localStorage.getItem('token');
    setShiftLoading(true);
    fetch(`/api/closings/active?outlet=${selectedOutlet._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && data._id) {
          setShift(data);
          setShiftLoading(false);
        } else {
          setShift(null);
          setStartingCash(String(user?.defaultStartingCash ?? ''));
          setShowOpenShift(true);
          setShiftLoading(false);
        }
      })
      .catch(() => setShiftLoading(false));
  }, [selectedOutlet?._id, user?.defaultStartingCash, user?.role]);

  useEffect(() => {
    if (showPopular) {
      fetch('/api/products/popular').then((r) => r.json()).then((data) => setProducts(data.products));
      return;
    }
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    params.set('active', 'true');
    fetch(`/api/products?${params}&limit=50`).then((r) => r.json()).then((data) => setProducts(data.products));
  }, [search, selectedCategory, showPopular]);

  function cartId(item: CartItem): string {
    const modStr = (item.modifiers || []).map((m) => `${m.name}:${m.price}`).sort().join('|');
    return `${item.product._id}|${modStr}`;
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id && !item.modifiers?.length);
      if (existing) {
        if (product.stockManagement && existing.qty >= product.stock) return prev;
        return prev.map((item) =>
          item.product._id === product._id && !item.modifiers?.length ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          cartId(item) === id
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((item) => cartId(item) !== id));
  }

  const subtotal = cart.reduce((sum, item) => {
    const modTotal = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
    return sum + (item.product.price + modTotal) * item.qty;
  }, 0);

  // Per-item tax: only add taxes that are NOT already included in each product price
  const taxDetails = activeTaxes.map((t) => {
    let displayAmount = 0;
    let addAmount = 0;
    for (const item of cart) {
      const match = (item.product.taxes || []).find(
        (pt) => String(pt.tax._id) === String(t._id)
      );
      const itemTotal = (item.product.price + (item.modifiers || []).reduce((s, m) => s + m.price, 0)) * item.qty;
      if (match && match.included) {
        displayAmount += Math.round(itemTotal * t.rate / (100 + t.rate));
      } else {
        const tax = Math.round(itemTotal * t.rate / 100);
        displayAmount += tax;
        addAmount += tax;
      }
    }
    return { ...t, amount: displayAmount, addAmount };
  });
  const taxTotal = taxDetails.reduce((s, t) => s + t.addAmount, 0);

  // Estimate discount from active promos for preview
  function estimatePromoDiscount(promos: any[]): number {
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    return promos.reduce((sum: number, p: any) => {
      const now = new Date();
      if (!p.active) return sum;
      if (p.startDate && now < new Date(p.startDate)) return sum;
      if (p.endDate && now > new Date(p.endDate)) return sum;
      const limit = p.usageLimit?.perPromotion || 0;
      if (limit > 0 && p.usedCount >= limit) return sum;
      return sum + p.rules.reduce((s: number, rule: any) => {
        const c = rule.conditions;
        if (rule.type === 'percentage') {
          if (!c.scope || c.scope === 'all') return s + Math.round(subtotal * (c.value || 0) / 100);
          if (c.scope === 'product' && c.targetIds?.length) {
            const matched = cart.filter((i) => c.targetIds.includes(i.product._id));
            return s + matched.reduce((a, i) => a + Math.round(i.product.price * i.qty * (c.value || 0) / 100), 0);
          }
          if (c.scope === 'category' && c.targetIds?.length) {
            const matched = cart.filter((i) => {
              const catId = typeof i.product.category === 'object' ? (i.product.category as any)._id : i.product.category;
              return c.targetIds.includes(catId);
            });
            return s + matched.reduce((a, i) => a + Math.round(i.product.price * i.qty * (c.value || 0) / 100), 0);
          }
        }
        if (rule.type === 'nominal') {
          if (!c.scope || c.scope === 'all') return s + Math.min(c.value || 0, subtotal);
          if (c.scope === 'product' && c.targetIds?.length) {
            const matched = cart.filter((i) => c.targetIds.includes(i.product._id));
            return s + matched.reduce((a, i) => a + Math.min((c.value || 0) * i.qty, i.product.price * i.qty), 0);
          }
        }
        if (rule.type === 'min_spend' && subtotal >= (c.minAmount || 0)) {
          return s + (c.unit === 'percentage'
            ? Math.round(subtotal * (c.value || 0) / 100)
            : Math.min(c.value || 0, subtotal));
        }
        if (rule.type === 'min_quantity' && totalQty >= (c.minQty || 0)) {
          return s + Math.round(subtotal * (c.value || 0) / 100);
        }
        return s;
      }, 0);
    }, 0);
  }

  const eligiblePromos = promoApplied
    ? [promoApplied]
    : activePromos.filter((p: any) => !p.requiresCode);
  const estimatedDiscount = estimatePromoDiscount(eligiblePromos);
  const promoPct = eligiblePromos.length > 0
    ? Math.round(estimatedDiscount / subtotal * 100)
    : 0;
  const dpp = Math.max(0, subtotal - estimatedDiscount);

  // Recalculate excluded taxes on DPP (harga setelah diskon)
  const dppTaxDetails = activeTaxes.map((t) => {
    let displayAmount = 0;
    let addAmount = 0;
    for (const item of cart) {
      const match = (item.product.taxes || []).find(
        (pt) => String(pt.tax._id) === String(t._id)
      );
      const itemTotal = (item.product.price + (item.modifiers || []).reduce((s, m) => s + m.price, 0)) * item.qty;
      const itemDpp = Math.max(0, itemTotal - Math.round(estimatedDiscount * itemTotal / subtotal));
      if (match && match.included) {
        displayAmount += Math.round(itemDpp * t.rate / (100 + t.rate));
      } else {
        const tax = Math.round(itemDpp * t.rate / 100);
        displayAmount += tax;
        addAmount += tax;
      }
    }
    return { ...t, amount: displayAmount, addAmount };
  });
  const dppTaxTotal = dppTaxDetails.reduce((s, t) => s + t.addAmount, 0);
  const grandTotal = dpp + dppTaxTotal;
  const selectedPM = paymentMethods.find((pm) => pm._id === paymentMethod);
  const isCash = selectedPM?.type === 'cash';
  const change = isCash && cashAmount ? Number(cashAmount) - grandTotal : 0;

  async function applyPromoCode() {
    setPromoError('');
    if (!promoCode.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/promotions/code/${encodeURIComponent(promoCode.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setPromoError(data.message || 'Kode promo tidak valid');
        setPromoApplied(null);
        return;
      }
      const promo = await res.json();
      setPromoApplied(promo);
      setPromoError('');
    } catch {
      setPromoError('Gagal memvalidasi kode promo');
    }
  }

  function removePromoCode() {
    setPromoCode('');
    setPromoApplied(null);
    setPromoError('');
  }

  async function searchMember(q: string) {
    setMemberSearch(q);
    if (!q.trim()) { setMemberResults([]); return; }
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMemberResults(await res.json());
  }

  function selectMember(m: any) {
    setSelectedMember(m);
    setShowMemberSearch(false);
    setMemberSearch('');
    setMemberResults([]);
  }

  async function checkout() {
    if (cart.length === 0) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: cart.map((item) => ({
          product: item.product._id,
          qty: item.qty,
          price: item.product.price,
          modifiers: item.modifiers || [],
        })),
        paymentMethod: selectedPM?._id,
        cashAmount: isCash ? Number(cashAmount) : undefined,
        cardLastFour: selectedPM?.requiresCardLastFour ? cardLastFour : undefined,
        promoCode: promoApplied?.code || undefined,
        memberId: selectedMember?._id || undefined,
        tableNumber: tableNumber || undefined,
        customerName: customerName || undefined,
        outlet: selectedOutlet?._id || undefined,
      }),
    });

    if (res.ok) {
      const order = await res.json();
      setLastOrder(order);
      setShowReceipt(true);
      setCart([]);
      setCashAmount('');
      setPromoCode('');
      setPromoApplied(null);
      setSelectedMember(null);
    }
  }

  async function openShift() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/closings/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outlet: selectedOutlet?._id, startingCash: Number(startingCash) || 0 }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setShift(data);
    setShowOpenShift(false);
  }

  async function confirmCloseShift() {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/closings/${shift._id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ physicalCash: Number(physicalCash) || 0 }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setCloseSummary(data);
  }

  // Riwayat Transaksi
  function getDateRange(filter: string) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (filter === 'today') {
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (filter === 'yesterday') {
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (filter === 'week') {
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (filter === 'month') {
      start.setMonth(start.getMonth() - 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return { startDate: '', endDate: '' };
  }

  async function fetchOrders(page = 1) {
    const token = localStorage.getItem('token');
    setOrdersLoading(true);
    try {
      const { startDate, endDate } = getDateRange(historyFilter);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedOutlet?._id) params.set('outlet', selectedOutlet._id);
      if (historySearch.trim()) params.set('search', historySearch.trim());
      const res = await fetch(`/api/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setHistoryPage(data.page);
        setHistoryTotalPages(data.totalPages);
      }
    } catch { /* ignore */ }
    setOrdersLoading(false);
  }

  useEffect(() => {
    if (showHistory) fetchOrders();
  }, [showHistory, historyFilter, historySearch, selectedOutlet?._id]);

  function viewOrder(order: any) {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  }

  function printOrder(order: any) {
    setSelectedOrder(order);
    setShowReceipt(true);
    setLastOrder(order);
    setShowHistory(false);
    setShowOrderDetail(false);
  }

  async function verifySupervisor() {
    try {
      setSupervisorError('');
      const res = await fetch('/api/auth/verify-supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supervisorUserId, password: supervisorPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        setSupervisorData(data.user);
        setShowSupervisorAuth(false);
        setSupervisorPassword('');
        setSupervisorUserId('');
        if (pendingVoidAction === 'void-all') {
          setShowVoidModal(true);
        } else if (pendingVoidAction === 'void-item') {
          openVoidItemModal(selectedOrder);
        } else if (pendingVoidAction === 'void-payment') {
          voidPaymentOrder();
        }
      } else {
        const err = await res.json();
        setSupervisorError(err.message || 'Verifikasi gagal');
      }
    } catch {
      setSupervisorError('Gagal terhubung ke server');
    }
  }

  async function confirmVoidOrder() {
    if (!selectedOrder) return;
    const token = localStorage.getItem('token');
    const body: any = { reason: voidReason };
    if (supervisorData) {
      body.supervisorId = supervisorData.id;
      body.voidedByName = supervisorData.name;
    }
    const res = await fetch(`/api/orders/${selectedOrder._id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setSelectedOrder(updated);
      setShowVoidModal(false);
      setVoidReason('');
      setSupervisorData(null);
    } else {
      const err = await res.json();
      alert(err.message || 'Gagal void order');
    }
  }

  async function voidPaymentOrder() {
    if (!selectedOrder) return;
    const token = localStorage.getItem('token');
    const body: any = { reason: `Void payment` };
    if (supervisorData) {
      body.supervisorId = supervisorData.id;
      body.voidedByName = supervisorData.name;
    }
    const res = await fetch(`/api/orders/${selectedOrder._id}/void-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      // Return items to cart
      const items: CartItem[] = updated.items.map((item: any) => ({
        product: item.product,
        qty: item.qty,
        modifiers: item.modifiers || [],
      }));
      setCart(items);
      setShowOrderDetail(false);
      setShowPaymentModal(true);
      setSupervisorData(null);
    } else {
      const err = await res.json();
      alert(err.message || 'Gagal void payment');
    }
  }

  function openVoidItemModal(order: any) {
    setSelectedOrder(order);
    const selections: { [itemId: string]: number } = {};
    // Pre-fill full qty for each item
    order.items?.forEach((item: any) => {
      const voidedQty = order.voidedItems
        ?.filter((vi: any) => String(vi.itemId) === String(item._id))
        ?.reduce((s: number, vi: any) => s + vi.qty, 0) || 0;
      selections[item._id] = Math.max(0, item.qty - voidedQty);
    });
    setVoidItemSelections(selections);
    setVoidItemReason('');
    setShowVoidItemModal(true);
  }

  // Laporan Kasir
  async function fetchReport() {
    const token = localStorage.getItem('token');
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedOutlet?._id) params.set('outlet', selectedOutlet._id);
      const res = await fetch(`/api/closings/report?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        setReportData(null);
      }
    } catch { setReportData(null); }
    setReportLoading(false);
  }

  async function confirmPickup() {
    if (!pickupAmount || Number(pickupAmount) <= 0) return;
    const closingId = reportData?.shift?.id;
    if (!closingId) return alert('Tidak ada shift aktif');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/closings/${closingId}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(pickupAmount), reason: pickupReason }),
      });
      if (res.ok) {
        setShowPickupModal(false);
        setPickupAmount('');
        setPickupReason('');
        fetchReport();
      } else {
        const err = await res.json();
        alert(err.message || 'Gagal tarik uang');
      }
    } catch { alert('Gagal tarik uang'); }
  }

  async function confirmVoidItems() {
    if (!selectedOrder) return;
    const entries = Object.entries(voidItemSelections).filter(([_, qty]) => qty > 0);
    if (entries.length === 0) return alert('Pilih minimal 1 item untuk di-void');

    const token = localStorage.getItem('token');
    for (const [itemId, qty] of entries) {
      const body: any = { itemId, qty, reason: voidItemReason };
      if (supervisorData) {
        body.supervisorId = supervisorData.id;
        body.voidedByName = supervisorData.name;
      }
      const res = await fetch(`/api/orders/${selectedOrder._id}/void-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || `Gagal void item ${itemId}`);
        return;
      }
    }

    const updatedRes = await fetch(`/api/orders/${selectedOrder._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (updatedRes.ok) {
      const updated = await updatedRes.json();
      setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setSelectedOrder(updated);
    }
    setShowVoidItemModal(false);
    setVoidItemReason('');
    setSupervisorData(null);
  }

  function confirmModifierSelection() {
    if (!modifierProduct) return;
    const selectedMods = Object.values(modifierSelections).filter(Boolean);
    setCart((prev) => {
      const newItem: CartItem = { product: modifierProduct, qty: 1, modifiers: selectedMods };
      const key = cartId(newItem);
      const existing = prev.find((item) => cartId(item) === key);
      if (existing) {
        if (modifierProduct.stockManagement && existing.qty >= modifierProduct.stock) return prev;
        return prev.map((item) =>
          cartId(item) === key ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, newItem];
    });
    setShowModifierModal(false);
    setModifierProduct(null);
    setModifierSelections({});
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-[#2176D2] text-white h-16 flex items-center justify-between px-6 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSidebar(true)} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[24px]">menu</span>
            <span className="text-lg font-semibold">{user?.name || 'Kasir'}</span>
          </button>
          {user?.outlets && user.outlets.length > 0 && (
            <select
              value={selectedOutlet?._id || ''}
              onChange={(e) => {
                const o = user.outlets?.find((o) => o._id === e.target.value);
                if (o) setSelectedOutlet(o);
              }}
              className="ml-2 bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {user.outlets.map((o) => (
                <option key={o._id} value={o._id} className="text-gray-800">{o.name}</option>
              ))}
            </select>
          )}
          {shift && (
            <span className="ml-2 bg-green-400/20 text-green-200 border border-green-400/30 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider">
              Shift: OPEN
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {shift && (
            <button
              onClick={() => { setPhysicalCash(''); setShowCloseShift(true); }}
              className="px-4 py-1.5 bg-amber-500/20 text-amber-200 border border-amber-400/30 rounded-lg text-sm font-semibold hover:bg-amber-500/30 transition-colors"
            >
              Tutup Shift
            </button>
          )}
          <div className="bg-[#E6F4EA] text-[#1E7E34] px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
            <span className="w-2.5 h-2.5 bg-[#28A745] rounded-full"></span>
            Ter-sinkron
          </div>
        </div>
      </header>

      {shiftLoading && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-gray-400 text-sm font-semibold">Memuat shift...</div>
        </div>
      )}

      {!shiftLoading && !shift && user?.role !== 'admin' && !showOpenShift && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <span className="material-symbols-outlined text-gray-300 text-[64px]">store</span>
            <p className="text-gray-500 font-semibold mt-2">Pilih outlet dan buka shift untuk memulai</p>
          </div>
        </div>
      )}

      {!shiftLoading && (shift || user?.role === 'admin') && (
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Catalog */}
        <section className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Search & Filters */}
          <div className="space-y-6 mb-6">
            <div className="relative max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400">search</span>
              </div>
              <input
                className="block w-full pl-11 pr-12 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cari Produk / Scan Barcode"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <span className="material-symbols-outlined text-[#2176D2]">qr_code_scanner</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setShowPopular(false); setSelectedFamily(''); setSelectedCategory(''); }}
                  className={`px-6 py-2 rounded-full font-medium text-sm ${
                    !showPopular && !selectedFamily && !selectedCategory
                      ? 'bg-[#2176D2] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => { setShowPopular(true); setSelectedFamily(''); setSelectedCategory(''); }}
                  className={`px-6 py-2 rounded-full font-medium text-sm ${
                    showPopular
                      ? 'bg-[#2176D2] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">star</span>
                    Favorit
                  </span>
                </button>
                {families.map((fam) => (
                  <button
                    key={fam._id}
                    onClick={() => { setShowPopular(false); setSelectedFamily(fam._id); setSelectedCategory(''); }}
                    className={`px-6 py-2 rounded-full font-medium text-sm ${
                      selectedFamily === fam._id && !selectedCategory
                        ? 'bg-[#2176D2] text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {fam.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap ml-1">
                {categories
                  .filter((c) => !selectedFamily || c.family?._id === selectedFamily)
                  .map((cat) => (
                    <button
                      key={cat._id}
                      onClick={() => { setShowPopular(false); setSelectedCategory(cat._id); }}
                      className={`px-4 py-1.5 rounded-full font-medium text-xs ${
                        selectedCategory === cat._id
                          ? 'bg-[#2176D2] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const outOfStock = product.stockManagement !== false && product.stock === 0;
              const promo = hasActivePromo(product);
              return (
                <div
                  key={product._id}
                  onClick={() => {
                    if (outOfStock) return;
                    if (product.modifiers && product.modifiers.length > 0) {
                      const initial: { [modifierId: string]: ModifierOption } = {};
                      for (const mod of product.modifiers) {
                        if (mod.required && mod.options.length > 0) {
                          initial[mod._id] = mod.options[0];
                        }
                      }
                      setModifierSelections(initial);
                      setModifierProduct(product);
                      setShowModifierModal(true);
                    } else {
                      addToCart(product);
                    }
                  }}
                  className={`product-card bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border cursor-pointer relative ${
                    promo
                      ? 'border-green-400 bg-green-50/30'
                      : 'border-gray-100'
                  } ${outOfStock ? 'opacity-60' : ''}`}
                >
                  {outOfStock && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider z-10">
                      Habis
                    </span>
                  )}
                  {promo && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider z-10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">local_offer</span>
                      Promo
                    </span>
                  )}
                  <div className="h-40 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-[48px]">
                        {outOfStock ? 'block' : 'inventory_2'}
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-800">{product.name}</h3>
                    <p className="text-gray-900 mt-1">Rp. {product.price.toLocaleString()}
                      {product.taxes?.length > 0 && product.taxes.some((t) => t.included) && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 ml-1.5 px-1.5 py-0.5 rounded font-semibold align-middle">Inc</span>
                      )}
                    </p>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span className={`text-xs ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {product.stockManagement === false ? 'Tanpa stok' : `Stok: ${outOfStock ? 'Habis' : product.stock}`}
                      </span>
                      <button
                        disabled={outOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (outOfStock) return;
                          if (product.modifiers && product.modifiers.length > 0) {
                            const initial: { [modifierId: string]: ModifierOption } = {};
                            for (const mod of product.modifiers) {
                              if (mod.required && mod.options.length > 0) {
                                initial[mod._id] = mod.options[0];
                              }
                            }
                            setModifierSelections(initial);
                            setModifierProduct(product);
                            setShowModifierModal(true);
                          } else {
                            addToCart(product);
                          }
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                          outOfStock
                            ? 'bg-gray-300 text-white cursor-not-allowed'
                            : 'bg-[#2176D2] text-white'
                        }`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Sidebar - Order Summary */}
        <aside className="w-[450px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
          {/* Order Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Pesanan</h2>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{cart.length}</span>
          </div>

          {/* Customer Info */}
          <div className="px-6 py-3 border-b border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input type="text" placeholder="No. Meja" value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              <input type="text" placeholder="Nama Pelanggan (opsional)" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>

          {/* Order Items List */}
          <div className="flex-1 overflow-y-auto order-list-container p-6 space-y-6">
            {cart.map((item) => {
              const modTotal = (item.modifiers || []).reduce((s, m) => s + m.price, 0);
              return (
              <div key={cartId(item)}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{item.product.name} x{item.qty}</h4>
                    <p className="text-sm text-gray-400">Rp {(item.product.price + modTotal).toLocaleString()}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                        {item.modifiers.map((m, i) => (
                          <div key={i} className="flex justify-between pl-3">
                            <span>+ {m.name}</span>
                            <span>Rp {m.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-800">
                      Rp {((item.product.price + modTotal) * item.qty).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateQty(cartId(item), 1)}
                        disabled={item.product.stockManagement && item.qty >= item.product.stock}
                        className="text-gray-300 hover:text-[#2176D2] disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      </button>
                      <button
                        onClick={() => updateQty(cartId(item), -1)}
                        className="text-gray-300 hover:text-[#2176D2]"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove_circle</span>
                      </button>
                      <button onClick={() => removeItem(cartId(item))} className="text-gray-300 hover:text-red-500">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 mt-4"></div>
              </div>
            )})}
            {cart.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <span className="material-symbols-outlined text-[48px]">shopping_cart</span>
                <p className="mt-2">Belum ada item</p>
              </div>
            )}
          </div>

          {/* Order Totals */}
          <div className="p-6 bg-white border-t border-gray-100 shrink-0 space-y-3">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString()}</span>
            </div>
            {estimatedDiscount > 0 && (
              <>
                <div className="flex justify-between text-green-600 text-sm font-semibold">
                  <span>Diskon Promo {promoPct > 0 && `(${promoPct}%)`}</span>
                  <span>- Rp {estimatedDiscount.toLocaleString()}</span>
                </div>
              </>
            )}
            {dppTaxDetails.map((t, i) => {
              const isIncluded = cart.some((item) =>
                (item.product.taxes || []).some((pt) => String(pt.tax._id) === String(t._id) && pt.included)
              );
              return (
                <div key={i} className="flex justify-between text-sm">
                  <span className={isIncluded ? 'text-amber-700' : 'text-gray-500'}>
                    {t.name}{t.rate > 0 && ` (${t.rate}%)`}
                    {isIncluded && <span className="text-[10px] ml-1 font-semibold">[Inc]</span>}
                  </span>
                  <span className={isIncluded ? 'text-amber-700' : 'text-gray-500'}>
                    Rp {t.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="text-lg font-bold text-gray-800">Total</span>
              <span className="text-2xl font-extrabold text-gray-900">Rp {grandTotal.toLocaleString()}</span>
            </div>

            {/* Proses Pembayaran */}
            <button
              onClick={() => { setShowPaymentModal(true); }}
              disabled={cart.length === 0}
              className="w-full py-4 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              Proses Pembayaran
            </button>
          </div>
        </aside>
      </main>
      )}

      {/* Buka Shift Modal */}
      {showOpenShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#2176D2] text-[28px]">play_circle</span>
              <h3 className="text-lg font-bold text-gray-800">Buka Shift</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedOutlet?.name}</p>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Modal Awal</label>
              <input
                type="number"
                placeholder="0"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2176D2]/20"
              />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={openShift}
                className="flex-1 py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Buka Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutup Shift Modal */}
      {showCloseShift && !closeSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-500 text-[28px]">pause_circle</span>
              <h3 className="text-lg font-bold text-gray-800">Tutup Shift</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedOutlet?.name}</p>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uang Fisik di Laci</label>
              <input
                type="number"
                placeholder="0"
                value={physicalCash}
                onChange={(e) => setPhysicalCash(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2176D2]/20"
              />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowCloseShift(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmCloseShift}
                disabled={!physicalCash}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Hitung & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Summary Modal */}
      {closeSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-green-600 text-[28px]">check_circle</span>
              <h3 className="text-lg font-bold text-gray-800">Shift Ditutup</h3>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Modal Awal</span>
                <span className="font-semibold">Rp {closeSummary.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Penjualan</span>
                <span className="font-semibold">Rp {closeSummary.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Penjualan Tunai</span>
                <span className="font-semibold">Rp {closeSummary.cashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Penjualan Non-Tunai</span>
                <span className="font-semibold">Rp {closeSummary.nonCashSales.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Uang Fisik</span>
                <span>Rp {closeSummary.physicalCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Uang Seharusnya</span>
                <span>Rp {closeSummary.expectedCash.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between text-lg font-extrabold ${closeSummary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Selisih</span>
                <span>{closeSummary.difference >= 0 ? '+' : ''}{closeSummary.difference.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setCloseSummary(null); setShowCloseShift(false); setShift(null); setCart([]); }}
                className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Member */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Member</label>
                {selectedMember ? (
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2176D2] text-[18px]">diversity_3</span>
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{selectedMember.name}</span>
                        <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          selectedMember.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                          selectedMember.tier === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                          selectedMember.tier === 'silver' ? 'bg-gray-100 text-gray-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {selectedMember.tier.charAt(0).toUpperCase() + selectedMember.tier.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-red-500">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Cari Member (nama/telepon)" value={memberSearch}
                        onChange={(e) => searchMember(e.target.value)}
                        onFocus={() => setShowMemberSearch(true)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                      <button onClick={() => setShowMemberSearch(!showMemberSearch)}
                        className="px-3 py-2 text-sm font-semibold text-[#2176D2] bg-blue-50 rounded-lg hover:bg-blue-100">
                        Cari
                      </button>
                    </div>
                    {showMemberSearch && memberResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {memberResults.map((m) => (
                          <button key={m._id} onClick={() => selectMember(m)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 border-b border-gray-100 last:border-0">
                            <span className="material-symbols-outlined text-gray-400 text-[16px]">person</span>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-gray-400 text-xs">{m.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Promo Code */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Promo</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Kode Promo" value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(null); setPromoError(''); }}
                    disabled={!!promoApplied}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" />
                  {promoApplied ? (
                    <button onClick={removePromoCode} className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                      Batal
                    </button>
                  ) : (
                    <button onClick={applyPromoCode} disabled={!promoCode.trim()}
                      className="px-3 py-2 text-sm font-semibold text-white bg-[#2176D2] rounded-lg hover:opacity-90 disabled:opacity-50">
                      Pakai
                    </button>
                  )}
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                {promoApplied && <p className="text-xs text-green-600 font-semibold mt-1">✓ {promoApplied.name}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Metode Pembayaran</label>
                <div className="flex gap-2 flex-wrap">
                  {paymentMethods.filter((pm) => pm.active).map((pm) => (
                    <button key={pm._id} onClick={() => { setPaymentMethod(pm._id); setCardLastFour(''); }}
                      className={`flex-1 min-w-[80px] py-3 rounded-lg text-sm font-semibold transition-colors ${
                        paymentMethod === pm._id
                          ? 'bg-[#2176D2] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {pm.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Amount */}
              {isCash && (
                <div>
                  <input type="number" placeholder="Jumlah Bayar" value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                  {cashAmount && (
                    <div className={`mt-2 text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {change >= 0
                        ? `Kembalian: Rp ${change.toLocaleString()}`
                        : `Uang kurang Rp ${Math.abs(change).toLocaleString()}`
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Card Last Four */}
              {selectedPM?.requiresCardLastFour && (
                <div>
                  <input type="text" placeholder="4 Digit Terakhir Kartu" maxLength={4} value={cardLastFour}
                    onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
              )}
            </div>

            {/* Footer Total + Actions */}
            <div className="p-6 border-t border-gray-100 shrink-0 space-y-4">
              {estimatedDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>Diskon Promo {promoPct > 0 && `(${promoPct}%)`}</span>
                  <span>- Rp {estimatedDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-base text-gray-700">Total</span>
                <span className="text-2xl font-extrabold text-gray-900">Rp {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                  Batal
                </button>
                <button onClick={() => { setShowPaymentModal(false); checkout(); }}
                  disabled={(isCash && (!cashAmount || change < 0)) || (selectedPM?.requiresCardLastFour && cardLastFour.length !== 4)}
                  className="flex-[2] py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                  Bayar Rp {grandTotal.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div id="receipt-print" className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`material-symbols-outlined text-[32px] ${lastOrder.status === 'voided' ? 'text-red-600' : 'text-green-600'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {lastOrder.status === 'voided' ? 'cancel' : 'check_circle'}
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Struk Pembayaran</h3>
                {lastOrder.orderNumber && <p className="text-xs font-mono text-gray-400 mt-0.5">{lastOrder.orderNumber}</p>}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    color: lastOrder.status === 'voided' ? '#DC2626' : lastOrder.status === 'partially-voided' ? '#D97706' : '#16A34A',
                    backgroundColor: lastOrder.status === 'voided' ? '#FEE2E2' : lastOrder.status === 'partially-voided' ? '#FEF3C7' : '#DCFCE7',
                  }}
                >
                  {lastOrder.status === 'voided' ? 'VOID' : lastOrder.status === 'partially-voided' ? 'PARTIAL VOID' : 'LUNAS'}
                </span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              {lastOrder.items?.map((item: any, i: number) => {
                const voidedQty = lastOrder.voidedItems
                  ?.filter((vi: any) => String(vi.itemId) === String(item._id))
                  ?.reduce((s: number, vi: any) => s + vi.qty, 0) || 0;
                return (
                  <div key={i} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{item.product?.name} <span className="text-gray-400">x{item.qty}</span></span>
                      <span className="font-semibold">Rp {item.subtotal?.toLocaleString()}</span>
                    </div>
                    {item.modifiers?.length > 0 && (
                      <div className="text-xs text-gray-400 ml-3 mt-0.5 space-y-0.5">
                        {item.modifiers.map((m: any, mi: number) => (
                          <div key={mi} className="flex justify-between">
                            <span>+ {m.name}</span>
                            {m.price > 0 && <span>Rp {m.price.toLocaleString()}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {lastOrder.subtotal > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>Rp {lastOrder.subtotal?.toLocaleString()}</span>
              </div>
            )}
            {lastOrder.promotions?.length > 0 && lastOrder.promotions.map((p: any, i: number) => (
              <div key={i} className="flex justify-between text-sm text-green-600">
                <span>{p.name}</span>
                <span>-Rp {p.discount?.toLocaleString()}</span>
              </div>
            ))}
            {lastOrder.discountTotal > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-700 border-t border-gray-200 pt-1">
                <span>Total Diskon</span>
                <span>-Rp {lastOrder.discountTotal?.toLocaleString()}</span>
              </div>
            )}
            {lastOrder.taxDetails?.length > 0 && lastOrder.taxDetails.map((t: any, i: number) => (
              <div key={i} className={`flex justify-between text-sm ${t.included ? 'text-amber-700' : 'text-gray-500'}`}>
                <span>{t.name}{t.rate > 0 && ` (${t.rate}%)`}{t.included && <span className="text-[10px] ml-1 font-semibold">[Inc]</span>}</span>
                <span>Rp {(t.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            {lastOrder.voidedItems?.length > 0 && (
              <div className="border-t border-gray-100 pt-2 mt-2">
                <h4 className="text-xs font-bold text-red-500 mb-1">VOID:</h4>
                {lastOrder.voidedItems.map((vi: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs text-red-400">
                    <span>{vi.productName || 'Unknown'} x{vi.qty}{vi.reason && ` (${vi.reason})`}{vi.voidedByName && <span className="text-gray-400 ml-1">- {vi.voidedByName}</span>}</span>
                  </div>
                ))}
              </div>
            )}
            {(lastOrder.status === 'voided' || lastOrder.status === 'partially-voided') && (lastOrder.voidedByName || lastOrder.voidReason) && (
              <div className="border-t border-gray-100 pt-2 mt-2 text-xs text-red-500 space-y-0.5">
                {lastOrder.voidedByName && <p>Dibatal oleh: {lastOrder.voidedByName}</p>}
                {lastOrder.voidReason && <p>Alasan: {lastOrder.voidReason}</p>}
              </div>
            )}
            <div className="border-t border-gray-200 mt-2 pt-4 space-y-1">
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>Rp {lastOrder.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Metode</span>
                <span className="font-semibold">{lastOrder.paymentMethodName || lastOrder.paymentMethod?.name || lastOrder.paymentMethodCode}</span>
              </div>
              {lastOrder.memberName && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Member</span>
                  <span className="font-semibold">{lastOrder.memberName} {lastOrder.memberTier && `(${lastOrder.memberTier})`}</span>
                </div>
              )}
              {lastOrder.tableNumber && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Meja</span>
                  <span className="font-semibold">{lastOrder.tableNumber}</span>
                </div>
              )}
              {lastOrder.customerName && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Pelanggan</span>
                  <span className="font-semibold">{lastOrder.customerName}</span>
                </div>
              )}
              {lastOrder.cardLastFour && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Kartu</span>
                  <span className="font-mono font-semibold">****{lastOrder.cardLastFour}</span>
                </div>
              )}
              {lastOrder.cashAmount && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Bayar</span>
                  <span>Rp {lastOrder.cashAmount?.toLocaleString()}</span>
                </div>
              )}
              {lastOrder.change && (
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>Kembali</span>
                  <span>Rp {lastOrder.change?.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => { window.print(); }}
                className="flex-1 py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h3>
              <button onClick={() => { setShowHistory(false); setOrders([]); }} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Filter */}
            <div className="px-6 py-4 border-b border-gray-100 shrink-0 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'today', label: 'Hari Ini' },
                  { key: 'yesterday', label: 'Kemarin' },
                  { key: 'week', label: '7 Hari' },
                  { key: 'month', label: '30 Hari' },
                  { key: 'all', label: 'Semua' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setHistoryFilter(f.key); setHistoryPage(1); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      historyFilter === f.key
                        ? 'bg-[#2176D2] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-[18px]">search</span>
                </div>
                <input
                  type="text"
                  placeholder="Cari transaksi (no. invoice, nama produk, pelanggan...)"
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-6">
              {ordersLoading ? (
                <div className="text-center text-gray-400 py-12">
                  <span className="material-symbols-outlined text-[48px]">hourglass_top</span>
                  <p className="mt-2">Memuat...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <span className="material-symbols-outlined text-[48px]">receipt_long</span>
                  <p className="mt-2">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => {
                    const statusColor = order.status === 'voided' ? 'text-red-600 bg-red-50' :
                      order.status === 'partially-voided' ? 'text-amber-600 bg-amber-50' :
                      'text-green-600 bg-green-50';
                    const statusLabel = order.status === 'voided' ? 'Void' :
                      order.status === 'partially-voided' ? 'Partial Void' :
                      'Selesai';
                    return (
                      <div key={order._id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-gray-800 text-sm">
                                {order.orderNumber || 'N/A'}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                                {order.items?.length || 0} item
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                {order.paymentMethodName || 'N/A'}
                              </span>
                              {order.outletName && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">store</span>
                                  {order.outletName}
                                </span>
                              )}
                              {order.cashierName && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">person</span>
                                  {order.cashierName}
                                </span>
                              )}
                            </div>
                            {order.items?.slice(0, 3).map((item: any, i: number) => (
                              <span key={i} className="text-xs text-gray-400 mr-2">
                                {item.product?.name || 'Unknown'} x{item.qty}
                                {order.voidedItems?.filter((vi: any) => String(vi.itemId) === String(item._id)).length > 0 && (
                                  <span className="text-red-400 ml-1">
                                    (void: {order.voidedItems.filter((vi: any) => String(vi.itemId) === String(item._id)).reduce((s: number, vi: any) => s + vi.qty, 0)})
                                  </span>
                                )}
                              </span>
                            ))}
                            {order.items?.length > 3 && (
                              <span className="text-xs text-gray-400">+{order.items.length - 3} lainnya</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className="text-lg font-bold text-gray-900">Rp {order.total?.toLocaleString()}</span>
                            <div className="flex gap-1.5">
                              <button onClick={() => viewOrder(order)}
                                className="p-2 text-gray-400 hover:text-[#2176D2] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lihat Detail">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                              </button>
                              <button onClick={() => printOrder(order)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Print Ulang">
                                <span className="material-symbols-outlined text-[18px]">print</span>
                              </button>
                              {order.status !== 'voided' && (
                                <>
                                  <button onClick={() => {
                                    setSelectedOrder(order);
                                    setVoidReason('');
                                    if (user?.role === 'admin') {
                                      setShowVoidModal(true);
                                    } else {
                                      setPendingVoidAction('void-all');
                                      setSupervisorUserId('');
                                      setSupervisorPassword('');
                                      setSupervisorError('');
                                      setShowSupervisorAuth(true);
                                    }
                                  }}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Void Semua">
                                    <span className="material-symbols-outlined text-[18px]">block</span>
                                  </button>
                                  <button onClick={() => {
                                    if (user?.role === 'admin') {
                                      openVoidItemModal(order);
                                    } else {
                                      setSelectedOrder(order);
                                      setPendingVoidAction('void-item');
                                      setSupervisorUserId('');
                                      setSupervisorPassword('');
                                      setSupervisorError('');
                                      setShowSupervisorAuth(true);
                                    }
                                  }}
                                    className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                    title="Void Per Item">
                                    <span className="material-symbols-outlined text-[18px]">indeterminate_check_box</span>
                                  </button>
                                </>
                              )}
                              {order.status === 'completed' && (
                                <button onClick={() => {
                                  setSelectedOrder(order);
                                  if (user?.role === 'admin') {
                                    voidPaymentOrder();
                                  } else {
                                    setPendingVoidAction('void-payment');
                                    setSupervisorUserId('');
                                    setSupervisorPassword('');
                                    setSupervisorError('');
                                    setShowSupervisorAuth(true);
                                  }
                                }}
                                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Void Pembayaran">
                                  <span className="material-symbols-outlined text-[18px]">payments</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="p-6 border-t border-gray-100 shrink-0 flex justify-center gap-2">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => fetchOrders(historyPage - 1)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  {historyPage} / {historyTotalPages}
                </span>
                <button
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => fetchOrders(historyPage + 1)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Detail Transaksi</h3>
              <button onClick={() => setShowOrderDetail(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                {selectedOrder.orderNumber && (
                  <span className="font-mono font-bold text-gray-700">{selectedOrder.orderNumber}</span>
                )}
                <span className="text-gray-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {new Date(selectedOrder.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-3">
                {selectedOrder.items?.map((item: any, i: number) => {
                  const voidedQty = selectedOrder.voidedItems
                    ?.filter((vi: any) => String(vi.itemId) === String(item._id))
                    ?.reduce((s: number, vi: any) => s + vi.qty, 0) || 0;
                  const remainingQty = item.qty - voidedQty;
                  return (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-800">{item.product?.name || 'Unknown'}</span>
                        <span className="text-gray-400 ml-1">x{item.qty}</span>
                        {voidedQty > 0 && (
                          <span className="text-red-500 text-xs ml-2">(void: {voidedQty}, sisa: {remainingQty})</span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-800">Rp {item.subtotal?.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              {selectedOrder.subtotal > 0 && (
                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Rp {selectedOrder.subtotal?.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.promotions?.length > 0 && selectedOrder.promotions.map((p: any, i: number) => (
                <div key={i} className="flex justify-between text-sm text-green-600">
                  <span>{p.name}</span>
                  <span>-Rp {p.discount?.toLocaleString()}</span>
                </div>
              ))}
              {selectedOrder.discountTotal > 0 && (
                <div className="flex justify-between text-sm font-semibold text-green-700">
                  <span>Total Diskon</span>
                  <span>-Rp {selectedOrder.discountTotal?.toLocaleString()}</span>
                </div>
              )}
              {selectedOrder.taxDetails?.map((t: any, i: number) => (
                <div key={i} className={`flex justify-between text-sm ${t.included ? 'text-amber-700' : 'text-gray-500'}`}>
                  <span>{t.name}{t.rate > 0 && ` (${t.rate}%)`}{t.included && ' [Inc]'}</span>
                  <span>Rp {(t.amount || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rp {selectedOrder.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Metode Pembayaran</span>
                <span className="font-semibold">{selectedOrder.paymentMethodName || 'N/A'}</span>
              </div>
              {selectedOrder.cashierName && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Kasir</span>
                  <span className="font-semibold">{selectedOrder.cashierName}</span>
                </div>
              )}
              {selectedOrder.memberName && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Member</span>
                  <span className="font-semibold">{selectedOrder.memberName}</span>
                </div>
              )}
              {selectedOrder.tableNumber && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Meja</span>
                  <span className="font-semibold">{selectedOrder.tableNumber}</span>
                </div>
              )}

              {/* Voided Items History */}
              {selectedOrder.voidedItems?.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <h4 className="text-sm font-bold text-red-600 mb-2">Riwayat Void</h4>
                  {selectedOrder.voidedItems.map((vi: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-red-500 mb-1">
                      <span className="flex-1">
                        {vi.productName || 'Unknown'} <span className="text-red-400">x{vi.qty}</span>
                        {vi.reason && <span className="text-gray-400 ml-1">- {vi.reason}</span>}
                        {vi.voidedByName && <span className="text-gray-400 ml-1">({vi.voidedByName})</span>}
                      </span>
                      <span className="text-gray-400">
                        {new Date(vi.voidedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(selectedOrder.status === 'voided' || selectedOrder.status === 'partially-voided') && (selectedOrder.voidedByName || selectedOrder.voidReason) && (
                <div className="border-t border-gray-100 pt-3 text-xs text-red-500 space-y-0.5">
                  {selectedOrder.voidedByName && <p>Dibatal oleh: {selectedOrder.voidedByName}</p>}
                  {selectedOrder.voidReason && <p>Alasan: {selectedOrder.voidReason}</p>}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-3">
              <button onClick={() => setShowOrderDetail(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Tutup
              </button>
              <button onClick={() => { setShowOrderDetail(false); printOrder(selectedOrder); }}
                className="flex-1 py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-colors">
                Print Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Auth Modal */}
      {showSupervisorAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-600 text-[28px]">verified_user</span>
              <h3 className="text-lg font-bold text-gray-800">Otorisasi Supervisor</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Kamu tidak memiliki izin void. Masukkan akun supervisor yang memiliki izin void.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">User ID</label>
                <input type="text" placeholder="user_id supervisor" value={supervisorUserId}
                  onChange={(e) => setSupervisorUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Password</label>
                <input type="password" placeholder="password" value={supervisorPassword}
                  onChange={(e) => setSupervisorPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifySupervisor()}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
              {supervisorError && <p className="text-sm text-red-500">{supervisorError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowSupervisorAuth(false); setSupervisorData(null); setPendingVoidAction(null); }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={verifySupervisor}
                className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors">
                Verifikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Order Modal */}
      {showVoidModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-red-600 text-[28px]">block</span>
              <h3 className="text-lg font-bold text-gray-800">Void Transaksi</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Yakin ingin void semua item di transaksi ini? Stok akan dikembalikan.
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Alasan Void</label>
              <input type="text" placeholder="Alasan (opsional)" value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowVoidModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={confirmVoidOrder}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                Void Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Per Item Modal */}
      {showVoidItemModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600 text-[28px]">indeterminate_check_box</span>
                <h3 className="text-lg font-bold text-gray-800">Void Per Item</h3>
              </div>
              <button onClick={() => setShowVoidItemModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-sm text-gray-500">Atur jumlah item yang ingin di-void:</p>
              {selectedOrder.items?.map((item: any) => {
                const voidedQty = selectedOrder.voidedItems
                  ?.filter((vi: any) => String(vi.itemId) === String(item._id))
                  ?.reduce((s: number, vi: any) => s + vi.qty, 0) || 0;
                const maxVoid = item.qty - voidedQty;
                if (maxVoid <= 0) return null;
                return (
                  <div key={item._id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{item.product?.name || 'Unknown'}</span>
                      <span className="text-gray-400 ml-1 text-sm">x{item.qty}</span>
                      {voidedQty > 0 && (
                        <span className="text-red-400 text-xs block">Sudah di-void: {voidedQty}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setVoidItemSelections((prev) => ({ ...prev, [item._id]: Math.max(0, (prev[item._id] || maxVoid) - 1) }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                      >
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="w-10 text-center font-bold text-gray-800">{voidItemSelections[item._id] || 0}</span>
                      <button
                        onClick={() => setVoidItemSelections((prev) => ({ ...prev, [item._id]: Math.min(maxVoid, (prev[item._id] || 0) + 1) }))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Alasan Void</label>
                <input type="text" placeholder="Alasan (opsional)" value={voidItemReason}
                  onChange={(e) => setVoidItemReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-3">
              <button onClick={() => setShowVoidItemModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={confirmVoidItems}
                disabled={Object.values(voidItemSelections).every((q) => q === 0)}
                className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50">
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Laporan Kasir Modal */}
      {showCashierReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-800">Laporan Kasir</h3>
              <button onClick={() => setShowCashierReport(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {reportLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-gray-400 text-sm font-semibold">Memuat...</div>
              </div>
            ) : !reportData ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center text-gray-400">
                  <span className="material-symbols-outlined text-[48px]">assessment</span>
                  <p className="mt-2">Tidak ada shift aktif</p>
                  <p className="text-xs mt-1">Buka shift terlebih dahulu</p>
                </div>
              </div>
            ) : (
              <div id="report-print" className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Shift Info */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="material-symbols-outlined text-[16px]">store</span>
                  {reportData.shift.outletName}
                  <span className="text-gray-300">|</span>
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {new Date(reportData.shift.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Total Penjualan */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <p className="text-sm text-blue-100 font-medium">Total Penjualan</p>
                  <p className="text-3xl font-extrabold mt-1">Rp {reportData.sales.total.toLocaleString()}</p>
                  <div className="flex gap-4 mt-3 text-sm text-blue-100">
                    <span>{reportData.sales.transactionCount} transaksi</span>
                  </div>
                </div>

                {/* Rincian Pembayaran */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">payments</span>
                    Rincian Pembayaran
                  </h4>
                  <div className="space-y-2">
                    {reportData.paymentBreakdown?.length > 0 ? (
                      reportData.paymentBreakdown.map((pm: any, i: number) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-medium text-gray-800">{pm.method}</span>
                            <span className="text-xs text-gray-400 ml-2">{pm.count} transaksi</span>
                          </div>
                          <span className="font-semibold text-gray-800">Rp {pm.total.toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">Belum ada transaksi</p>
                    )}
                    <div className="flex justify-between py-2 font-bold text-gray-800 border-t border-gray-200">
                      <span>Total</span>
                      <span>Rp {reportData.sales.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 font-semibold">
                      <span>Cash</span>
                      <span>Rp {reportData.sales.cash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-600 font-semibold">
                      <span>Non-Cash</span>
                      <span>Rp {reportData.sales.nonCash.toLocaleString()}</span>
                    </div>
                    {reportData.sales.voided > 0 && (
                      <div className="flex justify-between text-sm text-red-500 font-semibold">
                        <span>Void</span>
                        <span>-Rp {reportData.sales.voided.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Uang Tunai di Laci */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-gray-400">account_balance</span>
                    Uang Tunai di Laci
                  </h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Uang Awal</span>
                      <span className="font-semibold text-gray-800">Rp {reportData.cashDrawer.startingCash.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pembayaran Tunai</span>
                      <span className="font-semibold text-green-700">+ Rp {reportData.cashDrawer.cashSales.toLocaleString()}</span>
                    </div>
                    {reportData.cashDrawer.cashPickups?.length > 0 && (
                      <div className="border-t border-amber-200 pt-2 space-y-1">
                        {reportData.cashDrawer.cashPickups.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-red-600">
                            <span>Tarik: {p.reason}</span>
                            <span>- Rp {p.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tarik Uang</span>
                      <span className="font-semibold text-red-600">- Rp {reportData.cashDrawer.totalCashPickups.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-amber-300 pt-2 flex justify-between font-bold text-base">
                      <span>Total Uang di Laci</span>
                      <span className="text-gray-900">Rp {reportData.cashDrawer.expectedCash.toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPickupModal(true)}
                    className="mt-3 w-full py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">money_off</span>
                    Tarik Uang
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-3">
              <button onClick={() => setShowCashierReport(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Tutup
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarik Uang Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-600 text-[28px]">money_off</span>
              <h3 className="text-lg font-bold text-gray-800">Tarik Uang</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Ambil uang dari laci kasir</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Jumlah</label>
                <input type="number" placeholder="0" value={pickupAmount}
                  onChange={(e) => setPickupAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Keperluan</label>
                <input type="text" placeholder="Mis: setor bank" value={pickupReason}
                  onChange={(e) => setPickupReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPickupModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">
                Batal
              </button>
              <button onClick={confirmPickup}
                disabled={!pickupAmount || Number(pickupAmount) <= 0}
                className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                Tarik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modifier Selection Modal */}
      {showModifierModal && modifierProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#2176D2] text-[28px]">tune</span>
              <h3 className="text-lg font-bold text-gray-800">{modifierProduct.name}</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
              {modifierProduct.modifiers?.map((mod) => (
                <div key={mod._id}>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-bold text-gray-700">{mod.name}</label>
                    {mod.required && <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Wajib</span>}
                  </div>
                  <div className="space-y-1">
                    {mod.options.map((opt) => {
                      const selected = modifierSelections[mod._id]?.name === opt.name;
                      return (
                        <button
                          key={opt.name}
                          onClick={() => setModifierSelections((prev) => ({ ...prev, [mod._id]: opt }))}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            selected
                              ? 'bg-[#2176D2] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="font-medium">{opt.name}</span>
                          {opt.price > 0 && <span className={selected ? 'text-white' : 'text-gray-500'}>+ Rp {opt.price.toLocaleString()}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModifierModal(false); setModifierProduct(null); setModifierSelections({}); }}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmModifierSelection}
                className="flex-1 py-3 bg-[#2176D2] text-white font-bold rounded-xl hover:opacity-90 transition-colors"
              >
                Add ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Profile */}
          <div className="bg-[#2176D2] text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">person</span>
                </div>
                <div>
                  <p className="font-bold text-base">{user?.name || 'Kasir'}</p>
                  <p className="text-sm text-white/70 font-mono">{user?.userId}</p>
                </div>
              </div>
              <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
          </div>

          {/* Menu */}
          <div className="flex-1 p-4 space-y-1">
            <SidebarItem icon="person" label="Info Akun" />
            <button
              onClick={() => { setShowSidebar(false); setShowHistory(true); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[24px] text-gray-400">receipt_long</span>
              Riwayat Transaksi
            </button>
            <button
              onClick={() => { setShowSidebar(false); setShowCashierReport(true); fetchReport(); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[24px] text-gray-400">assessment</span>
              Laporan Kasir
            </button>
            <SidebarItem icon="history" label="Riwayat Shift" />
            <SidebarItem icon="settings" label="Pengaturan" />
            <SidebarItem icon="help" label="Bantuan" />
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => { setShowSidebar(false); logout(); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold"
            >
              <span className="material-symbols-outlined text-[24px]">logout</span>
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium">
      <span className="material-symbols-outlined text-[24px] text-gray-400">{icon}</span>
      {label}
    </button>
  );
}
