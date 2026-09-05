import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { DriverApprovalRequest } from '../../types';
import { AdminLiveMap } from './AdminLiveMap';
import { AdminDriverManagement } from './AdminDriverManagement';
import { AdminCustomerManagement } from './AdminCustomerManagement';
import { AdminRidesManagement } from './AdminRidesManagement';
import { AdminReports } from './AdminReports';
import { AdminNotifications } from './AdminNotifications';
import { 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  Copy, 
  CheckCheck, 
  Phone, 
  Sparkles, 
  Key, 
  Bell, 
  AlertCircle, 
  ArrowLeft, 
  UserCheck, 
  Car, 
  Zap, 
  LogIn,
  RotateCw,
  PlusCircle,
  MapPin,
  Users,
  CreditCard,
  Tag,
  BarChart3,
  Sliders,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  Percent,
  LogOut,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

type AdminTab = 
  | 'overview' 
  | 'live_map' 
  | 'drivers' 
  | 'customers' 
  | 'rides' 
  | 'pricing' 
  | 'coupons' 
  | 'reports' 
  | 'notifications' 
  | 'audit';

export const AdminDashboard: React.FC = () => {
  const { 
    driverApprovals, 
    pendingApprovalsCount, 
    approveDriverRegistration, 
    rejectDriverRegistration, 
    registerDriverApproval,
    loginDriverWithPin,
    setActiveRole,
    simulatedDrivers,
    activeRide,
    triggerSound,
    logoutAdmin,
    updateAdminPassword
  } = useRide();

  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [activeApprovalSubTab, setActiveApprovalSubTab] = useState<'pending' | 'approved'>('pending');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ success: boolean; msg: string } | null>(null);
  const [approvedPinModal, setApprovedPinModal] = useState<{
    driverName: string;
    phone: string;
    pin: string;
    vehicleNumber: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Pricing configuration state (Admin configurable pricing formula without developer edits)
  const [pricingConfig, setPricingConfig] = useState({
    baseFare: 25,
    perKmRate: 16,
    perMinuteRate: 1.5,
    minimumFare: 20,
    waitingFeePerMin: 1.0,
    cancellationFee: 15,
    peakSurgeMultiplier: 1.2,
    serviceFeePercent: 10,
    taxGstPercent: 5
  });

  // Coupons configuration state
  const [couponsList, setCouponsList] = useState([
    { code: 'RAPIDOTOTO', discount: 25, maxDiscount: 20, minFare: 25, active: true, expiry: '31 Dec 2025' },
    { code: 'GREENRIDE', discount: 20, maxDiscount: 15, minFare: 20, active: true, expiry: '31 Dec 2025' },
    { code: 'WELCOME50', discount: 50, maxDiscount: 35, minFare: 30, active: true, expiry: '31 Dec 2025' },
    { code: 'RAINYDAY', discount: 15, maxDiscount: 15, minFare: 30, active: false, expiry: '15 Jun 2025' }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(20);
  const [newCouponMax, setNewCouponMax] = useState(15);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', action: 'Driver Approved', actor: 'Admin (Subrata)', target: 'Bikram Naskar (WB-24-ER-8841)', time: 'Today, 09:15 AM' },
    { id: '2', action: 'Surge Multiplier Set', actor: 'Admin (Koushik)', target: '1.2x Peak Rush Sector V', time: 'Today, 08:30 AM' },
    { id: '3', action: 'Coupon Created', actor: 'System', target: 'RAPIDOTOTO (25% off)', time: 'Yesterday, 11:00 AM' },
    { id: '4', action: 'Dispute Refund Credited', actor: 'Admin (Subrata)', target: 'Subrata Naskar (₹50)', time: 'Yesterday, 04:20 PM' }
  ]);

  const pendingList = driverApprovals.filter((a) => a.status === 'pending');
  const approvedList = driverApprovals.filter((a) => a.status === 'approved');

  // Handle Approve action
  const handleApprove = async (approval: DriverApprovalRequest) => {
    setIsProcessingId(approval.id);
    triggerSound('beep');
    try {
      const res = await approveDriverRegistration(approval.id);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      setApprovedPinModal({
        driverName: approval.driverName,
        phone: approval.phone,
        pin: res.pin,
        vehicleNumber: approval.vehicleNumber
      });
      setActionNotice(`Driver "${approval.driverName}" approved! Generated 4-Digit PIN: ${res.pin}`);
      setAuditLogs(prev => [
        { id: String(Date.now()), action: 'Driver Approved', actor: 'Admin', target: `${approval.driverName} (${approval.vehicleNumber})`, time: 'Just now' },
        ...prev
      ]);
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handle Reject action
  const handleReject = async (approvalId: string) => {
    setIsProcessingId(approvalId);
    triggerSound('beep');
    try {
      await rejectDriverRegistration(approvalId);
      setActionNotice('Driver registration marked as rejected.');
      setAuditLogs(prev => [
        { id: String(Date.now()), action: 'Driver Rejected', actor: 'Admin', target: `ID: ${approvalId}`, time: 'Just now' },
        ...prev
      ]);
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Simulate a new Toto Driver Registration to test pending queue
  const handleSimulateNewRegistration = async () => {
    setIsSimulating(true);
    triggerSound('beep');
    const randomNames = ['Tapas Das', 'Rajesh Halder', 'Bishal Saha', 'Swapan Roy', 'Manoj Mondal'];
    const randomModels = ['Mayuri Pro Li-ion E-Rickshaw', 'Saarthi Smart Electric', 'Kinetic Safar Smart', 'Terra Y4A Deluxe'];
    const randomColors = ['Emerald Green', 'Canary Yellow', 'Electric Blue', 'Saffron Orange'];
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const chosenName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const chosenModel = randomModels[Math.floor(Math.random() * randomModels.length)];
    const chosenColor = randomColors[Math.floor(Math.random() * randomColors.length)];
    const phone = `+91 983${Math.floor(1000000 + Math.random() * 8999999)}`;

    try {
      await registerDriverApproval({
        driverName: chosenName,
        phone,
        vehicleType: 'toto',
        vehicleNumber: `WB-19-T-${randNum}`,
        vehicleModel: chosenModel,
        vehicleColor: chosenColor
      });
      setCurrentTab('overview');
      setActiveApprovalSubTab('pending');
      setActionNotice(`New registration received: ${chosenName} (${chosenModel}) added to pending queue.`);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTestLoginAsDriver = async (phone: string, pin: string) => {
    triggerSound('success');
    const res = await loginDriverWithPin(phone, pin);
    if (res.success) {
      setActiveRole('driver');
    }
  };

  const copyPinToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    triggerSound('beep');
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    setCouponsList([
      { code: cleanCode, discount: newCouponDiscount, maxDiscount: newCouponMax, minFare: 25, active: true, expiry: '31 Dec 2025' },
      ...couponsList
    ]);
    setNewCouponCode('');
    setActionNotice(`Coupon "${cleanCode}" generated successfully!`);
    triggerSound('success');
  };

  const handleToggleCoupon = (code: string) => {
    setCouponsList(prev => prev.map(c => c.code === code ? { ...c, active: !c.active } : c));
    triggerSound('beep');
  };

  return (
    <div id="admin-dashboard" className="w-full max-w-6xl mx-auto py-4 px-3 sm:px-6 font-sans space-y-5">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              setActiveRole('driver');
            }}
            className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 flex items-center justify-center text-neutral-800 shadow-2xs transition-all cursor-pointer"
            title="Return to Toto Partner view"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RAPIDO TOTO ADMIN CONTROL CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Enterprise Fleet Operations
            </h1>
          </div>
        </div>

        {/* Quick Simulation & Switch Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="admin-simulate-registration-btn"
            type="button"
            disabled={isSimulating}
            onClick={handleSimulateNewRegistration}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Register a sample driver to test approval flow"
          >
            {isSimulating ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5" />
            )}
            <span>Simulate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveRole('driver')}
            className="px-3 py-2 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Switch to Captain Partner view"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Driver View</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              setShowPasswordModal(true);
              setPasswordNotice(null);
            }}
            className="px-3 py-2 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Change Admin Password"
          >
            <Key className="w-3.5 h-3.5 text-[#C8622A]" />
            <span>Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              logoutAdmin();
            }}
            className="px-3 py-2 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 active:scale-95 text-red-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Log out from Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Action Notice Alert Banner */}
      {actionNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-semibold text-amber-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setActionNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Navigation Menu Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-neutral-200 shadow-2xs overflow-x-auto">
        {[
          { id: 'overview', label: 'Dashboard KPI', icon: Activity },
          { id: 'live_map', label: 'Live Fleet Map', icon: MapPin },
          { id: 'drivers', label: 'Driver Directory', icon: Car },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'rides', label: 'Rides & Audit', icon: Clock },
          { id: 'pricing', label: 'Fare Settings', icon: Sliders },
          { id: 'coupons', label: 'Coupons', icon: Tag },
          { id: 'reports', label: 'Reports & CSV', icon: BarChart3 },
          { id: 'notifications', label: 'Broadcasts', icon: Bell },
          { id: 'audit', label: 'Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setCurrentTab(tab.id as AdminTab); triggerSound('beep'); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF6B2C]' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
              {tab.id === 'overview' && pendingApprovalsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & KPI DASHBOARD */}
      {currentTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 10 Detailed Real-time KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Customers</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">1,468</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active Riders</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Drivers</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">{approvedList.length + 4}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Registered Fleet</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online Drivers</span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{simulatedDrivers.length}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Live on Map</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Rides</div>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">{activeRide ? 1 : 2}</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Trips in progress</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Completed Rides</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">324</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">94.7% Success</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Cancelled Rides</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">18</div>
              <div className="text-[10px] text-neutral-400 font-semibold mt-0.5">5.3% Cancel Rate</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Today's Revenue</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1 font-mono">₹14,850</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">+14% vs yesterday</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Today's Bookings</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">342</div>
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Dispatches</div>
            </div>

            <div 
              onClick={() => setActiveApprovalSubTab('pending')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                pendingApprovalsCount > 0
                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                <span>Pending Approvals</span>
                {pendingApprovalsCount > 0 && <Bell className="w-3 h-3 text-amber-600 animate-bounce" />}
              </div>
              <div className="text-2xl font-extrabold text-[#111111] mt-1">{pendingApprovalsCount}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Requires KYC Review</div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Support Tickets</div>
              <div className="text-2xl font-extrabold text-neutral-900 mt-1">2</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">All under SLA</div>
            </div>
          </div>

          {/* Pending / Approved Drivers Sub-Queue */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Captain Onboarding & Security Approvals
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-[#F6F4F0] p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveApprovalSubTab('pending')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeApprovalSubTab === 'pending'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600'
                  }`}
                >
                  Pending Queue ({pendingApprovalsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveApprovalSubTab('approved')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeApprovalSubTab === 'approved'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600'
                  }`}
                >
                  Approved Captains ({approvedList.length + 4})
                </button>
              </div>
            </div>

            {/* Sub-Queue List */}
            {activeApprovalSubTab === 'pending' ? (
              <div className="space-y-3">
                {pendingList.map((appr) => (
                  <div
                    key={appr.id}
                    className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#111111]">{appr.driverName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>Phone: <strong className="text-neutral-800">{appr.phone}</strong></span>
                        <span>Plate: <strong className="font-mono text-neutral-800">{appr.vehicleNumber}</strong></span>
                        <span>Model: {appr.vehicleModel} ({appr.vehicleColor})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingId === appr.id}
                        onClick={() => handleApprove(appr)}
                        className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isProcessingId === appr.id ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>Approve & Generate PIN</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingId === appr.id}
                        onClick={() => handleReject(appr.id)}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}

                {pendingList.length === 0 && (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    <Check className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    No pending driver registrations in queue.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvedList.map((appr) => (
                  <div key={appr.id} className="p-3.5 rounded-2xl border border-neutral-200 bg-[#FAF8F5] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-neutral-900">{appr.driverName}</div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Approved
                      </span>
                    </div>
                    <div className="text-neutral-500 font-mono text-[11px]">{appr.vehicleNumber} • {appr.phone}</div>
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-200">
                      <span className="font-semibold text-neutral-600">Login PIN:</span>
                      <span className="font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-neutral-200">
                        {appr.generatedPin || '1234'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE FLEET MAP */}
      {currentTab === 'live_map' && <AdminLiveMap />}

      {/* TAB 3: DRIVER MANAGEMENT */}
      {currentTab === 'drivers' && <AdminDriverManagement />}

      {/* TAB 4: CUSTOMER MANAGEMENT */}
      {currentTab === 'customers' && <AdminCustomerManagement />}

      {/* TAB 5: RIDES MANAGEMENT */}
      {currentTab === 'rides' && <AdminRidesManagement />}

      {/* TAB 6: PRICING & FARE SETTINGS */}
      {currentTab === 'pricing' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#C8622A]" />
                <div>
                  <h3 className="font-extrabold text-base text-[#111111]">
                    Dynamic Pricing Formula Configuration
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Adjust base fare, distance rates, and surge multipliers without redeploying code.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActionNotice('Pricing configurations saved and updated across all customer calculations.');
                  triggerSound('success');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Save Pricing Formula
              </button>
            </div>

            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Base Fare (First 1.5 KM)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.baseFare}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, baseFare: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Minimum flat pickup fee</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Rate per Kilometer</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.perKmRate}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, perKmRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Applied beyond base distance</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Rate per Minute (Time Fare)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.perMinuteRate}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, perMinuteRate: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Traffic delay compensation</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Minimum Trip Fare</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pricingConfig.minimumFare}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, minimumFare: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Absolute floor price</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Peak Surge Multiplier</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">x</span>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingConfig.peakSurgeMultiplier}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, peakSurgeMultiplier: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Demand rush multiplier (1.0x - 2.5x)</p>
              </div>

              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="font-bold text-neutral-800">Platform Commission %</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">%</span>
                  <input
                    type="number"
                    value={pricingConfig.serviceFeePercent}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, serviceFeePercent: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-xl font-bold"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Retained by platform (Captain gets 90%)</p>
              </div>
            </div>

            {/* Vehicle Specific Pricing */}
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <h4 className="font-bold text-sm text-[#111111]">Vehicle Tier Rates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">E-Rickshaw (1 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹20 • Per KM: ₹14</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Toto Premium (2 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹25 • Per KM: ₹16</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Toto Deluxe (3 Person)</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹30 • Per KM: ₹18</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="font-bold text-neutral-900">Full Reserve Toto</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Base: ₹45 • Per KM: ₹20</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: COUPONS & PROMOTIONS MANAGEMENT */}
      {currentTab === 'coupons' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">Coupon & Promo Code Engine</h3>
              </div>
            </div>

            {/* Create Coupon Form */}
            <form onSubmit={handleCreateCoupon} className="p-4 bg-[#FAF8F5] rounded-2xl border border-neutral-200 space-y-3 text-xs">
              <div className="font-bold text-neutral-800">Generate New Campaign Voucher</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-neutral-500 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="e.g. MONSOON20"
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-mono font-bold uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-500 block mb-1">Discount %</label>
                  <input
                    type="number"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-neutral-500 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={newCouponMax}
                    onChange={(e) => setNewCouponMax(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Add Coupon
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Coupons Table */}
            <div className="divide-y divide-neutral-100">
              {couponsList.map((cpn) => (
                <div key={cpn.code} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                        {cpn.code}
                      </span>
                      <span className="text-emerald-700 font-bold">{cpn.discount}% OFF</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-600">Max Cap: ₹{cpn.maxDiscount}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">Expires {cpn.expiry} • Min Fare: ₹{cpn.minFare}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCoupon(cpn.code)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                      cpn.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                    }`}
                  >
                    {cpn.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: REPORTS & CSV EXPORT */}
      {currentTab === 'reports' && <AdminReports />}

      {/* TAB 9: BROADCAST NOTIFICATIONS */}
      {currentTab === 'notifications' && <AdminNotifications />}

      {/* TAB 10: AUDIT LOGS */}
      {currentTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8622A]" />
                <h3 className="font-extrabold text-base text-[#111111]">
                  Immutable System Audit Logs
                </h3>
              </div>
              <span className="text-xs text-neutral-500">Total Entries: {auditLogs.length}</span>
            </div>

            <div className="space-y-2 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-neutral-900">{log.action}</div>
                    <div className="text-neutral-500 text-[11px]">{log.target} • Executed by <strong className="text-neutral-800">{log.actor}</strong></div>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">{log.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generated PIN Confirmation Modal */}
      {approvedPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl border border-neutral-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase">
                APPROVAL SUCCESSFUL
              </span>
              <h3 className="text-2xl font-extrabold text-[#111111] tracking-tight">
                4-Digit PIN Generated!
              </h3>
              <p className="text-xs text-neutral-500">
                Driver <strong className="text-neutral-900">{approvedPinModal.driverName}</strong> has been approved with plate <strong className="text-neutral-900">{approvedPinModal.vehicleNumber}</strong>.
              </p>
            </div>

            {/* PIN Display */}
            <div className="bg-[#FAF8F5] border-2 border-[#E5DFD5] rounded-3xl p-5 space-y-2">
              <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Driver Security Login PIN
              </div>
              <div className="text-4xl font-extrabold font-mono tracking-widest text-[#111111]">
                {approvedPinModal.pin}
              </div>
              <div className="text-[11px] text-neutral-500">
                Driver uses Mobile ({approvedPinModal.phone}) + this PIN for login.
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => copyPinToClipboard(approvedPinModal.pin)}
                className="w-full py-3 bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.98] text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {copiedPin ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPin ? 'PIN Copied to Clipboard!' : 'Copy 4-Digit PIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTestLoginAsDriver(approvedPinModal.phone, approvedPinModal.pin);
                  setApprovedPinModal(null);
                }}
                className="w-full py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Test Login to Driver Dashboard Now</span>
              </button>

              <button
                type="button"
                onClick={() => setApprovedPinModal(null)}
                className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-800 font-semibold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-neutral-200 shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                  <Key className="w-4 h-4 text-[#C8622A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Update Admin Password</h3>
                  <p className="text-[11px] text-neutral-500">Stored securely for future logins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPasswordVal.trim() || newPasswordVal.trim().length < 3) {
                  setPasswordNotice({ success: false, msg: 'Password must be at least 3 characters long.' });
                  return;
                }
                if (newPasswordVal !== confirmPasswordVal) {
                  setPasswordNotice({ success: false, msg: 'Passwords do not match.' });
                  return;
                }
                const res = updateAdminPassword(newPasswordVal);
                if (res.success) {
                  setPasswordNotice({ success: true, msg: 'Password successfully updated!' });
                  setTimeout(() => {
                    setShowPasswordModal(false);
                    setNewPasswordVal('');
                    setConfirmPasswordVal('');
                    setPasswordNotice(null);
                  }, 1500);
                } else {
                  setPasswordNotice({ success: false, msg: res.message });
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#C8622A]"
                />
              </div>

              {passwordNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${passwordNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <span>{passwordNotice.msg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#181818] hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer active:scale-95 transition-all shadow-xs"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
