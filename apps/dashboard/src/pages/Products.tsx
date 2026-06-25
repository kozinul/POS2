import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';

interface Outlet {
  _id: string;
  name: string;
  code: string;
}

interface Tax {
  _id: string;
  name: string;
  rate: number;
  active: boolean;
}

interface Category {
  _id: string;
  name: string;
  family?: { _id: string; name: string } | string;
}

interface Family { _id: string; name: string }

interface ProductTax {
  tax: { _id: string; name: string; rate: number };
  included: boolean;
}

interface Modifier {
  _id: string;
  name: string;
  options: { name: string; price: number }[];
  family?: { _id: string; name: string } | string;
}

interface Product {
  _id: string;
  name: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  image?: string;
  stock: number;
  stockManagement: boolean;
  taxes: ProductTax[];
  discount: number;
  category: { _id: string; name: string };
  outlets: Outlet[];
  modifiers: Modifier[];
  active: boolean;
}

export default function Products() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', barcode: '', price: '', costPrice: '', image: '', stock: '',
    stockManagement: true, taxes: [] as { id: string; included: boolean }[], discount: '0',
    category: '', outlets: [] as string[], modifiers: [] as string[], active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories);
    fetch('/api/taxes').then((r) => r.json()).then(setTaxes);
    fetch('/api/outlets').then((r) => r.json()).then(setOutlets);
    fetch('/api/modifiers').then((r) => r.json()).then(setModifiers);
    fetch('/api/families').then((r) => r.json()).then(setFamilies);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('search', search);
    fetch(`/api/products?${params}`).then((r) => r.json()).then((data) => {
      setProducts(data.products);
      setTotalPages(data.totalPages);
    });
  }, [page, search]);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  function resetForm() {
    setForm({ name: '', barcode: '', price: '', costPrice: '', image: '', stock: '', stockManagement: true, taxes: [], discount: '0', category: '', outlets: [], modifiers: [], active: true });
  }

  async function saveProduct() {
    try {
      const body: Record<string, any> = {
        ...form,
        price: Number(form.price),
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        stock: form.stockManagement ? Number(form.stock) : 0,
        discount: Number(form.discount) || 0,
        taxes: form.taxes.map((ft) => ({ tax: ft.id, included: ft.included })),
        active: form.active,
        barcode: form.barcode || undefined,
        image: form.image || undefined,
        modifiers: form.modifiers,
      };
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).message || 'Gagal menyimpan');
      await Swal.fire({ icon: 'success', title: 'Berhasil', text: editingId ? 'Produk diperbarui' : 'Produk ditambahkan', timer: 1500, showConfirmButton: false });
      setShowForm(false);
      setEditingId(null);
      resetForm();
      window.location.reload();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    }
  }

  async function deleteProduct(id: string) {
    const result = await Swal.fire({ icon: 'question', title: 'Hapus produk?', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal' });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Gagal menghapus');
      await Swal.fire({ icon: 'success', title: 'Dihapus', timer: 1500, showConfirmButton: false });
      window.location.reload();
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message });
    }
  }

  function editProduct(product: Product) {
    setForm({
      name: product.name,
      barcode: product.barcode || '',
      image: product.image || '',
      price: String(product.price),
      costPrice: product.costPrice ? String(product.costPrice) : '',
      stock: String(product.stock),
      stockManagement: product.stockManagement,
      taxes: product.taxes?.filter((t) => t.tax).map((t) => ({ id: t.tax._id, included: t.included })) || [],
      active: product.active,
      discount: String(product.discount),
      category: typeof product.category === 'object' ? product.category._id : product.category,
      outlets: product.outlets?.map((o) => o._id) || [],
      modifiers: product.modifiers?.map((m) => m._id) || [],
    });
    setEditingId(product._id);
    setShowForm(true);
  }

  const selectedCategory = categories.find((c) => c._id === form.category);
  const categoryFamily = selectedCategory && typeof selectedCategory.family === 'object' ? selectedCategory.family?._id : null;
  const availableModifiers = useMemo(() => modifiers.filter((m) => {
    const mFamily = typeof m.family === 'object' ? m.family?._id : m.family;
    return !mFamily || mFamily === categoryFamily;
  }), [modifiers, categoryFamily]);

  const selectedTaxes = taxes.filter((t) => form.taxes.some((ft) => ft.id === t._id));
  const totalTaxRate = selectedTaxes.reduce((sum, t) => sum + t.rate, 0);
  const includedTaxes = form.taxes.filter((ft) => ft.included).map((ft) => ft.id);
  const excludedTaxes = form.taxes.filter((ft) => !ft.included).map((ft) => ft.id);

  function toggleTax(taxId: string) {
    setForm((prev) => ({
      ...prev,
      taxes: prev.taxes.some((ft) => ft.id === taxId)
        ? prev.taxes.filter((ft) => ft.id !== taxId)
        : [...prev.taxes, { id: taxId, included: true }],
    }));
  }

  function toggleInclude(taxId: string) {
    setForm((prev) => ({
      ...prev,
      taxes: prev.taxes.map((ft) =>
        ft.id === taxId ? { ...ft, included: !ft.included } : ft
      ),
    }));
  }

  function toggleOutlet(outletId: string) {
    setForm((prev) => ({
      ...prev,
      outlets: prev.outlets.includes(outletId)
        ? prev.outlets.filter((id) => id !== outletId)
        : [...prev.outlets, outletId],
    }));
  }

  function toggleModifier(modId: string) {
    setForm((prev) => ({
      ...prev,
      modifiers: prev.modifiers.includes(modId)
        ? prev.modifiers.filter((id) => id !== modId)
        : [...prev.modifiers, modId],
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">inventory_2</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">KELOLA PRODUK</h3>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Produk
        </button>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low">
          <div className="relative w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input type="text" placeholder="Cari produk..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
              <tr>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Gambar</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Nama</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Status</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Harga Jual</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Modal</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Laba</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Pajak</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Diskon</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Stok</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Outlet</th>
                <th className="p-table_cell_padding font-section-header text-section-header text-outline uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {products.map((p) => (
                <tr key={p._id} className={`table-row-hover transition-colors ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="p-table_cell_padding">
                    {p.image ? (
                      <img src={p.image} alt="" className="w-10 h-10 rounded object-cover border border-outline-variant" />
                    ) : (
                      <span className="material-symbols-outlined text-outline text-[24px]">inventory_2</span>
                    )}
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface font-semibold">{p.name}</td>
                  <td className="p-table_cell_padding">
                    <span className={`status-pill ${p.active ? 'status-active' : 'status-inactive'}`}>{p.active ? 'Aktif' : 'Nonaktif'}</span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md">Rp {p.price.toLocaleString()}</td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {p.costPrice != null ? `Rp ${p.costPrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md">
                    {p.costPrice != null ? (
                      <span className={p.price - p.costPrice >= 0 ? 'text-green-700' : 'text-red-600'}>
                        Rp {(p.price - p.costPrice).toLocaleString()}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-table_cell_padding">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${p.taxes?.length > 0 && p.taxes.every((pt) => pt.included) ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                      {p.taxes?.length > 0 && p.taxes.every((pt) => pt.included) ? 'Include' : 'Exclude'}
                    </span>
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md text-on-surface-variant">
                    {p.discount > 0 ? `${p.discount}%` : '-'}
                  </td>
                  <td className="p-table_cell_padding font-body-md text-body-md">
                    {p.stockManagement ? p.stock : <span className="text-xs text-gray-400 italic">Fleksibel</span>}
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex flex-wrap gap-1">
                      {p.outlets?.length > 0
                        ? p.outlets.map((o) => (
                            <span key={o._id} className="text-xs bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">
                              {o.code}
                            </span>
                          ))
                        : <span className="text-xs text-gray-400 italic">Semua</span>
                      }
                    </div>
                  </td>
                  <td className="p-table_cell_padding">
                    <div className="flex items-center gap-2">
                      <button onClick={() => editProduct(p)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => deleteProduct(p._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">delete</span>Hapus
                      </button>
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
            <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}>{p}</button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 p-6 border border-outline-variant max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-3">
              {editingId ? 'Edit Produk' : 'Tambah Produk'}
              {editingId && <span className={`status-pill ${form.active ? 'status-active' : 'status-inactive'}`}>{form.active ? 'Aktif' : 'Nonaktif'}</span>}
            </h3>
            <div className="flex flex-col gap-4">
              <input placeholder="Nama Produk" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <div className="flex gap-3">
                <input placeholder="Barcode (opsional)" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="flex-1 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1 px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Image */}
              <div>
                <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Gambar</label>
                <div className="flex items-center gap-4">
                  {form.image && (
                    <img src={form.image} alt="preview" className="w-20 h-20 rounded-lg object-cover border border-outline-variant" />
                  )}
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('image', file);
                    const res = await fetch('/api/upload', { method: 'POST', body: fd });
                    if (!res.ok) return Swal.fire({ icon: 'error', title: 'Gagal upload' });
                    const data = await res.json();
                    setForm((prev) => ({ ...prev, image: data.url }));
                  }} className="text-sm" />
                  {form.image && (
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: '' }))} className="text-xs text-red-500 font-semibold">Hapus</button>
                  )}
                </div>
              </div>

              {/* Price & Tax side by side */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Harga Jual</label>
                  <input type="number" placeholder="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <p className="text-[10px] text-on-surface-variant mt-1 italic">Harga yang dibayar pelanggan</p>
                </div>
                <div className="w-36">
                  <label className="text-xs text-on-surface-variant font-semibold mb-1 block">Harga Pokok (Modal)</label>
                  <input type="number" placeholder="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <p className="text-[10px] text-on-surface-variant mt-1 italic">Modal / HPP (opsional)</p>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Pajak & Service</label>
                  {taxes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Buat pajak terlebih dahulu.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {taxes.filter((t) => t.active).map((t) => {
                        const selected = form.taxes.find((ft) => ft.id === t._id);
                        return (
                          <div key={t._id} className="flex items-stretch">
                            <label className={`flex items-center gap-1 px-2 py-1.5 rounded-l-lg border text-xs cursor-pointer transition-colors ${selected ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                              <input type="checkbox" checked={!!selected} onChange={() => toggleTax(t._id)} className="hidden" />
                              <span className="material-symbols-outlined text-[14px]">{selected ? 'check_box' : 'check_box_outline_blank'}</span>
                              {t.name} ({t.rate}%)
                            </label>
                            {selected && (
                              <button type="button" onClick={() => toggleInclude(t._id)} className={`px-1.5 py-1.5 rounded-r-lg border border-l-0 text-[10px] font-semibold transition-colors ${selected.included ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                {selected.included ? 'Inc' : 'Exc'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {form.price && includedTaxes.length > 0 && (() => {
                const priceNum = Number(form.price);
                const totalIncRate = selectedTaxes.filter((t) => includedTaxes.includes(t._id)).reduce((sum, t) => sum + t.rate, 0);
                const basePrice = Math.round(priceNum * 100 / (100 + totalIncRate));
                return (
                  <div className="bg-surface-container-low rounded-lg px-4 py-3 space-y-1">
                    <div className="text-sm font-semibold text-on-surface-variant">Sudah termasuk dalam harga</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Harga sebelum pajak</span>
                      <span className="font-medium">Rp {basePrice.toLocaleString()}</span>
                    </div>
                    {selectedTaxes.filter((t) => includedTaxes.includes(t._id)).map((t) => {
                      const taxAmount = Math.round(basePrice * t.rate / 100);
                      return (
                        <div key={t._id} className="flex justify-between text-sm">
                          <span className="text-on-surface-variant">{t.name} ({t.rate}%)</span>
                          <span className="font-medium">Rp {taxAmount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                    <div className="border-t border-outline-variant pt-1 flex justify-between text-sm font-bold">
                      <span>Total harga jual</span>
                      <span>Rp {priceNum.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
              {form.price && excludedTaxes.length > 0 && (
                <div className="bg-surface-container-low rounded-lg px-4 py-3 space-y-1">
                  <div className="text-sm font-semibold text-on-surface-variant">Akan ditambahkan</div>
                  {selectedTaxes.filter((t) => excludedTaxes.includes(t._id)).map((t) => {
                    const taxAmount = Math.round(Number(form.price) * t.rate / 100);
                    return (
                      <div key={t._id} className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">{t.name} ({t.rate}%)</span>
                        <span className="font-medium">Rp {taxAmount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-outline-variant pt-1 flex justify-between text-sm font-bold">
                    <span>Total + pajak</span>
                    <span>Rp {Math.round(Number(form.price) * (1 + excludedTaxes.reduce((sum, id) => {
                      const t = taxes.find((tx) => tx._id === id);
                      return sum + (t?.rate || 0);
                    }, 0) / 100)).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Discount */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-on-surface-variant shrink-0">Diskon</label>
                <input type="number" placeholder="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="w-24 px-3 py-2 border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <span className="text-sm text-on-surface-variant">%</span>
              </div>

              {/* Stock Management */}
              <div className="border-t border-outline-variant pt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                  <input type="checkbox" checked={form.stockManagement} onChange={(e) => setForm({ ...form, stockManagement: e.target.checked })} className="rounded border-outline-variant" />
                  Kelola Stok
                </label>
                {form.stockManagement ? (
                  <input type="number" placeholder="Jumlah Stok" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                ) : (
                  <p className="text-sm text-on-surface-variant italic">Stok tidak dikelola — hanya mencatat item terjual</p>
                )}
              </div>

              {/* Outlet Assignment */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Tersedia di Outlet</label>
                {outlets.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Tidak ada outlet. Buat outlet terlebih dahulu.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {outlets.map((o) => (
                      <label key={o._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${form.outlets.includes(o._id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                        <input type="checkbox" checked={form.outlets.includes(o._id)} onChange={() => toggleOutlet(o._id)} className="hidden" />
                        <span className="material-symbols-outlined text-[16px]">{form.outlets.includes(o._id) ? 'check_box' : 'check_box_outline_blank'}</span>
                        {o.name} ({o.code})
                      </label>
                    ))}
                  </div>
                )}
                {form.outlets.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 italic">Kosong = tersedia di semua outlet</p>
                )}
              </div>

              {/* Modifier Assignment */}
              <div className="border-t border-outline-variant pt-3">
                <label className="text-sm font-semibold text-on-surface-variant mb-2 block">Modifier / Opsi</label>
                {availableModifiers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Tidak ada modifier untuk family ini. Buat modifier tanpa family (global) atau dengan family yang sesuai.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableModifiers.map((m) => {
                      const selected = form.modifiers.includes(m._id);
                      return (
                        <label key={m._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${selected ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleModifier(m._id)} className="hidden" />
                          <span className="material-symbols-outlined text-[16px]">{selected ? 'check_box' : 'check_box_outline_blank'}</span>
                          {m.name}
                          <span className="text-[10px] text-on-surface-variant">({m.options.length} opsi)</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {form.modifiers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 italic">Kosong = tidak ada modifier untuk produk ini</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-outline-variant pt-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-outline-variant" />
                Produk Aktif
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-semibold text-on-surface-variant bg-surface-container-low rounded-lg hover:bg-surface-container-high transition-colors">Batal</button>
                <button onClick={saveProduct} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
