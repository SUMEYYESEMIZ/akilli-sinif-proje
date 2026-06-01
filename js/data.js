/* =====================================================
   AKILLI SINIF SİSTEMİ - VERİ VE SENSÖR MODÜLÜ
   Referans Standartlar:
   - CO2    : ASHRAE 62.1
   - Sıcaklık: ASHRAE 55-2017
   - Işık   : EN 12464-1
   ===================================================== */

/* ===== ASHRAE / EN EŞİK DEĞERLERİ ===== */
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

/* ===== VARSAYILAN VERİ ===== */
const VARSAYILAN_SINIFLAR = [
  { id: 'A', ad: 'Sınıf A', ogrenci: 8, max: 15, klima: 20, pencere: false, isik: true, pir: true, mod: 'auto' },
  { id: 'B', ad: 'Sınıf B', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto' },
  { id: 'C', ad: 'Sınıf C', ogrenci: 0, max: 15, klima: 18, pencere: false, isik: false, pir: false, mod: 'auto' }
];

/* ===== LOCALSTORAGE İLE VERİ YÖNETİMİ ===== */
// Sayfalar arası veri paylaşımı için localStorage kullanılır
function veriYukle() {
  try {
    const kayitli = localStorage.getItem('akilli_sinif_data');
    if (kayitli) {
      const parsed = JSON.parse(kayitli);
      // Kayıtlı veri varsa kullan, yoksa varsayılanı kullan
      return parsed;
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(VARSAYILAN_SINIFLAR));
}

function veriKaydet(siniflar) {
  try {
    localStorage.setItem('akilli_sinif_data', JSON.stringify(siniflar));
  } catch(e) {}
}

// Global SINIFLAR değişkeni localStorage'dan yüklenir
let SINIFLAR = veriYukle();

/* ===== CO2 HESAPLAMA ===== */
function hesaplaCO2(ogrenci) {
  return 400 + (ogrenci * 45);
}

/* ===== SICAKLIK HESAPLAMA ===== */
function hesaplaSicaklik(ogrenci) {
  const ortamTemp = 20;
  return parseFloat((ortamTemp + (ogrenci * 0.3)).toFixed(1));
}

/* ===== NEM HESAPLAMA ===== */
function hesaplaNem(ogrenci, max) {
  const bazNem = 44;
  const ogrenciEtkisi = (ogrenci / max) * 12;
  return Math.round(bazNem + ogrenciEtkisi);
}

/* ===== LDR DOĞAL IŞIK ===== */
function hesaplaLDR() {
  const saat = new Date().getHours();
  const dakika = new Date().getMinutes();
  const zamanDecimal = saat + dakika / 60;
  if (zamanDecimal < 6 || zamanDecimal > 20) return 20;
  if (zamanDecimal >= 10 && zamanDecimal <= 14) return 850;
  if (zamanDecimal < 10) return Math.round(20 + (zamanDecimal - 6) * 207);
  return Math.round(850 - (zamanDecimal - 14) * 138);
}

/* ===== KONFOR PUANI HESAPLAMA ===== */
// CO2(40 puan) + Sıcaklık(30 puan) + Nem(30 puan) = Max 100
// ASHRAE 62.1, ASHRAE 55-2017 standartlarına göre ağırlıklandırılmıştır
// CO2 insan sağlığını en çok etkileyen faktör olduğundan en yüksek ağırlığı alır
function hesaplaKonfor(co2, temp, nem) {
  let puan = 0;
  if (co2 < ESIKLER.co2Normal) puan += 40;
  else if (co2 < ESIKLER.co2Kritik) puan += 20;
  else puan += 0;
  if (temp >= ESIKLER.tempMin && temp <= ESIKLER.tempMax) puan += 30;
  else if (temp >= 18 && temp <= 26) puan += 15;
  else puan += 0;
  if (nem >= ESIKLER.nemMin && nem <= ESIKLER.nemMax) puan += 30;
  else if (nem >= 30 && nem <= 70) puan += 15;
  else puan += 0;
  return puan;
}

/* ===== KONFOR ETİKETİ ===== */
// Sayısal puanı anlaşılır etikete çevirir
function konforEtiket(puan) {
  if (puan >= 80) return { etiket: 'İyi', renk: '#4ade80', bg: '#052e16', border: '#14532d' };
  if (puan >= 60) return { etiket: 'Orta', renk: '#fbbf24', bg: '#1c1407', border: '#78350f' };
  if (puan >= 40) return { etiket: 'Dikkat', renk: '#fb923c', bg: '#1c0f07', border: '#7c2d12' };
  return { etiket: 'Kötü', renk: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' };
}

/* ===== OTOMATİK KONTROL KARARLARI ===== */
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
  if (co2 >= ESIKLER.co2Kritik) {
    sinif.pencere = true;
  } else if (co2 < ESIKLER.co2Normal) {
    sinif.pencere = false;
  }
  if (temp > ESIKLER.tempMax) {
    sinif.klima = Math.max(16, sinif.klima - 1);
  } else if (temp < ESIKLER.tempMin) {
    sinif.klima = Math.min(30, sinif.klima + 1);
  }
  sinif.isik = ldr < ESIKLER.isikMasa;
}

/* ===== TÜM SİSTEM VERİLERİNİ GÜNCELLE ===== */
function sistemGuncelle() {
  const ldr = hesaplaLDR();
  SINIFLAR.forEach(s => {
    s.co2    = hesaplaCO2(s.ogrenci);
    s.temp   = hesaplaSicaklik(s.ogrenci);
    s.nem    = hesaplaNem(s.ogrenci, s.max);
    s.ldr    = ldr;
    s.konfor = hesaplaKonfor(s.co2, s.temp, s.nem);
    // Sadece auto modda otomatik karar ver
    // Manuel modda cihaz durumlarına dokunma
    if (s.mod === 'auto') {
      otomatikKarar(s, s.co2, s.temp, s.nem, s.ldr);
    }
  });
  // Her güncellemede localStorage'a kaydet
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

// İlk hesaplama
sistemGuncelle();
