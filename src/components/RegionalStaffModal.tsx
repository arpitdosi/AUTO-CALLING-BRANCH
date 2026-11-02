import React, { useState, useMemo } from 'react';
import { X, Search, Phone, MessageSquare, Building2, User, Filter, ShieldCheck, Mail, Users } from 'lucide-react';
import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';

interface RegionalStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickCall?: (employee: RegionalEmployee) => void;
}

export const RegionalStaffModal: React.FC<RegionalStaffModalProps> = ({
  isOpen,
  onClose,
  onQuickCall,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [cadreFilter, setCadreFilter] = useState('ALL');

  if (!isOpen) return null;

  const positions = useMemo(() => {
    const set = new Set<string>();
    BHAVNAGAR_REGIONAL_STAFF.forEach((s) => {
      if (s.position) set.add(s.position);
    });
    return Array.from(set).sort();
  }, []);

  const filteredStaff = useMemo(() => {
    return BHAVNAGAR_REGIONAL_STAFF.filter((staff) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        staff.name.toLowerCase().includes(q) ||
        staff.branch.toLowerCase().includes(q) ||
        staff.phone.includes(q) ||
        staff.ecNo.toLowerCase().includes(q) ||
        staff.position.toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (positionFilter !== 'ALL' && staff.position !== positionFilter) return false;
      if (cadreFilter !== 'ALL' && staff.cadre !== cadreFilter) return false;

      return true;
    });
  }, [searchQuery, positionFilter, cadreFilter]);

  const openWhatsApp = (staff: RegionalEmployee) => {
    const cleanNumber = staff.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const text = encodeURIComponent(
      `Respected ${staff.name} Ji (${staff.position}, ${staff.branch} Branch),\n\nConnecting from Regional Office Bhavnagar. Please call back when available.`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-white">
                  भावनगर रीजन स्टाफ डायरेक्टरी (Staff Directory)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {BHAVNAGAR_REGIONAL_STAFF.length} कुल कर्मचारी
                </span>
              </div>
              <p className="text-xs text-blue-200">
                बैंक ऑफ़ बड़ौदा भावनगर क्षेत्र के सभी अधिकारियों एवं कर्मचारियों की सूची
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, branch, phone, EC..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Position Filter */}
            <div>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">सभी पद (All Positions)</option>
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Cadre Filter */}
            <div>
              <select
                value={cadreFilter}
                onChange={(e) => setCadreFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">सभी संवर्ग (All Cadres)</option>
                <option value="Officer">Officer</option>
                <option value="Clerical">Clerical</option>
                <option value="Sub Staff">Sub Staff</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>दिखाए जा रहे हैं: <strong className="text-white">{filteredStaff.length}</strong> कर्मचारी</span>
            {(searchQuery || positionFilter !== 'ALL' || cadreFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPositionFilter('ALL');
                  setCadreFilter('ALL');
                }}
                className="text-blue-400 hover:underline"
              >
                फ़िल्टर साफ़ करें
              </button>
            )}
          </div>
        </div>

        {/* List of Staff */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              कोई कर्मचारी नहीं मिला। कृपया सर्च शब्द या फ़िल्टर बदलें।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-start justify-between hover:border-slate-600 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm">{staff.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        EC: {staff.ecNo}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                        {staff.grade}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 inline shrink-0" />
                      <span>{staff.branch}</span>
                    </div>

                    <div className="text-[11px] text-indigo-300 font-medium">
                      📌 {staff.position} ({staff.cadre})
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-300 pt-0.5">
                      📞 +91 {staff.phone}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 ml-2 shrink-0">
                    <a
                      href={`tel:${staff.phone}`}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => openWhatsApp(staff)}
                      className="p-2 bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/40 text-emerald-300 rounded-lg"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
