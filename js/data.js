/* =====================================================
   AKILLI SINIF SİSTEMİ - VERİ VE SENSÖR MODÜLÜ
   Referans Standartlar:
   - CO2    : ASHRAE 62.1
   - Sıcaklık: ASHRAE 55-2017
   - Işık   : EN 12464-1
   ===================================================== */

const SINIFLAR = [
  { id: 'A', ad: 'Sınıf A', ogrenci: 8, max: 15, klima: 20, pencere: false, isik: true, pir: true, mod: 'auto' },
  { id: 'B', ad: 'Sınıf B', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto' },
  { id: 'C', ad: 'Sınıf C', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto' }
];

/* ===== ASHRAE / EN EŞİK DEĞERLERİ ===== */
const ESIKLER = {
  co2Normal  : 800,    // ppm  - ASHRAE 62.1: Normal üst sınır
  co2Kritik  : 1000,   // ppm  - ASHRAE 62.1: Kritik eşik
  co2Tehlike : 2000,   // ppm  - ASHRAE 62.1: Tehlikeli seviye
  tempMin    : 19,     // °C   - ASHRAE 55-2017: Min konfor sıcaklığı
  tempMax    : 24,     // °C   - ASHRAE 55-2017: Max konfor sıcaklığı
  nemMin     : 40,     // %    - ASHRAE: Min nem
  nemMax     : 60,     // %    - ASHRAE: Max nem
  isikMasa   : 300,    // lx   - EN 12464-1: Masa min aydınlatma
  isikTahta  : 500,    // lx   - EN 12464-1: Tahta min aydınlatma
  pirKapanma : 10      // dk   - Hareketsizlikte kapanma süresi
};

/* ===== CO2 HESAPLAMA ===== */
// Formül: CO2 = 400 + (öğrenci × 45) ppm
// Kişi başı 35-50 ppm artış (ASHRAE referans)
function hesaplaCO2(ogrenci) {
  return 400 + (ogrenci * 45);
}

/* ===== SICAKLIK HESAPLAMA ===== */
// Formül: T = T_ortam + (öğrenci × 0.3) °C
function hesaplaSicaklik(ogrenci, ortamTemp) {
  ortamTemp = ortamTemp || 20;
  return parseFloat((ortamTemp + (ogrenci * 0.3)).toFixed(1));
}

/* ===== NEM HESAPLAMA ===== */
// Doluluk ve saat parametreli model
function hesaplaNem(ogrenci, max) {
  const bazNem = 44;
  const ogrenciEtkisi = (ogrenci / max) * 12;
  return Math.round(bazNem + ogrenciEtkisi);
}

/* ===== LDR DOĞAL IŞIK ===== */
// Saate göre doğal ışık simülasyonu
function hesaplaLDR() {
  const saat = new Date().getHours();
  const dakika = new Date().getMinutes();
  const zamanDecimal = saat + dakika / 60;
  // Sabah 6 → öğle 12 → akşam 18 arası değişim
  if (zamanDecimal < 6 || zamanDecimal > 20) return 20;
  if (zamanDecimal >= 10 && zamanDecimal <= 14) return 850; // öğle en parlak
  if (zamanDecimal < 10) return Math.round(20 + (zamanDecimal - 6) * 207);
  return Math.round(850 - (zamanDecimal - 14) * 138);
}

/* ===== KONFOR PUANI HESAPLAMA ===== */
// Maksimum 100 puan: CO2(40) + Sıcaklık(30) + Nem(30)
function hesaplaKonfor(co2, temp, nem) {
  let puan = 0;
  // CO2 puanı (40 puan max)
  if (co2 < ESIKLER.co2Normal) puan += 40;
  else if (co2 < ESIKLER.co2Kritik) puan += 20;
  else puan += 0;
  // Sıcaklık puanı (30 puan max)
  if (temp >= ESIKLER.tempMin && temp <= ESIKLER.tempMax) puan += 30;
  else if (temp >= 18 && temp <= 26) puan += 15;
  else puan += 0;
  // Nem puanı (30 puan max)
  if (nem >= ESIKLER.nemMin && nem <= ESIKLER.nemMax) puan += 30;
  else if (nem >= 30 && nem <= 70) puan += 15;
  else puan += 0;
  return puan;
}

/* ===== OTOMATİK KONTROL KARARLARI ===== */
// ASHRAE eşiklerine göre otomatik karar mekanizması
function otomatikKarar(sinif, co2, temp, nem, ldr) {
  if (sinif.mod !== 'auto') return;
  // PIR: Öğrenci yoksa kapat
  if (sinif.ogrenci === 0) {
    sinif.isik = false;
    sinif.klima = 18;
    sinif.pencere = false;
    sinif.pir = false;
    return;
  }
  sinif.pir = true;
  // CO2 kontrolü (ASHRAE 62.1)
  if (co2 >= ESIKLER.co2Kritik) {
    sinif.pencere = true;
  } else if (co2 < ESIKLER.co2Normal) {
    sinif.pencere = false;
  }
  // Sıcaklık kontrolü (ASHRAE 55-2017)
  if (temp > ESIKLER.tempMax) {
    sinif.klima = Math.max(16, sinif.klima - 1);
  } else if (temp < ESIKLER.tempMin) {
    sinif.klima = Math.min(30, sinif.klima + 1);
  }
  // Işık kontrolü (EN 12464-1)
  sinif.isik = ldr < ESIKLER.isikMasa;
}

/* ===== TÜM SİSTEM VERİLERİNİ GÜNCELLE ===== */
function sistemGuncelle() {
  const ldr = hesaplaLDR();
  SINIFLAR.forEach(s => {
    s.co2  = hesaplaCO2(s.ogrenci);
    s.temp = hesaplaSicaklik(s.ogrenci);
    s.nem  = hesaplaNem(s.ogrenci, s.max);
    s.ldr  = ldr;
    s.konfor = hesaplaKonfor(s.co2, s.temp, s.nem);
    otomatikKarar(s, s.co2, s.temp, s.nem, s.ldr);
  });
}

/* ===== YARDIMCI FONKSİYONLAR ===== */
function co2Renk(v) {
  return v < ESIKLER.co2Normal ? '#4ade80' : v < ESIKLER.co2Kritik ? '#fbbf24' : '#f87171';
}

function konforRenk(v) {
  return v >= 80 ? '#4ade80' : v >= 60 ? '#fbbf24' : '#f87171';
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

// İlk hesaplama
sistemGuncelle();
