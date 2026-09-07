import { CallingLead, Meeting } from '@/lib/types';
import { formatTime12h } from '@/lib/meeting-utils';

export type MessageInput = {
  numbers: string[];
  message: string;
  route?: string;
  senderId?: string;
  whatsapp?: boolean;
};

export type WhatsAppTemplateInput = {
  numbers: string[];
  clientName: string;
  date: string;
  time: string;
  repName?: string;
  messageId?: string;
  templateName?: string;
  variables?: string[];
  notes?: string;
};

/**
 * Normalizes phone numbers to clean 10-digit digits for Fast2SMS API
 */
export function normalizeNumbersForFast2SMS(numbers: string[]): string {
  return numbers
    .map((num) => {
      let clean = num.replace(/\D/g, '');
      if (clean.length === 12 && clean.startsWith('91')) {
        clean = clean.slice(2);
      } else if (clean.length === 11 && clean.startsWith('0')) {
        clean = clean.slice(1);
      }
      return clean;
    })
    .filter((digits) => digits.length === 10)
    .join(',');
}

/**
 * Normalizes phone number with 91 prefix for WhatsApp Direct links and WhatsApp API
 */
export function normalizeNumberForWhatsApp(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean;
  }
  if (clean.length === 10) {
    return '91' + clean;
  }
  return clean;
}

/**
 * Generates branded professional WhatsApp confirmation message for client
 */
export function getMeetingWhatsAppMessage(meeting: Meeting, repName: string = 'Abhishek Kumar'): string {
  const time12h = formatTime12h(meeting.time);
  return `*MediRank — Doctor Demo Meeting Confirmation* 🩺✨

Hello Dr. *${meeting.clientName}*,

Your *MediRank* live demo meeting is confirmed:

📅 *Date:* ${meeting.date}
⏰ *Time:* ${time12h} (IST)
👤 *Representative:* ${repName}
${meeting.notes ? `📝 *Notes:* ${meeting.notes}\n` : ''}
Our team member will visit / connect with you at your clinic to demonstrate how *MediRank* enhances your Google Local Presence, boosts patient inquiries, and manages 5-star patient reviews.

For any queries or reschedule, feel free to reply on this WhatsApp number.

Best regards,
*Team MediRank* (by Vyapar Wallah)
📞 Support: +91 98000 10001`;
}

/**
 * Generates custom cold-outreach / intro WhatsApp message for telecallers pitching new leads
 */
export function getLeadIntroWhatsAppMessage(lead: CallingLead, callerName: string = 'MediRank Team'): string {
  if (lead.clientType === 'Clinic / Hospital') {
    return `Namaste Dr. Sahib / Team *${lead.clientName}* 🩺,

Mai *${callerName}* baat kar raha hu *MediRank* se.

Hum doctor clinics aur hospitals ki *Google Local Presence & Patient Footfall* ko 3X boost karte hain:
✅ *Google Maps #1 Ranking:* Aapke area ke top searches me aapka clinic show karega.
✅ *More Patient Inquiries:* Direct WhatsApp appointments directly Google se.
✅ *5-Star Reputation Management:* Automatic happy patient reviews.

Kya hum kal *10:00 AM* ya *01:00 PM* par ek quick 10-minute ka live *MediRank Demo* schedule kar sakte hain?

Regards,
*${callerName}* • MediRank Team
📞 +91 98000 10001`;
  }

  return `Namaste Director / Principal Sir (*${lead.clientName}*) 🏫,

Mai *${callerName}* baat kar raha hu *Vyapar Wallah Education Technology* se.

Hum schools aur coaching institutes ke fees collection aur parent communication ko automate karte hain:
✅ *100% On-Time Fees Recovery:* Automatic WhatsApp Due Reminders with Online Payment Links
✅ *Daily Student Attendance & Bio-metric Sync*
✅ *Report Cards & Parent Communication App*

Aapke institute ke liye ek short 10-minute live online demo schedule karein?

Regards,
*${callerName}* • Vyapar Wallah Team
📞 +91 98000 10001`;
}

/**
 * Generates direct wa.me link for 1-click WhatsApp web/app messaging
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = normalizeNumberForWhatsApp(phone);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

/**
 * Sends Official WhatsApp Template Message via Fast2SMS WhatsApp API
 * (Supports both Fast2SMS Simple WhatsApp API and Meta Cloud WABA format)
 */
