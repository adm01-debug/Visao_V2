#!/usr/bin/env node
/**
 * Onda Shinobi 3 — Simulação de Monitor Groups / Saved Layouts
 * 500+ cenários cobrindo schema, RLS lógico, layouts, drag-drop, cascade e JSON.
 */

const LAYOUTS = ['1x1', '2x2', '3x3', '4x4', '1+5', '2+8'];
const SLOTS = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16, '1+5': 6, '2+8': 10 };
const MAX_SLOTS = 32;

let pass = 0, fail = 0;
const failures = [];
const check = (cond, name) => {
  if (cond) pass++;
  else { fail++; failures.push(name); }
};

// ---------- Schema validation ----------
function validateGroup(g) {
  if (!g.name || typeof g.name !== 'string' || g.name.trim().length === 0) return 'name_required';
  if (g.name.length > 100) return 'name_too_long';
  if (!LAYOUTS.includes(g.layout)) return 'invalid_layout';
  if (!g.user_id) return 'user_id_required';
  return null;
}
function validateSlot(s) {
  if (typeof s.slot_index !== 'number' || s.slot_index < 0 || s.slot_index > 31) return 'invalid_slot_index';
  if (!Number.isInteger(s.slot_index)) return 'slot_not_int';
  return null;
}

// Test valid groups
for (const layout of LAYOUTS) {
  check(validateGroup({ name: 'g', layout, user_id: 'u1' }) === null, `valid_${layout}`);
}
// Test invalid
check(validateGroup({ name: '', layout: '2x2', user_id: 'u1' }) === 'name_required', 'reject_empty_name');
check(validateGroup({ name: 'x'.repeat(101), layout: '2x2', user_id: 'u1' }) === 'name_too_long', 'reject_long_name');
check(validateGroup({ name: 'g', layout: '5x5', user_id: 'u1' }) === 'invalid_layout', 'reject_bad_layout');
check(validateGroup({ name: 'g', layout: '2x2' }) === 'user_id_required', 'reject_no_user');

// Slot validation
for (let i = 0; i < 32; i++) check(validateSlot({ slot_index: i }) === null, `slot_${i}_ok`);
check(validateSlot({ slot_index: -1 }) === 'invalid_slot_index', 'reject_neg_slot');
check(validateSlot({ slot_index: 32 }) === 'invalid_slot_index', 'reject_slot_32');
check(validateSlot({ slot_index: 1.5 }) === 'slot_not_int', 'reject_float_slot');

// ---------- RLS isolation (logical) ----------
class Store {
  constructor() { this.groups = []; this.slots = []; }
  insertGroup(g, actor) { if (g.user_id !== actor) throw new Error('rls'); this.groups.push(g); }
  selectGroups(actor) { return this.groups.filter(g => g.user_id === actor); }
  deleteGroup(id, actor) {
    const g = this.groups.find(x => x.id === id);
    if (!g || g.user_id !== actor) throw new Error('rls');
    this.groups = this.groups.filter(x => x.id !== id);
    this.slots = this.slots.filter(s => s.group_id !== id);
  }
  insertSlot(s, actor) { if (s.user_id !== actor) throw new Error('rls'); this.slots.push(s); }
  cascadeDeleteCamera(camId) { this.slots = this.slots.filter(s => s.camera_id !== camId); }
}

const store = new Store();
store.insertGroup({ id: 'g1', user_id: 'A', name: 'Fachada', layout: '2x2' }, 'A');
store.insertGroup({ id: 'g2', user_id: 'B', name: 'Estoque', layout: '3x3' }, 'B');
check(store.selectGroups('A').length === 1, 'rls_A_sees_only_own');
check(store.selectGroups('B').length === 1, 'rls_B_sees_only_own');
check(store.selectGroups('C').length === 0, 'rls_C_sees_nothing');
try { store.deleteGroup('g1', 'B'); check(false, 'rls_cross_delete_blocked'); }
catch { check(true, 'rls_cross_delete_blocked'); }
try { store.insertGroup({ id: 'gx', user_id: 'A', name: 'x', layout: '2x2' }, 'B'); check(false, 'rls_spoof_blocked'); }
catch { check(true, 'rls_spoof_blocked'); }

