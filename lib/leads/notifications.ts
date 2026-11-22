import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER || "gregorydgoyins@gmail.com";
const smtpPass = process.env.SMTP_PASS || "nkumvonnqkgybjib";
const alertEmail = process.env.ALERT_EMAIL || "gregorydgoyins@gmail.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export interface LeadSubmission {
  type: "BETA_WAITLIST" | "BOOK_PREORDER" | "SPONSOR_DONATION" | "PODCAST_LISTENER";
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  interestTier?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export async function sendLeadNotification(lead: LeadSubmission) {
  const subject = `[CBSE LEAD] New ${lead.type}: ${lead.name || lead.email}`;
  
  const textContent = `
NEW INCOMING SUBMISSION FROM COMICBOOKSTOCKEXCHANGE.COM
-------------------------------------------------------
Type: ${lead.type}
Date: ${new Date().toISOString()}

Name: ${lead.name || "N/A"}
Email: ${lead.email}
Phone: ${lead.phone || "N/A"}
Organization / Comic Store: ${lead.organization || "N/A"}
Interest Tier / Level: ${lead.interestTier || "N/A"}

Message / Notes:
${lead.message || "None provided"}

Metadata:
${JSON.stringify(lead.metadata || {}, null, 2)}
-------------------------------------------------------
`;

  const htmlContent = `
    <div style="font-family: sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 8px;">
      <h2 style="color: #c5a059; border-bottom: 1px solid #334155; padding-bottom: 8px;">
        New CBSE Submission: ${lead.type}
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr><td style="padding: 6px; color: #94a3b8; width: 140px;"><strong>Name:</strong></td><td style="padding: 6px;">${lead.name || "N/A"}</td></tr>
        <tr><td style="padding: 6px; color: #94a3b8;"><strong>Email:</strong></td><td style="padding: 6px;"><a href="mailto:${lead.email}" style="color: #38bdf8;">${lead.email}</a></td></tr>
        <tr><td style="padding: 6px; color: #94a3b8;"><strong>Phone:</strong></td><td style="padding: 6px;">${lead.phone || "N/A"}</td></tr>
        <tr><td style="padding: 6px; color: #94a3b8;"><strong>Organization / Store:</strong></td><td style="padding: 6px;">${lead.organization || "N/A"}</td></tr>
        <tr><td style="padding: 6px; color: #94a3b8;"><strong>Interest Tier:</strong></td><td style="padding: 6px; color: #fbbf24;">${lead.interestTier || "N/A"}</td></tr>
      </table>
      ${lead.message ? `
        <div style="margin-top: 20px; background-color: #1e293b; padding: 12px; border-radius: 4px; border-left: 4px solid #c5a059;">
          <strong>Message:</strong><br/>
          <p style="white-space: pre-wrap; margin-top: 6px;">${lead.message}</p>
        </div>
      ` : ""}
    </div>
  `;

  return await transporter.sendMail({
    from: `"CBSE Exchange Alerts" <${smtpUser}>`,
    to: alertEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}
