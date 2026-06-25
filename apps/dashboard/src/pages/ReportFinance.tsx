import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportFinance() {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`/api/reports/finance?startDate=${startDate}&endDate=${endDate}`, { headers })
      .then((r) => r.json())
      .then(setData);
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">account_balance</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">LAPORAN KEUANGAN</h3>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-on-surface-variant">Dari</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-outline-variant rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-on-surface-variant">Sampai</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-outline-variant rounded-lg text-sm" />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">payments</span>
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Total Pendapatan</h3>
            </div>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">Rp {data.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Total Transaksi</h3>
            </div>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">{data.totalOrders}</p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">receipt</span>
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Estimasi Pajak (PPN)</h3>
            </div>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">Rp {data.taxEstimate.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider">Pendapatan Bersih</h3>
            </div>
            <p className="font-display-sm text-display-sm text-green-600 font-bold">Rp {data.netRevenue.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
