import {describe,it,expect} from "vitest";
import {calculateCertificationFees as fee} from "@/lib/sniper/certification-fees";

describe("CGC 2026 signed and unsigned fee schedule",()=>{
  it("uses exact Panel Profits unsigned totals",()=>{
    expect(fee({publicationYear:1988,rawFmv:300,signatureMethod:"NONE",signatureCount:0}).total).toBe(80);
    expect(fee({publicationYear:1963,rawFmv:300,signatureMethod:"NONE",signatureCount:0}).total).toBe(95);
    expect(fee({publicationYear:1988,rawFmv:700,signatureMethod:"NONE",signatureCount:0}).total).toBe(155);
  });
  it("uses witnessed Signature Series tier without adding JSA fees",()=>{
    const x=fee({publicationYear:1988,rawFmv:300,signatureMethod:"CGC_WITNESSED",signatureCount:2,signerFees:[40,60]});
    expect(x.gradingFee).toBe(53);
    expect(x.signatureAuthenticationFee).toBe(0);
    expect(x.total).toBe(203);
    expect(x.complete).toBe(true);
  });
  it("requires known signer fees to declare witnessed cost complete",()=>{
    expect(fee({publicationYear:1963,rawFmv:300,signatureMethod:"CGC_WITNESSED",signatureCount:2}).complete).toBe(false);
  });
  it("authenticates each JSA signature at $30 without double-charging witnessed fees",()=>{
    const x=fee({publicationYear:1988,rawFmv:300,signatureMethod:"JSA_AUTHENTICATED",signatureCount:4});
    expect(x.gradingFee).toBe(30);
    expect(x.signatureAuthenticationFee).toBe(120);
    expect(x.total).toBe(200);
    expect(x.complete).toBe(true);
  });
  it("charges high-value and unlimited-value signed tiers separately",()=>{
    expect(fee({publicationYear:1963,rawFmv:700,signatureMethod:"CGC_WITNESSED",signatureCount:1,signerFees:[0]}).total).toBe(190);
    expect(fee({publicationYear:1963,rawFmv:2000,signatureMethod:"CGC_WITNESSED",signatureCount:1,signerFees:[0]}).total).toBe(225);
  });
  it("rejects unsupported autograph grading and invalid inputs",()=>{
    expect(()=>fee({publicationYear:1988,rawFmv:300,signatureMethod:"JSA_AUTHENTICATED",signatureCount:4,gradeAutographs:true})).toThrow();
    expect(()=>fee({publicationYear:1988,rawFmv:0,signatureMethod:"NONE",signatureCount:0})).toThrow();
  });
});
