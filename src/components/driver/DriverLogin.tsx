import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
import { SEED_DRIVERS } from '../../data/appData';
import { 
  ArrowLeft, 
  Gauge, 
  Lock, 
  Phone, 
  User, 
  Car, 
  CheckCircle, 
  RotateCw, 
  Key, 
  ShieldAlert, 
  Sparkles, 
  Palette,
  ShieldCheck,
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  Check,
  Image as ImageIcon
} from 'lucide-react';

interface DriverLoginProps {
  onLoginSuccess?: () => void;
  onBack?: () => void;
}

const POPULAR_COLORS = [
  'Emerald Green',
  'Canary Yellow',
  'Electric Blue',
  'Saffron Orange',
  'Pearl White'
];

const DRIVER_PHOTO_PRESETS = [
  { id: 'dp1', label: 'Capt. Sujit', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80' },
  { id: 'dp2', label: 'Capt. Ratan', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80' },
  { id: 'dp3', label: 'Capt. Bappa', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80' },
  { id: 'dp4', label: 'Capt. Joydeb', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80' }
];

const TOTO_PHOTO_PRESETS = [
  { id: 'tp_green', name: 'Emerald Green Toto', color: 'Emerald Green', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=320&auto=format&fit=crop&q=80' },
  { id: 'tp_yellow', name: 'Canary Yellow Toto', color: 'Canary Yellow', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=320&auto=format&fit=crop&q=80' },
  { id: 'tp_blue', name: 'Electric Blue Toto', color: 'Electric Blue', url: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=320&auto=format&fit=crop&q=80' },
  { id: 'tp_orange', name: 'Saffron Orange Toto', color: 'Saffron Orange', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=320&auto=format&fit=crop&q=80' },
  { id: 'tp_white', name: 'Pearl White Toto', color: 'Pearl White', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=320&auto=format&fit=crop&q=80' }
];

export const DriverLogin: React.FC<DriverLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { 
    loginDriver,
    loginDriverWithPin, 
    registerDriverApproval, 
    pendingApprovalsCount,
    triggerSound, 
    setActiveRole, 
    logoutUser 
  } = useRide();

  // Login form state
  const [phoneNumber, setPhoneNumber] = useState('+91 98745 22019');
  const [securityPin, setSecurityPin] = useState('1234');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Mode: login vs register
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regVehicleModel, setRegVehicleModel] = useState('Mayuri Deluxe Li-ion E-Rickshaw');
  const [regVehicleColor, setRegVehicleColor] = useState('Emerald Green');
  const [driverPhoto, setDriverPhoto] = useState<string>(DRIVER_PHOTO_PRESETS[0].url);
  const [totoPhotos, setTotoPhotos] = useState<string[]>([TOTO_PHOTO_PRESETS[0].url]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<string | null>(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // Handle Driver Photo File Upload
  const handleDriverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setDriverPhoto(event.target.result as string);
        triggerSound('success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Toto Photos File Upload (Multiple)
  const handleTotoPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTotoPhotos((prev) => [...prev, event.target!.result as string]);
          triggerSound('beep');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add preset Toto photo
  const addTotoPresetPhoto = (url: string) => {
    if (!totoPhotos.includes(url)) {
      setTotoPhotos((prev) => [...prev, url]);
      triggerSound('beep');
    }
  };

  // Remove Toto photo from array
  const removeTotoPhoto = (indexToRemove: number) => {
    setTotoPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    triggerSound('beep');
  };

  // Handle Driver Login with Phone + 4-digit PIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your mobile phone number');
      return;
    }
    if (!securityPin.trim() || securityPin.length < 4) {
      setErrorMsg('Please enter your 4-digit security PIN');
      return;
    }

    setErrorMsg('');
    setPendingApprovalNotice(null);
    setLoading(true);
    triggerSound('beep');

    try {
      const result = await loginDriverWithPin(phoneNumber, securityPin);
      if (result.success) {
        setLoginSuccess(true);
        triggerSound('success');
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess();
        }, 350);
      } else {
        triggerSound('alert');
        if (result.isPendingApproval) {
          setPendingApprovalNotice(result.message);
        } else {
          setErrorMsg(result.message);
        }
      }
    } catch (err) {
      console.error('Driver login error:', err);
      setErrorMsg('Login failed. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle New Toto Partner Registration (Stores approval request in Firestore)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!regVehicleNumber.trim()) {
      setErrorMsg('Please enter your Toto registration plate number');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    triggerSound('beep');

    try {
      await registerDriverApproval({
        driverName: regName.trim(),
        phone: regPhone.startsWith('+91') ? regPhone : `+91 ${regPhone.replace(/\D/g, '').slice(-10)}`,
        vehicleType: 'toto',
        vehicleNumber: regVehicleNumber.trim().toUpperCase(),
        vehicleModel: regVehicleModel.trim(),
        vehicleColor: regVehicleColor.trim(),
        driverPhoto: driverPhoto || undefined,
        totoPhotos: totoPhotos.length > 0 ? totoPhotos : undefined
      });

      setRegistrationSubmitted(true);
      triggerSound('success');
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMsg('Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick autofill demo captain
  const handleAutofillDemo = () => {
    setPhoneNumber('+91 98745 22019');
    setSecurityPin('1234');
    setErrorMsg('');
    setPendingApprovalNotice(null);
    triggerSound('beep');
  };

  return (
    <div id="driver-login-screen" className="w-full max-w-md mx-auto bg-[#FAF8F5] min-h-[580px] max-h-[94vh] overflow-y-auto no-scrollbar flex flex-col justify-between p-5 sm:p-6 text-[#111111] font-sans select-none animate-in fade-in duration-200 rounded-3xl border border-[#EDE8E0] shadow-sm">
      <div className="space-y-5">
        {/* Top Back & Admin Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              logoutUser();
              setActiveRole('user');
              if (onBack) onBack();
            }}
            className="w-10 h-10 rounded-full bg-[#EFEAE2] hover:bg-[#E4DDD3] active:scale-95 flex items-center justify-center text-[#111111] transition-all cursor-pointer shadow-2xs"
            title="Return to Passenger App"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMsg('');
                setPendingApprovalNotice(null);
                setRegistrationSubmitted(false);
              }}
              className="text-xs font-bold text-[#C8622A] hover:underline cursor-pointer bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200"
            >
              {isRegisterMode ? 'Back to Sign In' : 'Register New Toto'}
            </button>
          </div>
        </div>

        {/* Beige Speedometer Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#EDE8E0] text-[#111111] flex items-center justify-center shadow-2xs border border-[#E2DDD3]">
          <Gauge className="w-7 h-7 stroke-[2.2]" />
        </div>

        {/* Header Typography */}
        <div className="space-y-1">
          <div className="text-xs font-bold tracking-wider uppercase text-[#C8622A] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TOTO CAPTAIN PORTAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
            {isRegisterMode ? 'Register Your Toto' : 'Driver PIN Sign In'}
          </h1>
          <p className="text-xs font-medium text-neutral-500 pt-0.5">
            {isRegisterMode 
              ? 'Upload driver photo & Toto photos to receive admin verification and your 4-digit security PIN.'
              : 'Sign in using your mobile number and admin-assigned 4-digit security PIN.'}
          </p>
        </div>

        {/* Notice of Pending Approval */}
        {pendingApprovalNotice && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Approval Pending</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {pendingApprovalNotice}
            </p>
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Go to Admin Console to Approve
            </button>
          </div>
        )}

        {/* Registration Success Confirmation */}
        {registrationSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-5 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-emerald-900">
                Registration & Photos Stored in Firestore!
              </h3>
              <p className="text-xs text-emerald-800">
                Your Toto registration dossier with driver selfie and vehicle photos has been submitted to Admin. Once approved, a unique 4-digit security PIN will be issued for you.
              </p>
            </div>

            {/* Preview of Submitted Photos */}
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200 text-left space-y-2.5">
              <div className="flex items-center gap-3">
                {driverPhoto ? (
                  <img 
                    src={driverPhoto} 
                    alt="Driver Photo" 
                    className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">
                    {regName.slice(0, 1) || 'C'}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-xs text-neutral-900">{regName}</div>
                  <div className="text-[11px] text-neutral-500 font-mono">{regVehicleNumber}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{regVehicleModel} ({regVehicleColor})</div>
                </div>
              </div>

              {totoPhotos.length > 0 && (
                <div className="pt-1.5 border-t border-emerald-100 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    {totoPhotos.length} Toto Photo{totoPhotos.length > 1 ? 's' : ''} Attached:
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {totoPhotos.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Toto ${i + 1}`}
                        className="w-16 h-12 rounded-lg object-cover border border-emerald-200 shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  triggerSound('beep');
                  setActiveRole('admin');
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-xs"
              >
                Open Admin Console & Approve Driver Now
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(false);
                  setRegistrationSubmitted(false);
                }}
                className="w-full py-2 text-xs font-semibold text-neutral-600 hover:text-black cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : !isRegisterMode ? (
          /* Login with Phone + 4-digit PIN */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#111111]">
                Registered Mobile Phone Number
              </label>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#EDE8E0] shadow-2xs focus-within:border-black transition-colors px-4 py-3">
                <Phone className="w-4 h-4 text-gray-500 mr-2.5 shrink-0" />
                <input
                  id="driver-phone-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. +91 98745 22019"
                  className="w-full bg-transparent text-sm font-semibold text-[#111111] placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 4-digit Security PIN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#111111]">
                  4-Digit Security PIN
                </label>
                <button
                  type="button"
                  onClick={handleAutofillDemo}
                  className="text-[10px] font-bold text-[#C8622A] hover:underline cursor-pointer"
                >
                  Demo Captain PIN (1234)
                </button>
              </div>

              <div className="relative flex items-center bg-white rounded-2xl border border-[#EDE8E0] shadow-2xs focus-within:border-black transition-colors px-4 py-3">
                <Lock className="w-4 h-4 text-gray-500 mr-2.5 shrink-0" />
                <input
                  id="driver-pin-input"
                  type="password"
                  maxLength={4}
                  value={securityPin}
                  onChange={(e) => {
                    setSecurityPin(e.target.value.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter 4-digit security PIN"
                  className="w-full bg-transparent text-base font-mono font-bold tracking-widest text-[#111111] placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-xl border border-red-200">
                {errorMsg}
              </p>
            )}

            {loginSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PIN Verified! Redirecting to Dashboard...</span>
              </div>
            )}

            {/* Submit Login Button */}
            <button
              id="open-driver-dashboard-btn"
              type="submit"
              disabled={loading || loginSuccess}
              className="w-full bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer disabled:opacity-75"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN in Firestore...</span>
                </>
              ) : loginSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Login Successful! Loading Dashboard...</span>
                </>
              ) : (
                <span>Sign In to Captain Dashboard</span>
              )}
            </button>

            {/* Quick Demo Captains One-Click Sign In */}
            <div className="pt-2 border-t border-[#EDE8E0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-600">Quick Demo Captains (1-Click Login):</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">Instant Access</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {SEED_DRIVERS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={async () => {
                      setPhoneNumber(d.phone);
                      setSecurityPin('1234');
                      setErrorMsg('');
                      setPendingApprovalNotice(null);
                      setLoginSuccess(true);
                      triggerSound('success');
                      await loginDriver(d);
                      setTimeout(() => {
                        if (onLoginSuccess) onLoginSuccess();
                      }, 350);
                    }}
                    className="flex items-center justify-between p-2.5 bg-white hover:bg-amber-50/80 active:scale-[0.98] rounded-2xl border border-[#EDE8E0] hover:border-amber-300 transition-all cursor-pointer text-left group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Driver Photo & Toto Photo Badge */}
                      <div className="relative shrink-0">
                        <img
                          src={d.avatarUrl || d.driverPhoto}
                          alt={d.name}
                          className="w-10 h-10 rounded-xl object-cover border border-neutral-200 group-hover:border-[#C8622A] transition-colors"
                        />
                        {d.totoPhoto && (
                          <img
                            src={d.totoPhoto}
                            alt={d.vehicleModel}
                            className="w-4 h-4 rounded-full object-cover absolute -bottom-1 -right-1 border border-white shadow-xs"
                            title={d.vehicleModel}
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-900 group-hover:text-[#C8622A] flex items-center gap-1.5">
                          <span>{d.name}</span>
                          <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 px-1 rounded">
                            {d.vehicleColor}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {d.vehicleNumber} • PIN: 1234
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#C8622A] bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 group-hover:bg-[#C8622A] group-hover:text-white transition-colors">
                      Sign In →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* 1. Driver Full Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#111111]">
                Driver Full Name
              </label>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#EDE8E0] px-3.5 py-2.5 shadow-2xs">
                <User className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Sujit Ghosh"
                  className="w-full text-xs font-semibold text-[#111111] placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Mobile Phone */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#111111]">
                10-Digit Mobile Number
              </label>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#EDE8E0] px-3.5 py-2.5 shadow-2xs">
                <Phone className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. 98301 23456"
                  className="w-full text-xs font-semibold text-[#111111] placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 3. OPTION: Driver Photo (Selfie / ID Portrait) */}
            <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#EDE8E0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C8622A]" />
                  <label className="block text-[11px] font-bold text-[#111111]">
                    Driver Photo (Selfie / ID Portrait)
                  </label>
                </div>
                {driverPhoto && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Active Photo Avatar Preview */}
                <div className="relative shrink-0">
                  {driverPhoto ? (
                    <img 
                      src={driverPhoto} 
                      alt="Driver Selfie" 
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#C8622A] shadow-xs" 
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  {driverPhoto && (
                    <button
                      type="button"
                      onClick={() => setDriverPhoto('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:bg-rose-700 shadow-xs cursor-pointer"
                      title="Remove Driver Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  {/* File upload input */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDE8E0] hover:bg-[#E2DDD3] text-[#111111] text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#C8622A]" />
                    <span>Upload From Device / Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDriverPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-neutral-500">
                    Clear passport photo or selfie for passenger trust & safety.
                  </p>
                </div>
              </div>

              {/* Quick Portrait Presets */}
              <div className="pt-1.5 border-t border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-500 block mb-1">
                  Or select verified driver portrait:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {DRIVER_PHOTO_PRESETS.map((dp) => (
                    <button
                      key={dp.id}
                      type="button"
                      onClick={() => {
                        setDriverPhoto(dp.url);
                        triggerSound('beep');
                      }}
                      className={`flex items-center gap-1.5 p-1 pr-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                        driverPhoto === dp.url 
                          ? 'border-[#C8622A] bg-amber-50/80 shadow-2xs' 
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <img src={dp.url} alt={dp.label} className="w-6 h-6 rounded-lg object-cover" />
                      <span className="text-[10px] font-semibold text-neutral-800">{dp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Vehicle Registration Plate */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#111111]">
                Toto Registration Number Plate
              </label>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#EDE8E0] px-3.5 py-2.5 shadow-2xs">
                <Car className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={regVehicleNumber}
                  onChange={(e) => setRegVehicleNumber(e.target.value)}
                  placeholder="e.g. WB-06-ER-8942"
                  className="w-full text-xs font-mono font-bold uppercase text-[#111111] placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Toto Model */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#111111]">
                Toto Model
              </label>
              <input
                type="text"
                value={regVehicleModel}
                onChange={(e) => setRegVehicleModel(e.target.value)}
                placeholder="e.g. Mayuri Deluxe Lithium"
                className="w-full bg-white rounded-2xl border border-[#EDE8E0] px-3.5 py-2.5 text-xs font-semibold text-[#111111] placeholder-gray-400 focus:outline-none shadow-2xs"
              />
            </div>

            {/* 6. Body Color */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#111111]">
                Toto Body Color
              </label>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {POPULAR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      setRegVehicleColor(col);
                      // Auto-suggest matching toto photo
                      const matchingPreset = TOTO_PHOTO_PRESETS.find(p => p.color === col);
                      if (matchingPreset && !totoPhotos.includes(matchingPreset.url)) {
                        setTotoPhotos([matchingPreset.url]);
                      }
                    }}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                      regVehicleColor === col
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. OPTION: Toto Rickshaw Photos (Front, Side, Interior) */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-[#EDE8E0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C8622A]" />
                  <label className="block text-[11px] font-bold text-[#111111]">
                    Toto Vehicle Photos
                  </label>
                </div>
                <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-lg">
                  {totoPhotos.length} Photo{totoPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Gallery of Uploaded Toto Photos */}
              {totoPhotos.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {totoPhotos.map((imgUrl, idx) => (
                    <div key={idx} className="relative shrink-0 group">
                      <img
                        src={imgUrl}
                        alt={`Toto photo ${idx + 1}`}
                        className="w-20 h-14 rounded-xl object-cover border border-neutral-200 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeTotoPhoto(idx)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs cursor-pointer transition-colors"
                        title="Delete photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-mono px-1 rounded">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}

                  {/* Add more button */}
                  <label className="w-16 h-14 rounded-xl border-2 border-dashed border-neutral-300 hover:border-[#C8622A] bg-neutral-50 flex flex-col items-center justify-center text-neutral-500 cursor-pointer shrink-0 transition-colors">
                    <Plus className="w-4 h-4 text-[#C8622A]" />
                    <span className="text-[9px] font-bold mt-0.5">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleTotoPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="w-full py-4 px-3 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-[#C8622A] bg-neutral-50/70 flex flex-col items-center justify-center text-neutral-600 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-[#C8622A] mb-1" />
                  <span className="text-xs font-bold text-neutral-800">Upload Toto Photos</span>
                  <span className="text-[10px] text-neutral-400">Front view, side profile & number plate</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleTotoPhotoUpload}
                    className="hidden"
                  />
                </label>
              )}

              {/* Quick Toto Vehicle Presets Matching Colors */}
              <div className="pt-1.5 border-t border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-500 block mb-1">
                  Attach Authentic Toto E-Rickshaw Photo Presets:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {TOTO_PHOTO_PRESETS.map((preset) => {
                    const isAdded = totoPhotos.includes(preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setTotoPhotos(prev => prev.filter(u => u !== preset.url));
                          } else {
                            addTotoPresetPhoto(preset.url);
                          }
                        }}
                        className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isAdded 
                            ? 'border-emerald-500 bg-emerald-50/60 shadow-2xs' 
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <img 
                          src={preset.url} 
                          alt={preset.name} 
                          className="w-7 h-7 rounded-lg object-cover shrink-0" 
                        />
                        <div className="truncate flex-1">
                          <div className="text-[10px] font-bold text-neutral-900 truncate">
                            {preset.name}
                          </div>
                          <div className="text-[9px] text-neutral-500 font-medium">
                            {isAdded ? '✓ Added' : '+ Tap to add'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-75 pt-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Firestore...</span>
                </>
              ) : (
                <span>Submit Toto & Photos for Admin Approval</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 text-center text-[11px] text-neutral-500 font-medium space-y-1.5">
        <div>Secured with Firebase Firestore & 4-Digit PIN Authentication</div>
        <div>
          <button
            id="driver-footer-admin-login-btn"
            type="button"
            onClick={() => {
              triggerSound('beep');
              setActiveRole('admin');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 hover:text-black font-bold text-xs transition-all cursor-pointer border border-neutral-200 shadow-2xs active:scale-95 group"
            title="Open Admin Login Portal"
          >
            <Lock className="w-3.5 h-3.5 text-[#C8622A] group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-[#C8622A] group-hover:underline">Admin Login Portal</span>
            <span className="text-neutral-400 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