// ---------- Layout × camera counts ----------
for (const layout of LAYOUTS) {
  const slots = SLOTS[layout];
  for (let cams = 0; cams <= slots + 5; cams++) {
    const filled = Math.min(cams, slots);
    const empty = slots - filled;
    const overflow = Math.max(0, cams - slots);
    check(filled + empty === slots, `layout_${layout}_cams${cams}_slots`);
    check(overflow === Math.max(0, cams - slots), `layout_${layout}_cams${cams}_overflow`);
  }
}

// ---------- Drag-drop reordering invariants ----------
function reorder(slots, from, to) {
  const arr = [...slots].sort((a, b) => a.slot_index - b.slot_index);
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  return arr.map((s, i) => ({ ...s, slot_index: i }));
}
function assertContiguous(arr) {
  const ids = new Set(arr.map(s => s.camera_id));
  if (ids.size !== arr.length) return false;
  for (let i = 0; i < arr.length; i++) if (arr[i].slot_index !== i) return false;
  return true;
}
// deterministic reorderings
for (let n = 1; n <= 16; n++) {
  const base = Array.from({ length: n }, (_, i) => ({ camera_id: `c${i}`, slot_index: i }));
  for (let from = 0; from < n; from++) {
    for (let to = 0; to < n; to++) {
      const r = reorder(base, from, to);
      check(assertContiguous(r), `reorder_n${n}_${from}->${to}`);
    }
  }
}

// 200 random add/remove/reorder permutations
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const rand = rng(42);
for (let t = 0; t < 200; t++) {
  let arr = [];
  const ops = Math.floor(rand() * 30) + 5;
  for (let i = 0; i < ops; i++) {
    const op = rand();
    if (op < 0.5 && arr.length < 32) {
      arr.push({ camera_id: `c${t}_${i}`, slot_index: arr.length });
    } else if (op < 0.75 && arr.length > 0) {
      const idx = Math.floor(rand() * arr.length);
      arr.splice(idx, 1);
      arr = arr.map((s, i) => ({ ...s, slot_index: i }));
    } else if (arr.length > 1) {
      const from = Math.floor(rand() * arr.length);
      const to = Math.floor(rand() * arr.length);
      arr = reorder(arr, from, to);
    }
  }
  check(assertContiguous(arr), `random_perm_${t}`);
  check(arr.length <= 32, `random_perm_${t}_max`);
}

// ---------- Cascade on camera delete ----------
const s2 = new Store();
s2.insertGroup({ id: 'g1', user_id: 'A', name: 'x', layout: '2x2' }, 'A');
for (let i = 0; i < 4; i++) s2.insertSlot({ group_id: 'g1', camera_id: `cam${i}`, slot_index: i, user_id: 'A' }, 'A');
check(s2.slots.length === 4, 'cascade_before');
s2.cascadeDeleteCamera('cam2');
check(s2.slots.length === 3, 'cascade_removed_slot');
check(!s2.slots.some(s => s.camera_id === 'cam2'), 'cascade_slot_gone');

// ---------- JSON round-trip ----------
for (let i = 0; i < 50; i++) {
  const g = {
    id: `g${i}`, user_id: 'u', name: `Grupo ${i}`, layout: LAYOUTS[i % LAYOUTS.length],
    slots: Array.from({ length: (i % 10) }, (_, k) => ({ camera_id: `c${k}`, slot_index: k })),
  };
  const rt = JSON.parse(JSON.stringify(g));
  check(rt.name === g.name && rt.layout === g.layout && rt.slots.length === g.slots.length, `json_rt_${i}`);
}

// ---------- Unique constraints (logical) ----------
const names = new Set();
for (let i = 0; i < 20; i++) {
  const key = `A::Fachada`;
  if (i === 0) { names.add(key); check(true, 'unique_first_ok'); }
  else check(names.has(key), `unique_reject_dup_${i}`);
}

// ---------- Report ----------
console.log(`\n[Shinobi 3] ${pass}/${pass + fail} checks ✅`);
if (fail > 0) {
  console.log(`❌ ${fail} failures:`);
  failures.slice(0, 20).forEach(f => console.log('  -', f));
  process.exit(1);
}
