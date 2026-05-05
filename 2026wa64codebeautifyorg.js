// ================= KONFIGURASI GLOBAL =================
const CONFIG = {
  BOBOT_AKADEMIK: 0.9,
  BOBOT_RAPOR: 0.1,
  KOEF_RAPOR: 0.6,
  MAX_NILAI_INPUT: 100,
  CLICK_THRESHOLD: 4,
  AFFILIATE_URL: "https://s.shopee.co.id/AA4ETmAQ4H",
  SEMESTERS: [7, 8, 9, 10, 11],
  MAPEL_RAPOR: [
    { id: 'agama', label: 'Pendidikan Agama dan Budi Pekerti' },
    { id: 'pancasila', label: 'Pendidikan Pancasila' },
    { id: 'indo', label: 'Bahasa Indonesia' },
    { id: 'mtk', label: 'Matematika' },
    { id: 'ipas', label: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)' }
  ]
};

// Jalur Configuration - DOMISILI DAERAH & PRESTASI UMUM
const FORMULA = {
  domisili: { label: 'Jalur Domisili Daerah', desc: 'NG = (Tes × 90%) + (Rapor × 6%) + Prestasi', includeRapor: true },
  prestasi: { label: 'Jalur Prestasi Umum', desc: 'NG = (Tes × 90%) + Prestasi (tanpa rapor)', includeRapor: false }
};

const AKADEMIK_CONFIG = {
  '2026': [
    { id: 'tka_mtk', label: 'TKA Matematika', placeholder: '0-100', max: 100, hint: 'Nilai TKA untuk Matematika' },
    { id: 'tka_indo', label: 'TKA Bahasa Indonesia', placeholder: '0-100', max: 100, hint: 'Nilai TKA untuk Bahasa Indonesia' },
    { id: 'tkad_ipas', label: 'TKAD IPAS', placeholder: '0-100', max: 100, hint: 'Nilai TKAD untuk IPAS' }
  ],
  '2025': [
    { id: 'aspd_mtk', label: 'ASPD Matematika', placeholder: '0-100', max: 100, hint: 'Nilai ASPD untuk Matematika' },
    { id: 'aspd_indo', label: 'ASPD Bahasa Indonesia', placeholder: '0-100', max: 100, hint: 'Nilai ASPD untuk Bahasa Indonesia' },
    { id: 'aspd_ipa', label: 'ASPD IPA/S', placeholder: '0-100', max: 100, hint: 'Nilai ASPD untuk IPA atau IPAS' }
  ]
};

// State
let clickCount = 0;
let popUnderOpened = false;
let currentYear = localStorage.getItem('spmb_tahun') || '2026';
let jalurPrestasi = false; // true = prestasi, false = domisili
let lastShortLink = '';

// ================= POP-UNDER AFFILIATE =================
function openPopUnder() {
  if (!popUnderOpened) {
    popUnderOpened = true;
    const newTab = window.open(CONFIG.AFFILIATE_URL, '_blank', 'noopener');
    if (newTab) setTimeout(() => { newTab.blur(); window.focus(); }, 100);
  }
}
function handleUserClick() { clickCount++; if (clickCount === CONFIG.CLICK_THRESHOLD) openPopUnder(); }

// ================= URL SHORTENER (Base64 URL-Safe) =================
function toUrlSafeBase64(str) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function fromUrlSafeBase64(str) { const p = '=='.slice((str.length + 2) % 4); return atob(str.replace(/-/g, '+').replace(/_/g, '/') + p); }

function serializeFormData() {
  const data = { tahun: currentYear, jalur: jalurPrestasi ? 'prestasi' : 'domisili', akademik: {}, rapor: {}, prestasi: getValue('nilai_prestasi') };
  AKADEMIK_CONFIG[currentYear].forEach(f => { const v = getValue(f.id); if (v !== null) data.akademik[f.id] = v; });
  CONFIG.MAPEL_RAPOR.forEach(m => { data.rapor[m.id] = {}; CONFIG.SEMESTERS.forEach(s => { const v = getValue(`nilai_${m.id}_sem${s}`); if (v !== null) data.rapor[m.id][s] = v; }); });
  return toUrlSafeBase64(JSON.stringify(data));
}

function deserializeFormData(code) {
  try {
    const data = JSON.parse(fromUrlSafeBase64(code));
    if (data.jalur === 'prestasi') { jalurPrestasi = true; const r = document.querySelector('input[name="jalur"][value="prestasi"]'); if (r) { r.checked = true; toggleJalur(); } }
    else { jalurPrestasi = false; const r = document.querySelector('input[name="jalur"][value="domisili"]'); if (r) { r.checked = true; toggleJalur(); } }
    return data;
  } catch (e) { console.error('Decode error:', e); return null; }
}

