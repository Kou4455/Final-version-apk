import React, { useState } from 'react';
import { 
  Wallet, 
  IndianRupee, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Check, 
  RotateCw, 
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onAddMoney: (amount: number) => Promise<void>;
}

interface WalletTxn {
  id: string;
  type: 'topup' | 'ride_payment' | 'cashback';
  title: string;
  amount: number;
  date: string;
  isCredit: boolean;
}

const INITIAL_TXNS: WalletTxn[] = [
  {
    id: 'tx_101',
    type: 'topup',
    title: 'UPI Instant Top-Up',
    amount: 200,
    date: 'Today, 10:14 AM',
    isCredit: true
  },
  {
    id: 'tx_102',
    type: 'cashback',
    title: 'First Electric Ride Promo Credit',
    amount: 50,
    date: 'Yesterday, 06:30 PM',
    isCredit: true
  },
  {
    id: 'tx_103',
    type: 'ride_payment',
    title: 'Trip to Sector V Metro Station',
    amount: 35,
    date: 'Yesterday, 07:15 PM',
    isCredit: false
  }
];

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  balance,
  onAddMoney
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(200);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<WalletTxn[]>(INITIAL_TXNS);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTopup = async () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedPreset;
    if (isNaN(amount) || amount < 10) return;

    setIsProcessing(true);
    setSuccessNotice(null);

    try {
      await onAddMoney(amount);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });

      const newTx: WalletTxn = {
        id: `tx_${Date.now()}`,
        type: 'topup',
        title: 'UPI Instant Wallet Top-Up',
        amount,
        date: 'Just now',
        isCredit: true
      };
      setTransactions((prev) => [newTx, ...prev]);
      setSuccessNotice(`₹${amount} added successfully to your Toto Drive Wallet!`);
      setCustomAmount('');
    } catch (err) {
      console.error('Wallet top-up failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FFF3C4] text-[#8C5200]">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Toto Drive Wallet</h3>
              <p className="text-[11px] text-neutral-500 font-medium">Instant 1-Click Ride Payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance & Topup Section */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Balance Card */}
          <div className="bg-linear-to-br from-neutral-900 to-neutral-800 text-white p-4 rounded-2xl shadow-sm space-y-1">
            <div className="flex justify-between items-center text-[11px] text-neutral-300 font-medium">
              <span>Available Balance</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Fast Checkout
              </span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-white flex items-center">
              <span>₹{balance.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-neutral-400 pt-1">
              Zero transaction charges • No OTP needed during trips
            </div>
          </div>

          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Quick Add Money */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-neutral-800">
              Add Money to Wallet
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 300, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(amt);
                    setCustomAmount('');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedPreset === amt && !customAmount
                      ? 'bg-[#E07A00] text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-bold">₹</span>
                <input
                  type="number"
                  min={10}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Or enter custom amount"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl pl-7 pr-3 py-2 text-xs font-medium text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                />
              </div>

              <button
                onClick={handleTopup}
                disabled={isProcessing}
                className="bg-[#E07A00] hover:bg-[#C96E00] active:scale-[0.99] text-white font-bold px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isProcessing ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Add Money</span>
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-neutral-800">
              Recent Transactions
            </div>

            <div className="divide-y divide-neutral-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-xl ${
                      tx.isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {tx.isCredit ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-800">{tx.title}</div>
                      <div className="text-[10px] text-neutral-400">{tx.date}</div>
                    </div>
                  </div>

                  <div className={`font-mono font-bold ${
                    tx.isCredit ? 'text-emerald-600' : 'text-neutral-900'
                  }`}>
                    {tx.isCredit ? '+' : '-'}₹{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
