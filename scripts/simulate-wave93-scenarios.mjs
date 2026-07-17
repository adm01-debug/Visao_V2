// Onda 93 — Constraints NOT VALID pendentes
const types = ['CHECK','FOREIGN KEY'];
const ages = ['<1d','1-7d','7-30d','30-90d','>90d'];
const sizes = ['tiny','small','medium','large','huge'];
const loads = ['read_only','write_heavy','append_only','mixed'];
const s=[];
for(const t of types) for(const a of ages) for(const z of sizes) for(const l of loads){
  const critical = (a==='30-90d'||a==='>90d') && (z==='large'||z==='huge');
  const warn = (a==='7-30d') || (a==='30-90d' && !critical);
  s.push({t,a,z,l,sev: critical?'critical': warn?'warning':'info'});
}
const c=s.filter(x=>x.sev==='critical').length, w=s.filter(x=>x.sev==='warning').length;
console.log(`Cenários: ${s.length} | críticos: ${c} | warnings: ${w} | info: ${s.length-c-w}`);
console.log('Gaps: VALIDATE em tabela huge pode segurar SHARE UPDATE EXCLUSIVE — sugerir janela de manutenção.');
