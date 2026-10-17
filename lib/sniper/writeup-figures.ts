import type {ListingWriteup} from './writeup-schema';
type Brief=Pick<ListingWriteup,'edition'|'synopsis'|'investment'>;
interface Amount {currency:string;amount:number}
const currency=(value:string)=>/^(?:\$|USD|dollars?)$/i.test(value)?'USD':/^(?:€|EUR|euros?)$/i.test(value)?'EUR':'GBP';
function amounts(text:string):Amount[] {
 const out:Amount[]=[];
 const scales:Record<string,number>={k:1e3,thousand:1e3,m:1e6,million:1e6,b:1e9,billion:1e9};
 const patterns=[/([$€£]|\bUSD|\bEUR|\bGBP)\s*([\d,]+(?:\.\d+)?)(?:\s*(thousand|million|billion|[kmb])\b)?/gi,/\b([\d,]+(?:\.\d+)?)\s*(?:(thousand|million|billion|[kmb])\s*)?(USD|dollars?|EUR|euros?|GBP|pounds?)\b/gi];
 for(let i=0;i<patterns.length;i++)for(const match of text.matchAll(patterns[i])){
  const unit=i===0?match[1]:match[3],raw=i===0?match[2]:match[1];
  const scale=scales[(i===0?match[3]:match[2])?.toLowerCase()]||1;
  out.push({currency:currency(unit),amount:Number(raw.replaceAll(',',''))*scale});
 }
 return out;
}
/** A cited financial amount must exist in that source; prose cannot create a new valuation. */
export function assertSourcedWriteupFigures(brief:Brief,evidence:{amounts:Amount[];storyText:string}) {
 const storyAmounts=amounts(evidence.storyText);
 const check=(text:string,refs:number[])=>{
  if(/\b\d+(?:\.\d+)?\s*(?:%|percent\b|per cent\b)/i.test(text))throw new Error('Unsupported percentage in generated research');
  const allowed=[...(refs.includes(0)?storyAmounts:[]),...(refs.includes(1)?evidence.amounts:[])];
  const found=amounts(text);
  if(/[$€£](?!\s*\d)/.test(text))throw new Error('Unverifiable monetary expression in generated research');
  for(const value of found)if(!allowed.some(row=>row.currency.toUpperCase()===value.currency && Number.isFinite(row.amount) && Math.abs(row.amount-value.amount)<0.005))throw new Error('Unsupported financial figure in generated research');
 };
 check(brief.edition,[0,1]);check(brief.investment.heading,[0,1]);check(brief.synopsis.intro,[0]);
 for(const point of [...brief.synopsis.points,...brief.investment.points])check(`${point.label}. ${point.text}`,point.refs||[0]);
}
