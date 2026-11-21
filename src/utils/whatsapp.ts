export type WhatsAppAppMode = 'whatsapp' | 'whatsapp_business';

export interface WhatsAppAttachment {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  sizeKB: number;
  createdAt: number;
}

export interface WhatsAppTemplate {
  id: string;
  label: string;
  text: string;
  isDefault?: boolean;
  attachmentId?: string;
  createdAt?: number;
}

export interface WhatsAppQuickReplyOption {
  id: string;
  label: string;
  replyText: string;
}

export interface WhatsAppQuickReplyConfig {
  enabled: boolean;
  replyPhone: string;
  options: WhatsAppQuickReplyOption[];
}

const WA_APP_MODE_KEY = 'bank_bm_wa_app_mode_v1';
const WA_TEMPLATES_KEY = 'bank_bm_wa_templates_v1';
const WA_ATTACHMENTS_KEY = 'bank_bm_wa_attachments_v1';
const WA_ACTIVE_ATTACHMENT_KEY = 'bank_bm_wa_active_attachment_v1';
const WA_QUICK_REPLY_CONFIG_KEY = 'bank_bm_wa_quick_reply_v1';

export const QUICK_REPLY_PRESETS: {
  id: string;
  title: string;
  options: WhatsAppQuickReplyOption[];
}[] = [
  {
    id: 'work_status',
    title: '✅ कार्य स्थिति (3 बटन)',
    options: [
      { id: 'qr_done', label: '✅ हाँ / कार्य पूरा हुआ', replyText: '✅ कार्य पूरा हो गया है (Confirmed Done)' },
      { id: 'qr_evening', label: '⏳ आज शाम तक होगा', replyText: '⏳ आज शाम तक पूरा कर देंगे (By Evening)' },
      { id: 'qr_pending', label: '❌ पेंडिंग / कॉल चाहिए', replyText: '❌ अभी पेंडिंग है, कृपया कॉल करें (Need Help)' },
    ],
  },
  {
    id: 'yes_no',
    title: '👍 हाँ / नहीं (2 बटन)',
    options: [
      { id: 'qr_yes', label: '✅ हाँ (Confirm / Yes)', replyText: '✅ हाँ, कन्फर्म है (Confirmed Yes)' },
      { id: 'qr_no', label: '❌ नहीं (No / Not Done)', replyText: '❌ अभी नहीं हुआ (Not Yet / No)' },
    ],
  },
  {
    id: 'vc_meeting',
    title: '💻 VC / मीटिंग (3 बटन)',
    options: [
      { id: 'qr_join', label: '✅ समय पर जुड़ेंगे', replyText: '✅ समय पर VC/मीटिंग में जुड़ रहे हैं' },
      { id: 'qr_other', label: '👤 अन्य स्टाफ जुड़ेगा', replyText: '👤 शाखा से अन्य अधिकारी जुड़ेंगे' },
      { id: 'qr_leave', label: '🏖️ छुट्टी / बाहर हूँ', replyText: '🏖️ मैं आज छुट्टी/बाहर हूँ' },
    ],
  },
  {
    id: 'four_options',
    title: '📋 4 विकल्प (Done/Progress/Call/Leave)',
    options: [
      { id: 'qr_4_done', label: '✅ पूरा हो गया', replyText: '✅ कार्य पूरा हो गया है (Done)' },
      { id: 'qr_4_prog', label: '⏳ प्रक्रिया में है', replyText: '⏳ कार्य प्रक्रिया में है, जल्द अपडेट देंगे' },
      { id: 'qr_4_call', label: '📞 कॉल बैक करें', replyText: '📞 कृपया इस विषय पर कॉल करें' },
      { id: 'qr_4_leave', label: '🏖️ आज छुट्टी पर हूँ', replyText: '🏖️ मैं आज अवकाश पर हूँ' },
    ],
  },
];

