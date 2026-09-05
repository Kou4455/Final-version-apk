import React, { useState } from 'react';
import { SupportTicket } from '../../types';
import { 
  LifeBuoy, 
  X, 
  Send, 
  Check, 
  HelpCircle, 
  PackageSearch, 
  AlertTriangle, 
  CreditCard, 
  Car, 
  RotateCw,
  Phone
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: 'user' | 'driver';
  activeRideId?: string;
  onSubmitTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userRole,
  activeRideId,
  onSubmitTicket
}) => {
  const [category, setCategory] = useState<SupportTicket['category']>('ride');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [itemDetails, setItemDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitTicket({
        userId,
        userName,
        userRole,
        rideId: activeRideId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        itemDetails: category === 'lost_item' ? itemDetails.trim() : undefined
      });
      confetti({ particleCount: 40, spread: 50 });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Support ticket submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900">Support Center</h3>
              <p className="text-[11px] text-neutral-500 font-medium">We're here to help you 24x7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-base text-neutral-900">Support Ticket Created!</h4>
            <p className="text-xs text-neutral-500">
              Our Kolkata support team has received your ticket and will respond via in-app notification within 15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
            {/* Direct helpline link */}
            <div className="p-3 bg-[#FFF9E6] border border-[#FFE082] rounded-2xl flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#8C5200]">Instant Phone Helpline</div>
                <div className="text-[10px] text-neutral-600">Toll-free 24x7 customer desk</div>
              </div>
              <a
                href="tel:1800266000"
                className="px-3 py-1.5 rounded-xl bg-[#FFD500] hover:bg-[#E6C000] text-black font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Desk</span>
              </a>
            </div>

            {/* Category selection chips */}
            <div className="space-y-1.5">
              <label className="block font-bold text-neutral-700">Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'ride', label: 'Ride Issue', icon: Car },
                  { id: 'payment', label: 'Payment', icon: CreditCard },
                  { id: 'lost_item', label: 'Lost Item', icon: PackageSearch },
                  { id: 'driver', label: 'Captain', icon: HelpCircle },
                  { id: 'safety', label: 'Safety', icon: AlertTriangle },
                  { id: 'account', label: 'Account', icon: LifeBuoy }
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#E07A00] bg-[#FFF3C4] text-[#8C5200] font-bold'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Lost Item selected */}
            {category === 'lost_item' && (
              <div className="space-y-1">
                <label className="block font-bold text-neutral-700">Lost Item Description</label>
                <input
                  type="text"
                  value={itemDetails}
                  onChange={(e) => setItemDetails(e.target.value)}
                  placeholder="e.g. Black umbrella, iPhone in rear passenger seat"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                  required
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <label className="block font-bold text-neutral-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your query or issue"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                required
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <label className="block font-bold text-neutral-700">Detailed Message</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Explain what happened so our team can resolve it quickly..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-[#E07A00]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E07A00] hover:bg-[#C96E00] text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Submit Support Ticket</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
