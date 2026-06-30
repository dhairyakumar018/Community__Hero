import React, { useRef } from 'react';

interface OTPInputProps {
  otp: string[];
  setOtp: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function OTPInput({ otp, setOtp }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const splitDigits = pastedData.split('');
      setOtp(splitDigits);
      inputsRef.current[5]?.focus();
    }
  };

  return (
    <div className="flex space-x-2.5 justify-center" id="otp-input-container">
      {otp.map((digit, i) => (
        <input
          key={i}
          id={`otp-digit-${i}`}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(e.target.value, i)}
          onKeyDown={e => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-white/5 border-white/10 text-slate-100 focus:border-blue-500/50 focus:outline-none transition-colors shadow-inner backdrop-blur-md"
        />
      ))}
    </div>
  );
}