export async function sendFast2SMSWhatsAppTemplate(input: WhatsAppTemplateInput) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n[FAST2SMS WHATSAPP INFO] FAST2SMS_API_KEY is not set in .env.local.');
    return { ok: false, skipped: true, message: 'FAST2SMS_API_KEY not configured.' };
  }

  const messageId =
    input.messageId ||
    process.env.FAST2SMS_WHATSAPP_MESSAGE_ID ||
    process.env.FAST2SMS_WHATSAPP_TEMPLATE_NAME;

  const templateName =
    input.templateName ||
    process.env.FAST2SMS_WHATSAPP_TEMPLATE_NAME ||
    'medirank_demo_confirmation';

  const phoneNumberId = process.env.FAST2SMS_PHONE_NUMBER_ID;

  // Variables values (Pipe separated for Fast2SMS: ClientName|Date|Time|RepName)
  const repName = input.repName || 'Abhishek Kumar';
  const variableValues =
    input.variables && input.variables.length > 0
      ? input.variables.join('|')
      : `${input.clientName}|${input.date}|${input.time}|${repName}`;

  const numbers10 = normalizeNumbersForFast2SMS(input.numbers);
  if (!numbers10) {
    return { ok: false, skipped: true, message: 'No valid recipient phone number provided.' };
  }

  console.log(`[FAST2SMS WHATSAPP] Sending template "${templateName}" (ID: ${messageId || 'N/A'}) to ${numbers10} with variables: ${variableValues}`);

  try {
    // 1. If Phone Number ID is configured, try Meta Cloud WhatsApp format first
    if (phoneNumberId) {
      const metaEndpoint = `https://www.fast2sms.com/dev/whatsapp/v26.0/${phoneNumberId}/messages`;
      const response = await fetch(metaEndpoint, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizeNumberForWhatsApp(input.numbers[0]),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: variableValues.split('|').map((val) => ({
                  type: 'text',
                  text: val,
                })),
              },
            ],
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      console.log('[FAST2SMS META WABA RESPONSE]', data);
      if (response.ok && data.return !== false) {
        return { ok: true, status: response.status, data };
      }
    }

    // 2. Fast2SMS Simple WhatsApp Template API
    const simpleEndpoint = 'https://www.fast2sms.com/dev/whatsapp';
    const payload: Record<string, any> = {
      numbers: numbers10,
      variables_values: variableValues,
    };

    if (messageId) {
      payload.message_id = messageId;
    }
    if (phoneNumberId) {
      payload.phone_number_id = phoneNumberId;
    }

    const response = await fetch(simpleEndpoint, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    console.log('[FAST2SMS SIMPLE WHATSAPP RESPONSE]', data);
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    console.error('[FAST2SMS WHATSAPP ERROR]', error);
    return { ok: false, error: error?.message };
  }
}

/**
 * Sends SMS via Fast2SMS Indian SMS Gateway API (DLT / Quick SMS route)
 */
export async function sendFast2SMSMessage(input: MessageInput) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log('\n[FAST2SMS INFO] FAST2SMS_API_KEY not set in .env.local.');
    console.log(`[FAST2SMS MESSAGE TO ${input.numbers.join(', ')}]: ${input.message}\n`);
    return { ok: false, skipped: true, message: 'FAST2SMS_API_KEY not configured in .env.local.' };
  }

  const endpoint = 'https://www.fast2sms.com/dev/bulkV2';
  const numbersFormatted = normalizeNumbersForFast2SMS(input.numbers);
  if (!numbersFormatted) {
    return { ok: false, skipped: true, message: 'No valid 10-digit mobile number provided.' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        route: input.route ?? 'q',
        sender_id: input.senderId ?? process.env.FAST2SMS_SENDER_ID ?? 'FSTSMS',
        message: input.message,
        language: 'english',
        flash: 0,
        numbers: numbersFormatted,
      }),
    });

    const data = await response.json().catch(() => ({}));
    console.log('[FAST2SMS SMS API RESPONSE]', data);
    return { ok: response.ok, status: response.status, data };
  } catch (error: any) {
    console.error('[FAST2SMS SMS API ERROR]', error);
    return { ok: false, error: error?.message };
  }
}
