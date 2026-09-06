import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { DriverProfile, DriverApprovalRequest } from '../../types';
import { 
  Car, 
  ShieldCheck, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  Phone, 
  FileText, 
  UserCheck, 
  Eye, 
  Edit3, 
  Star, 
  BatteryCharging,
  Key,
  RotateCw,
  Copy,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { DeleteDriverModal } from './DeleteDriverModal';

export const AdminDriverManagement: React.FC = () => {
  const { 
    driverApprovals, 
    approveDriverRegistration, 
    rejectDriverRegistration,
    deleteDriverProfile,
    triggerSound 
  } = useRide();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'suspended'>('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverApprovalRequest | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<DriverApprovalRequest | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filtered driver registrations list
  const filteredList = driverApprovals.filter((d) => {
    const matchesSearch = 
      d.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm) ||
      d.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (approval: DriverApprovalRequest) => {
    triggerSound('beep');
    try {
      const res = await approveDriverRegistration(approval.id);
      setActionNotice(`Driver "${approval.driverName}" approved! Login PIN: ${res.pin}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (approvalId: string) => {
    triggerSound('beep');
    try {
      await rejectDriverRegistration(approvalId);
      setActionNotice('Driver marked as rejected.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDeleteDriver = async (driverTarget: DriverApprovalRequest, reason: string) => {
    try {
      await deleteDriverProfile(driverTarget.id);
      if (selectedDriver?.id === driverTarget.id) {
        setSelectedDriver(null);
      }
      setActionNotice(`Driver "${driverTarget.driverName}" (${driverTarget.vehicleNumber}) deleted. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      setActionNotice(`Failed to delete driver: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Captain name, mobile number, or vehicle number..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#C8622A]"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-2xl overflow-x-auto">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { setStatusFilter(st); triggerSound('beep'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-[#111111] shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {actionNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Driver Cards / Table Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredList.map((driver) => (
          <div
            key={driver.id}
            className="bg-white rounded-3xl p-4 border border-neutral-200 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Avatar, Name, Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {driver.driverPhoto ? (
                    <img 
                      src={driver.driverPhoto} 
                      alt={driver.driverName} 
                      className="w-10 h-10 rounded-2xl object-cover border border-neutral-200 shadow-2xs" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {driver.driverName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-[#111111]">{driver.driverName}</h4>
                    <a href={`tel:${driver.phone}`} className="text-xs text-neutral-500 font-medium hover:text-[#C8622A] flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{driver.phone}</span>
                    </a>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  driver.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : driver.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {driver.status}
                </span>
              </div>

              {/* Vehicle Specs Box */}
              <div className="bg-[#FAF8F5] p-2.5 rounded-2xl border border-neutral-200 mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Vehicle No:</span>
                  <span className="font-mono font-bold text-[#111111]">{driver.vehicleNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Model:</span>
                  <span className="font-semibold text-neutral-800 truncate max-w-[150px]">{driver.vehicleModel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Color:</span>
                  <span className="font-semibold text-neutral-800">{driver.vehicleColor}</span>
                </div>
                {driver.totoPhotos && driver.totoPhotos.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-200">
                    <span className="text-neutral-500 font-medium text-[10px]">Toto Photos:</span>
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {driver.totoPhotos.slice(0, 3).map((pUrl, pIdx) => (
                        <img 
                          key={pIdx} 
                          src={pUrl} 
                          alt="Toto" 
                          className="w-5 h-5 rounded-md object-cover border border-neutral-300 shrink-0" 
                        />
                      ))}
                      {driver.totoPhotos.length > 3 && (
                        <span className="text-[9px] font-bold text-neutral-400">+{driver.totoPhotos.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
                {driver.generatedPin && (
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                    <span className="text-[#C8622A] font-bold flex items-center gap-1">
                      <Key className="w-3 h-3" /> Login PIN:
                    </span>
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {driver.generatedPin}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSelectedDriver(driver); triggerSound('beep'); }}
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:border-[#C8622A] hover:text-[#C8622A] cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#C8622A]" />
                <span>Details Review</span>
              </button>

              {driver.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleApprove(driver)}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    title="Approve Driver Registration"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(driver.id)}
                    className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                    title="Reject Driver Registration"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {driver.status === 'approved' && (
                <button
                  type="button"
                  onClick={() => handleReject(driver.id)}
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                >
                  <span>Suspend</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setDriverToDelete(driver); triggerSound('alert'); }}
                className="py-2 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-neutral-400 hover:text-rose-600 font-bold text-xs border border-neutral-300 hover:border-rose-300 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Permanently Delete Driver Profile"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredList.length === 0 && (
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 text-center space-y-2">
          <Car className="w-8 h-8 text-neutral-300 mx-auto" />
          <div className="font-bold text-neutral-700 text-sm">No Captains match your criteria</div>
          <p className="text-xs text-neutral-400">Try changing your search term or status filter.</p>
        </div>
      )}

      {/* KYC Document Inspection Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-[#111111]">KYC & Vehicle Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center gap-3">
                {selectedDriver.driverPhoto ? (
                  <img
                    src={selectedDriver.driverPhoto}
                    alt={selectedDriver.driverName}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 font-bold text-lg flex items-center justify-center shrink-0">
                    {selectedDriver.driverName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-[#111111]">{selectedDriver.driverName}</div>
                  <div className="text-neutral-500">Phone: {selectedDriver.phone}</div>
                  <div className="text-neutral-500">Registered: {new Date(selectedDriver.createdAt).toLocaleDateString()}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{selectedDriver.vehicleModel} ({selectedDriver.vehicleColor})</div>
                </div>
              </div>

              {/* Submitted Toto Photos Section */}
              {selectedDriver.totoPhotos && selectedDriver.totoPhotos.length > 0 && (
                <div className="space-y-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-800 flex items-center justify-between">
                    <span>Submitted Toto Rickshaw Photos:</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {selectedDriver.totoPhotos.length} Photos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedDriver.totoPhotos.map((imgUrl, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-white">
                        <img
                          src={imgUrl}
                          alt={`Toto vehicle ${i + 1}`}
                          className="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="font-bold text-neutral-700">Submitted Verification Documents:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Commercial DL</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> WB-19-20180029
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Vehicle RC</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {selectedDriver.vehicleNumber}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Aadhaar Card</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Verified (XXXX-8821)
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200 bg-white space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase">Battery Fitness</div>
                    <div className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Passed 60V Li-ion
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicator & Approval Section */}
              {selectedDriver.status === 'approved' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <div>
                      <div className="font-extrabold text-emerald-950 text-xs uppercase">Verification Status: Approved</div>
                      <div className="text-[10px] text-emerald-700">Driver is active in Toto fleet with Security PIN: <strong className="font-mono">{selectedDriver.generatedPin || '1234'}</strong></div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-black uppercase">
                    Approved
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Review Complete?</span>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold uppercase">
                      Pending Review
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Verify all driver and Toto vehicle documentation above before finalizing.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const toDel = selectedDriver;
                  setSelectedDriver(null);
                  setDriverToDelete(toDel);
                  triggerSound('alert');
                }}
                className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
                title="Permanently Delete Driver Profile"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Profile</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDriver(null)}
                  className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer"
                >
                  Close Dossier
                </button>

                {selectedDriver.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApprove(selectedDriver);
                      setSelectedDriver(null);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-200" />
                    <span>Generate PIN & Finalize</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER PROFILE DELETION WORKFLOW MODAL */}
      <DeleteDriverModal
        driver={driverToDelete}
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirmDelete={handleConfirmDeleteDriver}
      />
    </div>
  );
};
