import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { UserProfile } from '../../types';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Wallet, 
  Star, 
  Phone, 
  Mail, 
  History, 
  PlusCircle, 
  Ban, 
  CheckCircle2,
  Calendar,
  CreditCard
} from 'lucide-react';

interface MockCustomer extends UserProfile {
  status: 'active' | 'blocked';
  joinedDate: string;
  totalSpend: number;
}

const INITIAL_CUSTOMERS: MockCustomer[] = [
  {
    id: 'usr_subrata',
    name: 'Subrata Naskar',
    phone: '+91 98301 45289',
    email: 'subrata@totodrive.in',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    rating: 4.95,
    totalRides: 42,
    walletBalance: 450,
    status: 'active',
    joinedDate: '12 Jan 2025',
    totalSpend: 1680
  },
  {
    id: 'usr_koushik',
    name: 'Koushik Haldar',
    phone: '+91 98311 02458',
    email: 'koushik@totodrive.in',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    rating: 4.9,
    totalRides: 38,
    walletBalance: 320,
    status: 'active',
    joinedDate: '20 Jan 2025',
    totalSpend: 1420
  },
  {
    id: 'usr_ananya',
    name: 'Ananya Sen',
    phone: '+91 98302 99412',
    email: 'ananya.sen@gmail.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    rating: 4.8,
    totalRides: 19,
    walletBalance: 120,
    status: 'active',
    joinedDate: '02 Feb 2025',
    totalSpend: 760
  },
  {
    id: 'usr_rohit',
    name: 'Rohit Bhattacharya',
    phone: '+91 98744 11204',
    email: 'rohit.b@yahoo.co.in',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    rating: 3.8,
    totalRides: 5,
    walletBalance: 0,
    status: 'blocked',
    joinedDate: '15 Feb 2025',
    totalSpend: 210
  }
];

export const AdminCustomerManagement: React.FC = () => {
  const { triggerSound } = useRide();
  const [customers, setCustomers] = useState<MockCustomer[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<MockCustomer | null>(null);
  const [walletAmount, setWalletAmount] = useState<number>(100);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleToggleStatus = (id: string) => {
    triggerSound('beep');
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === 'active' ? 'blocked' : 'active';
          setActionNotice(`User "${c.name}" marked as ${nextStatus.toUpperCase()}`);
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleAddWalletBalance = (customerId: string) => {
    triggerSound('success');
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const updated = { ...c, walletBalance: c.walletBalance + walletAmount };
          setSelectedCustomer(updated);
          setActionNotice(`Credited ₹${walletAmount} to ${c.name}'s wallet successfully.`);
          return updated;
        }
        return c;
      })
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search passengers by name, phone or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          <div className="text-xs font-semibold text-neutral-500">
            Total Registered Passengers: <strong className="text-neutral-900">{customers.length}</strong>
          </div>
        </div>

        {actionNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Passenger Table / List Layout */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Rides & Spend</th>
                <th className="px-4 py-3">Wallet Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FDE8DC] text-[#C8622A] flex items-center justify-center font-bold text-xs">
                        {customer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-900">{customer.name}</div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {customer.joinedDate}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="text-neutral-700 font-semibold">{customer.phone}</div>
                    <div className="text-neutral-400 text-[11px]">{customer.email}</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="text-neutral-900 font-bold">{customer.totalRides} trips</div>
                    <div className="text-neutral-500 text-[11px]">₹{customer.totalSpend} GMV</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="font-extrabold text-emerald-700 font-mono">
                      ₹{customer.walletBalance}
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      customer.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {customer.status}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => { setSelectedCustomer(customer); triggerSound('beep'); }}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(customer.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        customer.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {customer.status === 'active' ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Manage / Wallet Credit Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Passenger Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1">
                <div className="font-bold text-sm text-[#111111]">{selectedCustomer.name}</div>
                <div className="text-neutral-500">Phone: {selectedCustomer.phone}</div>
                <div className="text-neutral-500">Email: {selectedCustomer.email}</div>
                <div className="text-neutral-500">Member Since: {selectedCustomer.joinedDate}</div>
              </div>

              {/* Wallet Credit Tool */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>Wallet Adjustment (Dispute Refund / Promo)</span>
                </div>
                <div className="text-emerald-700 text-[11px]">
                  Current Wallet Balance: <strong>₹{selectedCustomer.walletBalance}</strong>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddWalletBalance(selectedCustomer.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    Credit
                  </button>
                </div>
              </div>

              {/* Ride Summary */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-neutral-400 text-[10px] uppercase font-bold">Total Rides</div>
                  <div className="font-extrabold text-neutral-900 text-sm mt-0.5">{selectedCustomer.totalRides}</div>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-neutral-400 text-[10px] uppercase font-bold">Passenger Rating</div>
                  <div className="font-extrabold text-amber-600 text-sm mt-0.5 flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{selectedCustomer.rating}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
