  
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
    let lastShortLink = ''; // Cache link pendek terakhir

    // ================= POP-UNDER AFFILIATE =================
    function openPopUnder() {
      if (!popUnderOpened) {
        popUnderOpened = true;
        const newTab = window.open(CONFIG.AFFILIATE_URL, '_blank', 'noopener');
        if (newTab) {
          setTimeout(() => { newTab.blur(); window.focus(); }, 100);
        }
      }
    }

    function handleUserClick() {
      clickCount++;
      if (clickCount === CONFIG.CLICK_THRESHOLD) openPopUnder();
    }

    // ================= URL SHORTENER (Base64 URL-Safe) =================
    
    // Encode ke Base64 URL-Safe: ganti + → -, / → _, hapus =
    function toUrlSafeBase64(str) {
      return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
    
    // Decode dari Base64 URL-Safe
    function fromUrlSafeBase64(str) {
      // Tambahkan padding jika perlu
      const padding = '=='.slice((str.length + 2) % 4);
      return atob(str.replace(/-/g, '+').replace(/_/g, '/') + padding);
    }
    
    // Serialisasi data form menjadi string pendek
    function serializeFormData() {
      const data = {
        tahun: currentYear,
        akademik: {},
        rapor: {},
        prestasi: getValue('nilai_prestasi')
      };
      
      // Simpan nilai akademik
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const val = getValue(f.id);
        if (val !== null) data.akademik[f.id] = val;
      });
      
      // Simpan nilai rapor
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        data.rapor[mapel.id] = {};
        CONFIG.SEMESTERS.forEach(sem => {
          const val = getValue(`nilai_${mapel.id}_sem${sem}`);
          if (val !== null) data.rapor[mapel.id][sem] = val;
        });
      });
      
      // Convert ke JSON → Base64 URL-Safe
      const json = JSON.stringify(data);
      return toUrlSafeBase64(json);
    }
    
    // Deserialisasi data dari string pendek
    function deserializeFormData(code) {
      try {
        const json = fromUrlSafeBase64(code);
        const data = JSON.parse(json);
        return data;
      } catch (e) {
        console.error('Decode error:', e);
        return null;
      }
    }
    
    // Buat link pendek
    function buatLinkPendek() {
      const shortCode = serializeFormData();
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}?v=${shortCode}`;
    }
    
    // Load data dari URL parameter ?v=
    function loadNilaiDariURL() {
      const urlParams = new URLSearchParams(window.location.search);
      const v = urlParams.get('v');
      
      if (!v) return false;
      
      const data = deserializeFormData(v);
      if (!data) {
        showToast('⚠️ Link tidak valid atau rusak');
        return false;
      }
      
      // Set tahun
      if (data.tahun && (data.tahun === '2025' || data.tahun === '2026')) {
        const radio = document.querySelector(`input[name="tahun"][value="${data.tahun}"]`);
        if (radio) {
          radio.checked = true;
          currentYear = data.tahun;
          updateFormulaInfo();
          renderAkademikInputs();
        }
      }
      
      // Load akademik
      if (data.akademik) {
        Object.entries(data.akademik).forEach(([id, val]) => {
          const input = document.getElementById(id);
          if (input) input.value = val;
        });
      }
      
      // Load rapor
      if (data.rapor) {
        Object.entries(data.rapor).forEach(([mapelId, semesters]) => {
          Object.entries(semesters).forEach(([sem, val]) => {
            const input = document.getElementById(`nilai_${mapelId}_sem${sem}`);
            if (input) {
              input.value = val;
              updateSubjectAverage(mapelId);
            }
          });
        });
      }
      
      // Load prestasi
      if (data.prestasi !== undefined && data.prestasi !== null) {
        const prestInput = document.getElementById('nilai_prestasi');
        if (prestInput) prestInput.value = data.prestasi;
      }
      
      // Auto calculate
      setTimeout(() => {
        hitungNG();
        showToast('📥 Data dari link berhasil dimuat!');
      }, 300);
      
      return true;
    }
    
    // Copy link pendek ke clipboard
    async function copyShortLink() {
      const btn = document.getElementById('copyBtn');
      const textEl = document.getElementById('copyText');
      const displayEl = document.getElementById('shortUrlDisplay');
      
      // Generate link jika belum ada
      if (!lastShortLink) {
        lastShortLink = buatLinkPendek();
      }
      
      try {
        await navigator.clipboard.writeText(lastShortLink);
        
        // Feedback visual
        btn.classList.add('copied');
        textEl.textContent = '✅ Tersalin!';
        displayEl.textContent = lastShortLink;
        displayEl.classList.add('show');
        
        showToast('📋 Link pendek disalin ke clipboard!');
        
        // Reset setelah 2 detik
        setTimeout(() => {
          btn.classList.remove('copied');
          textEl.textContent = 'Salin Link Pendek';
        }, 2000);
      } catch (err) {
        // Fallback untuk browser lama
        displayEl.textContent = lastShortLink;
        displayEl.classList.add('show');
        showToast('📋 Link ditampilkan, silakan salin manual');
      }
    }

    // ================= UTILITIES =================
    function clampNilai(val) {
      const num = parseFloat(val);
      if (isNaN(num)) return null;
      if (num > CONFIG.MAX_NILAI_INPUT) return CONFIG.MAX_NILAI_INPUT;
      if (num < 0) return 0;
      return num;
    }

    function getValue(id) {
      const el = document.getElementById(id);
      if (!el) return null;
      const val = el.value.trim();
      if (val === '') return null;
      return clampNilai(val);
    }

    function isFieldEmpty(id) {
      const el = document.getElementById(id);
      return !el || el.value.trim() === '';
    }

    function getStorageKey(year, id) {
      return `spmb_${year}_${id}`;
    }

    function showToast(message, duration = 2000) {
      const old = document.getElementById('toast-msg');
      if (old) old.remove();
      
      const toast = document.createElement('div');
      toast.id = 'toast-msg';
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    function showRequiredHint(elementId, show) {
      const el = document.getElementById(elementId);
      if (el) el.classList.toggle('show', show);
    }

    function markFieldRequired(inputId, mark) {
      const input = document.getElementById(inputId);
      if (input) input.classList.toggle('required-empty', mark);
    }

    // ================= RENDER INPUTS =================
    function renderAkademikInputs() {
      const container = document.getElementById('akademik-inputs');
      const hintEl = document.getElementById('akademik-hint');
      const requiredEl = document.getElementById('akademik-required');
      const fields = AKADEMIK_CONFIG[currentYear];
      
      container.innerHTML = fields.map(f => `
        <label>${f.label} <span style="color:#dc3545">*</span>:</label>
        <input type="number" id="${f.id}" min="0" max="${f.max}" 
               placeholder="${f.placeholder}" value="" required>
        <span class="max-hint">Maks: ${f.max}</span>
      `).join('');
      
      hintEl.textContent = fields.map(f => f.hint).join(' | ');
      requiredEl.style.display = 'none';
      
      fields.forEach(f => {
        const input = document.getElementById(f.id);
        if (input) {
          input.addEventListener('input', function() {
            const val = parseFloat(this.value);
            if (!isNaN(val) && val > CONFIG.MAX_NILAI_INPUT) {
              this.value = CONFIG.MAX_NILAI_INPUT;
              this.classList.add('error');
              setTimeout(() => this.classList.remove('error'), 500);
              showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`);
            }
            this.classList.remove('required-empty');
            showRequiredHint('akademik-required', false);
            lastShortLink = ''; // Reset cached link
          });
          input.addEventListener('blur', function() {
            const val = clampNilai(this.value);
            if (val !== null && this.value.trim() !== '') {
              this.value = val;
            }
          });
        }
      });
    }

    function renderRaporInputs() {
      const container = document.getElementById('rapor-inputs');
      const requiredEl = document.getElementById('rapor-required');
      
      container.innerHTML = CONFIG.MAPEL_RAPOR.map(mapel => {
        const semInputs = CONFIG.SEMESTERS.map(sem => `
          <div class="semester-item">
            <label>S${sem} <span style="color:#dc3545">*</span></label>
            <input type="number" 
                   id="nilai_${mapel.id}_sem${sem}" 
                   min="0" 
                   max="${CONFIG.MAX_NILAI_INPUT}" 
                   placeholder="-"
                   value=""
                   data-mapel="${mapel.id}"
                   data-sem="${sem}"
                   required>
          </div>
        `).join('');
        
        return `
          <div class="subject-card">
            <div class="subject-title">
              <span>${mapel.label}</span>
              <span class="subject-avg" id="avg_${mapel.id}">Rata-rata: -</span>
            </div>
            <div class="semester-grid">
              ${semInputs}
            </div>
          </div>
        `;
      }).join('');
      
      requiredEl.style.display = 'none';
      
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const input = document.getElementById(`nilai_${mapel.id}_sem${sem}`);
          if (input) {
            input.addEventListener('input', function() {
              const val = parseFloat(this.value);
              if (!isNaN(val) && val > CONFIG.MAX_NILAI_INPUT) {
                this.value = CONFIG.MAX_NILAI_INPUT;
                this.classList.add('error');
                setTimeout(() => this.classList.remove('error'), 300);
                showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`);
              }
              this.classList.remove('required-empty');
              showRequiredHint('rapor-required', false);
              updateSubjectAverage(mapel.id);
              lastShortLink = ''; // Reset cached link
            });
            input.addEventListener('blur', function() {
              const val = clampNilai(this.value);
              if (val !== null && this.value.trim() !== '') {
                this.value = val;
              }
            });
          }
        });
      });
    }

    function updateSubjectAverage(mapelId) {
      let total = 0, count = 0, hasValue = false;
      CONFIG.SEMESTERS.forEach(sem => {
        const val = getValue(`nilai_${mapelId}_sem${sem}`);
        if (val !== null) { total += val; count++; hasValue = true; }
      });
      const avg = hasValue && count > 0 ? (total / count) : null;
      const avgEl = document.getElementById(`avg_${mapelId}`);
      if (avgEl) {
        avgEl.textContent = avg !== null ? `Rata-rata: ${avg.toFixed(2)}` : 'Rata-rata: -';
      }
      return avg;
    }

    // ================= TOGGLE TAHUN =================
    function updateFormulaInfo() {
      const el = document.getElementById('formula-info');
      if (!el) return;
      if (currentYear === '2026') {
        el.innerHTML = `📐 <strong>Rumus 2026:</strong><br>NG = ((TKA MTK + TKA B.Indo + TKAD) × 90%) + (Jml.Rerata Rapor × 0,6 × 10%) + Prestasi`;
      } else {
        el.innerHTML = `📐 <strong>Rumus 2025:</strong><br>NG = ((ASPD MTK + ASPD B.Indo + ASPD IPA) × 90%) + (Jml.Rerata Rapor × 0,6 × 10%) + Prestasi`;
      }
    }

    function toggleForm() {
      currentYear = document.querySelector('input[name="tahun"]:checked').value;
      localStorage.setItem('spmb_tahun', currentYear);
      updateFormulaInfo();
      renderAkademikInputs();
      loadInputsSmart();
      lastShortLink = ''; // Reset link cache
      showToast(`🔄 Mode: ${currentYear} | Input disesuaikan`);
      document.getElementById('hasil_ng').innerHTML = '<em>Nilai Gabungan akan muncul di sini setelah dihitung.</em>';
    }

    // ================= LOAD/SAVE LOCALSTORAGE =================
    function loadInputsSmart() {
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const key = getStorageKey(currentYear, f.id);
        const saved = localStorage.getItem(key);
        const input = document.getElementById(f.id);
        if (input) {
          input.value = (saved !== null && saved !== '' && saved !== 'null') ? clampNilai(saved) : '';
        }
      });
      
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          const key = getStorageKey(currentYear, id);
          const saved = localStorage.getItem(key);
          const input = document.getElementById(id);
          if (input) {
            input.value = (saved !== null && saved !== '' && saved !== 'null') ? clampNilai(saved) : '';
            updateSubjectAverage(mapel.id);
          }
        });
      });
      
      const prestKey = getStorageKey(currentYear, 'nilai_prestasi');
      const prestSaved = localStorage.getItem(prestKey);
      const prestInput = document.getElementById('nilai_prestasi');
      if (prestInput) {
        prestInput.value = (prestSaved !== null && prestSaved !== '' && prestSaved !== 'null') ? clampNilai(prestSaved) : '';
      }
    }

    function saveInputs() {
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const key = getStorageKey(currentYear, f.id);
        const val = document.getElementById(f.id)?.value?.trim();
        if (val && val !== '') localStorage.setItem(key, clampNilai(val));
        else localStorage.removeItem(key);
      });
      
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          const key = getStorageKey(currentYear, id);
          const val = document.getElementById(id)?.value?.trim();
          if (val && val !== '') localStorage.setItem(key, clampNilai(val));
          else localStorage.removeItem(key);
        });
      });
      
      const prestVal = document.getElementById('nilai_prestasi')?.value?.trim();
      const prestKey = getStorageKey(currentYear, 'nilai_prestasi');
      if (prestVal && prestVal !== '') localStorage.setItem(prestKey, clampNilai(prestVal));
      else localStorage.removeItem(prestKey);
      
      localStorage.setItem('spmb_tahun', currentYear);
    }

    function resetForm() {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`spmb_${currentYear}_`)) localStorage.removeItem(key);
      });
      
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const input = document.getElementById(f.id);
        if (input) { input.value = ''; input.classList.remove('required-empty', 'error'); }
      });
      
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const input = document.getElementById(`nilai_${mapel.id}_sem${sem}`);
          if (input) { input.value = ''; input.classList.remove('required-empty', 'error'); updateSubjectAverage(mapel.id); }
        });
      });
      
      const prestInput = document.getElementById('nilai_prestasi');
      if (prestInput) { prestInput.value = ''; prestInput.classList.remove('error'); }
      
      document.getElementById('hasil_ng').innerHTML = '<em>✅ Form direset. Silakan isi semua field yang wajib.</em>';
      showRequiredHint('akademik-required', false);
      showRequiredHint('rapor-required', false);
      document.getElementById('shortUrlDisplay').classList.remove('show');
      
      clickCount = 0;
      popUnderOpened = false;
      lastShortLink = '';
      showToast('🔄 Semua nilai direset');
    }

    // ================= SHARE TO WHATSAPP =================
    function shareToWhatsApp(mode) {
      let message = '';
      let shareUrl = lastShortLink || buatLinkPendek();
      
      if (mode === 'withValues') {
        const outputEl = document.getElementById('hasil_ng');
        if (outputEl && outputEl.querySelector('.final')) {
          message = `🎓 *Hasil Simulasi Nilai Gabungan SPMB ${currentYear}*\n\n`;
          message += `Saya baru saja menghitung Nilai Gabungan untuk pendaftaran SMP Negeri Kota Yogyakarta.\n\n`;
          
          const akademikFields = AKADEMIK_CONFIG[currentYear];
          let totalAkademik = 0;
          akademikFields.forEach(f => { const val = getValue(f.id); if (val !== null) totalAkademik += val; });
          
          message += `📊 *Ringkasan:*\nTahun: ${currentYear}\nTotal Akademik: ${totalAkademik}\n`;
          
          let totalRapor = 0, countRapor = 0;
          CONFIG.MAPEL_RAPOR.forEach(mapel => {
            CONFIG.SEMESTERS.forEach(sem => {
              const val = getValue(`nilai_${mapel.id}_sem${sem}`);
              if (val !== null) { totalRapor += val; countRapor++; }
            });
          });
          if (countRapor > 0) message += `Rata-rata Rapor: ${(totalRapor/countRapor).toFixed(2)}\n`;
          
          const prestasi = getValue('nilai_prestasi') || 0;
          if (prestasi > 0) message += `Prestasi: ${prestasi}\n`;
          
          const finalValue = outputEl.querySelector('.final');
          if (finalValue) {
            const ngMatch = finalValue.textContent.match(/([\d.]+)/);
            if (ngMatch) message += `\n🎯 *Nilai Gabungan: ${ngMatch[1]}*\n`;
          }
          
          message += `\n💡 Coba hitung sendiri:\n${shareUrl}`;
        } else {
          message = `🎓 *Simulasi Nilai Gabungan SPMB ${currentYear}*\n\n`;
          message += `Saya mengisi kalkulator SPMB Kota Yogyakarta. Cek hasilnya!\n\n`;
          message += `🔗 Link dengan nilai saya:\n${shareUrl}\n\nSilakan coba hitung sendiri!`;
        }
      } else {
        const baseUrl = window.location.origin + window.location.pathname;
        message = `🎓 *Kalkulator Nilai Gabungan SPMB ${currentYear}*\n\n`;
        message += `Ingin tahu berapa Nilai Gabungan kamu untuk pendaftaran SMP Negeri Kota Yogyakarta?\n\n`;
        message += `Gunakan kalkulator ini untuk menghitung:\n✅ Nilai Tes Akademik (ASPD/TKA+TKAD)\n✅ Nilai Rapor 5 Semester\n✅ Nilai Prestasi\n\n`;
        message += `🔗 Link kalkulator:\n${baseUrl}\n\nGratis dan mudah digunakan! 💚`;
      }
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      showToast(mode === 'withValues' ? '📤 Membuka WhatsApp dengan nilai...' : '📤 Membuka WhatsApp...');
    }

    // ================= FUNGSI HITUNG UTAMA =================
    function hitungNG() {
      let hasError = false, errorFields = [];
      
      const akademikFields = AKADEMIK_CONFIG[currentYear];
      akademikFields.forEach(f => {
        if (isFieldEmpty(f.id)) { markFieldRequired(f.id, true); errorFields.push(f.label); hasError = true; }
        else {
          markFieldRequired(f.id, false);
          const val = parseFloat(document.getElementById(f.id).value);
          if (val > CONFIG.MAX_NILAI_INPUT) {
            document.getElementById(f.id).classList.add('error');
            setTimeout(() => document.getElementById(f.id).classList.remove('error'), 500);
            showToast(`${f.label} tidak boleh lebih dari ${CONFIG.MAX_NILAI_INPUT}`);
            hasError = true;
          }
        }
      });
      if (errorFields.length > 0) showRequiredHint('akademik-required', true);
      
      const raporEmpty = [];
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          if (isFieldEmpty(id)) {
            markFieldRequired(id, true);
            if (raporEmpty.length < 3) raporEmpty.push(`${mapel.label} S${sem}`);
            hasError = true;
          } else {
            markFieldRequired(id, false);
            const val = parseFloat(document.getElementById(id).value);
            if (val > CONFIG.MAX_NILAI_INPUT) {
              document.getElementById(id).classList.add('error');
              setTimeout(() => document.getElementById(id).classList.remove('error'), 300);
              hasError = true;
            }
          }
        });
      });
      if (raporEmpty.length > 0) showRequiredHint('rapor-required', true);
      
      if (hasError) {
        const msg = errorFields.length > 0 
          ? `⚠️ Lengkapi: ${errorFields.slice(0,3).join(', ')}${errorFields.length>3?' + lainnya':''}`
          : `⚠️ Isi semua nilai rapor (contoh kosong: ${raporEmpty.join(', ')})`;
        document.getElementById('hasil_ng').innerHTML = `<div class="error-msg">${msg}</div>`;
        showToast('⚠️ Lengkapi field yang wajib diisi', 3000);
        return;
      }
      
      showRequiredHint('akademik-required', false);
      showRequiredHint('rapor-required', false);

      let jumlahRerataRapor = 0, detailRapor = '';
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        const avg = updateSubjectAverage(mapel.id);
        if (avg !== null) { jumlahRerataRapor += avg; detailRapor += `📊 ${mapel.label.split(' (')[0]}: <strong>${avg.toFixed(2)}</strong><br>`; }
      });

      let totalTesAkademik = 0, labelAkademik = '', detailAkademik = '';
      if (currentYear === '2026') {
        const tka_mtk = getValue('tka_mtk'), tka_indo = getValue('tka_indo'), tkad_ipas = getValue('tkad_ipas');
        totalTesAkademik = tka_mtk + tka_indo + tkad_ipas;
        labelAkademik = 'TKA + TKAD';
        detailAkademik = `🎓 TKA MTK: ${tka_mtk} | TKA B.Indo: ${tka_indo} | TKAD IPAS: ${tkad_ipas}`;
      } else {
        const aspd_mtk = getValue('aspd_mtk'), aspd_indo = getValue('aspd_indo'), aspd_ipa = getValue('aspd_ipa');
        totalTesAkademik = aspd_mtk + aspd_indo + aspd_ipa;
        labelAkademik = 'ASPD';
        detailAkademik = `🎓 ASPD MTK: ${aspd_mtk} | ASPD B.Indo: ${aspd_indo} | ASPD IPA/S: ${aspd_ipa}`;
      }

      const nilaiPrestasi = getValue('nilai_prestasi') || 0;
      const komponenAkademik = totalTesAkademik * CONFIG.BOBOT_AKADEMIK;
      const komponenRapor = (jumlahRerataRapor * CONFIG.KOEF_RAPOR) * CONFIG.BOBOT_RAPOR;
      const nilaiGabunganAkhir = komponenAkademik + komponenRapor + nilaiPrestasi;

      const output = `
        <strong>🎓 Tahun Kelulusan: ${currentYear}</strong><br><br>
        📚 <strong>Rata-rata Rapor per Mapel (5 Semester):</strong><br>${detailRapor}
        ➕ <strong>Jumlah Rerata Rapor:</strong> ${jumlahRerataRapor.toFixed(2)} <small style="color:#666">(maks: ${CONFIG.MAPEL_RAPOR.length * CONFIG.MAX_NILAI_INPUT})</small><br><br>
        ${detailAkademik}<br>
        🎓 <strong>Total ${labelAkademik}:</strong> ${totalTesAkademik.toFixed(2)}<br>
        🏆 Komponen Akademik (×${Math.round(CONFIG.BOBOT_AKADEMIK*100)}%): <strong>${komponenAkademik.toFixed(2)}</strong><br>
        📖 Komponen Rapor (×${Math.round(CONFIG.KOEF_RAPOR*CONFIG.BOBOT_RAPOR*1000)/10}%): <strong>${komponenRapor.toFixed(2)}</strong><br>
        🎖️ Nilai Prestasi: <strong>${nilaiPrestasi}</strong><br><br>
        <span class="final">🎯 NILAI GABUNGAN: ${nilaiGabunganAkhir.toFixed(2)}</span>
        <br><small style="color:#666">💡 Nilai maksimal tanpa prestasi: ${(300*0.9 + 500*0.06).toFixed(2)} = 300.00</small>
      `;

      const outputBox = document.getElementById('hasil_ng');
      outputBox.innerHTML = output;
      outputBox.classList.remove('flash');
      void outputBox.offsetWidth;
      outputBox.classList.add('flash');

      saveInputs();
      lastShortLink = ''; // Invalidate cache, will regenerate on share/copy
      showToast('✅ Perhitungan selesai!');
    }

    // ================= INIT =================
    document.addEventListener('DOMContentLoaded', () => {
      const savedYear = localStorage.getItem('spmb_tahun') || '2026';
      const radio = document.querySelector(`input[name="tahun"][value="${savedYear}"]`);
      if (radio) radio.checked = true;
      currentYear = savedYear;
      
      updateFormulaInfo();
      renderAkademikInputs();
      renderRaporInputs();
      
      // Prioritize URL params over localStorage
      if (!loadNilaiDariURL()) {
        loadInputsSmart();
      }
      
      document.querySelectorAll('input[name="tahun"]').forEach(radio => {
        radio.addEventListener('change', toggleForm);
      });



    });
  
