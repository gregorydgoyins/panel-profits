import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
if(!key)throw new Error('The existing Supabase service key is required in .env.local');
const venue=process.argv.find(s=>s.startsWith('--venue='))?.split('=')[1];
const rounds=Number(process.argv.find(s=>s.startsWith('--rounds='))?.split('=')[1]||12);
if(!Number.isInteger(rounds)||rounds<1||rounds>30)throw new Error('rounds must be between 1 and 30');
for(let round=1;round<=rounds;round++){
 const response=await fetch('https://comicbookstockexchange.com/api/cron/sniper-local-research',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({venue,limit:40}),signal:AbortSignal.timeout(230000)});
 if(!response.ok)throw new Error(`Research maintenance HTTP ${response.status}`);
 const result=await response.json();console.log(JSON.stringify({round,...result}));
 if(result.busy || !result.written)break;
}
