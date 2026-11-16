// Build all artifacts from one sealed snapshot; no runtime dependency or network.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseSnapshot,buildRadar,boardIssue,dataScript} from './lib/engine.ts';
import {buildDossier} from './vendor/makefun-board.ts';
const base=fileURLToPath(new URL('.',import.meta.url));
function option(key:string,fallback:string) {
  const flag='--'+key;
  const index=process.argv.indexOf(flag);
  if(index>=0) {
    const value=process.argv[index+1];
    if(!value||value.startsWith('--')) throw Error('Missing value for '+flag);
    return value;
  }
  return process.argv.find(s=>s.startsWith(flag+'='))?.slice(flag.length+1)||fallback;
}
function copyArtifact(folder:string,destination:string) {
  const source=join(base,folder), target=join(destination,folder);
  mkdirSync(target,{recursive:true});
  const names=readdirSync(source).filter(n=>!n.startsWith('.')).sort();
  for(const name of names) {
    if(!/^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/.test(name)) throw Error('Invalid artifact filename: '+name);
    if(!statSync(join(source,name)).isFile()) throw Error('Artifact is not a regular file: '+name);
    copyFileSync(join(source,name),join(target,name));
  }
  return names;
}
export function run() {
  const input=option('input',process.env.MAKEFUN_INPUT_DIR||'/input');
  const output=option('output',process.env.MAKEFUN_OUTPUT_DIR||'/output');
  const snapshot=parseSnapshot(readFileSync(input.endsWith('.json')?input:join(input,'snapshot.json'),'utf8'));
  const {board,radar}=buildRadar(snapshot);
  const error=boardIssue(board,snapshot);
  if(error) throw Error(error);
  if(board.length<100||board.length>4000) throw Error('Board outside required row count');
  mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'board.json'),JSON.stringify({rows:board})+'\n');
  writeFileSync(join(output,'data.js'),dataScript(radar));
  copyArtifact('dashboard',output);
  const screenshots=copyArtifact('screenshots',output);
  if(screenshots.length<3||screenshots.length>4) throw Error('Expected 3 or 4 screenshots');
  const dossier=buildDossier(output,{text_max_bytes:65536,screenshots:{max:4,max_bytes:524288},dashboard:{max_files:400,max_bytes:4194304}});
  writeFileSync(join(output,'dossier.json'),dossier);
  console.log(JSON.stringify({status:'built',rows:board.length,watchlist:radar.watchlist_size,early:radar.early_size,live:radar.live_size,screenshots:screenshots.length,dossier_bytes:Buffer.byteLength(dossier)}));
}
