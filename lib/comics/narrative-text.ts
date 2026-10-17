/** A source pointer or an unwritten-synopsis notice is not evidence of story events. */
export function hasNarrativeText(value:unknown):value is string {
 if(typeof value!=='string')return false;
 const text=value.trim();
 if(/^\{\{/.test(text))return false;
 if(/(?:^|\n)\s*\|\s*\w+\s*=/.test(text) || /(?:^|\n)\s*(?:no (?:story )?synopsis\b|(?:the )?synopsis[^\n]{0,100}(?:not (?:yet )?(?:been )?written|unavailable)|(?:this )?article is a stub|to be added[.!]?\s*$)/i.test(text))return false;
 const body=text.replace(/https?:\/\/[^\s<>()\[\]]+/gi,'').replace(/[\[\](){}*_<>]/g,' ').replace(/\s+/g,' ').trim();
 if(body.length<20)return false;
 const substance=body.replace(/\b(?:read|see|full|summary|synopsis|story|here|click|available|at|on|the|this|issue|for|more|information|visit)\b/gi,'').replace(/[^\p{L}\p{N}]+/gu,'').trim();
 return substance.length>=10;
}
