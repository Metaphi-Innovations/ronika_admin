/**
 * Utility functions for composing and routing emails in the Admin dashboard.
 */

export interface ComposeEmailOptions {
  to: string;
  subject?: string;
  body?: string;
}

/**
 * Builds a standardized client reply draft for an enquiry.
 */
export function buildEnquiryReplyDraft(enquiry: {
  name: string;
  email: string;
  productName: string;
  message?: string;
  createdAt?: string;
}) {
  const subject = `Regarding your enquiry for "${enquiry.productName}" — Ronika Bhatia Studio`;

  const formattedDate = enquiry.createdAt
    ? new Date(enquiry.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const body = [
    `Hi ${enquiry.name || 'there'},`,
    '',
    `Thank you for reaching out regarding "${enquiry.productName}".`,
    '',
    '[Your response here]',
    '',
    '---',
    'Original Enquiry Details:',
    `• Product: ${enquiry.productName}`,
    formattedDate ? `• Received: ${formattedDate}` : '',
    enquiry.message ? `• Client Note: "${enquiry.message}"` : '',
    '',
    'Warm regards,',
    'Ronika Bhatia',
    'Visual Designer & Illustrator',
    'https://ronikabhatia.com',
  ]
    .filter((line) => typeof line === 'string')
    .join('\n');

  return { subject, body };
}

/**
 * Generates a Gmail web compose URL routed through Google AccountChooser.
 *
 * This allows the user to select which Google account to send from,
 * and opens the standard Gmail compose window with recipient, subject,
 * and body prefilled.
 */
export function getGmailComposeUrl(options: ComposeEmailOptions | string): string {
  const opts: ComposeEmailOptions = typeof options === 'string' ? { to: options } : options;
  if (!opts.to) return '';

  const cleanEmail = opts.to.replace(/^mailto:/i, '').trim();
  const queryParts: string[] = [];

  if (opts.subject) {
    queryParts.push(`subject=${encodeURIComponent(opts.subject)}`);
  }
  if (opts.body) {
    queryParts.push(`body=${encodeURIComponent(opts.body)}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const mailtoUri = `mailto:${cleanEmail}${queryString}`;
  const gmailDestination = `https://mail.google.com/mail/?extsrc=mailto&url=${encodeURIComponent(mailtoUri)}`;

  return `https://accounts.google.com/AccountChooser?service=mail&continue=${encodeURIComponent(gmailDestination)}`;
}

/**
 * Generates a standard RFC 6068 mailto URI for native desktop mail clients.
 */
export function getMailtoUrl(options: ComposeEmailOptions | string): string {
  const opts: ComposeEmailOptions = typeof options === 'string' ? { to: options } : options;
  if (!opts.to) return '';

  const cleanEmail = opts.to.replace(/^mailto:/i, '').trim();
  const queryParts: string[] = [];

  if (opts.subject) {
    queryParts.push(`subject=${encodeURIComponent(opts.subject)}`);
  }
  if (opts.body) {
    queryParts.push(`body=${encodeURIComponent(opts.body)}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return `mailto:${cleanEmail}${queryString}`;
}
