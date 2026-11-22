import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

const DB_PATH = path.join(process.cwd(), "data", "subscribers.json");

export interface SubscriberRecord {
  id: string;
  email: string;
  name?: string;
  isComicBusiness: boolean;
  businessName?: string;
  businessType?: string;
  interestTier?: string;
  source: string;
  notes?: string;
  createdAt: string;
  active: boolean;
}

function ensureDataFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

export function getAllSubscribers(): SubscriberRecord[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSubscriber(record: Omit<SubscriberRecord, "id" | "createdAt" | "active">): SubscriberRecord {
  ensureDataFile();
  const subscribers = getAllSubscribers();
  const existingIdx = subscribers.findIndex(
    (s) => s.email.toLowerCase() === record.email.toLowerCase()
  );

  const newRecord: SubscriberRecord = {
    id: existingIdx >= 0 ? subscribers[existingIdx].id : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...record,
    createdAt: existingIdx >= 0 ? subscribers[existingIdx].createdAt : new Date().toISOString(),
    active: true,
  };

  if (existingIdx >= 0) {
    subscribers[existingIdx] = newRecord;
  } else {
    subscribers.push(newRecord);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(subscribers, null, 2), "utf8");
  return newRecord;
}

export async function blastNewEpisodeEmail({
  episodeTitle,
  episodeDescription,
  episodeNumber,
  youtubeUrl,
  spotifyUrl,
  appleUrl,
  soundcloudUrl,
  pandoraUrl,
  directDownloadUrl,
}: {
  episodeTitle: string;
  episodeDescription: string;
  episodeNumber: string | number;
  youtubeUrl?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  soundcloudUrl?: string;
  pandoraUrl?: string;
  directDownloadUrl?: string;
}) {
  const subscribers = getAllSubscribers().filter((s) => s.active);
  if (subscribers.length === 0) {
    return { count: 0, message: "No subscribers found." };
  }

  const smtpUser = process.env.SMTP_USER || "gregorydgoyins@gmail.com";
  const smtpPass = process.env.SMTP_PASS || "nkumvonnqkgybjib";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const subject = `[P4 PANEL EPISODE #${episodeNumber}] ${episodeTitle}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #e0e6ed; padding: 32px; border-radius: 8px; max-width: 640px; margin: 0 auto; border: 1px solid #c5a059;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c5a059; border: 1px solid rgba(197, 160, 89, 0.4); padding: 4px 10px; border-radius: 12px;">
          The Comic Book Stock Exchange Official Broadcast
        </span>
        <h1 style="color: #ffffff; font-size: 26px; margin: 16px 0 6px 0; font-family: Georgia, serif;">
          P4 PANEL PODCAST &bull; EPISODE #${episodeNumber}
        </h1>
        <h2 style="color: #e7c87d; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
          ${episodeTitle}
        </h2>
      </div>

      <div style="background-color: #0d1322; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 24px; line-height: 1.6; font-size: 14px; color: #cbd5e1;">
        <p style="margin: 0;">${episodeDescription}</p>
      </div>

      <div style="text-align: center; margin-bottom: 28px;">
        <p style="font-family: monospace; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          Listen &amp; Watch On Your Preferred Network
        </p>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px;">
          ${youtubeUrl ? `<a href="${youtubeUrl}" style="background-color: #cc0000; color: #ffffff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">YouTube</a>` : ""}
          ${spotifyUrl ? `<a href="${spotifyUrl}" style="background-color: #1db954; color: #ffffff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">Spotify</a>` : ""}
          ${appleUrl ? `<a href="${appleUrl}" style="background-color: #872ec4; color: #ffffff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">Apple Podcasts</a>` : ""}
          ${soundcloudUrl ? `<a href="${soundcloudUrl}" style="background-color: #ff5500; color: #ffffff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">SoundCloud</a>` : ""}
          ${pandoraUrl ? `<a href="${pandoraUrl}" style="background-color: #005483; color: #ffffff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">Pandora</a>` : ""}
          ${directDownloadUrl ? `<a href="${directDownloadUrl}" style="background-color: #c5a059; color: #000000; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold; margin: 4px; display: inline-block;">Direct Master Audio</a>` : ""}
        </div>
      </div>

      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; font-family: monospace;">
        You received this transmission because you registered for CBSE updates or P4 Panel Podcast episode releases at <a href="https://comicbookstockexchange.com" style="color: #c5a059;">comicbookstockexchange.com</a>.
      </div>
    </div>
  `;

  const results = [];
  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from: `"P4 Panel Podcast" <${smtpUser}>`,
        to: sub.email,
        subject,
        html,
      });
      results.push({ email: sub.email, status: "sent" });
    } catch (err: any) {
      console.error(`Failed to send blast to ${sub.email}:`, err);
      results.push({ email: sub.email, status: "failed", error: err.message });
    }
  }

  return {
    totalSubscribers: subscribers.length,
    sentCount: results.filter((r) => r.status === "sent").length,
    results,
  };
}