export const DEFAULT_QUICK_REPLY_CONFIG: WhatsAppQuickReplyConfig = {
  enabled: false,
  replyPhone: '',
  options: QUICK_REPLY_PRESETS[0].options,
};

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'callback',
    label: '📞 कॉल बैक अनुरोध',
    text: 'रीजनल ऑफिस (RO) भावनगर से आपसे संपर्क करना था। कृपया उपलब्ध होते ही तुरंत कॉल बैक करें। धन्यवाद।',
    isDefault: true,
  },
  {
    id: 'daily_figures',
    label: '📊 दैनिक बिजनेस रिपोर्ट',
    text: 'कृपया आज के दैनिक बिजनेस फिगर्स (CASA, डिपॉजिट एवं लोन) तुरंत शेयर करें। धन्यवाद।',
    isDefault: true,
  },
  {
    id: 'npa_recovery',
    label: '💰 NPA / रिकवरी',
    text: 'कृपया अपनी शाखा की आज की NPA एवं SMA रिकवरी की ताज़ा प्रगति रिपोर्ट तुरंत अपडेट करें।',
    isDefault: true,
  },
  {
    id: 'vc_meeting',
    label: '💻 VC / मीटिंग सूचना',
    text: 'आज क्षेत्रीय कार्यालय की महत्वपूर्ण VC / मीटिंग निर्धारित है। कृपया समय पर जुड़ना सुनिश्चित करें।',
    isDefault: true,
  },
  {
    id: 'compliance',
    label: '📋 ऑडिट / अनुपालन',
    text: 'कृपया शाखा के लंबित ऑडिट / अनुपालन बिंदु आज ही पूर्ण कर रिपोर्ट भेजें।',
    isDefault: true,
  },
];

