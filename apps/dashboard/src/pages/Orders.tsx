import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

interface Outlet { _id: string; name: string }
interface User { _id: string; name: string; role: string }

interface Order {
  _id: string;
  orderNumber?: string;
  items: { product: { name: string }; qty: number; price: number; subtotal: number }[];
  total: number;
  subtotal?: number;
  taxDetails?: { name: string; rate: number; amount: number }[];
  paymentMethod: { _id: string; name: string } | string;
  paymentMethodName?: string;
  cashAmount?: number;
  change?: number;
  cashier: { name: string };
  outletName?: string;
  status: 'completed' | 'voided';
  voidReason?: string;
  createdAt: string;
  tableNumber?: string;
  customerName?: string;
}

export default function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [filterStart, setFilterStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterEnd, setFilterEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterOutlet, setFilterOutlet] = useState('');
  const [filterCashier, setFilterCashier] = useState('');
  const [search, setSearch] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  function loadOrders() {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (filterStart) params.set('startDate', filterStart);
    if (filterEnd) params.set('endDate', filterEnd);
    if (filterOutlet) params.set('outlet', filterOutlet);
    if (filterCashier) params.set('cashier', filterCashier);
    if (search) params.set('search', search);
    fetch(`/api/orders?${params}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders);
        setTotalPages(data.totalPages);
      });
  }

  useEffect(() => {
    fetch('/api/outlets').then((r) => r.json()).then(setOutlets);
    fetch('/api/users', { headers }).then((r) => r.json()).then((users) => setCashiers(users.filter((u: User) => u.role === 'cashier')));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [page, token, filterStart, filterEnd, filterOutlet, filterCashier, search]);

  async function handleVoid() {
    if (!voidTarget) return;
    const res = await fetch(`/api/orders/${voidTarget._id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ reason: voidReason }),
    });
    if (!res.ok) {
      const err = await res.json();
      Swal.fire({ icon: 'error', title: 'Gagal Void', text: err.message });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Transaksi di-void', timer: 1500, showConfirmButton: false });
    setVoidTarget(null);
    setVoidReason('');
    loadOrders();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">receipt_long</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">DAFTAR TRANSAKSI</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-outline uppercase tracking-wider">Cari</label>
          <input type="text" placeholder="No. transaksi, pelanggan, kasir, meja..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md w-72 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-outline uppercase tracking-wider">Dari</label>
          <input type="date" value={filterStart} onChange={(e) => { setFilterStart(e.target.value); setPage(1); }} className="px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-outline uppercase tracking-wider">Sampai</label>
          <input type="date" value={filterEnd} onChange={(e) => { setFilterEnd(e.target.value); setPage(1); }} className="px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-outline uppercase tracking-wider">Outlet</label>
          <select value={filterOutlet} onChange={(e) => { setFilterOutlet(e.target.value); setPage(1); }} className="px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Semua Outlet</option>
            {outlets.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-outline uppercase tracking-wider">Kasir</label>
          <select value={filterCashier} onChange={(e) => { setFilterCashier(e.target.value); setPage(1); }} className="px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="">Semua Kasir</option>
            {cashiers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <button onClick={() => { setFilterStart(new Date().toISOString().slice(0, 10)); setFilterEnd(new Date().toISOString().slice(0, 10)); setFilterOutlet(''); setFilterCashier(''); setSearch(''); setPage(1); }} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
          Reset
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Transaksi</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Tanggal</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Kasir</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Total</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {orders.map((o) => (
                <tr key={o._id} className={`table-row-hover transition-colors ${o.status === 'voided' ? 'opacity-50' : ''}`}>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{o.orderNumber || o._id.slice(-8)}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{new Date(o.createdAt).toLocaleString('id')}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{o.cashier?.name || '-'}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">{o.outletName || '-'}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md font-semibold">Rp {o.total.toLocaleString()}</td>
                  <td className="p-table_cell_padding">
                    {o.status === 'voided' ? (
                      <span className="status-pill bg-error/15 text-error font-semibold text-[11px]">VOID</span>
                    ) : (
                      <span className="status-pill bg-success/15 text-success font-semibold text-[11px]">BERHASIL</span>
                    )}
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(o)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Detail
                      </button>
                      {o.status === 'completed' && (
                        <button onClick={() => { setVoidTarget(o); setVoidReason(''); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">block</span>
                          Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                p === page
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 border border-outline-variant">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Detail Transaksi</h3>
              {selected.status === 'voided' && (
                <span className="status-pill bg-error/15 text-error font-semibold text-[11px]">VOID</span>
              )}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Transaksi:</span><span className="font-semibold">{selected.orderNumber || selected._id.slice(-8)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Outlet:</span><span className="font-semibold">{selected.outletName || '-'}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Kasir:</span><span className="font-semibold">{selected.cashier?.name}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Waktu:</span><span className="font-semibold">{new Date(selected.createdAt).toLocaleString('id')}</span></div>
              {selected.voidReason && <div className="flex justify-between"><span className="text-on-surface-variant">Alasan Void:</span><span className="font-semibold text-error">{selected.voidReason}</span></div>}
            </div>
            <hr className="my-3 border-outline-variant" />
            <div className="flex flex-col gap-2">
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-on-surface">{item.product?.name} <span className="text-on-surface-variant">x{item.qty}</span></span>
                  <span className="font-semibold">Rp {item.subtotal.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <hr className="my-3 border-outline-variant" />
            {!!selected.subtotal && (
              <div className="flex justify-between text-sm text-on-surface-variant mb-1">
                <span>Subtotal</span>
                <span>Rp {(selected.subtotal || 0).toLocaleString()}</span>
              </div>
            )}
            {!!(selected.taxDetails?.length) && selected.taxDetails!.map((t: any, i: number) => (
              <div key={i} className="flex justify-between text-sm text-on-surface-variant">
                <span>{t.name}{t.rate > 0 && ` (${t.rate}%)`}</span>
                <span>Rp {(t.amount || 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-outline-variant">
              <span>Total</span>
              <span>Rp {selected.total.toLocaleString()}</span>
            </div>
            <hr className="my-3 border-outline-variant" />
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Metode:</span><span className="font-semibold">{selected.paymentMethodName || (typeof selected.paymentMethod === 'object' ? selected.paymentMethod.name : selected.paymentMethod)}</span></div>
              {selected.cashAmount && <div className="flex justify-between"><span className="text-on-surface-variant">Bayar:</span><span className="font-semibold">Rp {selected.cashAmount.toLocaleString()}</span></div>}
              {selected.change && <div className="flex justify-between"><span className="text-on-surface-variant">Kembali:</span><span className="font-semibold">Rp {selected.change.toLocaleString()}</span></div>}
              {selected.tableNumber && <div className="flex justify-between"><span className="text-on-surface-variant">Meja:</span><span className="font-semibold">{selected.tableNumber}</span></div>}
              {selected.customerName && <div className="flex justify-between"><span className="text-on-surface-variant">Pelanggan:</span><span className="font-semibold">{selected.customerName}</span></div>}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-outline-variant">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-error text-[28px]">warning</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Void Transaksi</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Yakin ingin void transaksi <span className="font-semibold text-on-surface">{voidTarget.orderNumber || `#${voidTarget._id.slice(-8)}`}</span>?
              Stok akan dikembalikan.
            </p>
            <textarea
              placeholder="Alasan void (opsional)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-error/20 focus:border-error resize-none h-20"
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setVoidTarget(null)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">
                Batal
              </button>
              <button onClick={handleVoid} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-error rounded-lg hover:bg-error/90 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-[18px]">block</span>
                Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