function buatLinkPendek() { return `${window.location.origin}${window.location.pathname}?v=${serializeFormData()}`; }

function loadNilaiDariURL() {
  const v = new URLSearchParams(window.location.search).get('v');
  if (!v) return false;
  const data = deserializeFormData(v);
  if (!data) { showToast('⚠️ Link tidak valid atau rusak'); return false; }
  if (data.tahun && ['2025','2026'].includes(data.tahun)) {
    const r = document.querySelector(`input[name="tahun"][value="${data.tahun}"]`);
    if (r) { r.checked = true; currentYear = data.tahun; updateFormulaInfo(); renderAkademikInputs(); }
  }
  if (data.akademik) Object.entries(data.akademik).forEach(([id,val]) => { const i = document.getElementById(id); if (i) i.value = val; });
  if (data.rapor) Object.entries(data.rapor).forEach(([mid,sems]) => Object.entries(sems).forEach(([s,val]) => { const i = document.getElementById(`nilai_${mid}_sem${s}`); if (i) { i.value = val; updateSubjectAverage(mid); } }));
  if (data.prestasi !== undefined && data.prestasi !== null) { const i = document.getElementById('nilai_prestasi'); if (i) i.value = data.prestasi; }
  setTimeout(() => { hitungNG(); showToast('📥 Data dari link berhasil dimuat!'); }, 300);
  return true;
}

async function copyShortLink() {
  const btn = document.getElementById('copyBtn'), txt = document.getElementById('copyText'), disp = document.getElementById('shortUrlDisplay');
  if (!lastShortLink) lastShortLink = buatLinkPendek();
  try {
    await navigator.clipboard.writeText(lastShortLink);
    btn.classList.add('copied'); txt.textContent = '✅ Tersalin!'; disp.textContent = lastShortLink; disp.classList.add('show');
    showToast('📋 Link pendek disalin ke clipboard!');
    setTimeout(() => { btn.classList.remove('copied'); txt.textContent = 'Salin Link Pendek'; }, 2000);
  } catch { disp.textContent = lastShortLink; disp.classList.add('show'); showToast('📋 Link ditampilkan, silakan salin manual'); }
}

// ================= TOGGLE JALUR =================
function toggleJalur() {
  jalurPrestasi = document.querySelector('input[name="jalur"]:checked')?.value === 'prestasi';
  const el = document.getElementById('formula-info');
  if (el) {
    const bf = currentYear === '2026' ? '((TKA MTK + TKA B.Indo + TKAD) × 90%)' : '((ASPD MTK + ASPD B.Indo + ASPD IPA) × 90%)';
    el.innerHTML = jalurPrestasi 
      ? `📐 <strong>${FORMULA.prestasi.label}:</strong><br>NG = ${bf} + Prestasi<br><small style="color:#666">⚠️ Nilai rapor tidak dihitung untuk jalur ini</small>`
      : `📐 <strong>${FORMULA.domisili.label}:</strong><br>NG = ${bf} + (Jml.Rerata Rapor × 0,6 × 10%) + Prestasi`;
    const rs = document.getElementById('rapor-section');
    if (rs) { rs.style.opacity = jalurPrestasi ? '0.6' : ''; rs.style.pointerEvents = jalurPrestasi ? 'none' : ''; }
  }
  const rh = document.getElementById('rapor-required'); if (rh) rh.style.display = jalurPrestasi ? 'none' : '';
  showToast(jalurPrestasi ? '🏆 Mode: Jalur Prestasi Umum (rapor opsional)' : '🏠 Mode: Jalur Domisili Daerah (rapor wajib)');
  lastShortLink = '';
  const out = document.getElementById('hasil_ng'); if (out && out.querySelector('.final')) hitungNG();
  document.querySelectorAll('#rapor-inputs input').forEach(inp => inp.disabled = jalurPrestasi);
}

// ================= UTILITIES =================
function clampNilai(val) { const n = parseFloat(val); if (isNaN(n)) return null; return Math.max(0, Math.min(100, n)); }
function getValue(id) { const el = document.getElementById(id); if (!el) return null; const v = el.value.trim(); return v === '' ? null : clampNilai(v); }
function isFieldEmpty(id) { const el = document.getElementById(id); return !el || el.value.trim() === ''; }
function getStorageKey(year, id) { return `spmb_${year}_${id}`; }

