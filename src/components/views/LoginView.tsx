import React, { useState } from 'react';
import useTranslations from '../../lib/useTranslations';
import OTPInput from '../OTPInput';
import { Phone, ArrowRight, ShieldCheck, Zap, UserCheck, Lock, CheckCircle } from 'lucide-react';
import { loginAsGuest, loginAsOfficer } from '../../lib/api';
import { UserProfile } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (profile: UserProfile) => void;
  theme?: 'dark' | 'light';
}

type LoginTab = 'citizen' | 'officer';

export default function LoginView({ onLoginSuccess, theme = 'dark' }: LoginViewProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<LoginTab>('citizen');
  
  // Citizen Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [displayName, setDisplayName] = useState('');
  
  // Officer Form state
  const [selectedRole, setSelectedRole] = useState<'super_admin' | 'ward_officer' | 'department_head'>('super_admin');
  const [officerPin, setOfficerPin] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Demo OTP and PIN configs
  const DEMO_OTP = '777777';
  const ROLE_PINS = {
    super_admin: '9999',
    ward_officer: '8888',
    department_head: '7777'
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    setLoading(true);

    // Simulate OTP sending delay
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
    }, 1200);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    
    if (enteredCode !== DEMO_OTP && enteredCode !== '123456') {
      setError(`Incorrect verification code. Please use the demo code: ${DEMO_OTP}`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const profile = await loginAsGuest(
        phoneNumber,
        displayName || `Citizen ${phoneNumber.slice(-4)}`
      );
      onLoginSuccess(profile);
    } catch (err) {
      setError('Auth failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPin = ROLE_PINS[selectedRole];
    
    if (officerPin !== requiredPin) {
      setError(`Incorrect security PIN. Demo PIN for this profile is ${requiredPin}`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const profile = await loginAsOfficer(selectedRole);
      onLoginSuccess(profile);
    } catch (err) {
      setError('Officer authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBypass = async () => {
    setError('');
    setLoading(true);
    try {
      const profile = await loginAsGuest('+919876543210', 'Judge Guest');
      onLoginSuccess(profile);
    } catch (err) {
      setError('Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-view" className={`max-w-md mx-auto py-10 px-4 space-y-6 animate-fadeIn transition-colors duration-300`}>
      {/* App Branding */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg shadow-blue-500/25">
          JF
        </div>
        <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
          {t('app_name')}
        </h2>
        <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Vibe2Ship Civic Reporting Platform</p>
      </div>

      {/* Tabs Switcher */}
      <div className={`flex border p-1 rounded-2xl transition-colors duration-300 ${
        theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
      }`}>
        <button
          onClick={() => { setActiveTab('citizen'); setError(''); }}
          className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'citizen'
              ? theme === 'light'
                ? 'bg-white text-blue-600 shadow-md border border-slate-200/60'
                : 'bg-white/10 text-white'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Citizen Portal</span>
        </button>
        <button
          onClick={() => { setActiveTab('officer'); setError(''); }}
          className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'officer'
              ? theme === 'light'
                ? 'bg-white text-blue-600 shadow-md border border-slate-200/60'
                : 'bg-white/10 text-white'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Municipal Officer</span>
        </button>
      </div>

      <div className={`border rounded-3xl p-6 shadow-2xl space-y-6 transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
          : 'bg-[#121b2e]/60 border-white/10 text-slate-100 backdrop-blur-md'
      }`}>
        
        {/* Error Message display */}
        {error && (
          <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl font-semibold animate-pulse">
            {error}
          </div>
        )}

        {activeTab === 'citizen' ? (
          /* CITIZEN LOGIN PORTAL */
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1">
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                  {t('login_title')}
                </h3>
                <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('login_subtitle')}
                </p>
              </div>

              <div className="space-y-3">
                {/* Optional Name Input */}
                <div className="space-y-1">
                  <label htmlFor="display-name" className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Your Name (Optional)
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    placeholder="Enter your name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                      theme === 'light'
                        ? 'bg-slate-100 border border-slate-200 text-slate-800 focus:bg-white'
                        : 'bg-white/5 border border-white/10 text-slate-100'
                    }`}
                  />
                </div>

                {/* Phone Input */}
                <div className="space-y-1">
                  <label htmlFor="phone-number" className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {t('phone_number')}
                  </label>
                  <div className="flex">
                    <span className={`border-y border-l px-3 py-2.5 text-xs rounded-l-xl flex items-center font-bold ${
                      theme === 'light'
                        ? 'bg-slate-200 border-slate-200 text-slate-700'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}>
                      +91
                    </span>
                    <input
                      id="phone-number"
                      type="tel"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className={`w-full rounded-r-xl px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                        theme === 'light'
                          ? 'bg-slate-100 border border-y border-r border-slate-200 text-slate-800 focus:bg-white'
                          : 'bg-white/5 border border-white/10 text-slate-100'
                      }`}
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              <button
                id="btn-send-otp"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-transform active:scale-98 disabled:opacity-50 border border-blue-500"
              >
                <span>{loading ? t('loading') : t('send_otp')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* OTP VERIFICATION VIEW */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-1">
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                  {t('entering_otp')}
                </h3>
                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('otp_sent_to')} <span className="text-blue-500 font-bold">+91 {phoneNumber}</span>.
                </p>
              </div>

              {/* Simulated OTP hint box */}
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] px-3 py-2.5 rounded-lg flex items-center space-x-2 font-bold backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>[Demo Mode] Enter code <strong className="font-extrabold">{DEMO_OTP}</strong> or <strong className="font-extrabold">123456</strong> to verify.</span>
              </div>

              <OTPInput otp={otp} setOtp={setOtp} />

              <div className="flex justify-between items-center text-[11px] px-1">
                <span className={`${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('didnt_receive_code')}</span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-blue-500 font-bold hover:underline"
                >
                  {t('resend')}
                </button>
              </div>

              <button
                id="btn-verify-otp"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-transform active:scale-98 disabled:opacity-50 border border-blue-500"
              >
                <span>{loading ? t('loading') : t('verify_otp')}</span>
              </button>
            </form>
          )
        ) : (
          /* MUNICIPAL OFFICER LOGIN PORTAL */
          <form onSubmit={handleOfficerLogin} className="space-y-4">
            <div className="space-y-1">
              <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                Government Admin Authentication
              </h3>
              <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Access the official city control board. Select your profile role below.
              </p>
            </div>

            {/* Officer Profiles Grid */}
            <div className="space-y-2">
              <label className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Select Profile Role
              </label>
              
              <div className="space-y-2">
                {/* Super Admin */}
                <div
                  onClick={() => { setSelectedRole('super_admin'); setError(''); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRole === 'super_admin'
                      ? 'border-blue-500 bg-blue-500/10'
                      : theme === 'light'
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      SA
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Super Admin Officer</h4>
                      <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>HQ Command • Phone: +91 9999999999</p>
                    </div>
                  </div>
                  {selectedRole === 'super_admin' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </div>

                {/* Ward Officer */}
                <div
                  onClick={() => { setSelectedRole('ward_officer'); setError(''); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRole === 'ward_officer'
                      ? 'border-blue-500 bg-blue-500/10'
                      : theme === 'light'
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      WO
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Ward Officer Kumar</h4>
                      <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Hazratganj Ward • Phone: +91 8888888888</p>
                    </div>
                  </div>
                  {selectedRole === 'ward_officer' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </div>

                {/* Department Head */}
                <div
                  onClick={() => { setSelectedRole('department_head'); setError(''); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedRole === 'department_head'
                      ? 'border-blue-500 bg-blue-500/10'
                      : theme === 'light'
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow">
                      DH
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Dept Head Shastri</h4>
                      <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Sanitation Dept • Phone: +91 7777777777</p>
                    </div>
                  </div>
                  {selectedRole === 'department_head' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </div>
              </div>
            </div>

            {/* Officer PIN Input */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="officer-pin" className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Officer Security PIN
                </label>
                <span className="text-[9px] text-blue-500 font-extrabold">
                  Demo PIN: {ROLE_PINS[selectedRole]}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="officer-pin"
                  type="password"
                  maxLength={4}
                  placeholder="Enter 4-digit security PIN"
                  value={officerPin}
                  onChange={e => setOfficerPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-100 border border-slate-200 text-slate-800 focus:bg-white'
                      : 'bg-white/5 border border-white/10 text-slate-100'
                  }`}
                />
              </div>
            </div>

            <button
              id="btn-officer-login"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg flex items-center justify-center space-x-1.5 transition-transform active:scale-98 disabled:opacity-50 border border-blue-500 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Secure Admin Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Guest fallback for Quick Testing */}
        {activeTab === 'citizen' && (
          <>
            <div className="relative flex py-2 items-center">
              <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">or</span>
              <div className={`flex-grow border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}></div>
            </div>

            <button
              id="btn-guest-bypass"
              onClick={handleGuestBypass}
              disabled={loading}
              className={`w-full font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 transition-transform active:scale-98 border ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-blue-600 border-slate-200'
                  : 'bg-white/10 backdrop-blur-md hover:bg-white/15 text-blue-400 border-white/10'
              }`}
            >
              <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>{t('guest_mode')}</span>
            </button>
          </>
        )}
      </div>

      <p className={`text-[10px] text-center leading-relaxed font-semibold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
        🔒 Connected securely via Firebase Auth Emulation.<br />Your report rewards real municipal-grade civic credits.
      </p>
    </div>
  );
}
