import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { saveSubscriber } from "@/lib/leads/subscribers";
import { sendLeadNotification } from "@/lib/leads/notifications";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, format, price, type, message, organization } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email address is required." }, { status: 400 });
    }

    // 1. Immediately capture lead & store on disk in subscribers ledger
    saveSubscriber({
      email: email.trim().toLowerCase(),
      name: name?.trim() || undefined,
      isComicBusiness: Boolean(organization),
      businessName: organization?.trim() || undefined,
      interestTier: price || "$9.99",
      source: type || "book_checkout",
      section: type || "book_checkout",
      notes: `Order intent for: ${format || "Book"} (${price || "$9.99"})${phone ? ` | Phone: ${phone}` : ""}${message ? ` | Msg: ${message}` : ""}`,
    });

    // 2. Alert notification to Gregory D. Goyins
    await sendLeadNotification({
      type: type || "BOOK_ORDER",
      name: name?.trim() || "",
      email: email.trim(),
      phone: phone?.trim(),
      organization: organization?.trim(),
      interestTier: price || "$9.99",
      message: `Checkout initiated for ${format || "eBook"} (${price || "$9.99"})`,
      metadata: { format, price, phone, type },
    });

    // Determine amount in cents
    let unitAmount = 999; // Default $9.99
    if (price) {
      const cleanNum = parseFloat(price.replace(/[^0-9.]/g, ""));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        unitAmount = Math.round(cleanNum * 100);
      }
    }

    const host = req.headers.get("origin") || req.headers.get("referer") || "https://comicbookstockexchange.com";
    const originUrl = host.replace(/\/$/, "");

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: email.trim().toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: format ? `Panel Profits: ${format}` : "Panel Profits: The Architecture of Sequential Art Equities",
              description: "Instant access & download to the canonical digital monograph & sovereign ledger.",
              images: ["https://comicbookstockexchange.com/brand/panel-profits-mark.svg"],
              tax_code: "txcd_10000000", // General electronically supplied digital services/eBooks
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${originUrl}/book?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originUrl}/book?canceled=true`,
      metadata: {
        lead_name: name || "",
        lead_email: email || "",
        lead_phone: phone || "",
        format: format || "eBook",
        tier: price || "$9.99",
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
