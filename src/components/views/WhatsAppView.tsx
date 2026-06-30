import { useState } from 'react';
import useTranslations from '../../lib/useTranslations';
import { MessageSquare, Phone, ArrowLeft, Send, Check } from 'lucide-react';

interface WhatsAppViewProps {
  onBack: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  image?: string;
}

export default function WhatsAppView({ onBack }: WhatsAppViewProps) {
  const { t } = useTranslations();
  const [activeLang, setActiveLang] = useState<'en' | 'hi' | 'ta'>('en');

  // Multi-lingual dialogue templates
  const conversations: Record<'en' | 'hi' | 'ta', Message[]> = {
    en: [
      { id: '1', sender: 'user', text: 'Hello, I want to report an issue.', timestamp: '11:42 AM' },
      { id: '2', sender: 'bot', text: 'Namaste! Welcome to Community Hero Bot. 🗺️\n\nPlease snap and upload a photo of the civic issue (pothole, garbage, streetlight, water leak).', timestamp: '11:42 AM' },
      { id: '3', sender: 'user', text: 'Uploading photo...', timestamp: '11:43 AM', image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=400' },
      { id: '4', sender: 'bot', text: '✓ Photo received!\n\nAI analysis classified: GARBAGE PILE 🗑️\nSeverity: MEDIUM ⚠️\n\nPlease share your current GPS coordinates, or send your nearest landmark.', timestamp: '11:43 AM' },
      { id: '5', sender: 'user', text: 'Near Metro Station pillar 42, Indiranagar', timestamp: '11:44 AM' },
      { id: '6', sender: 'bot', text: '🎉 Excellent! Your ticket has been logged successfully.\n\nTicket Ref: #TKT-824\nAssigned: Sanitation & Waste Management Department.\nEstimated resolution: within 48 hours.\n\nYou have been awarded +10 civic points! Thank you for being a neighborhood hero!', timestamp: '11:44 AM' }
    ],
    hi: [
      { id: '1', sender: 'user', text: 'नमस्ते, मैं एक समस्या की रिपोर्ट करना चाहता हूँ।', timestamp: '11:42 AM' },
      { id: '2', sender: 'bot', text: 'नमस्ते! कम्युनिटी हीरो बॉट में आपका स्वागत है। 🗺️\n\nकृपया नागरिक समस्या (गड्ढा, कचरा, स्ट्रीटलाइट, पानी का रिसाव) की एक फोटो खींचकर अपलोड करें।', timestamp: '11:42 AM' },
      { id: '3', sender: 'user', text: 'फोटो अपलोड कर रहा हूँ...', timestamp: '11:43 AM', image: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=400' },
      { id: '4', sender: 'bot', text: '✓ फोटो प्राप्त हुई!\n\nएआई विश्लेषण श्रेणी: सड़क का गड्ढा (POTHOLE) 🕳️\nतीव्रता: उच्च (HIGH) ⚠️\n\nकृपया अपने वर्तमान जीपीएस निर्देशांक (GPS) साझा करें, या अपना निकटतम लैंडमार्क भेजें।', timestamp: '11:43 AM' },
      { id: '5', sender: 'user', text: 'उस्मान रोड बस स्टैंड के पास', timestamp: '11:44 AM' },
      { id: '6', sender: 'bot', text: '🎉 बहुत बढ़िया! आपका टिकट सफलतापूर्वक दर्ज कर लिया गया है।\n\nटिकट संदर्भ: #TKT-912\nविभाग: लोक निर्माण विभाग (PWD)\nअनुमानित समाधान: २४ घंटे के भीतर।\n\nआपको +१० नागरिक अंक दिए गए हैं! पड़ोस का हीरो बनने के लिए धन्यवाद!', timestamp: '11:44 AM' }
    ],
    ta: [
      { id: '1', sender: 'user', text: 'வணக்கம், நான் ஒரு புகாரை பதிவு செய்ய வேண்டும்.', timestamp: '11:42 AM' },
      { id: '2', sender: 'bot', text: 'வணக்கம்! கம்யூனிட்டி ஹீரோ வாட்ஸ்அப் போட்க்கு வரவேற்கிறோம். 🗺️\n\nசாலையோர குப்பைகள், உடைந்த தெருவிளக்குகள் போன்ற புகாரை ஒரு புகைப்படமாக எடுத்து அனுப்பவும்.', timestamp: '11:42 AM' },
      { id: '3', sender: 'user', text: 'புகைப்படம் அனுப்புகிறேன்...', timestamp: '11:43 AM', image: 'https://images.unsplash.com/photo-1509143139826-657a799a629b?auto=format&fit=crop&q=80&w=400' },
      { id: '4', sender: 'bot', text: '✓ புகைப்படம் பெறப்பட்டது!\n\nஎங்கள் AI பகுப்பாய்வு: உடைந்த தெருவிளக்கு (STREETLIGHT) 💡\nதீவிரம்: நடுத்தரமானது ⚠️\n\nஉங்கள் தற்போதைய இருப்பிடத்தை (GPS Coordinates) பகிரவும் அல்லது அருகில் உள்ள அடையாளத்தை அனுப்பவும்.', timestamp: '11:43 AM' },
      { id: '5', sender: 'user', text: 'ஜி பி ரோடு தியேட்டர் அருகில்', timestamp: '11:44 AM' },
      { id: '6', sender: 'bot', text: '🎉 அருமை! உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது.\n\nபுகார் எண்: #TKT-412\nஒதுக்கப்பட்ட துறை: மின்சார வாரியம்\nதீர்வு காணும் நேரம்: 48 மணி நேரத்திற்குள்.\n\nஉங்களுக்கு +10 ஹீரோ புள்ளிகள் வழங்கப்பட்டுள்ளது! உதவ முன்வந்தமைக்கு நன்றி!', timestamp: '11:44 AM' }
    ]
  };

  const activeMessages = conversations[activeLang];

  return (
    <div id="whatsapp-view" className="max-w-md mx-auto space-y-5 pb-24 animate-fadeIn">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>
        <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>WhatsApp Bot Channel</span>
        </span>
      </div>

      <div className="bg-[#1e293b]/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px] backdrop-blur-xl">
        {/* WhatsApp Chat Header Header */}
        <div className="bg-emerald-800/90 p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-emerald-400 font-extrabold text-sm border-2 border-emerald-500/20">
              CH
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-100">Community Hero Bot</h3>
              <p className="text-[9px] text-emerald-200">Online • Auto-Translate Enabled</p>
            </div>
          </div>

          {/* Quick Lang Select */}
          <div className="flex space-x-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveLang('en')}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg ${activeLang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              EN
            </button>
            <button
              onClick={() => setActiveLang('hi')}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg ${activeLang === 'hi' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setActiveLang('ta')}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg ${activeLang === 'ta' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* Conversation Stream Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.02),transparent_70%)] bg-slate-950/40">
          {activeMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              {/* Message bubble */}
              <div
                className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/10 backdrop-blur-sm'
                }`}
              >
                {msg.image && (
                  <div className="rounded-lg overflow-hidden mb-2 aspect-video bg-slate-950 border border-slate-700">
                    <img src={msg.image} alt="WhatsApp snap" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <p className="whitespace-pre-line font-medium">{msg.text}</p>
              </div>

              {/* Timestamp */}
              <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-500 font-mono">
                <span>{msg.timestamp}</span>
                {msg.sender === 'user' && <Check className="w-3 h-3 text-emerald-500" />}
              </div>
            </div>
          ))}
        </div>

        {/* Chat input box mimicking mock chatbot */}
        <div className="bg-white/5 border-t border-white/10 p-3 flex items-center space-x-2 backdrop-blur-md">
          <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-full px-4.5 py-2.5 text-xs text-slate-400 flex items-center justify-between">
            <span>Demo Chat Mode (Read-Only)</span>
            <MessageSquare className="w-4 h-4 text-slate-500" />
          </div>
          <button className="bg-emerald-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow shadow-emerald-500/20">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/10 rounded-2xl p-4 text-[10px] text-emerald-200/90 leading-relaxed text-center font-medium backdrop-blur-md">
        📞 Official Twilio Sandbox Trigger: Message <strong className="text-white">+1 (415) 523-8886</strong> with code <strong className="text-white">join vibe2ship-civic</strong> to interact on your physical phone!
      </div>
    </div>
  );
}