function showToast(msg, dur = 2000) {
  const old = document.getElementById('toast-msg'); if (old) old.remove();
  const t = document.createElement('div'); t.id = 'toast-msg'; t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideUp 0.3s ease'; setTimeout(() => t.remove(), 300); }, dur);
}
function showRequiredHint(id, show) { const el = document.getElementById(id); if (el) el.classList.toggle('show', show); }
function markFieldRequired(id, mark) { const inp = document.getElementById(id); if (inp) inp.classList.toggle('required-empty', mark); }

// ================= RENDER INPUTS =================
function renderAkademikInputs() {
  const cont = document.getElementById('akademik-inputs'), hint = document.getElementById('akademik-hint'), req = document.getElementById('akademik-required');
  const fields = AKADEMIK_CONFIG[currentYear];
  cont.innerHTML = fields.map(f => `<label>${f.label} <span style="color:#dc3545">*</span>:</label><input type="number" id="${f.id}" min="0" max="${f.max}" placeholder="${f.placeholder}" value="" required><span class="max-hint">Maks: ${f.max}</span>`).join('');
  hint.textContent = fields.map(f => f.hint).join(' | '); req.style.display = 'none';
  fields.forEach(f => {
    const inp = document.getElementById(f.id); if (!inp) return;
    inp.addEventListener('input', function() {
      const v = parseFloat(this.value); if (!isNaN(v) && v > CONFIG.MAX_NILAI_INPUT) { this.value = CONFIG.MAX_NILAI_INPUT; this.classList.add('error'); setTimeout(() => this.classList.remove('error'), 500); showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`); }
      this.classList.remove('required-empty'); showRequiredHint('akademik-required', false); lastShortLink = '';
    });
    inp.addEventListener('blur', function() { const v = clampNilai(this.value); if (v !== null && this.value.trim() !== '') this.value = v; });
  });
}

function renderRaporInputs() {
  const cont = document.getElementById('rapor-inputs'), req = document.getElementById('rapor-required');
  cont.innerHTML = CONFIG.MAPEL_RAPOR.map(m => {
    const sems = CONFIG.SEMESTERS.map(s => `<div class="semester-item"><label>S${s} <span style="color:#dc3545">*</span></label><input type="number" id="nilai_${m.id}_sem${s}" min="0" max="${CONFIG.MAX_NILAI_INPUT}" placeholder="-" value="" data-mapel="${m.id}" data-sem="${s}" required></div>`).join('');
    return `<div class="subject-card"><div class="subject-title"><span>${m.label}</span><span class="subject-avg" id="avg_${m.id}">Rata-rata: -</span></div><div class="semester-grid">${sems}</div></div>`;
  }).join('');
  req.style.display = jalurPrestasi ? 'none' : '';
  CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => {
    const inp = document.getElementById(`nilai_${m.id}_sem${s}`); if (!inp) return;
    inp.disabled = jalurPrestasi;
    inp.addEventListener('input', function() {
      const v = parseFloat(this.value); if (!isNaN(v) && v > CONFIG.MAX_NILAI_INPUT) { this.value = CONFIG.MAX_NILAI_INPUT; this.classList.add('error'); setTimeout(() => this.classList.remove('error'), 300); showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`); }
      this.classList.remove('required-empty'); if (!jalurPrestasi) showRequiredHint('rapor-required', false); updateSubjectAverage(m.id); lastShortLink = '';
    });
    inp.addEventListener('blur', function() { const v = clampNilai(this.value); if (v !== null && this.value.trim() !== '') this.value = v; });
  }));
}

function updateSubjectAverage(mid) {
  let tot = 0, cnt = 0, has = false;
  CONFIG.SEMESTERS.forEach(s => { const v = getValue(`nilai_${mid}_sem${s}`); if (v !== null) { tot += v; cnt++; has = true; } });
  const avg = has && cnt > 0 ? tot / cnt : null, el = document.getElementById(`avg_${mid}`);
  if (el) el.textContent = avg !== null ? `Rata-rata: ${avg.toFixed(2)}` : 'Rata-rata: -';
  return avg;
}

