import React from 'react';
import { ActiveRide } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  IndianRupee, 
  Calendar, 
  MapPin, 
  FileText 
} from 'lucide-react';

interface RideReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  ride: ActiveRide;
  customerName: string;
}

export const RideReceiptModal: React.FC<RideReceiptModalProps> = ({
  isOpen,
  onClose,
  ride,
  customerName
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
========================================
TOTO DRIVE - TRIP TAX INVOICE / RECEIPT
========================================
Invoice #: INV-${ride.id.toUpperCase().slice(-8)}
Ride ID: ${ride.id}
Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}

CUSTOMER DETAILS:
Name: ${customerName}

DRIVER & VEHICLE:
Captain: ${ride.driverName || 'Verified Captain'}
Vehicle: ${ride.driverVehicleNumber || 'WB-Toto-E-Rickshaw'}
Category: Zero-Emission Electric Toto

TRIP SUMMARY:
Pickup: ${ride.pickup.name} (${ride.pickup.address})
Destination: ${ride.dropoff.name} (${ride.dropoff.address})
Distance: ${ride.distanceKm?.toFixed(1) || '3.5'} km
Duration: ${ride.estimatedDurationMins || 12} mins

FARE BREAKDOWN:
Base Fare: ₹20.00
Distance Charge: ₹${Math.max(10, ((ride.distanceKm || 3.5) * 8)).toFixed(2)}
Time & Motion: ₹10.00
Discounts / Coupons: -₹${(ride.couponDiscount || 0).toFixed(2)}
GST / Green Cess: ₹0.00 (100% Electric Exemption)
----------------------------------------
TOTAL PAID: ₹${ride.fare}.00
Payment Method: ${(ride.paymentMethod || 'CASH').toUpperCase()}
Status: COMPLETED & SETTLED
========================================
Thank you for commuting green with Toto Drive!
    `;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TotoDrive_Receipt_${ride.id.slice(-6)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const baseFare = 20;
  const distanceCharge = Math.max(10, Math.round(((ride.distanceKm || 3.5) * 8)));
  const timeCharge = 10;
  const discount = ride.couponDiscount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
        {/* Modal Controls */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#E07A00]" />
            <h3 className="font-extrabold text-sm text-neutral-900">Trip Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors"
              title="Download Receipt"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 space-y-4 overflow-y-auto font-sans bg-white text-neutral-900">
          {/* Brand header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" />
              <div>
                <div className="font-black text-base text-neutral-900">Toto<span className="text-[#E07A00]">Drive</span></div>
                <div className="text-[10px] text-neutral-400">Zero-Emission Electric Mobility</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-neutral-400">INVOICE</div>
              <div className="font-mono text-xs font-bold text-neutral-800">
                #{ride.id.toUpperCase().slice(-8)}
              </div>
            </div>
          </div>

          {/* Date & Passenger */}
          <div className="grid grid-cols-2 gap-2 text-xs py-1">
            <div>
              <span className="text-neutral-400 text-[11px] block">Passenger</span>
              <span className="font-bold text-neutral-900">{customerName}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[11px] block">Captain & Vehicle</span>
              <span className="font-bold text-neutral-900">{ride.driverName}</span>
              <div className="text-[10px] font-mono text-neutral-500">{ride.driverVehicleNumber}</div>
            </div>
          </div>

          {/* Route Section */}
          <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-neutral-200 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-bold">Pickup</div>
                <div className="font-semibold text-neutral-800">{ride.pickup.name}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E07A00] mt-1 shrink-0" />
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-bold">Destination</div>
                <div className="font-semibold text-neutral-800">{ride.dropoff.name}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex justify-between text-[11px] text-neutral-600">
              <span>Distance: <strong>{ride.distanceKm?.toFixed(1) || '3.5'} km</strong></span>
              <span>Duration: <strong>{ride.estimatedDurationMins || 12} mins</strong></span>
            </div>
          </div>

          {/* Detailed Calculation */}
          <div className="space-y-2 text-xs border-b border-neutral-200 pb-3">
            <div className="flex justify-between text-neutral-600">
              <span>Base Fare</span>
              <span className="font-mono">₹{baseFare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Distance Charge</span>
              <span className="font-mono">₹{distanceCharge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Time & Motion Charge</span>
              <span className="font-mono">₹{timeCharge.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount / Promo</span>
                <span className="font-mono">-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400 text-[11px]">
              <span>Taxes / Green Toll (Exempt)</span>
              <span className="font-mono">₹0.00</span>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center text-sm pt-1">
            <div>
              <div className="font-black text-neutral-900">Total Fare Paid</div>
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">
                Paid via {(ride.paymentMethod || 'Cash').toUpperCase()}
              </div>
            </div>
            <div className="font-black text-lg font-mono text-[#E07A00]">
              ₹{ride.fare}.00
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-neutral-400 pt-2 border-t border-dashed border-neutral-200">
            Thank you for commuting with Toto Drive. Kolkata Eco-Mobility.
          </div>
        </div>
      </div>
    </div>
  );
};
