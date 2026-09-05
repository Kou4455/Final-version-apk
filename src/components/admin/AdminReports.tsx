import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  DollarSign, 
  Car, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const { triggerSound } = useRide();
  const [dateRange, setDateRange] = useState<'today' | '7days' | 'month' | 'year'>('today');

  // Realistic analytics figures for Toto Network
  const metrics = {
    totalRevenue: dateRange === 'today' ? 14850 : dateRange === '7days' ? 98400 : 392000,
    platformFee: dateRange === 'today' ? 1485 : dateRange === '7days' ? 9840 : 39200,
    driverPayout: dateRange === 'today' ? 13365 : dateRange === '7days' ? 88560 : 352800,
    totalBookings: dateRange === 'today' ? 342 : dateRange === '7days' ? 2280 : 9120,
    completedTrips: dateRange === 'today' ? 324 : dateRange === '7days' ? 2150 : 8610,
    cancelledTrips: dateRange === 'today' ? 18 : dateRange === '7days' ? 130 : 510,
    activeCaptains: 48,
    fuelSavedLitres: dateRange === 'today' ? 215 : dateRange === '7days' ? 1430 : 5720
  };

  const handleExportCSV = () => {
    triggerSound('success');
    const headers = ['Date', 'Ride_ID', 'Passenger_Name', 'Captain_Name', 'Vehicle_Number', 'Distance_KM', 'Fare_INR', 'Platform_Fee_INR', 'Payment_Method', 'Status'];
    const rows = [
      ['2025-05-01 10:14', 'RIDE-9021', 'Subrata Naskar', 'Bikram Naskar', 'WB-24-ER-8841', '1.8', '35', '3.5', 'UPI', 'COMPLETED'],
      ['2025-05-01 10:30', 'RIDE-9022', 'Ananya Sen', 'Bappa Paul', 'WB-08-ER-3921', '2.2', '45', '4.5', 'WALLET', 'COMPLETED'],
      ['2025-05-01 11:05', 'RIDE-9023', 'Koushik Haldar', 'Joydeb Das', 'WB-02-ER-7712', '4.1', '65', '6.5', 'CASH', 'COMPLETED'],
      ['2025-05-01 11:42', 'RIDE-9024', 'Rohit Bhattacharya', 'Bikram Naskar', 'WB-24-ER-8841', '2.9', '0', '0', 'CASH', 'CANCELLED'],
      ['2025-05-01 12:15', 'RIDE-9025', 'Priya Roy', 'Bappa Paul', 'WB-08-ER-3921', '3.0', '50', '5.0', 'UPI', 'COMPLETED']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapido_toto_analytics_${dateRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Filter and Export Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
          {(['today', '7days', 'month', 'year'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setDateRange(r); triggerSound('beep'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                dateRange === r
                  ? 'bg-white text-[#111111] shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {r === '7days' ? 'Last 7 Days' : r}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger to CSV</span>
        </button>
      </div>

      {/* Primary Financial Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Gross Bookings Value (GMV)
          </div>
          <div className="text-3xl font-extrabold text-[#111111] mt-2 font-mono">
            ₹{metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% vs previous period</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Platform Net Commission (10%)
          </div>
          <div className="text-3xl font-extrabold text-[#C8622A] mt-2 font-mono">
            ₹{metrics.platformFee.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Direct system platform fee</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Captain Net Disbursal (90%)
          </div>
          <div className="text-3xl font-extrabold text-emerald-700 mt-2 font-mono">
            ₹{metrics.driverPayout.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Paid directly to Toto drivers</p>
        </div>
      </div>

      {/* Operational Efficiency Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Rides</div>
          <div className="font-extrabold text-xl text-neutral-900 mt-1">{metrics.totalBookings}</div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Completed Rate</div>
          <div className="font-extrabold text-xl text-emerald-600 mt-1">
            {((metrics.completedTrips / metrics.totalBookings) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Cancellation Rate</div>
          <div className="font-extrabold text-xl text-rose-600 mt-1">
            {((metrics.cancelledTrips / metrics.totalBookings) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="text-[10px] text-neutral-400 uppercase font-bold">Clean Energy Saved</div>
          <div className="font-extrabold text-xl text-emerald-600 mt-1">{metrics.fuelSavedLitres} L</div>
        </div>
      </div>

      {/* Fleet Distribution Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
        <h4 className="font-extrabold text-sm text-[#111111] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#C8622A]" />
          <span>Fleet Performance Distribution</span>
        </h4>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between font-semibold pb-1">
              <span>Toto Partner Electric (E-Rickshaw)</span>
              <span>78% of all trips (252 rides)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-semibold pb-1">
              <span>Toto Express Direct</span>
              <span>15% of all trips (48 rides)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-[#C8622A] rounded-full" style={{ width: '15%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-semibold pb-1">
              <span>Bike & Auto Ancillary</span>
              <span>7% of all trips (24 rides)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '7%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