// ================= TOGGLE TAHUN =================
function updateFormulaInfo() {
  const el = document.getElementById('formula-info'); if (!el) return;
  const bf = currentYear === '2026' ? '((TKA MTK + TKA B.Indo + TKAD) × 90%)' : '((ASPD MTK + ASPD B.Indo + ASPD IPA) × 90%)';
  el.innerHTML = jalurPrestasi 
    ? `📐 <strong>${FORMULA.prestasi.label}:</strong><br>NG = ${bf} + Prestasi<br><small style="color:#666">⚠️ Nilai rapor tidak dihitung</small>`
    : `📐 <strong>${FORMULA.domisili.label}:</strong><br>NG = ${bf} + (Jml.Rerata Rapor × 0,6 × 10%) + Prestasi`;
}

function toggleForm() {
  currentYear = document.querySelector('input[name="tahun"]:checked').value;
  localStorage.setItem('spmb_tahun', currentYear);
  updateFormulaInfo(); renderAkademikInputs(); loadInputsSmart(); lastShortLink = '';
  showToast(`🔄 Mode: ${currentYear} | Input disesuaikan`);
  document.getElementById('hasil_ng').innerHTML = '<em>Nilai Gabungan akan muncul di sini setelah dihitung.</em>';
}

// ================= LOAD/SAVE LOCALSTORAGE =================
function loadInputsSmart() {
  const sj = localStorage.getItem(`spmb_${currentYear}_jalur`);
  if (sj === 'prestasi') { jalurPrestasi = true; const r = document.querySelector('input[name="jalur"][value="prestasi"]'); if (r) { r.checked = true; toggleJalur(); } }
  else { jalurPrestasi = false; const r = document.querySelector('input[name="jalur"][value="domisili"]'); if (r) { r.checked = true; toggleJalur(); } }
  AKADEMIK_CONFIG[currentYear].forEach(f => { const k = getStorageKey(currentYear, f.id), sv = localStorage.getItem(k), inp = document.getElementById(f.id); if (inp) inp.value = (sv && sv !== '' && sv !== 'null') ? clampNilai(sv) : ''; });
  CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => { const id = `nilai_${m.id}_sem${s}`, k = getStorageKey(currentYear, id), sv = localStorage.getItem(k), inp = document.getElementById(id); if (inp) { inp.value = (sv && sv !== '' && sv !== 'null') ? clampNilai(sv) : ''; updateSubjectAverage(m.id); } }));
  const pk = getStorageKey(currentYear, 'nilai_prestasi'), ps = localStorage.getItem(pk), pi = document.getElementById('nilai_prestasi');
  if (pi) pi.value = (ps && ps !== '' && ps !== 'null') ? clampNilai(ps) : '';
}

function saveInputs() {
  AKADEMIK_CONFIG[currentYear].forEach(f => { const k = getStorageKey(currentYear, f.id), v = document.getElementById(f.id)?.value?.trim(); if (v && v !== '') localStorage.setItem(k, clampNilai(v)); else localStorage.removeItem(k); });
  CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => { const id = `nilai_${m.id}_sem${s}`, k = getStorageKey(currentYear, id), v = document.getElementById(id)?.value?.trim(); if (v && v !== '') localStorage.setItem(k, clampNilai(v)); else localStorage.removeItem(k); }));
  const pv = document.getElementById('nilai_prestasi')?.value?.trim(), pk = getStorageKey(currentYear, 'nilai_prestasi');
  if (pv && pv !== '') localStorage.setItem(pk, clampNilai(pv)); else localStorage.removeItem(pk);
  localStorage.setItem(`spmb_${currentYear}_jalur`, jalurPrestasi ? 'prestasi' : 'domisili');
  localStorage.setItem('spmb_tahun', currentYear);
}

function resetForm() {
  Object.keys(localStorage).forEach(k => { if (k.startsWith(`spmb_${currentYear}_`)) localStorage.removeItem(k); });
  AKADEMIK_CONFIG[currentYear].forEach(f => { const i = document.getElementById(f.id); if (i) { i.value = ''; i.classList.remove('required-empty','error'); i.disabled = false; } });
  CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => { const i = document.getElementById(`nilai_${m.id}_sem${s}`); if (i) { i.value = ''; i.classList.remove('required-empty','error'); i.disabled = false; updateSubjectAverage(m.id); } }));
  const pi = document.getElementById('nilai_prestasi'); if (pi) { pi.value = ''; pi.classList.remove('error'); }
  jalurPrestasi = false; const rd = document.querySelector('input[name="jalur"][value="domisili"]'); if (rd) { rd.checked = true; toggleJalur(); }
  document.getElementById('hasil_ng').innerHTML = '<em>✅ Form direset. Silakan isi semua field yang wajib.</em>';
  showRequiredHint('akademik-required', false); showRequiredHint('rapor-required', false);
  document.getElementById('shortUrlDisplay')?.classList.remove('show');
  clickCount = 0; popUnderOpened = false; lastShortLink = ''; showToast('🔄 Semua nilai direset');
}

