    // ================= KONFIGURASI GLOBAL =================
    const CONFIG = {
      BOBOT_AKADEMIK: 0.9,      // 90%
      BOBOT_RAPOR: 0.1,         // 10%
      KOEF_RAPOR: 0.6,          // koefisien penyetaraan skala
      MAX_NILAI_INPUT: 100,     // maksimal per input field
      CLICK_THRESHOLD: 2,       // klik ke-4 buka pop-under
      AFFILIATE_URL: "https://s.shopee.co.id/AA4ETmAQ4H",
      SEMESTERS: [7, 8, 9, 10, 11], // Semester 7-11
      MAPEL_RAPOR: [
        { id: 'agama', label: 'Pendidikan Agama dan Budi Pekerti' },
        { id: 'pancasila', label: 'Pendidikan Pancasila' },
        { id: 'indo', label: 'Bahasa Indonesia' },
        { id: 'mtk', label: 'Matematika' },
        { id: 'ipas', label: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)' }
      ]
    };

    // Tes akademik per tahun - DIPISAH per mapel
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

    // ================= UTILITIES =================
    function clampNilai(val) {
      const num = parseFloat(val);
      if (isNaN(num)) return null; // return null untuk empty validation
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
      if (el) {
        el.classList.toggle('show', show);
      }
    }

    function markFieldRequired(inputId, mark) {
      const input = document.getElementById(inputId);
      if (input) {
        input.classList.toggle('required-empty', mark);
      }
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
      
      // Event listener untuk validasi real-time
      fields.forEach(f => {
        const input = document.getElementById(f.id);
        if (input) {
          input.addEventListener('input', function() {
            // Auto-clamp jika >100
            const val = parseFloat(this.value);
            if (!isNaN(val) && val > CONFIG.MAX_NILAI_INPUT) {
              this.value = CONFIG.MAX_NILAI_INPUT;
              this.classList.add('error');
              setTimeout(() => this.classList.remove('error'), 500);
              showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`);
            }
            // Hapus highlight required saat user mengetik
            this.classList.remove('required-empty');
            showRequiredHint('akademik-required', false);
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
      
      // Event listener untuk validasi real-time
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const input = document.getElementById(`nilai_${mapel.id}_sem${sem}`);
          if (input) {
            input.addEventListener('input', function() {
              // Auto-clamp jika >100
              const val = parseFloat(this.value);
              if (!isNaN(val) && val > CONFIG.MAX_NILAI_INPUT) {
                this.value = CONFIG.MAX_NILAI_INPUT;
                this.classList.add('error');
                setTimeout(() => this.classList.remove('error'), 300);
                showToast(`Nilai dibatasi maksimal ${CONFIG.MAX_NILAI_INPUT}`);
              }
              // Hapus highlight required saat user mengetik
              this.classList.remove('required-empty');
              showRequiredHint('rapor-required', false);
              // Update rata-rata real-time jika ada nilai
              updateSubjectAverage(mapel.id);
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
      let total = 0;
      let count = 0;
      let hasValue = false;
      
      CONFIG.SEMESTERS.forEach(sem => {
        const val = getValue(`nilai_${mapelId}_sem${sem}`);
        if (val !== null) {
          total += val;
          count++;
          hasValue = true;
        }
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
      // Rapor inputs sama untuk kedua tahun
      loadInputsSmart();
      
      showToast(`🔄 Mode: ${currentYear} | Input disesuaikan`);
      
      // Reset output
      document.getElementById('hasil_ng').innerHTML = 
        '<em>Nilai Gabungan akan muncul di sini setelah dihitung.</em>';
    }

    // ================= LOAD/SAVE LOCALSTORAGE =================
    function loadInputsSmart() {
      // Load akademik
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const key = getStorageKey(currentYear, f.id);
        const saved = localStorage.getItem(key);
        const input = document.getElementById(f.id);
        if (input) {
          // Hanya load jika ada data tersimpan (bukan empty string)
          if (saved !== null && saved !== '' && saved !== 'null') {
            input.value = clampNilai(saved);
          } else {
            input.value = ''; // Pastikan empty
          }
        }
      });
      
      // Load rapor
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          const key = getStorageKey(currentYear, id);
          const saved = localStorage.getItem(key);
          const input = document.getElementById(id);
          if (input) {
            if (saved !== null && saved !== '' && saved !== 'null') {
              input.value = clampNilai(saved);
            } else {
              input.value = ''; // Pastikan empty
            }
            updateSubjectAverage(mapel.id);
          }
        });
      });
      
      // Load prestasi (opsional, boleh kosong)
      const prestKey = getStorageKey(currentYear, 'nilai_prestasi');
      const prestSaved = localStorage.getItem(prestKey);
      const prestInput = document.getElementById('nilai_prestasi');
      if (prestInput) {
        if (prestSaved !== null && prestSaved !== '' && prestSaved !== 'null') {
          prestInput.value = clampNilai(prestSaved);
        } else {
          prestInput.value = '';
        }
      }
    }

    function saveInputs() {
      // Simpan akademik
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const key = getStorageKey(currentYear, f.id);
        const val = document.getElementById(f.id)?.value?.trim();
        if (val && val !== '') {
          localStorage.setItem(key, clampNilai(val));
        } else {
          localStorage.removeItem(key);
        }
      });
      
      // Simpan rapor
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          const key = getStorageKey(currentYear, id);
          const val = document.getElementById(id)?.value?.trim();
          if (val && val !== '') {
            localStorage.setItem(key, clampNilai(val));
          } else {
            localStorage.removeItem(key);
          }
        });
      });
      
      // Simpan prestasi (opsional)
      const prestVal = document.getElementById('nilai_prestasi')?.value?.trim();
      const prestKey = getStorageKey(currentYear, 'nilai_prestasi');
      if (prestVal && prestVal !== '') {
        localStorage.setItem(prestKey, clampNilai(prestVal));
      } else {
        localStorage.removeItem(prestKey);
      }
      
      localStorage.setItem('spmb_tahun', currentYear);
    }

    function resetForm() {
      // Hapus data tahun ini dari localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`spmb_${currentYear}_`)) {
          localStorage.removeItem(key);
        }
      });
      
      // Reset UI akademik
      AKADEMIK_CONFIG[currentYear].forEach(f => {
        const input = document.getElementById(f.id);
        if (input) {
          input.value = '';
          input.classList.remove('required-empty', 'error');
        }
      });
      
      // Reset UI rapor
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const input = document.getElementById(`nilai_${mapel.id}_sem${sem}`);
          if (input) {
            input.value = '';
            input.classList.remove('required-empty', 'error');
            updateSubjectAverage(mapel.id);
          }
        });
      });
      
      // Reset prestasi
      const prestInput = document.getElementById('nilai_prestasi');
      if (prestInput) {
        prestInput.value = '';
        prestInput.classList.remove('error');
      }
      
      // Reset output & hints
      document.getElementById('hasil_ng').innerHTML = 
        '<em>✅ Form direset. Silakan isi semua field yang wajib.</em>';
      showRequiredHint('akademik-required', false);
      showRequiredHint('rapor-required', false);
      
      clickCount = 0;
      popUnderOpened = false;
      showToast('🔄 Semua nilai direset');
    }

    // ================= FUNGSI HITUNG UTAMA =================
    function hitungNG() {
      let hasError = false;
      let errorFields = [];
      
      // 1. Validasi input akademik (WAJIB)
      const akademikFields = AKADEMIK_CONFIG[currentYear];
      akademikFields.forEach(f => {
        if (isFieldEmpty(f.id)) {
          markFieldRequired(f.id, true);
          errorFields.push(f.label);
          hasError = true;
        } else {
          markFieldRequired(f.id, false);
          // Validasi >100
          const val = parseFloat(document.getElementById(f.id).value);
          if (val > CONFIG.MAX_NILAI_INPUT) {
            document.getElementById(f.id).classList.add('error');
            setTimeout(() => document.getElementById(f.id).classList.remove('error'), 500);
            showToast(`${f.label} tidak boleh lebih dari ${CONFIG.MAX_NILAI_INPUT}`);
            hasError = true;
          }
        }
      });
      
      if (errorFields.length > 0) {
        showRequiredHint('akademik-required', true);
      }
      
      // 2. Validasi input rapor (WAJIB - 25 field)
      const raporEmpty = [];
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        CONFIG.SEMESTERS.forEach(sem => {
          const id = `nilai_${mapel.id}_sem${sem}`;
          if (isFieldEmpty(id)) {
            markFieldRequired(id, true);
            if (raporEmpty.length < 3) { // Tampilkan max 3 contoh
              raporEmpty.push(`${mapel.label} S${sem}`);
            }
            hasError = true;
          } else {
            markFieldRequired(id, false);
            // Validasi >100
            const val = parseFloat(document.getElementById(id).value);
            if (val > CONFIG.MAX_NILAI_INPUT) {
              document.getElementById(id).classList.add('error');
              setTimeout(() => document.getElementById(id).classList.remove('error'), 300);
              hasError = true;
            }
          }
        });
      });
      
      if (raporEmpty.length > 0) {
        showRequiredHint('rapor-required', true);
      }
      
      // Jika ada error, tampilkan pesan dan stop
      if (hasError) {
        const msg = errorFields.length > 0 
          ? `⚠️ Lengkapi: ${errorFields.slice(0,3).join(', ')}${errorFields.length>3?' + lainnya':''}`
          : `⚠️ Isi semua nilai rapor (contoh kosong: ${raporEmpty.join(', ')})`;
        
        document.getElementById('hasil_ng').innerHTML = 
          `<div class="error-msg">${msg}</div>`;
        showToast('⚠️ Lengkapi field yang wajib diisi', 3000);
        return;
      }
      
      // Sembunyikan hint required jika semua valid
      showRequiredHint('akademik-required', false);
      showRequiredHint('rapor-required', false);

      // 3. Hitung Jumlah Rerata Rapor (5 mapel × rata-rata 5 semester)
      let jumlahRerataRapor = 0;
      let detailRapor = '';
      
      CONFIG.MAPEL_RAPOR.forEach(mapel => {
        const avg = updateSubjectAverage(mapel.id);
        if (avg !== null) {
          jumlahRerataRapor += avg;
          detailRapor += `📊 ${mapel.label.split(' (')[0]}: <strong>${avg.toFixed(2)}</strong><br>`;
        }
      });

      // 4. Hitung nilai akademik (dipisah per mapel)
      let totalTesAkademik = 0;
      let labelAkademik = '';
      let detailAkademik = '';
      
      if (currentYear === '2026') {
        const tka_mtk = getValue('tka_mtk');
        const tka_indo = getValue('tka_indo');
        const tkad_ipas = getValue('tkad_ipas');
        totalTesAkademik = tka_mtk + tka_indo + tkad_ipas;
        labelAkademik = 'TKA + TKAD';
        detailAkademik = `🎓 TKA MTK: ${tka_mtk} | TKA B.Indo: ${tka_indo} | TKAD IPAS: ${tkad_ipas}`;
      } else {
        const aspd_mtk = getValue('aspd_mtk');
        const aspd_indo = getValue('aspd_indo');
        const aspd_ipa = getValue('aspd_ipa');
        totalTesAkademik = aspd_mtk + aspd_indo + aspd_ipa;
        labelAkademik = 'ASPD';
        detailAkademik = `🎓 ASPD MTK: ${aspd_mtk} | ASPD B.Indo: ${aspd_indo} | ASPD IPA/S: ${aspd_ipa}`;
      }

      // 5. Nilai prestasi (opsional)
      const nilaiPrestasi = getValue('nilai_prestasi') || 0;

      // 6. Hitung sesuai rumus POS SPMB 2026
      const komponenAkademik = totalTesAkademik * CONFIG.BOBOT_AKADEMIK;
      const komponenRapor = (jumlahRerataRapor * CONFIG.KOEF_RAPOR) * CONFIG.BOBOT_RAPOR;
      const nilaiGabunganAkhir = komponenAkademik + komponenRapor + nilaiPrestasi;

      // 7. Tampilkan hasil detail
      const output = `
        <strong>🎓 Tahun Kelulusan: ${currentYear}</strong><br><br>
        
        📚 <strong>Rata-rata Rapor per Mapel (5 Semester):</strong><br>
        ${detailRapor}
        ➕ <strong>Jumlah Rerata Rapor:</strong> ${jumlahRerataRapor.toFixed(2)} 
           <small style="color:#666">(maks: ${CONFIG.MAPEL_RAPOR.length * CONFIG.MAX_NILAI_INPUT})</small><br><br>
        
        ${detailAkademik}<br>
        🎓 <strong>Total ${labelAkademik}:</strong> ${totalTesAkademik.toFixed(2)}<br>
        🏆 Komponen Akademik (×${Math.round(CONFIG.BOBOT_AKADEMIK*100)}%): <strong>${komponenAkademik.toFixed(2)}</strong><br>
        📖 Komponen Rapor (×${Math.round(CONFIG.KOEF_RAPOR*CONFIG.BOBOT_RAPOR*1000)/10}%): <strong>${komponenRapor.toFixed(2)}</strong><br>
        🎖️ Nilai Prestasi: <strong>${nilaiPrestasi}</strong><br><br>
        
        <span class="final">
          🎯 NILAI GABUNGAN: ${nilaiGabunganAkhir.toFixed(2)}
        </span>
        <br><small style="color:#666">
          💡 Nilai maksimal tanpa prestasi: ${(300*0.9 + 500*0.06).toFixed(2)} = 300.00
        </small>
      `;

      const outputBox = document.getElementById('hasil_ng');
      outputBox.innerHTML = output;
      outputBox.classList.remove('flash');
      void outputBox.offsetWidth;
      outputBox.classList.add('flash');

      // Simpan input
      saveInputs();
      
      showToast('✅ Perhitungan selesai!');
    }

    // ================= INIT =================
    document.addEventListener('DOMContentLoaded', () => {
      // Set radio button sesuai tahun tersimpan
      const savedYear = localStorage.getItem('spmb_tahun') || '2026';
      const radio = document.querySelector(`input[name="tahun"][value="${savedYear}"]`);
      if (radio) radio.checked = true;
      
      currentYear = savedYear;
      
      // Render semua input
      updateFormulaInfo();
      renderAkademikInputs();
      renderRaporInputs();
      
      // Load data tersimpan (jika ada)
      loadInputsSmart();
      
      // Event listener untuk toggle tahun
      document.querySelectorAll('input[name="tahun"]').forEach(radio => {
        radio.addEventListener('change', toggleForm);
      });
    });


</body>
</html>
