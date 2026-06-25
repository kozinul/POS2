import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface OutletPromotion {
  name: string;
  code: string;
  requiresCode: boolean;
}

interface OnlineOutlet {
  outletId: string;
  outletName: string;
  cashiers: string[];
  revenue: number;
  transactions: number;
  bestSellingProduct: string;
  bestSellingQty: number;
  promotions: OutletPromotion[];
}

interface TopProduct {
  productName: string;
  qty: number;
}

interface FamilyTopProducts {
  familyId: string;
  familyName: string;
  products: TopProduct[];
}

interface Summary {
  totalRevenue: number;
  totalTransactions: number;
  onlineOutlets: OnlineOutlet[];
  topProductsByFamily: FamilyTopProducts[];
}

const summaryCard = 'bg-white border border-outline-variant rounded-xl shadow-sm p-5 flex flex-col gap-2';

function useClock() {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const clock = useClock();

  useEffect(() => {
    fetch('/api/summary', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => {});
  }, []);

  if (!summary) return <div className="text-on-surface-variant">Memuat...</div>;

  const dateStr = clock.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = clock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <>
      <div className="text-sm text-on-surface-variant mb-2">
        <span className="font-semibold">{dateStr}</span> &mdash; {timeStr}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={summaryCard}>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Pendapatan Hari Ini</h3>
          </div>
          <p className="font-display-sm text-display-sm text-on-surface font-bold">
            Rp {summary.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className={summaryCard}>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Total Transaksi</h3>
          </div>
          <p className="font-display-sm text-display-sm text-on-surface font-bold">
            {summary.totalTransactions}
          </p>
        </div>
        <div className={summaryCard}>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary text-[24px]">leaderboard</span>
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Rating Outlet</h3>
          </div>
          {summary.onlineOutlets.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Belum ada transaksi</p>
          ) : (
            <div className="flex flex-col gap-1 mt-1">
              {[...summary.onlineOutlets]
                .sort((a, b) => b.transactions - a.transactions)
                .slice(0, 3)
                .map((o, i) => (
                  <div key={o.outletId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-700'
                      }`}>{i + 1}</span>
                      <span className="truncate max-w-[140px]">{o.outletName}</span>
                    </span>
                    <span className="font-semibold text-on-surface">{o.transactions} tx</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Online Outlets Cards */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">store</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">OUTLET ONLINE</h3>
        </div>
        {summary.onlineOutlets.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Tidak ada outlet online</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.onlineOutlets.map((o) => (
              <div key={o.outletId} className={summaryCard}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">storefront</span>
                  <h4 className="font-label-md text-label-md text-on-surface font-bold">{o.outletName}</h4>
                </div>
                <div className="flex flex-col gap-1 text-sm text-on-surface-variant mt-1">
                  <div className="flex justify-between">
                    <span>Kasir</span>
                    <span className="font-medium text-on-surface">{o.cashiers.join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pendapatan</span>
                    <span className="font-medium text-on-surface">Rp {o.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaksi</span>
                    <span className="font-medium text-on-surface">{o.transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produk Terlaris</span>
                    <span className="font-medium text-on-surface text-right max-w-[180px] truncate">
                      {o.bestSellingProduct !== '-' ? `${o.bestSellingProduct} (${o.bestSellingQty})` : '-'}
                    </span>
                  </div>
                  {o.promotions?.length > 0 && (
                    <div className="border-t border-outline-variant pt-3 mt-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Promo Aktif</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {o.promotions.map((p) => (
                          <span key={p.code} className="text-xs bg-primary/15 text-primary font-semibold px-3 py-1 rounded-full border border-primary/30">
                            {p.requiresCode ? p.code : p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top 5 Products by Family */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">bar_chart</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">5 PRODUK FAVORIT PER FAMILY</h3>
        </div>
        {summary.topProductsByFamily.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Belum ada data penjualan hari ini</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.topProductsByFamily.map((f) => (
              <div key={f.familyId} className={summaryCard}>
                <h4 className="font-label-md text-label-md text-primary font-bold mb-2">{f.familyName}</h4>
                <ol className="list-decimal list-inside text-sm text-on-surface space-y-1">
                  {f.products.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{p.productName}</span>
                      <span className="font-medium text-on-surface-variant shrink-0">{p.qty} terjual</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
