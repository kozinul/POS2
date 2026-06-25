import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportSales() {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<{ summary: any; daily: any[]; byPayment: any[] } | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`, { headers })
      .then((r) => r.json())
      .then(setData);
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">bar_chart</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">LAPORAN PENJUALAN</h3>
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Total Pendapatan</h3>
              <p className="font-display-sm text-display-sm text-on-surface font-bold">Rp {data.summary.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Total Transaksi</h3>
              <p className="font-display-sm text-display-sm text-on-surface font-bold">{data.summary.totalOrders}</p>
            </div>
            <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
              <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Rata-rata Pesanan</h3>
              <p className="font-display-sm text-display-sm text-on-surface font-bold">Rp {Math.round(data.summary.avgOrderValue).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Penjualan Harian</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-highest/50 border-b border-outline-variant">
                    <tr>
                      <th className="p-2 font-section-header text-section-header text-outline uppercase tracking-wider">Tanggal</th>
                      <th className="p-2 font-section-header text-section-header text-outline uppercase tracking-wider">Pendapatan</th>
                      <th className="p-2 font-section-header text-section-header text-outline uppercase tracking-wider">Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {data.daily.map((d: any) => (
                      <tr key={d._id} className="table-row-hover transition-colors">
                        <td className="p-2 font-body-md text-body-md text-on-surface">{new Date(d._id).toLocaleDateString('id')}</td>
                        <td className="p-2 font-body-md text-body-md font-semibold">Rp {d.revenue.toLocaleString()}</td>
                        <td className="p-2 font-body-md text-body-md">{d.orders}</td>
                      </tr>
                    ))}
                    {data.daily.length === 0 && (
                      <tr><td colSpan={3} className="p-4 text-center text-on-surface-variant">Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Metode Pembayaran</h3>
              <div className="space-y-4">
                {data.byPayment.map((p: any) => (
                  <div key={p._id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                    <div>
                      <p className="font-semibold capitalize">{p._id}</p>
                      <p className="text-sm text-on-surface-variant">{p.orders} transaksi</p>
                    </div>
                    <p className="font-bold text-lg">Rp {p.revenue.toLocaleString()}</p>
                  </div>
                ))}
                {data.byPayment.length === 0 && (
                  <p className="text-center text-on-surface-variant">Tidak ada data</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
