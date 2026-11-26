"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, X } from "lucide-react";

export function BookOrderModal({
  isOpen,
  onClose,
  selectedFormat,
  price,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedFormat: string;
  price: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Submit lead details and create Stripe checkout session
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BOOK_ORDER",
          name,
          email,
          phone,
          format: selectedFormat,
          price,
          message: shippingAddress ? `Shipping Address:\n${shippingAddress}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to initiate secure checkout.");
      }

      if (data.url) {
        // Redirect to secure Stripe Checkout page
        window.location.href = data.url;
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#040d18]/95 rounded-xl p-8 text-left overflow-hidden unlock-rim-ice">
        <button
          onClick={onClose}
          className="relative z-10 absolute top-4 right-4 p-1.5 rounded-full text-cyan-200/70 hover:text-white hover:bg-cyan-400/15 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="relative z-10 text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#38f6ff] mx-auto animate-bounce" />
            <h3 className="text-2xl font-serif font-bold text-white">Order Confirmed &bull; Access Dispatched</h3>
            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Thank you, <strong className="text-white">{name || email}</strong>! Your copy of{" "}
              <strong className="text-[#7df9ff]">{selectedFormat}</strong> ({price}) has been officially reserved.
            </p>
            <div className="p-4 bg-[#38f6ff]/10 border border-[#38f6ff]/40 rounded font-mono text-xs text-[#a5f3fc]">
              ✓ Direct download link &amp; receipt dispatched to <strong>{email}</strong>.
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded text-[#03101a] font-mono font-bold text-xs uppercase cursor-pointer"
              style={{
                background: "linear-gradient(90deg, #7df9ff 0%, #00e5ff 50%, #38bdf8 100%)",
                boxShadow: "0 0 16px rgba(0, 229, 255, 0.5)",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="mb-6">
              <div
                className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider mb-2"
                style={{
                  backgroundColor: "rgba(0, 229, 255, 0.14)",
                  color: "#7df9ff",
                  border: "1px solid rgba(56, 246, 255, 0.65)",
                }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Instant Checkout &bull; {price} Digital Access
              </div>
              <h3 className="text-xl font-serif font-bold text-white">
                {selectedFormat} &bull; <span className="text-[#7df9ff]">{price}</span>
              </h3>
              <p className="text-xs text-cyan-100/70 font-sans mt-1">
                Enter your information below to complete checkout and receive instant download links for EPUB, PDF, and Kindle.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded bg-red-900/30 border border-red-500/50 text-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gregory Vance"
                  className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collector@gmail.com"
                  className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                  Phone (For Delivery Tracking)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 019-2834"
                  className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                />
              </div>

              {!selectedFormat.toLowerCase().includes("ebook") && !selectedFormat.toLowerCase().includes("digital") && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-cyan-100/80 mb-1">
                    Shipping Address (For Physical Editions)
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="123 Market St, Suite 400, New York, NY 10001"
                    className="w-full bg-[#040c18] border border-cyan-400/25 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#38f6ff]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-[#03101a] font-mono font-bold uppercase tracking-widest text-sm py-3.5 px-6 rounded transition-all transform active:scale-95 mt-4 disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110 cursor-pointer"
                style={{
                  background: "linear-gradient(90deg, #00e5ff 0%, #00b8ff 52%, #0084ff 100%)",
                  boxShadow: "0 0 18px rgba(0, 174, 255, 0.65)",
                }}
              >
                {loading ? (
                  "Processing Secure Order..."
                ) : (
                  <>
                    <span>🔒 Complete Order &bull; {price}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
