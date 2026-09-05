import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { ActiveRide } from '../../types';
import { 
  Car, 
  Search, 
  Clock, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Eye, 
  User, 
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface MockRideRecord {
  id: string;
  passengerName: string;
  passengerPhone: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  pickupName: string;
  dropoffName: string;
  status: 'completed' | 'in_progress' | 'cancelled' | 'disputed';
  fare: number;
  discount: number;
  driverEarnings: number;
  platformFee: number;
  paymentMethod: 'cash' | 'upi' | 'wallet';
  date: string;
  otp: string;
  durationMins: number;
  distanceKm: number;
}

const INITIAL_RIDES: MockRideRecord[] = [
  {
    id: 'RIDE-9021',
    passengerName: 'Subrata Naskar',
    passengerPhone: '+91 98301 45289',
    driverName: 'Bikram Naskar',
    driverPhone: '+91 98314 55029',
    vehicleNumber: 'WB-24-ER-8841',
    pickupName: 'Sector V Metro Station (Gate 2)',
    dropoffName: 'City Centre 1 Mall',
    status: 'completed',
    fare: 35,
    discount: 5,
    driverEarnings: 31,
    platformFee: 4,
    paymentMethod: 'upi',
    date: 'Today, 10:14 AM',
    otp: '4912',
    durationMins: 6,
    distanceKm: 1.8
  },
  {
    id: 'RIDE-9022',
    passengerName: 'Ananya Sen',
    passengerPhone: '+91 98302 99412',
    driverName: 'Bappa Paul',
    driverPhone: '+91 98302 11984',
    vehicleNumber: 'WB-08-ER-3921',
    pickupName: 'City Centre 1 Mall',
    dropoffName: 'Karunamoyee Bus Terminal',
    status: 'in_progress',
    fare: 45,
    discount: 0,
    driverEarnings: 40,
    platformFee: 5,
    paymentMethod: 'wallet',
    date: 'Today, 10:30 AM',
    otp: '7721',
    durationMins: 8,
    distanceKm: 2.2
  },
  {
    id: 'RIDE-9020',
    passengerName: 'Koushik Haldar',
    passengerPhone: '+91 98311 02458',
    driverName: 'Joydeb Das',
    driverPhone: '+91 98366 45091',
    vehicleNumber: 'WB-02-ER-7712',
    pickupName: 'Eco Space Business Park',
    dropoffName: 'City Centre 2 (Rajarhat)',
    status: 'completed',
    fare: 65,
    discount: 10,
    driverEarnings: 58,
    platformFee: 7,
    paymentMethod: 'cash',
    date: 'Yesterday, 06:45 PM',
    otp: '8834',
    durationMins: 14,
    distanceKm: 4.1
  },
  {
    id: 'RIDE-9019',
    passengerName: 'Rohit Bhattacharya',
    passengerPhone: '+91 98744 11204',
    driverName: 'Bikram Naskar',
    driverPhone: '+91 98314 55029',
    vehicleNumber: 'WB-24-ER-8841',
    pickupName: 'DLF 2 IT Park',
    dropoffName: 'Karunamoyee Terminal',
    status: 'cancelled',
    fare: 0,
    discount: 0,
    driverEarnings: 0,
    platformFee: 0,
    paymentMethod: 'cash',
    date: 'Yesterday, 02:10 PM',
    otp: '1249',
    durationMins: 0,
    distanceKm: 2.9
  }
];

export const AdminRidesManagement: React.FC = () => {
  const { triggerSound } = useRide();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [selectedRide, setSelectedRide] = useState<MockRideRecord | null>(null);

  const filteredRides = INITIAL_RIDES.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      r.id.toLowerCase().includes(q) ||
      r.passengerName.toLowerCase().includes(q) ||
      r.driverName.toLowerCase().includes(q) ||
      r.vehicleNumber.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ride ID, passenger, captain or vehicle number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl">
            {(['all', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { setStatusFilter(st); triggerSound('beep'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#111111] shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rides Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Ride ID & Date</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Captain & Toto</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Fare & Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredRides.map((ride) => (
                <tr key={ride.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-[#111111] font-mono">{ride.id}</div>
                    <div className="text-[11px] text-neutral-400">{ride.date}</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-bold text-neutral-900">{ride.passengerName}</div>
                    <div className="text-[11px] text-neutral-400">{ride.passengerPhone}</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-bold text-neutral-900">{ride.driverName}</div>
                    <div className="text-[11px] font-mono text-[#C8622A]">{ride.vehicleNumber}</div>
                  </td>

                  <td className="px-4 py-3.5 max-w-[200px]">
                    <div className="text-neutral-800 truncate font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{ride.pickupName}</span>
                    </div>
                    <div className="text-neutral-500 truncate text-[11px] flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">{ride.dropoffName}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-neutral-900 font-mono">₹{ride.fare}</div>
                    <span className="text-[10px] font-bold uppercase text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {ride.paymentMethod}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      ride.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ride.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {ride.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => { setSelectedRide(ride); triggerSound('beep'); }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ride Audit & Timeline Modal */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Ride Audit Dossier ({selectedRide.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Route Summary */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Pickup Location</div>
                    <div className="font-bold text-neutral-800">{selectedRide.pickupName}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <div>
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Destination</div>
                    <div className="font-bold text-neutral-800">{selectedRide.dropoffName}</div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Passenger</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{selectedRide.passengerName}</div>
                  <div className="text-neutral-500 text-[11px]">{selectedRide.passengerPhone}</div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Captain</div>
                  <div className="font-bold text-neutral-900 mt-0.5">{selectedRide.driverName}</div>
                  <div className="font-mono text-[#C8622A] text-[11px]">{selectedRide.vehicleNumber}</div>
                </div>
              </div>

              {/* Financial Ledger Breakdown */}
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900 pb-1 border-b border-neutral-100 flex items-center justify-between">
                  <span>Fare & Settlement Ledger</span>
                  <span className="font-mono text-emerald-700">Total: ₹{selectedRide.fare}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Distance ({selectedRide.distanceKm} km) & Time ({selectedRide.durationMins} min)</span>
                  <span>₹{selectedRide.fare + selectedRide.discount}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Promo Discount Applied</span>
                  <span>- ₹{selectedRide.discount}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Captain Payout (90%)</span>
                  <span>₹{selectedRide.driverEarnings}</span>
                </div>
                <div className="flex items-center justify-between text-[#C8622A] font-bold">
                  <span>Platform Commission (10%)</span>
                  <span>₹{selectedRide.platformFee}</span>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900 text-[11px]">System Event Milestones:</div>
                <div className="text-[11px] text-neutral-600 space-y-1">
                  <div>• 10:14:02 — Ride requested & dispatched to nearby Toto partners</div>
                  <div>• 10:14:18 — Accepted by Captain {selectedRide.driverName}</div>
                  <div>• 10:16:30 — Driver arrived at pickup point</div>
                  <div>• 10:17:05 — Ride started with secure OTP verification ({selectedRide.otp})</div>
                  <div>• 10:23:10 — Reached destination. Payment settled via {selectedRide.paymentMethod.toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
