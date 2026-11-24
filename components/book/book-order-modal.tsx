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
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BOOK_PREORDER",
          name,
          email,
          phone,
          interestTier: selectedFormat,
          message: shippingAddress ? `Shipping Address:\n${shippingAddress}` : undefined,
          metadata: { format: selectedFormat, price, shippingAddress },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit pre-order.");
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
      <div className="relative w-full max-w-lg bg-[#0d1322] border border-[#c5a059]/40 rounded-xl p-8 shadow-2xl text-left overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#c5a059] mx-auto animate-bounce" />
            <h3 className="text-2xl font-serif font-bold text-white">Order Confirmed &bull; Access Dispatched</h3>
            <p className="text-sm text-white/80 leading-relaxed font-sans">
              Thank you, <strong className="text-white">{name || email}</strong>! Your copy of{" "}
              <strong className="text-[#c5a059]">{selectedFormat}</strong> ({price}) has been officially reserved.
            </p>
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded font-mono text-xs text-emerald-300">
              ✓ Direct download link &amp; receipt dispatched to <strong>{email}</strong>.
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded bg-[#c5a059] text-black font-mono font-bold text-xs uppercase"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#c5a059]/10 text-[#c5a059] text-[11px] font-mono uppercase tracking-wider mb-2">
                <ShoppingBag className="w-3.5 h-3.5" />
                Instant Checkout &bull; $9.99 Digital Access
              </div>
              <h3 className="text-xl font-serif font-bold text-white">
                {selectedFormat} &bull; <span className="text-[#c5a059]">{price}</span>
              </h3>
              <p className="text-xs text-white/60 font-sans mt-1">
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
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Gregory Vance"
                  className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collector@gmail.com"
                  className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                  Phone (For Delivery Tracking)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 019-2834"
                  className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              {!selectedFormat.toLowerCase().includes("ebook") && !selectedFormat.toLowerCase().includes("digital") && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/70 mb-1">
                    Shipping Address (For Physical Editions)
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="123 Market St, Suite 400, New York, NY 10001"
                    className="w-full bg-[#070b14] border border-white/15 rounded px-4 py-2 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#c5a059] to-[#8a6b2d] hover:from-[#d8b368] hover:to-[#9f7d37] text-black font-mono font-bold uppercase tracking-widest text-sm py-3.5 px-6 rounded shadow-lg transition-all transform active:scale-95 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
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
          </>
        )}
      </div>
    </div>
  );
}
