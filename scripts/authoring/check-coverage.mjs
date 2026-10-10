// Report checklist names with no wiki entry: node scripts/authoring/check-coverage.mjs scripts/authoring/checklist.txt
// Matches on name, id and altNames token by token; map shapes (geo) do not count as entries.

import fs from 'fs';
const fold=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const STOP=new Set(['of','the','s','a','at','to','and','i','ii']);
const toks=s=>fold(s).split(' ').filter(t=>t&&!STOP.has(t));
let all=[];for(const f of ['artefacts','culture','events','people','places','myth','texts','periods']){try{const d=JSON.parse(fs.readFileSync('data/'+f+'.json','utf8'));const arr=Array.isArray(d)?d:Object.values(d).flat();all=all.concat(arr.filter(x=>x&&x.id))}catch{}}
const names=all.flatMap(e=>[e.id.replace(/-/g,' '),e.name,...(e.altNames||[])].filter(Boolean).map(n=>new Set(toks(n))));
let sec='';const miss={};
for(const line of fs.readFileSync(process.argv[2],'utf8').split('\n')){if(line.startsWith('#')){sec=line.slice(1);miss[sec]=[];continue}
 for(const n of line.split('|').filter(Boolean)){const q=toks(n);const ok=names.some(set=>q.every(t=>set.has(t)||[...set].some(x=>x.length>5&&(x.startsWith(t)||t.startsWith(x)))));if(!ok)miss[sec].push(n)}}
for(const[k,v]of Object.entries(miss))console.log(k+' ('+v.length+'): '+[...new Set(v)].join(', '));
