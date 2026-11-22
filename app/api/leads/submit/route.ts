import { NextResponse } from "next/server";
import { sendLeadNotification, LeadSubmission } from "@/lib/leads/notifications";
import { saveSubscriber } from "@/lib/leads/subscribers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, name, email, phone, organization, interestTier, message, isComicBusiness, businessName, businessType, metadata } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
    }

    const submission: LeadSubmission = {
      type: type || "BETA_WAITLIST",
      name: name?.trim() || "",
      email: email.trim(),
      phone: phone?.trim(),
      organization: organization?.trim() || businessName?.trim(),
      interestTier: interestTier?.trim(),
      message: message?.trim(),
      metadata,
    };

    // 1. Save to podcast & platform blast subscribers registry
    saveSubscriber({
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      isComicBusiness: Boolean(isComicBusiness || metadata?.isComicBusiness),
      businessName: businessName?.trim() || organization?.trim() || metadata?.businessName,
      businessType: businessType?.trim() || metadata?.businessType,
      interestTier: interestTier?.trim(),
      source: type || "web",
      notes: message?.trim(),
    });

    // 2. Send immediate alert notification to Gregory D. Goyins
    await sendLeadNotification(submission);

    return NextResponse.json({ ok: true, message: "Submission successfully received." });
  } catch (error: any) {
    console.error("Error processing lead submission:", error);
    return NextResponse.json({ ok: false, error: "Failed to process submission." }, { status: 500 });
  }
}
