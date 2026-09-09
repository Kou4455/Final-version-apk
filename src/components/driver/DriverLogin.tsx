import React, { useState } from 'react';
import { useRide } from '../../context/RideContext';
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
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { compressImage, formatFileSize, estimateBase64Size } from '../../utils/imageCompressor';

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

export const DriverLogin: React.FC<DriverLoginProps> = ({ onLoginSuccess, onBack }) => {
  const { 
    loginDriver,
    loginDriverWithPin, 
    registerDriverApproval, 
    pendingApprovalsCount,
    triggerSound, 
    setActiveRole, 
    logoutUser,
    logoutDriver 
  } = useRide();

  // Login form state (starts blank with inside placeholder text)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Mode: login vs register
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regVehicleModel, setRegVehicleModel] = useState('Mayuri Deluxe Li-ion E-Rickshaw');
  const [regVehicleColor, setRegVehicleColor] = useState('Emerald Green');
  const [driverPhoto, setDriverPhoto] = useState<string>('');
  const [totoPhotos, setTotoPhotos] = useState<string[]>([]);
  const [compressingDriverPhoto, setCompressingDriverPhoto] = useState(false);
  const [compressingTotoPhotos, setCompressingTotoPhotos] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<string | null>(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  // Handle Driver Photo File Upload with Auto Compression
  const handleDriverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressingDriverPhoto(true);
    setErrorMsg('');
    try {
      // Compress to max 500x500 at 0.65 quality (produces ~25KB-45KB)
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.65,
        maxBytes: 60 * 1024
      });
      setDriverPhoto(compressed);
      triggerSound('success');
    } catch (err) {
      console.error('Driver photo compression error:', err);
      setErrorMsg('Failed to process driver photo. Please choose another image.');
    } finally {
      setCompressingDriverPhoto(false);
      e.target.value = '';
    }
  };

  // Handle Toto Photos File Upload with Auto Compression (Max 3 photos)
  const handleTotoPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setCompressingTotoPhotos(true);
    setErrorMsg('');
    try {
      const remainingSlots = Math.max(0, 3 - totoPhotos.length);
      if (remainingSlots <= 0) {
        setErrorMsg('Maximum 3 Toto photos allowed.');
        return;
      }
      const filesToProcess: File[] = [];
      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const item = files.item(i);
        if (item) filesToProcess.push(item);
      }
      const compressedList = await Promise.all(
        filesToProcess.map((file) =>
          compressImage(file, {
            maxWidth: 600,
            maxHeight: 500,
            quality: 0.65,
            maxBytes: 60 * 1024
          })
        )
      );

      setTotoPhotos((prev) => [...prev, ...compressedList].slice(0, 3));
      triggerSound('beep');
    } catch (err) {
      console.error('Toto photos compression error:', err);
      setErrorMsg('Failed to process toto photos. Please try again.');
    } finally {
      setCompressingTotoPhotos(false);
      e.target.value = '';
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
      console.warn('Driver login notice:', err);
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

  return (
    <div 
      id="driver-login-screen" 
      className="w-full flex-1 sm:flex-initial sm:max-w-md md:max-w-lg mx-auto bg-[#FAF8F5] sm:rounded-3xl border-0 sm:border border-[#EDE8E0] shadow-none sm:shadow-sm p-5 sm:p-7 text-[#111111] font-sans animate-in fade-in duration-200 flex flex-col justify-between min-h-[calc(100vh-65px)] sm:min-h-0 touch-pan-y"
    >
      <div className="space-y-5">
        {/* Top Back & Admin Link */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              triggerSound('beep');
              logoutDriver();
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

        {/* Form View Router */}
        {!isRegisterMode ? (
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
              <label className="block text-xs font-bold text-[#111111]">
                4-Digit Security PIN
              </label>

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
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-center animate-in fade-in">
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                <h3 className="text-sm font-bold text-emerald-900">Your KYC is approved!</h3>
                <p className="text-xs font-semibold text-emerald-800">
                  Your verification is confirmed and your account is ready to go. Redirecting...
                </p>
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

            {/* 3. Vehicle Registration Plate */}
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

            {/* 4. Toto Model */}
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

            {/* 5. Body Color */}
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

            {/* 6. Driver Photo (Selfie / ID Portrait) */}
            <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#EDE8E0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C8622A]" />
                  <label className="block text-[11px] font-bold text-[#111111]">
                    Driver Photo (Selfie / ID Portrait)
                  </label>
                </div>
                {compressingDriverPhoto ? (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Compressing...
                  </span>
                ) : driverPhoto ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Ready ({formatFileSize(estimateBase64Size(driverPhoto))})
                  </span>
                ) : null}
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
                      {compressingDriverPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#C8622A]" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
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
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDE8E0] hover:bg-[#E2DDD3] text-[#111111] text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs ${
                    compressingDriverPhoto ? 'opacity-60 pointer-events-none' : ''
                  }`}>
                    <Upload className="w-3.5 h-3.5 text-[#C8622A]" />
                    <span>{driverPhoto ? 'Change Photo' : 'Upload From Device / Camera'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={compressingDriverPhoto}
                      onChange={handleDriverPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-neutral-500">
                    Auto-optimized to lightweight HD JPEG for instant cloud sync.
                  </p>
                </div>
              </div>
            </div>

            {/* 7. OPTION: Toto Rickshaw Photos (Front, Side, Interior) */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-[#EDE8E0] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#C8622A]" />
                  <label className="block text-[11px] font-bold text-[#111111]">
                    Toto Vehicle Photos (Max 3)
                  </label>
                </div>
                {compressingTotoPhotos ? (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Optimizing...
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-lg">
                    {totoPhotos.length}/3 Photos
                  </span>
                )}
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

                  {/* Add more button if under limit */}
                  {totoPhotos.length < 3 && (
                    <label className={`w-16 h-14 rounded-xl border-2 border-dashed border-neutral-300 hover:border-[#C8622A] bg-neutral-50 flex flex-col items-center justify-center text-neutral-500 cursor-pointer shrink-0 transition-colors ${
                      compressingTotoPhotos ? 'opacity-60 pointer-events-none' : ''
                    }`}>
                      {compressingTotoPhotos ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#C8622A]" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-[#C8622A]" />
                          <span className="text-[9px] font-bold mt-0.5">Add</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={compressingTotoPhotos}
                        onChange={handleTotoPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <label className={`w-full py-4 px-3 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-[#C8622A] bg-neutral-50/70 flex flex-col items-center justify-center text-neutral-600 cursor-pointer transition-colors ${
                  compressingTotoPhotos ? 'opacity-60 pointer-events-none' : ''
                }`}>
                  {compressingTotoPhotos ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#C8622A]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Compressing & optimizing vehicle photos...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-[#C8622A] mb-1" />
                      <span className="text-xs font-bold text-neutral-800">Upload Toto Photos</span>
                      <span className="text-[10px] text-neutral-400">Front view, side profile & number plate (up to 3)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={compressingTotoPhotos}
                    onChange={handleTotoPhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Registration Success Confirmation */}
            {registrationSubmitted && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-2 shadow-2xs mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-extrabold text-emerald-900">
                  Success!
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  Your submission was received successfully. We are reviewing your details and will get back to you shortly.
                </p>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200 mb-4">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || registrationSubmitted}
              className={`w-full font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all cursor-pointer pt-2 ${
                registrationSubmitted
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white cursor-default'
                  : 'bg-[#FF6B2C] hover:bg-[#E55A1F] active:scale-[0.99] text-white disabled:opacity-75'
              }`}
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to Firestore...</span>
                </>
              ) : registrationSubmitted ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Submitted</span>
                </>
              ) : (
                <span>Submit For Approval</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 text-center text-[11px] text-neutral-500 font-medium space-y-1.5">
        <div>Secured with Firebase Firestore & 4-Digit PIN Authentication</div>
      </div>
    </div>
  );
};

