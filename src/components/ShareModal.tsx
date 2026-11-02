import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Globe,
  CheckCircle2,
  Send,
  Zap,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'vercel'>('share');

  if (!isOpen) return null;

  // Get current or canonical shared URL
  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.href.split('?')[0].split('#')[0]
      : 'https://ais-pre-eo5zc7nvdd36l5uhq7mj7h-1042900454213.asia-southeast1.run.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🏦 *बैंक ऑफ बड़ौदा - ब्रांच कॉलिंग व ऑटो-डायलर ऐप*\n\n` +
      `साथियों, हमारे बैंक के सभी ब्रांच मैनेजर्स व रीजनल स्टाफ (452+ कर्मी) को 1-by-1 ऑटो-कॉल करने, पेंडिंग कॉल मैनेज करने और दैनिक रिपोर्ट तैयार करने के लिए यह ऐप तैयार है।\n\n` +
      `📲 *ऐप ओपन करें:*\n${currentUrl}\n\n` +
      `💡 *टिप:* मोबाइल क्रोम ब्राउज़र में 'Add to Home screen' करके इसे ऐप की तरह इस्तेमाल करें!`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bank Calling & Auto-Dialer App',
          text: 'बैंक ऑफ बड़ौदा ब्रांच कॉलिंग व ऑटो-डायलर सिस्टम',
          url: currentUrl,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/40 rounded-2xl text-blue-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <span>स्टाफ के साथ ऐप शेयर करें (Share App Link)</span>
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                यह लाइव लिंक आपके बैंक स्टाफ के साथ सीधे काम करेगा
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'share'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>लाइव ऐप लिंक (Direct Link)</span>
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'vercel'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Vercel पर डिप्लॉय करें (Vercel Guide)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {activeTab === 'share' ? (
            <>
              {/* Ready Live Link Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>सक्रिय लाइव ऐप लिंक (Active Live URL):</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    24/7 एक्टिव
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-blue-300 font-mono select-all overflow-x-auto whitespace-nowrap">
                    {currentUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-95 ${
                      copied
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>कॉपी हो गया!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>कॉपी करें</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="p-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all"
                >
                  <MessageSquare className="w-5 h-5 fill-current" />
                  <span>व्हाट्सएप पर स्टाफ को भेजें</span>
                </button>

                <button
                  onClick={handleWebShare}
                  className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition-colors active:scale-95"
                >
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>अन्य ऐप पर शेयर करें</span>
                </button>
              </div>

              {/* Mobile Install / Add to Home Screen Instructions */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                  <Smartphone className="w-4 h-4" />
                  <span>मोबाइल में सीधे ऐप की तरह कैसे चलाएं (Add to Home Screen):</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 pl-6 list-decimal">
                  <p>1. अपने मोबाइल (Chrome या Safari) ब्राउज़र में यह लिंक खोलें।</p>
                  <p>2. ब्राउज़र के टॉप दाईं ओर <strong>तीन बिंदुओं (⋮ या Share आइकन)</strong> पर क्लिक करें।</p>
                  <p>3. <strong>"Add to Home screen" (होम स्क्रीन में जोड़ें)</strong> या "Install App" चुनें।</p>
                  <p>4. अब आपके फोन की होम स्क्रीन पर एक ऐप आइकन बन जाएगा, जहाँ से आप और आपका स्टाफ रोज 1-क्लिक में कॉलिंग कर सकेंगे!</p>
                </div>
              </div>
            </>
          ) : (
            /* Vercel Deployment Tab */
            <div className="space-y-4">
              <div className="p-4 bg-blue-950/40 border border-blue-500/40 rounded-2xl text-xs text-blue-200 leading-relaxed">
                🚀 हमने इस प्रोजेक्ट में <strong>vercel.json</strong> पहले से कॉन्फ़िगर कर दिया है। यदि आप Vercel पर अपना कस्टम डोमेन (जैसे <code>bob-calling.vercel.app</code>) बनाना चाहते हैं, तो इन आसान स्टेप्स को फॉलो करें:
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-850 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1">
                  <div className="font-bold text-xs text-white flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                    <span>Vercel पर लॉगिन करें:</span>
                  </div>
                  <p className="text-xs text-slate-300 pl-7">
                    ब्राउज़र में <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold inline-flex items-center gap-0.5">vercel.com <ExternalLink className="w-3 h-3" /></a> पर जाएं और अपने GitHub/Google अकाउंट से साइन इन करें।
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1">
                  <div className="font-bold text-xs text-white flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">2</span>
                    <span>नया प्रोजेक्ट बनाएं (Add New Project):</span>
                  </div>
                  <p className="text-xs text-slate-300 pl-7">
                    Vercel डैशबोर्ड पर <strong>"Add New..." → "Project"</strong> पर क्लिक करें और अपनी GitHub रिपॉजिटरी को सेलेक्ट करें।
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1">
                  <div className="font-bold text-xs text-white flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">3</span>
                    <span>ऑटो-डिटेक्शन सेटिंग्स:</span>
                  </div>
                  <div className="text-xs text-slate-300 pl-7 space-y-0.5 font-mono text-[11px]">
                    <p>• Framework Preset: <strong>Vite</strong></p>
                    <p>• Build Command: <code>npm run build</code></p>
                    <p>• Output Directory: <code>dist</code></p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-xl space-y-1">
                  <div className="font-bold text-xs text-white flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">4</span>
                    <span>"Deploy" पर क्लिक करें:</span>
                  </div>
                  <p className="text-xs text-slate-300 pl-7">
                    1 मिनट में आपका पर्सनल Vercel लिंक (उदा. <code>https://your-app.vercel.app</code>) तैयार हो जाएगा!
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>ध्यान दें:</strong> आपको Vercel बनाने की तत्काल ज़रूरत भी नहीं है, क्योंकि ऊपर दिया गया <strong>लाइव लिंक (Direct Link)</strong> अभी भी सभी स्टाफ के लिए तुरंत काम कर रहा है!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {activeTab === 'share' ? 'लिंक किसी भी मोबाइल या कंप्यूटर पर काम करेगा' : 'Vercel Config: vercel.json Ready'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
