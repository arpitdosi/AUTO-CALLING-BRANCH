import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { BranchManager } from '../types';

interface AddEditManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (manager: BranchManager) => void;
  editingManager?: BranchManager | null;
}

export const AddEditManagerModal: React.FC<AddEditManagerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingManager,
}) => {
  const [formData, setFormData] = useState<Partial<BranchManager>>({
    name: '',
    branch: '',
    solId: '',
    branchAlpha: '',
    phone: '',
    sinceWhen: '',
  });

  useEffect(() => {
    if (editingManager) {
      setFormData(editingManager);
    } else {
      setFormData({
        name: '',
        branch: '',
        solId: '',
        branchAlpha: '',
        phone: '',
        sinceWhen: '',
      });
    }
  }, [editingManager, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.branch) {
      alert('Please fill Name, Branch, and Mobile Number.');
      return;
    }

    const cleanPhone = (formData.phone || '').replace(/[^0-9]/g, '');
    const managerToSave: BranchManager = {
      id: editingManager ? editingManager.id : String(Date.now()),
      name: (formData.name || '').trim(),
      branch: (formData.branch || '').toUpperCase().trim(),
      solId: (formData.solId || '').trim(),
      branchAlpha: (formData.branchAlpha || '').toUpperCase().trim(),
      sinceWhen: (formData.sinceWhen || '').trim(),
      phone: cleanPhone,
    };

    onSave(managerToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white my-auto">
        <div className="bg-slate-800 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">
              {editingManager ? 'Edit Branch Manager Details' : 'Add New Branch Manager'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Employee Name (अधिकारी का नाम) *
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mr PATEL BHARATKUMAR P"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Branch Name (शाखा का नाम) *
              </label>
              <input
                type="text"
                required
                value={formData.branch || ''}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="e.g. LATHI ROAD"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sol ID (सॉल आईडी)
              </label>
              <input
                type="text"
                value={formData.solId || ''}
                onChange={(e) => setFormData({ ...formData, solId: e.target.value })}
                placeholder="e.g. 4593"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mobile Number (मोबाइल नंबर) *
              </label>
              <input
                type="tel"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9727638889"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Branch Alpha Code
              </label>
              <input
                type="text"
                value={formData.branchAlpha || ''}
                onChange={(e) => setFormData({ ...formData, branchAlpha: e.target.value })}
                placeholder="e.g. LATHIR"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Since When Branch (शाखा में पदस्थ तिथि)
            </label>
            <input
              type="text"
              value={formData.sinceWhen || ''}
              onChange={(e) => setFormData({ ...formData, sinceWhen: e.target.value })}
              placeholder="e.g. 23-05-2026"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>{editingManager ? 'Update Manager' : 'Save Manager'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
