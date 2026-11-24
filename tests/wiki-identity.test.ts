import {beforeEach,describe,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({row:null as any,error:null as any,eq:vi.fn(),bio:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createPublicServerClient:()=>({from:()=>({select:()=>{const query={eq:f.eq,maybeSingle:async()=>({data:f.row,error:f.error})};f.eq.mockReturnValue(query);return query;}})})}));
vi.mock('@/lib/wiki/lore-search',()=>({getLoreEntityBySlug:()=>({slug:'aero',title:'Marvel Aero',universe:'MARVEL',type:'character',summary:'Wrong universe',reality:'Earth-616'})}));
vi.mock('@/lib/creators/creator-bio-service',()=>({getCreatorBio:f.bio}));
vi.mock('next/navigation',()=>({
  notFound:()=>{throw new Error('NOT_FOUND');},
  redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`);}
}));
vi.mock('@/lib/news/entities',()=>({extractEntitiesFromContext:()=>[]}));
import Page from '@/app/wiki/entry/[slug]/page';
function text(node:any):string {if(node==null || typeof node==='boolean')return '';if(typeof node==='string' || typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.props?.children);}
beforeEach(()=>{vi.clearAllMocks();f.error=null;f.row={slug:'aero',display_title:'Star Wars Aero',universe:'STAR_WARS',page_type:'CHARACTER',summary:'Galactic Empire; Task Force 99'};});
describe('wiki identity across universes',()=>{
 it('keeps a stored Star Wars article from being replaced by bundled Marvel lore',async()=>{const result=await Page({params:Promise.resolve({slug:'aero'}),searchParams:Promise.resolve({universe:'STAR_WARS'})});const body=text(result);expect(body).toContain('Star Wars Aero');expect(body).toContain('STAR WARS');expect(body).not.toContain('Marvel Aero');expect(body).not.toContain('Earth-616');expect(f.eq).toHaveBeenCalledWith('universe','STAR_WARS');expect(f.bio).not.toHaveBeenCalled();});
 it('does not create an article from another universe when the stored identity is missing',async()=>{f.row=null;await expect(Page({params:Promise.resolve({slug:'aero'}),searchParams:Promise.resolve({universe:'STAR_WARS'})})).rejects.toThrow('REDIRECT:/wiki');});
 it('does not assign Detective Comics 27 or an alignment to a DC character with missing facts',async()=>{f.row={...f.row,universe:'DC',first_appearance:null,creators:null,reality:null};const result=await Page({params:Promise.resolve({slug:'aero'}),searchParams:Promise.resolve({universe:'DC'})});const body=text(result);expect(body).toContain('DC');expect(body).not.toContain('Detective Comics #27');expect(body).not.toContain('Prime Earth');expect(body).not.toContain('Historical milestone debut officially recorded');expect(body).not.toContain('Good');});
 it('does not mask an unreadable warehouse with a different local character',async()=>{f.error={code:'42501'};await expect(Page({params:Promise.resolve({slug:'aero'}),searchParams:Promise.resolve({})})).rejects.toThrow('Stored wiki article could not be read');});
});
