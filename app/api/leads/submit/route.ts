import { NextResponse } from "next/server";
import { sendLeadNotification, LeadSubmission } from "@/lib/leads/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, name, email, phone, organization, interestTier, message, metadata } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    const submission: LeadSubmission = {
      type: type || "BETA_WAITLIST",
      name: name?.trim() || "",
      email: email.trim(),
      phone: phone?.trim(),
      organization: organization?.trim(),
      interestTier: interestTier?.trim(),
      message: message?.trim(),
      metadata,
    };

    // Send immediate email notification to gregorydgoyins@gmail.com
    await sendLeadNotification(submission);

    return NextResponse.json({ ok: true, message: "Submission successfully received." });
  } catch (error: any) {
    console.error("Error processing lead submission:", error);
    return NextResponse.json({ ok: false, error: "Failed to process submission." }, { status: 500 });
  }
}
