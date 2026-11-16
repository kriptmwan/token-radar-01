// Launch Signal's deterministic evidence engine. No protocol-specific overrides.
export const MODEL = {
  base_multiple: 0.25, growth_weight: 0.72, growth_floor: -60, growth_cap: 120,
  maturity_floor: 0.58, maturity_range: 0.42, maturity_days: 1460, unknown_age_days: 365,
};
export const MODEL_VERSION = 'signal-evidence-1';
export function ageDays(asOf: string, listed: string | null): number | null {
  if (!listed) return null;
  const a = Date.parse(asOf), b = Date.parse(listed);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, Math.floor((a-b)/86400000)) : null;
}
export function parseSnapshot(text: string) {
  const s = JSON.parse(text);
  if (!s || !Array.isArray(s.protocols) || !Array.isArray(s.watchlist) || !Number.isFinite(Date.parse(s.as_of))) throw Error('Invalid snapshot envelope');
  const seen = new Set();
  for (const p of s.protocols) {
    if (!p.slug || seen.has(p.slug) || !p.name || !Number.isFinite(p.tvl_usd) || p.tvl_usd < 0 || !Array.isArray(p.chains)) throw Error('Invalid or duplicate protocol');
    seen.add(p.slug);
  }
  if (s.watchlist.some((slug: string)=>!seen.has(slug))) throw Error('Watchlist references missing protocol');
  return s;
}
export function isPreToken(p: any) {
  return p.mcap_usd == null && p.gecko_id == null && p.symbol == null;
}
export function impliedValue(p: any, asOf: string, model=MODEL) {
  const age = ageDays(asOf,p.listed_at);
  const growthPct = Math.max(model.growth_floor,Math.min(model.growth_cap,Number.isFinite(p.change_7d)?p.change_7d:0));
  const growthMult = 1+growthPct/100*model.growth_weight;
  const maturityMult = model.maturity_floor+Math.min(age??model.unknown_age_days,model.maturity_days)/model.maturity_days*model.maturity_range;
  return {age,growthPct,growthMult,maturityMult,implied:Math.max(1,Math.round(p.tvl_usd*model.base_multiple*growthMult*maturityMult))};
}
function plan(p: any, age: number|null): string[] {
  const chain = p.chains[0]||'the documented network';
  const capital = p.tvl_usd>=1e9?150:p.tvl_usd>=1e8?100:50;
  const days = age!==null&&age<180?60:30;
  const gas = chain==='Ethereum'?'$5–25':'$0.10–5';
  const category=(p.category||'').toLowerCase();
  let action='inspect the documented deposit and withdrawal flow; use a supported asset only';
  if (/lend|cdp/.test(category)) action='supply a supported asset without borrowing; check utilization and withdrawal liquidity';
  else if (/dex|yield/.test(category)) action='test a small liquidity position; inspect pool composition, impermanent loss and withdrawal fees';
  else if (/bridge/.test(category)) action='test the minimum supported bridge transfer and verify arrival before committing more';
  else if (/stak/.test(category)) action='check staking receipt redemption, validator risks and unbonding time before a small stake';
  else if (/perpetual|derivative/.test(category)) action='inspect margin and liquidation rules in a simulator; avoid a leveraged position for speculative rewards';
  else if (/rwa|insurance/.test(category)) action='verify jurisdiction and identity requirements first; do not fund if eligibility is unclear';
  else if (/curator|allocator/.test(category)) action='inspect vault holdings and manager permissions before a small supported-asset deposit';
  return [
    `Research ${p.name} on ${chain} using its official documentation. A token, rewards program and eligibility are not confirmed by the snapshot. Cost: $0. Time: 15 minutes before funding.`,
    `Set a $${capital} maximum research budget in a separate wallet. Verify the contract and network, simulate the first transaction and avoid unlimited approvals. Cost: ${gas} illustrative gas, not a quote. Time: 10 minutes.`,
    `For ${p.name}, ${action}. Proceed only if current documentation confirms access and supported assets. Cost: up to $${capital} capital at risk plus ${gas} gas. Time: 15–30 minutes.`,
    `Observe for ${days} days and record transaction hashes, balances and fees. Review official eligibility weekly; repeated transactions do not prove qualification. Cost: $0 to inspect; capital remains at risk. Time: 10 minutes weekly for ${days} days.`,
    `Test a small withdrawal before enlarging exposure. Exit when contract risk, fees or access rules exceed your budget and revoke unused approvals. Cost: ${gas} illustrative gas plus possible slippage or exit fees. Time: 15 minutes plus documented lockups.`,
  ];
}
export function buildRadar(snapshot: any, model=MODEL) {
  const watch = new Set(snapshot.watchlist);
  const candidates=snapshot.protocols.filter((p:any)=>watch.has(p.slug)||(
    p.tvl_usd<snapshot.floor_usd && isPreToken(p) && p.category!=='CEX' && !/\s[vV]?\d+(?:\.\d+)*$/.test(p.name)
  ));
  const board=candidates.map((p:any)=>{
    const v=impliedValue(p,snapshot.as_of,model);
    const flags=[];
    if(v.age===null) flags.push('Tracking date missing; 365-day prior used');
    if(p.change_7d===null) flags.push('Growth missing; neutral prior used');
    if(Math.abs(p.change_7d??0)>60) flags.push('Large weekly TVL move; inspect capital concentration');
    if(/bridge|stak|rwa/i.test(p.category||'')) flags.push('Product or access eligibility needs manual verification');
    return {...p,rank:0,token_status:'pre-token',age_days:v.age,implied_value_usd:v.implied,
      model:{base_multiple:model.base_multiple,growth_pct:v.growthPct,growth_multiplier:Math.round(v.growthMult*1e4)/1e4,maturity_multiplier:Math.round(v.maturityMult*1e4)/1e4,age_days:v.age},
      evidence:{low_usd:Math.max(1,Math.round(v.implied*.55)),high_usd:Math.round(v.implied*1.65),watchlist:watch.has(p.slug),completeness:[p.change_7d!==null,v.age!==null,p.chains.length>0,p.category!==null].filter(Boolean).length,flags},
      farm_steps:plan(p,v.age)};
  }).sort((a:any,b:any)=>b.implied_value_usd-a.implied_value_usd||(a.slug<b.slug?-1:1));
  board.forEach((r:any,i:number)=>r.rank=i+1);
  const live=snapshot.protocols.filter((p:any)=>!isPreToken(p)&&p.category!=='CEX').sort((a:any,b:any)=>(b.mcap_usd??0)-(a.mcap_usd??0)||(a.slug<b.slug?-1:1)).slice(0,24).map((p:any)=>({...p,age_days:ageDays(snapshot.as_of,p.listed_at)}));
  return {board,radar:{as_of:snapshot.as_of,source:snapshot.source,floor_usd:snapshot.floor_usd,model,model_version:MODEL_VERSION,watchlist_size:watch.size,board_size:board.length,early_size:board.filter((r:any)=>!watch.has(r.slug)).length,live_size:live.length,live,
    rows:board.map((r:any)=>({...r,growth_multiplier:r.model.growth_multiplier,maturity_multiplier:r.model.maturity_multiplier}))}};
}
export function boardIssue(board:any[],snapshot:any): string|null {
  const slugs=new Set(board.map(r=>r.slug));
  if(slugs.size!==board.length) return 'Duplicate slug';
  if(snapshot.watchlist.some((s:string)=>!slugs.has(s))) return 'Incomplete watchlist';
  for(let i=0;i<board.length;i++) {
    const r=board[i];
    if(r.rank!==i+1 || !Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd<=0) return 'Invalid rank or value';
    if(i>0&&r.implied_value_usd>board[i-1].implied_value_usd) return 'Unsorted values';
    if(r.farm_steps.length<3||r.farm_steps.some((s:string)=>s.length<20||s.length>600)) return 'Invalid farm plan';
  }
  return null;
}
export function dataScript(radar:any) { return 'window.RADAR='+JSON.stringify(radar)+';\n'; }