export function loadWhatsAppAppMode(): WhatsAppAppMode {
  try {
    const saved = localStorage.getItem(WA_APP_MODE_KEY);
    if (saved === 'whatsapp_business' || saved === 'whatsapp') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'whatsapp';
}

export function saveWhatsAppAppMode(mode: WhatsAppAppMode): void {
  try {
    localStorage.setItem(WA_APP_MODE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function loadWhatsAppTemplates(): WhatsAppTemplate[] {
  try {
    const raw = localStorage.getItem(WA_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_WHATSAPP_TEMPLATES;
}

export function saveWhatsAppTemplates(templates: WhatsAppTemplate[]): void {
  try {
    localStorage.setItem(WA_TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // ignore storage errors
  }
}

export function loadWhatsAppAttachments(): WhatsAppAttachment[] {
  try {
    const raw = localStorage.getItem(WA_ATTACHMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveWhatsAppAttachments(attachments: WhatsAppAttachment[]): boolean {
  try {
    localStorage.setItem(WA_ATTACHMENTS_KEY, JSON.stringify(attachments));
    return true;
  } catch {
    // Quota exceeded — trim oldest attachments and retry
    try {
      const trimmed = attachments.slice(0, Math.max(1, attachments.length - 1));
      localStorage.setItem(WA_ATTACHMENTS_KEY, JSON.stringify(trimmed));
      return false;
    } catch {
      return false;
    }
  }
}

export function loadActiveWhatsAppAttachmentId(): string | null {
  try {
    return localStorage.getItem(WA_ACTIVE_ATTACHMENT_KEY) || null;
  } catch {
    return null;
  }
}

export function saveActiveWhatsAppAttachmentId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(WA_ACTIVE_ATTACHMENT_KEY, id);
    } else {
      localStorage.removeItem(WA_ACTIVE_ATTACHMENT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadWhatsAppQuickReplyConfig(): WhatsAppQuickReplyConfig {
  try {
    const raw = localStorage.getItem(WA_QUICK_REPLY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          enabled: !!parsed.enabled,
          replyPhone: typeof parsed.replyPhone === 'string' ? parsed.replyPhone : '',
          options:
            Array.isArray(parsed.options) && parsed.options.length > 0
              ? parsed.options.slice(0, 4)
              : DEFAULT_QUICK_REPLY_CONFIG.options,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_QUICK_REPLY_CONFIG;
}

export function saveWhatsAppQuickReplyConfig(config: WhatsAppQuickReplyConfig): void {
  try {
    localStorage.setItem(WA_QUICK_REPLY_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function formatWhatsAppPhone(phone: string): string {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  return clean.startsWith('91') && clean.length > 10 ? clean : `91${clean}`;
}

export function isValidReplyPhone(phone: string): boolean {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return digits.length >= 10;
}

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

/**
 * Generates clean 1-tap WhatsApp Click-to-Reply links block (2 to 4 buttons).
 * When the receiver taps any link in WhatsApp, their reply chat to the sender opens
 * prefilled with their Branch Name, SOL ID, Staff Name, and selected confirmation status.
 */
export function buildQuickReplyLinksBlock(
  staff: { name: string; position?: string; branch?: string; solId?: string },
  config?: WhatsAppQuickReplyConfig | null
): string {
  if (!config || !config.enabled || !isValidReplyPhone(config.replyPhone)) {
    return '';
  }
  const activeOptions = (config.options || []).filter(
    (o) => o.label.trim() && o.replyText.trim()
  );
  if (activeOptions.length === 0) return '';

  const fullReplyPhone = formatWhatsAppPhone(config.replyPhone);
  const branchTag = [
    staff.branch ? `${staff.branch}` : '',
    staff.solId ? `SOL ${staff.solId}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const senderPrefix = branchTag
    ? `${branchTag} (${staff.name})`
    : staff.name || 'Branch Staff';

  const lines = activeOptions.slice(0, 4).map((opt, idx) => {
    const numEmoji = NUMBER_EMOJIS[idx] || `${idx + 1}.`;
    const prefillPayload = `${senderPrefix}: ${opt.replyText.trim()}`;
    const link = `https://wa.me/${fullReplyPhone}?text=${encodeURIComponent(prefillPayload)}`;
    return `${numEmoji} *${opt.label.trim()}*\n${link}`;
  });

  return `\n\n👇 *तुरंत कन्फर्म / रिप्लाई करने के लिए नीचे लिंक पर क्लिक करें:*\n\n${lines.join('\n\n')}`;
}

export function composeWhatsAppMessage(
  staff: { name: string; position?: string; branch?: string; solId?: string },
  messageBody: string,
  includeGreeting = true,
  quickReplyConfig?: WhatsAppQuickReplyConfig | null
): string {
  const replaced = (messageBody || '')
    .trim()
    .replace(/\{नाम\}|\{name\}/gi, staff.name || '')
    .replace(/\{शाखा\}|\{branch\}/gi, staff.branch || '')
    .replace(/\{पद\}|\{position\}/gi, staff.position || '');

  const greeting = includeGreeting
    ? `नमस्ते ${staff.name} जी (${staff.position ? `${staff.position}, ` : ''}${staff.branch || ''} शाखा),\n\n`
    : '';
  const quickReplyBlock = buildQuickReplyLinksBlock(staff, quickReplyConfig);

  return `${greeting}${replaced}${quickReplyBlock}`;
}

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/**
 * Builds the best URL for either WhatsApp (Personal) or WhatsApp Business.
 * On Android, uses explicit Android Intent URIs targeting `com.whatsapp` or `com.whatsapp.w4b`
 * with automatic fallback to `https://wa.me/...` if the selected app is not installed.
 * On Desktop/iOS, uses `https://wa.me/...` (or `https://api.whatsapp.com/send`).
 */
export function buildWhatsAppAppUrl(
  phone: string,
  finalText: string,
  appMode: WhatsAppAppMode = loadWhatsAppAppMode()
): string {
  const fullNumber = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(finalText);
  const waMeUrl = fullNumber
    ? `https://wa.me/${fullNumber}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (isAndroidDevice()) {
    const pkg = appMode === 'whatsapp_business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
    const query = fullNumber ? `phone=${fullNumber}&text=${encodedText}` : `text=${encodedText}`;
    return `intent://send?${query}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${encodeURIComponent(waMeUrl)};end`;
  }

  return waMeUrl;
}

/**
 * Opens WhatsApp or WhatsApp Business chat directly for a phone number & message.
 */
export function openWhatsAppChat(
  phone: string,
  finalText: string,
  appMode: WhatsAppAppMode = loadWhatsAppAppMode()
): void {
  const url = buildWhatsAppAppUrl(phone, finalText, appMode);
  if (url.startsWith('intent://')) {
    window.location.href = url;
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Compresses & converts an uploaded image File into a lightweight localStorage-safe WhatsAppAttachment.
 */
export async function processImageFileToAttachment(file: File): Promise<WhatsAppAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('इमेज पढ़ने में त्रुटि हुई।'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('अमान्य इमेज फ़ाइल।'));
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas उपलब्ध नहीं है।'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Use JPEG at 0.84 quality for crisp circulars/notices with small footprint (~60-200 KB)
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.84);
        const sizeKB = Math.max(1, Math.round((dataUrl.length * 3) / 4 / 1024));
        const cleanBaseName = (file.name || 'image').replace(/\.[^.]+$/, '');

        resolve({
          id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${cleanBaseName}.jpg`,
          dataUrl,
          mimeType,
          sizeKB,
          createdAt: Date.now(),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a saved attachment dataUrl back into a real File for Web Share API Level 2.
 */
export function dataUrlToFile(dataUrl: string, filename: string, fallbackMime = 'image/jpeg'): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const bstr = atob(parts[1] || '');
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Converts a dataUrl to a PNG Blob and copies it into the system clipboard (great for Desktop WhatsApp Web/App paste).
 */
export async function copyAttachmentImageToClipboard(attachment: WhatsAppAttachment): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== 'function' ||
      typeof ClipboardItem === 'undefined'
    ) {
      return false;
    }

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = attachment.dataUrl;
    });

    if (!pngBlob) return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  } catch {
    return false;
  }
}

export interface SendWithAttachmentResult {
  method: 'native_share' | 'clipboard_and_chat' | 'cancelled';
  imageCopied?: boolean;
}

/**
 * Sends a WhatsApp message with an automatic image attachment:
 * 1. On Mobile (Android/iOS) where Web Share Level 2 file sharing is supported:
 *    Opens native Share sheet with the image File ALREADY ATTACHED + personalized caption text,
 *    so the user taps WhatsApp or WhatsApp Business directly without opening the Gallery!
 * 2. On Desktop (or fallback):
 *    Copies the image straight to the system clipboard and opens the exact staff's WhatsApp / WA Business chat
 *    with the message text pre-filled so a single Paste (Ctrl+V) drops the image in.
 */
export async function sendWhatsAppWithAttachment(
  staff: { name: string; position?: string; branch?: string; phone: string },
  finalText: string,
  attachment: WhatsAppAttachment,
  appMode: WhatsAppAppMode = loadWhatsAppAppMode(),
  preferDirectChat = false
): Promise<SendWithAttachmentResult> {
  const file = dataUrlToFile(attachment.dataUrl, attachment.name, attachment.mimeType);

  // If user wants auto-attach via native Share Sheet (Mobile) and did not explicitly force direct chat
  if (
    !preferDirectChat &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        // Copy phone & text to clipboard as a quick backup before sharing
        try {
          await navigator.clipboard.writeText(finalText);
        } catch {
          // ignore clipboard permission error
        }

        await navigator.share({
          files: [file],
          title: `${staff.name} (${staff.branch || ''})`,
          text: finalText,
        });
        return { method: 'native_share' };
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') {
        return { method: 'cancelled' };
      }
      // Fall through to clipboard + direct chat
    }
  }

  // Direct chat + auto-copy image to clipboard
  const imageCopied = await copyAttachmentImageToClipboard(attachment);
  openWhatsAppChat(staff.phone, finalText, appMode);
  return { method: 'clipboard_and_chat', imageCopied };
}
