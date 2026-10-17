import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
if(!key)throw new Error('The existing Supabase service key is required in .env.local');
const venue=process.argv.find(s=>s.startsWith('--venue='))?.split('=')[1];
const provider=process.argv.find(s=>s.startsWith('--provider='))?.split('=')[1]||'gateway';
if(!['gemini','gateway'].includes(provider))throw new Error('provider must be gemini or gateway');
const rounds=Number(process.argv.find(s=>s.startsWith('--rounds='))?.split('=')[1]||100);
if(!Number.isInteger(rounds)||rounds<1||rounds>200)throw new Error('rounds must be between 1 and 200');
for(let round=1;round<=rounds;round++){
 const started=Date.now();
 const response=await fetch('https://comicbookstockexchange.com/api/cron/sniper-local-research',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({venue,provider,limit:provider==='gemini'?40:12}),signal:AbortSignal.timeout(230000)});
 if(!response.ok)throw new Error(`Research maintenance HTTP ${response.status}`);
 const result=await response.json();console.log(JSON.stringify({round,elapsedMs:Date.now()-started,...result}));
 if(result.busy){await new Promise(resolve=>setTimeout(resolve,30000));continue;}
 if(!result.written)break;
}
