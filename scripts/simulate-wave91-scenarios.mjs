// Onda 91 — FKs nullable / integridade fraca
const nullStates = ['not_null', 'nullable_used', 'nullable_all_null', 'nullable_mixed'];
const onDelete = ['NO ACTION', 'CASCADE', 'SET NULL', 'SET DEFAULT', 'RESTRICT'];
const usage = ['isolation_column','ownership','soft_link','audit_ref'];
const sizes = ['tiny','small','medium','large','huge'];
const s=[];
for(const n of nullStates) for(const d of onDelete) for(const u of usage) for(const z of sizes){
  const critical = (u==='ownership' || u==='isolation_column') && n.startsWith('nullable') && (z==='large'||z==='huge');
  const warn = n.startsWith('nullable') && !critical;
  s.push({n,d,u,z,sev: critical?'critical': warn?'warning':'ok'});
}
const c=s.filter(x=>x.sev==='critical').length, w=s.filter(x=>x.sev==='warning').length;
console.log(`Cenários: ${s.length} | críticos: ${c} | warnings: ${w} | ok: ${s.length-c-w}`);
console.log('Gaps: SET NULL exige nullable; audit_ref pode ser nullable intencionalmente.');
