import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface PaymentBreakdown {
  method: string;
  code: string;
  total: number;
  count: number;
}

interface CashierReport {
  cashierName: string;
  totalSales: number;
  totalTransactions: number;
  paymentBreakdown: PaymentBreakdown[];
}

export default function ReportCashier() {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CashierReport[]>([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`/api/reports/cashier?startDate=${startDate}&endDate=${endDate}`, { headers })
      .then((r) => r.json())
      .then(setData);
  }, [startDate, endDate]);

  const totalAllSales = data.reduce((sum, c) => sum + c.totalSales, 0);
  const totalAllTx = data.reduce((sum, c) => sum + c.totalTransactions, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-[24px]">badge</span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold tracking-tight">LAPORAN PER KASIR</h3>
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

      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Total Pendapatan</h3>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">Rp {totalAllSales.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Total Transaksi</h3>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">{totalAllTx}</p>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-6">
            <h3 className="font-section-header text-section-header text-outline uppercase tracking-wider mb-2">Jumlah Kasir</h3>
            <p className="font-display-sm text-display-sm text-on-surface font-bold">{data.length}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {data.map((cashier) => (
          <div key={cashier.cashierName} className="bg-white border border-outline-variant rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">{cashier.cashierName}</h3>
                <p className="text-sm text-on-surface-variant">{cashier.totalTransactions} transaksi</p>
              </div>
              <p className="font-bold text-lg">Rp {cashier.totalSales.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              {cashier.paymentBreakdown.map((pm) => (
                <div key={pm.code} className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
                  <div>
                    <p className="font-semibold capitalize">{pm.method}</p>
                    <p className="text-sm text-on-surface-variant">{pm.count} transaksi</p>
                  </div>
                  <p className="font-semibold">Rp {pm.total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-center text-on-surface-variant py-12">Tidak ada data untuk periode ini</p>
        )}
      </div>
    </div>
  );
}
