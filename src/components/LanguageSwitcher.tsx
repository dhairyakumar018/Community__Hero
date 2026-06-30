import React from 'react';
import useTranslations from '../lib/useTranslations';
import { Language } from '../types';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslations();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value as Language);
  };

  return (
    <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 backdrop-blur-md text-xs font-medium shadow-md">
      <Globe className="w-3.5 h-3.5 text-blue-400" />
      <select
        id="language-select"
        value={locale}
        onChange={handleLanguageChange}
        className="bg-transparent text-slate-100 focus:outline-none cursor-pointer pr-1"
      >
        <option value="en" className="bg-slate-900 text-slate-100">English</option>
        <option value="hi" className="bg-slate-900 text-slate-100">हिन्दी (Hindi)</option>
        <option value="ta" className="bg-slate-900 text-slate-100">தமிழ் (Tamil)</option>
        <option value="te" className="bg-slate-900 text-slate-100">తెలుగు (Telugu)</option>
        <option value="bn" className="bg-slate-900 text-slate-100">বাংলা (Bengali)</option>
      </select>
    </div>
  );
}
