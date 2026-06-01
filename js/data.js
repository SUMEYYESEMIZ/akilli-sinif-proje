/* =====================================================
   AKILLI SINIF SİSTEMİ - VERİ VE SENSÖR MODÜLÜ
   Referans Standartlar:
   - CO2    : ASHRAE 62.1
   - Sıcaklık: ASHRAE 55-2017
   - Işık   : EN 12464-1
   ===================================================== */

const ESIKLER = {
  co2Normal  : 800,
  co2Kritik  : 1000,
  co2Tehlike : 2000,
  tempMin    : 19,
  tempMax    : 24,
  nemMin     : 40,
  nemMax     : 60,
  isikMasa   : 300,
  isikTahta  : 500,
  pirKapanma : 10
};

const VARSAYILAN_SINIFLAR = [
  { id: 'A', ad: 'Sınıf A', ogrenci: 8, max: 15, klima: 20, pencere: false, isik: true, pir: true, mod: 'auto', co2Extra: 0 },
  { id: 'B', ad: 'Sınıf B', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto', co2Extra: 0 },
  { id: 'C', ad: 'Sınıf C', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto', co2Extra: 0 }
];

/* ===== LOCALSTORAGE VERİ YÖNETİMİ ===== */
function veriYukle() {
  try {
    const kayitli = localStorage.getItem('akilli_sinif_data');
    if (kayitli) return JSON.parse(kayitli);
  } catch(e) {}
  return JSON.parse(JSON.stringify(VARSAYILAN_SINIFLAR));
}

function veriKaydet(siniflar) {
  try {
    localStorage.setItem('akilli_sinif_data', JSON.stringify(siniflar));
  } catch(e) {}
}

let SINIFLAR = veriYukle();

// co2Extra yoksa ekle (eski veri uyumluluğu)
SINIFLAR.forEach(s => { if (s.co2Extra === undefined) s.co2Extra = 0; });

/* ===== CO2 HESAPLAMA ===== */
// Temel CO2 = 400 + (öğrenci × 45) ppm
// Pencere açıksa zamanla dış hava CO2 seviyesine (400 ppm) doğru iyileşir
function hesaplaCO2(sinif) {
  const bazCO2 = 400 + (sinif.ogrenci * 45);
  // Pencere açıksa co2Extra azalır (havalandırma etkisi)
  if (sinif.pencere && sinif.co2Extra > 0) {
    sinif.co2Extra = Math.max(0, sinif.co2Extra - 15);
  }
  // Öğrenci varsa co2Extra birikir
  if (sinif.ogrenci > 0 && !sinif.pencere) {
    sinif.co2Extra = Math.min(200, sinif.co2Extra + 2);
  }
  return bazCO2 + sinif.co2Extra;
}

/* ===== SICAKLIK HESAPLAMA ===== */
function hesaplaSicaklik(ogrenci) {
  return parseFloat((20 + (ogrenci * 0.3)).toFixed(1));
}

/* ===== NEM HESAPLAMA ===== */
function hesaplaNem(ogrenci, max) {
  return Math.round(44 + (ogrenci / max) * 12);
}

/* ===== LDR DOĞAL IŞIK ===== */
function hesaplaLDR() {
  const saat = new Date().getHours();
  const dakika = new Date().getMinutes();
  const z = saat + dakika / 60;
  if (z < 6 || z > 20) return 20;
  if (z >= 10 && z <= 14) return 850;
  if (z < 10) return Math.round(20 + (z - 6) * 207);
  return Math.round(850 - (z - 14) * 138);
}

/* ===== KONFOR PUANI ===== */
// CO2(40) + Sıcaklık(30) + Nem(30) = Max 100
// ASHRAE 62.1 ve ASHRAE 55-2017 standartlarına göre ağırlıklandırılmıştır
function hesaplaKonfor(co2, temp, nem) {
  let p = 0;
  p += co2 < ESIKLER.co2Normal ? 40 : co2 < ESIKLER.co2Kritik ? 20 : 0;
  p += (temp >= ESIKLER.tempMin && temp <= ESIKLER.tempMax) ? 30 : (temp >= 18 && temp <= 26) ? 15 : 0;
  p += (nem >= ESIKLER.nemMin && nem <= ESIKLER.nemMax) ? 30 : (nem >= 30 && nem <= 70) ? 15 : 0;
  return p;
}

/* ===== KONFOR ETİKETİ ===== */
function konforEtiket(puan) {
  if (puan >= 80) return { etiket: 'İyi',    renk: '#4ade80', bg: '#052e16', border: '#14532d' };
  if (puan >= 60) return { etiket: 'Orta',   renk: '#fbbf24', bg: '#1c1407', border: '#78350f' };
  if (puan >= 40) return { etiket: 'Dikkat', renk: '#fb923c', bg: '#1c0f07', border: '#7c2d12' };
  return              { etiket: 'Kötü',   renk: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' };
}

/* ===== OTOMATİK KONTROL ===== */
function otomatikKarar(sinif, co2, temp, nem, ldr) {
  if (sinif.mod !== 'auto') return;
  if (sinif.ogrenci === 0) {
    sinif.isik = false;
    sinif.klima = 18;
    sinif.pencere = false;
    sinif.pir = false;
    return;
  }
  sinif.pir = true;
  // CO2 kontrolü
  if (co2 >= ESIKLER.co2Kritik) sinif.pencere = true;
  else if (co2 < ESIKLER.co2Normal) sinif.pencere = false;
  // Sıcaklık kontrolü
  if (temp > ESIKLER.tempMax) sinif.klima = Math.max(16, sinif.klima - 1);
  else if (temp < ESIKLER.tempMin) sinif.klima = Math.min(30, sinif.klima + 1);
  // Işık kontrolü
  sinif.isik = ldr < ESIKLER.isikMasa;
}

/* ===== SİSTEM GÜNCELLE ===== */
function sistemGuncelle() {
  const ldr = hesaplaLDR();
  SINIFLAR.forEach(s => {
    s.co2    = hesaplaCO2(s);       // pencere etkisi burada hesaplanır
    s.temp   = hesaplaSicaklik(s.ogrenci);
    s.nem    = hesaplaNem(s.ogrenci, s.max);
    s.ldr    = ldr;
    s.konfor = hesaplaKonfor(s.co2, s.temp, s.nem);
    if (s.mod === 'auto') otomatikKarar(s, s.co2, s.temp, s.nem, s.ldr);
  });
  veriKaydet(SINIFLAR);
}

/* ===== YARDIMCI FONKSİYONLAR ===== */
function co2Renk(v) {
  return v < ESIKLER.co2Normal ? '#4ade80' : v < ESIKLER.co2Kritik ? '#fbbf24' : '#f87171';
}

function konforRenk(v) {
  return v >= 80 ? '#4ade80' : v >= 60 ? '#fbbf24' : v >= 40 ? '#fb923c' : '#f87171';
}

function co2Yuzde(v) {
  return Math.min(100, Math.round((v - 400) / 8));
}

function co2Durum(v) {
  if (v < ESIKLER.co2Normal) return 'Normal';
  if (v < ESIKLER.co2Kritik) return 'Uyarı';
  if (v < ESIKLER.co2Tehlike) return 'Kritik';
  return 'Tehlikeli';
}

function saatStr() {
  return new Date().toLocaleTimeString('tr-TR');
}

sistemGuncelle();
