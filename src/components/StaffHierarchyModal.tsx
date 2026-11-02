import React, { useState } from 'react';
import { X, Users, UserPlus, Phone, ShieldCheck, ArrowDown, Trash2, Edit2, Plus, Sparkles, Building2 } from 'lucide-react';
import { BranchManager, StaffContact } from '../types';

interface StaffHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: BranchManager | null;
  onUpdateBackupContacts: (managerId: string, backupContacts: StaffContact[]) => void;
}

export const StaffHierarchyModal: React.FC<StaffHierarchyModalProps> = ({
  isOpen,
  onClose,
  manager,
  onUpdateBackupContacts,
}) => {
  const [contacts, setContacts] = useState<StaffContact[]>(
    manager?.backupContacts || []
  );

  const [newStaffName, setNewStaffName] = useState('');
  const [newDesignation, setNewDesignation] = useState('Assistant Branch Manager (ABM)');
  const [newPhone, setNewPhone] = useState('');
  const [newPriority, setNewPriority] = useState<1 | 2 | 3>(2);

  if (!isOpen || !manager) return null;

  const designations = [
    'Assistant Branch Manager (ABM)',
    'Operational Officer / Second Man',
    'Senior Manager (Operations)',
    'Cash Officer / Chief Cashier',
    'Customer Service Head',
    'Credit / NPA Recovery Officer',
    'Clerk / Special Assistant',
  ];

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newPhone.trim()) {
      alert('कृपया स्टाफ का नाम और मोबाइल नंबर दर्ज करें।');
      return;
    }

    const cleanPhone = newPhone.replace(/[^0-9]/g, '');
    const newContact: StaffContact = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      designation: newDesignation,
      phone: cleanPhone,
      priorityOrder: newPriority,
    };

    const updated = [...contacts, newContact].sort((a, b) => a.priorityOrder - b.priorityOrder);
    setContacts(updated);
    onUpdateBackupContacts(manager.id, updated);

    // Reset inputs
    setNewStaffName('');
    setNewPhone('');
    setNewDesignation('Assistant Branch Manager (ABM)');
  };

  const handleDeleteStaff = (contactId: string) => {
    const updated = contacts.filter((c) => c.id !== contactId);
    setContacts(updated);
    onUpdateBackupContacts(manager.id, updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                शाखा स्टाफ एवं कॉलिंग क्रम (Staff Calling Order)
              </h3>
              <p className="text-[11px] text-blue-200">
                {manager.branch} Branch (SOL: {manager.solId})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Explanation Banner */}
          <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl text-xs text-blue-200 leading-relaxed">
            💡 <strong>यह कैसे काम करेगा:</strong> जब आप इस शाखा को कॉल करेंगे, तो <strong>1st Call</strong> ब्रांच मैनेजर को लगेगा। यदि मैनेजर का कॉल नहीं लगता (Pending) या वे छुट्टी पर होते हैं, तो सिस्टम तुरंत <strong>2nd Call</strong> (असिस्टेंट मैनेजर / सेकंड ऑफिसर) को डायल करने का विकल्प देगा।
          </div>

          {/* Hierarchy Flow List */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              कॉलिंग वरीयता क्रम (Calling Priority)
            </span>

            {/* Level 1: Primary Branch Manager */}
            <div className="bg-slate-800/90 border-2 border-emerald-500/60 rounded-xl p-3 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center justify-center text-xs">
                  1st
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white text-sm">{manager.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      Primary BM
                    </span>
                  </div>
                  <div className="text-xs text-amber-300 font-mono mt-0.5">
                    📞 +91 {manager.phone}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 italic">
                पहला कॉल हमेशा इन्हें
              </div>
            </div>

            {/* Level 2 & 3: Backup Contacts */}
            {contacts.map((contact, idx) => (
              <React.Fragment key={contact.id}>
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-4 h-4 text-slate-500" />
                </div>
                <div className="bg-slate-800/80 border border-indigo-500/40 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold flex items-center justify-center text-xs">
                      {contact.priorityOrder === 2 ? '2nd' : '3rd'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-sm">{contact.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                          {contact.designation}
                        </span>
                      </div>
                      <div className="text-xs text-amber-300 font-mono mt-0.5">
                        📞 +91 {contact.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteStaff(contact.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Remove Backup Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {contacts.length === 0 && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
                इस शाखा के लिए अभी कोई सेकंडरी ऑफिसर (ABM / Cash Officer) नहीं जोड़ा गया है। आप नीचे से जोड़ सकते हैं।
              </div>
            )}
          </div>

          {/* Form to Add Staff to this Branch */}
          <form onSubmit={handleAddStaff} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300">
              <UserPlus className="w-4 h-4" />
              <span>नया सेकंडरी स्टाफ जोड़ें (Add 2nd / Backup Officer)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400">स्टाफ का नाम (Officer Name) *</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="उदा. Mr SHARMA VIKRAM"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">मोबाइल नंबर (Mobile) *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="उदा. 9876543210"
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400">पद (Designation)</label>
                <select
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {designations.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400">कॉलिंग प्राथमिकता (Call Order)</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full mt-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={2}>2nd Call (यदि BM न उठाएं)</option>
                  <option value={3}>3rd Call (यदि 2nd भी न उठाएं)</option>
                </select>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>शाखा स्टाफ में शामिल करें</span>
              </button>
            </div>
          </form>

          {/* Footer Save / Done */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              पूर्ण (Done)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
