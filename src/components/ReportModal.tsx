import React, { useState } from 'react';
import { Copy, Check, Download, Share2, FileText, X } from 'lucide-react';
import { BranchManager, DailySession } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  managers: BranchManager[];
  session: DailySession;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  managers,
  session,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const logs = session.callLogs;
  const connected = managers.filter((m) => logs[m.id]?.outcome === 'connected');
  const notAnswered = managers.filter(
    (m) =>
      logs[m.id]?.outcome === 'not_answered' ||
      logs[m.id]?.outcome === 'busy' ||
      logs[m.id]?.outcome === 'switched_off'
  );
  const uncalled = managers.filter((m) => !logs[m.id]);

  const percentage = Math.round((connected.length / managers.length) * 100);

  const generateReportText = () => {
    let text = `🏦 *DAILY BRANCH MANAGER CALLING REPORT*\n`;
    text += `📅 Date: ${session.date}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *SUMMARY:*\n`;
    text += `• Total Branches: ${managers.length}\n`;
    text += `• ✅ Connected (बात हो गई): ${connected.length} (${percentage}%)\n`;
    text += `• ❌ Pending / Not Answered: ${notAnswered.length}\n`;
    text += `• ⏳ Not Attempted: ${uncalled.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (notAnswered.length > 0) {
      text += `🔴 *PENDING BRANCHES (RE-DIAL REQUIRED):*\n`;
      notAnswered.forEach((m, idx) => {
        const log = logs[m.id];
        const statusNote = log?.outcome === 'busy' ? '[Busy]' : log?.outcome === 'switched_off' ? '[Switched Off]' : '[No Answer]';
        text += `${idx + 1}. ${m.branch} (Sol: ${m.solId}) - ${m.name} | 📞 ${m.phone} ${statusNote}\n`;
      });
      text += `\n`;
    }

    if (connected.length > 0) {
      text += `🟢 *CONNECTED BRANCHES:*\n`;
      connected.forEach((m, idx) => {
        const log = logs[m.id];
        const tag = log?.tags?.[0] ? `[${log.tags[0]}]` : '';
        const note = log?.notes ? ` - ${log.notes}` : '';
        text += `${idx + 1}. ${m.branch} (Sol: ${m.solId}) - ${m.name} ${tag}${note}\n`;
      });
    }

    return text;
  };

  const handleCopy = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSV = () => {
    const headers = ['SOL ID', 'Branch Name', 'Area Category', 'Branch Alpha', 'Manager Name', 'Phone', 'Call Status', 'Notes', 'Tag', 'Attempt Round', 'Call Time'];
    const rows = managers.map((m) => {
      const log = logs[m.id];
      const outcome = log
        ? log.outcome === 'connected'
          ? 'Connected (बात हो गई)'
          : log.outcome === 'not_answered'
          ? 'Not Answered'
          : log.outcome === 'busy'
          ? 'Busy'
          : log.outcome === 'switched_off'
          ? 'Switched Off'
          : 'Skipped'
        : 'Not Attempted';
      const notesClean = (log?.notes || '').replace(/,/g, ';');
      const tagClean = (log?.tags?.[0] || '').replace(/,/g, ';');
      const roundClean = log?.round || '-';
      const timeClean = log ? new Date(log.timestamp).toLocaleTimeString() : '-';
      const categoryClean = m.areaCategory || 'RURAL';

      return [m.solId, `"${m.branch}"`, `"${categoryClean}"`, m.branchAlpha, `"${m.name}"`, m.phone, `"${outcome}"`, `"${notesClean}"`, `"${tagClean}"`, roundClean, timeClean].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BM_Calling_Report_${session.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(generateReportText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-800 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Daily Calling Status Report</h3>
              <p className="text-xs text-slate-400">Date: {session.date} • Real-time bank calling summary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-400 font-medium">Total Branches</span>
              <div className="text-2xl font-bold text-white mt-1">{managers.length}</div>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-xl p-3 text-center">
              <span className="text-xs text-emerald-400 font-medium">बात हो गई (Done)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{connected.length}</div>
            </div>
            <div className="bg-rose-950/40 border border-rose-600/30 rounded-xl p-3 text-center">
              <span className="text-xs text-rose-400 font-medium">पेंडिंग (Pending)</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">{notAnswered.length}</div>
            </div>
          </div>

          {/* Formatted Text Preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap select-all">
            {generateReportText()}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy for WhatsApp'}</span>
            </button>

            <button
              onClick={shareToWhatsApp}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={downloadCSV}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV (Excel)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
