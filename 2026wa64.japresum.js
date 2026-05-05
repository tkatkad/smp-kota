// ================= DI DALAM serializeFormData() =================
function serializeFormData() {
  const data = {
    tahun: currentYear,
    jalur: jalurPrestasi ? 'prestasi' : 'reguler', // ✅ Tambah jalur
    akademik: {},
    rapor: {},
    prestasi: getValue('nilai_prestasi')
  };
  // ... sisa kode sama ...
}

// ================= DI DALAM deserializeFormData() =================
function deserializeFormData(code) {
  try {
    const json = fromUrlSafeBase64(code);
    const data = JSON.parse(json);
    
    // ✅ Load status jalur jika ada
    if (data.jalur === 'prestasi') {
      jalurPrestasi = true;
      const radio = document.querySelector('input[name="jalur"][value="prestasi"]');
      if (radio) radio.checked = true;
      toggleJalur(); // Update UI
    }
    
    return data;
  } catch (e) {
    console.error('Decode error:', e);
    return null;
  }
}