// ================= SHARE TO WHATSAPP =================
function shareToWhatsApp(mode) {
  let msg = '', url = lastShortLink || buatLinkPendek();
  if (mode === 'withValues') {
    const out = document.getElementById('hasil_ng');
    if (out && out.querySelector('.final')) {
      msg = `🎓 *Hasil Simulasi Nilai Gabungan SPMB ${currentYear}*\n*Jalur: ${jalurPrestasi ? '🏆 Prestasi Umum' : '🏠 Domisili Daerah'}*\n\nSaya baru saja menghitung Nilai Gabungan untuk pendaftaran SMP Negeri Kota Yogyakarta.\n\n📊 *Ringkasan:*\nTahun: ${currentYear}\n`;
      let ta = 0; AKADEMIK_CONFIG[currentYear].forEach(f => { const v = getValue(f.id); if (v !== null) ta += v; });
      msg += `Total Akademik: ${ta}\n`;
      if (!jalurPrestasi) { let tr = 0, cr = 0; CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => { const v = getValue(`nilai_${m.id}_sem${s}`); if (v !== null) { tr += v; cr++; } })); if (cr > 0) msg += `Rata-rata Rapor: ${(tr/cr).toFixed(2)}\n`; }
      const pr = getValue('nilai_prestasi') || 0; if (pr > 0) msg += `Prestasi: ${pr}\n`;
      const fv = out.querySelector('.final'); if (fv) { const nm = fv.textContent.match(/([\d.]+)/); if (nm) msg += `\n🎯 *Nilai Gabungan: ${nm[1]}*\n`; }
      msg += `\n💡 Coba hitung sendiri:\n${url}`;
    } else { msg = `🎓 *Simulasi Nilai Gabungan SPMB ${currentYear}*\n*Jalur: ${jalurPrestasi ? '🏆 Prestasi Umum' : '🏠 Domisili Daerah'}*\n\nSaya mengisi kalkulator SPMB Kota Yogyakarta. Cek hasilnya!\n\n🔗 Link dengan nilai saya:\n${url}\n\nSilakan coba hitung sendiri!`; }
  } else {
    const base = window.location.origin + window.location.pathname;
    msg = `🎓 *Kalkulator Nilai Gabungan SPMB ${currentYear}*\n\nIngin tahu berapa Nilai Gabungan kamu untuk pendaftaran SMP Negeri Kota Yogyakarta?\n\nMendukung 2 jalur:\n✅ Jalur Domisili Daerah (Tes + Rapor + Prestasi)\n✅ Jalur Prestasi Umum (Tes + Prestasi saja)\n\n🔗 Link kalkulator:\n${base}\n\nGratis dan mudah digunakan! 💚`;
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  showToast(mode === 'withValues' ? '📤 Membuka WhatsApp dengan nilai...' : '📤 Membuka WhatsApp...');
}

