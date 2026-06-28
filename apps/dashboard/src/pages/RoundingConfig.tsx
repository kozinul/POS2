import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROUNDING_METHODS = [
  { value: 'no_rounding', label: 'Tanpa Pembulatan' },
  { value: 'nearest_100', label: 'Ke 100 Terdekat (Rp 1.100 → Rp 1.100)' },
  { value: 'nearest_500', label: 'Ke 500 Terdekat (Rp 1.100 → Rp 1.000)' },
  { value: 'nearest_1000', label: 'Ke 1000 Terdekat (Rp 1.100 → Rp 1.000)' },
  { value: 'round_up_100', label: 'Naikkan ke 100 (Rp 1.101 → Rp 1.200)' },
  { value: 'round_down_100', label: 'Turunkan ke 100 (Rp 1.199 → Rp 1.100)' },
];

export default function RoundingConfig() {
  const { token } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState('nearest_100');
  const [maxAdjustment, setMaxAdjustment] = useState(1000);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/settings', { headers })
      .then((r) => r.json())
      .then((data) => {
        const rc = data.roundingConfig || {};
        setEnabled(rc.enabled ?? true);
        setMethod(rc.method || 'nearest_100');
        setMaxAdjustment(rc.maxRoundingAdjustment ?? 1000);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        key: 'roundingConfig',
        value: { enabled, method, maxRoundingAdjustment: Number(maxAdjustment) },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const preview = (() => {
    if (!enabled || method === 'no_rounding') return null;
    const examples = [1100, 1250, 11000, 50250];
    return examples.map((amount) => {
      let rounded: number;
      switch (method) {
        case 'nearest_100': rounded = Math.round(amount / 100) * 100; break;
        case 'nearest_500': rounded = Math.round(amount / 500) * 500; break;
        case 'nearest_1000': rounded = Math.round(amount / 1000) * 1000; break;
        case 'round_up_100': rounded = Math.ceil(amount / 100) * 100; break;
        case 'round_down_100': rounded = Math.floor(amount / 100) * 100; break;
        default: rounded = amount;
      }
      return { amount, rounded, adjustment: rounded - amount };
    });
  })();

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">currency_exchange</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">PEMBULATAN UANG TUNAI</h3>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Pengaturan Pembulatan</h4>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 p-3 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-low transition-colors">
            <input type="checkbox" checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-outline-variant w-5 h-5" />
            <div>
              <span className="font-body-md text-body-md text-on-surface font-semibold">Aktifkan Pembulatan Uang Tunai</span>
              <p className="text-sm text-on-surface-variant mt-0.5">Terapkan pembulatan otomatis untuk pembayaran tunai</p>
            </div>
          </label>

          {enabled && (
            <>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Metode Pembulatan</label>
                <select value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {ROUNDING_METHODS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Maks. Penyesuaian (Rp)</label>
                <input type="number" placeholder="1000" value={maxAdjustment}
                  onChange={(e) => setMaxAdjustment(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                <p className="text-xs text-on-surface-variant mt-1">Jika selisih pembulatan melebihi batas ini, pembulatan tidak diterapkan</p>
              </div>
            </>
          )}
        </div>
      </div>

      {enabled && method !== 'no_rounding' && (
        <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Pratinjau Pembulatan</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-2 pr-4 font-section-header text-section-header text-outline uppercase">Total</th>
                  <th className="py-2 px-4 font-section-header text-section-header text-outline uppercase">Dibulatkan</th>
                  <th className="py-2 pl-4 font-section-header text-section-header text-outline uppercase">Penyesuaian</th>
                </tr>
              </thead>
              <tbody>
                {preview?.map((p, i) => (
                  <tr key={i} className="border-b border-outline-variant/50">
                    <td className="py-3 pr-4 font-body-md text-body-md text-on-surface">Rp {p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 font-body-md text-body-md font-semibold text-on-surface">Rp {p.rounded.toLocaleString()}</td>
                    <td className={`py-3 pl-4 font-body-md text-body-md font-semibold ${p.adjustment > 0 ? 'text-amber-600' : p.adjustment < 0 ? 'text-green-600' : 'text-on-surface'}`}>
                      {p.adjustment > 0 ? '+' : ''}Rp {p.adjustment.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving}
          className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
        {saved && <span className="text-sm text-green-600 font-semibold">Pengaturan tersimpan!</span>}
      </div>
    </div>
  );
}
