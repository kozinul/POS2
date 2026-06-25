import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash', 'qris', 'debit']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/settings', { headers })
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setCompanyName(data.companyName || '');
        setCurrency(data.currency || 'IDR');
        setPaymentMethods(data.paymentMethods || ['cash', 'qris', 'debit']);
      });
  }, []);

  async function saveGeneral() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ key: 'companyName', value: companyName }),
    });
    await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ key: 'currency', value: currency }),
    });
    await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ key: 'paymentMethods', value: paymentMethods }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function togglePayment(method: string) {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">settings</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">PENGATURAN</h3>
      </div>

      {/* Pengaturan Umum */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Pengaturan Umum</h4>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Nama Perusahaan</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Mata Uang</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <option value="IDR">IDR (Rp)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metode Pembayaran */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Metode Pembayaran</h4>
        <div className="flex flex-col gap-3">
          {[
            { value: 'cash', label: 'Tunai', icon: 'payments' },
            { value: 'qris', label: 'QRIS', icon: 'qr_code' },
            { value: 'debit', label: 'Debit / Kartu', icon: 'credit_card' },
          ].map((method) => (
            <label key={method.value} className="flex items-center gap-3 p-3 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors">
              <input
                type="checkbox"
                checked={paymentMethods.includes(method.value)}
                onChange={() => togglePayment(method.value)}
                className="rounded border-outline-variant"
              />
              <span className="material-symbols-outlined text-on-surface-variant">{method.icon}</span>
              <span className="font-body-md text-body-md text-on-surface">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sinkronisasi */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Status Sinkronisasi</h4>
        <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="font-body-md text-body-md text-on-surface">Sistem terhubung — semua outlet dalam keadaan sinkron</span>
        </div>
        <button className="mt-4 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
          Sinkronkan Semua Outlet
        </button>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button onClick={saveGeneral} disabled={saving} className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
        {saved && <span className="text-sm text-green-600 font-semibold">Pengaturan tersimpan!</span>}
      </div>
    </div>
  );
}