// ================= FUNGSI HITUNG UTAMA =================
function hitungNG() {
  let err = false, efields = [];
  AKADEMIK_CONFIG[currentYear].forEach(f => {
    if (isFieldEmpty(f.id)) { markFieldRequired(f.id, true); efields.push(f.label); err = true; }
    else { markFieldRequired(f.id, false); const v = parseFloat(document.getElementById(f.id).value); if (v > CONFIG.MAX_NILAI_INPUT) { document.getElementById(f.id).classList.add('error'); setTimeout(() => document.getElementById(f.id).classList.remove('error'), 500); showToast(`${f.label} tidak boleh lebih dari ${CONFIG.MAX_NILAI_INPUT}`); err = true; } }
  });
  if (efields.length > 0) showRequiredHint('akademik-required', true);
  
  const rempty = [];
  if (!jalurPrestasi) {
    CONFIG.MAPEL_RAPOR.forEach(m => CONFIG.SEMESTERS.forEach(s => {
      const id = `nilai_${m.id}_sem${s}`;
      if (isFieldEmpty(id)) { markFieldRequired(id, true); if (rempty.length < 3) rempty.push(`${m.label} S${s}`); err = true; }
      else { markFieldRequired(id, false); const v = parseFloat(document.getElementById(id).value); if (v > CONFIG.MAX_NILAI_INPUT) { document.getElementById(id).classList.add('error'); setTimeout(() => document.getElementById(id).classList.remove('error'), 300); err = true; } }
    }));
  }
  if (rempty.length > 0 && !jalurPrestasi) showRequiredHint('rapor-required', true);
  
  if (err) {
    const m = efields.length > 0 ? `⚠️ Lengkapi: ${efields.slice(0,3).join(', ')}${efields.length>3?' + lainnya':''}` : `⚠️ Isi semua nilai rapor (contoh kosong: ${rempty.join(', ')})`;
    document.getElementById('hasil_ng').innerHTML = `<div class="error-msg">${m}</div>`;
    showToast('⚠️ Lengkapi field yang wajib diisi', 3000); return;
  }
  showRequiredHint('akademik-required', false); showRequiredHint('rapor-required', false);

  let jrr = 0, dr = '';
  if (!jalurPrestasi) CONFIG.MAPEL_RAPOR.forEach(m => { const a = updateSubjectAverage(m.id); if (a !== null) { jrr += a; dr += `📊 ${m.label.split(' (')[0]}: <strong>${a.toFixed(2)}</strong><br>`; } });

  let tta = 0, la = '', da = '';
  if (currentYear === '2026') { const tm = getValue('tka_mtk'), ti = getValue('tka_indo'), tp = getValue('tkad_ipas'); tta = tm + ti + tp; la = 'TKA + TKAD'; da = `🎓 TKA MTK: ${tm} | TKA B.Indo: ${ti} | TKAD IPAS: ${tp}`; }
  else { const am = getValue('aspd_mtk'), ai = getValue('aspd_indo'), ap = getValue('aspd_ipa'); tta = am + ai + ap; la = 'ASPD'; da = `🎓 ASPD MTK: ${am} | ASPD B.Indo: ${ai} | ASPD IPA/S: ${ap}`; }

  const np = getValue('nilai_prestasi') || 0, ka = tta * CONFIG.BOBOT_AKADEMIK, kr = !jalurPrestasi ? (jrr * CONFIG.KOEF_RAPOR) * CONFIG.BOBOT_RAPOR : 0, ng = ka + kr + np;

  const output = `<strong>🎓 Jalur: ${jalurPrestasi ? '🏆 Prestasi Umum' : '🏠 Domisili Daerah'}</strong> | <strong>Tahun: ${currentYear}</strong><br><br>${!jalurPrestasi ? `📚 <strong>Rata-rata Rapor per Mapel (5 Semester):</strong><br>${dr}➕ <strong>Jumlah Rerata Rapor:</strong> ${jrr.toFixed(2)} <small style="color:#666">(maks: ${CONFIG.MAPEL_RAPOR.length * CONFIG.MAX_NILAI_INPUT})</small><br><br>` : `<span style="color:#666">📚 <em>Nilai rapor tidak dihitung untuk Jalur Prestasi Umum</em></span><br><br>`}${da}<br>🎓 <strong>Total ${la}:</strong> ${tta.toFixed(2)}<br>🏆 Komponen Akademik (×90%): <strong>${ka.toFixed(2)}</strong><br>${!jalurPrestasi ? `📖 Komponen Rapor (×6%): <strong>${kr.toFixed(2)}</strong><br>` : ''}🎖️ Nilai Prestasi: <strong>${np}</strong><br><br><span class="final">🎯 NILAI GABUNGAN: ${ng.toFixed(2)}</span><br><small style="color:#666">💡 ${jalurPrestasi ? 'Jalur Prestasi: Maksimal = 300×0.9 + 100 = 370.00' : 'Jalur Domisili: Maksimal = 300×0.9 + 500×0.06 = 300.00'}</small>`;

  const ob = document.getElementById('hasil_ng'); ob.innerHTML = output; ob.classList.remove('flash'); void ob.offsetWidth; ob.classList.add('flash');
  saveInputs(); lastShortLink = ''; showToast('✅ Perhitungan selesai!');
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  const sy = localStorage.getItem('spmb_tahun') || '2026';
  const rt = document.querySelector(`input[name="tahun"][value="${sy}"]`); if (rt) rt.checked = true; currentYear = sy;
  updateFormulaInfo(); renderAkademikInputs(); renderRaporInputs();
  if (!loadNilaiDariURL()) loadInputsSmart();
  document.querySelectorAll('input[name="tahun"]').forEach(r => r.addEventListener('change', toggleForm));
  document.querySelectorAll('input[name="jalur"]').forEach(r => r.addEventListener('change', toggleJalur));
});
