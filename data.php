<?php
// ============================================================
// data.php — Sensör Veri Motoru
// Akıllı Sınıf Sistemi
// ASHRAE 62.1 / ASHRAE 55-2017 / EN 12464-1 Uyumlu
// ============================================================

session_start();

// Sınıf verilerini başlat (ilk açılışta)
if (!isset($_SESSION['siniflar'])) {
    $_SESSION['siniflar'] = [
        'A' => [
            'id'       => 'A',
            'ogrenci'  => 8,
            'max'      => 15,
            'co2'      => 0,
            'temp'     => 0,
            'nem'      => 0,
            'ldr'      => 0,
            'pir'      => true,
            'isik'     => true,
            'klima'    => 20,
            'pencere'  => false,
            'mod'      => 'auto',
            'konfor'   => 0,
        ],
        'B' => [
            'id'       => 'B',
            'ogrenci'  => 0,
            'max'      => 15,
            'co2'      => 0,
            'temp'     => 0,
            'nem'      => 0,
            'ldr'      => 0,
            'pir'      => false,
            'isik'     => false,
            'klima'    => 18,
            'pencere'  => false,
            'mod'      => 'auto',
            'konfor'   => 0,
        ],
        'C' => [
            'id'       => 'C',
            'ogrenci'  => 0,
            'max'      => 15,
            'co2'      => 0,
            'temp'     => 0,
            'nem'      => 0,
            'ldr'      => 0,
            'pir'      => false,
            'isik'     => false,
            'klima'    => 18,
            'pencere'  => false,
            'mod'      => 'auto',
            'konfor'   => 0,
        ],
    ];
}

// ============================================================
// SENSÖR SİMÜLASYON FONKSİYONLARI
// ============================================================

// CO2 hesaplama — ASHRAE 62.1
// Formül: CO2 = 400 + (öğrenci × 45) ppm
// Dışarıdaki hava: ~400 ppm
// Kişi başı artış: 35-50 ppm
function hesaplaC02($ogrenci) {
    $baz = 400;
    $kisi_basi = 45;
    $gurultu = rand(-10, 10); // Gerçekçilik için küçük sapma
    return $baz + ($ogrenci * $kisi_basi) + $gurultu;
}

// Sıcaklık hesaplama — ASHRAE 55-2017
// İdeal: 20-24°C
// Formül: T = T_ortam + (öğrenci × 0.3)
function hesaplaSicaklik($ogrenci) {
    $t_ortam = 21;
    $kisi_isi = 0.3;
    $gurultu = rand(-5, 5) / 10;
    return round($t_ortam + ($ogrenci * $kisi_isi) + $gurultu, 1);
}

// Nem hesaplama — ASHRAE
// İdeal: %40-60
// Öğrenci kalabalıklaştıkça nem artar
function hesaplaNem($ogrenci) {
    $baz = 44;
    $kisi_nem = 0.8;
    $gurultu = rand(-3, 3);
    return min(90, round($baz + ($ogrenci * $kisi_nem) + $gurultu));
}

// LDR doğal ışık hesaplama — EN 12464-1
// Min masa: 300 lx, Min tahta: 500 lx
// Saate göre doğal ışık değişir
function hesaplaLDR() {
    $saat = (int)date('H');
    // Sabah artar, öğle max, akşam düşer
    if ($saat >= 10 && $saat <= 14) {
        return rand(400, 800); // Öğle - yüksek doğal ışık
    } elseif ($saat >= 8 && $saat < 10) {
        return rand(150, 400); // Sabah - orta
    } elseif ($saat > 14 && $saat <= 17) {
        return rand(200, 500); // Öğleden sonra
    } else {
        return rand(0, 150);   // Akşam/gece - düşük
    }
}

// Konfor puanı hesaplama
// CO2 puanı (40) + Sıcaklık puanı (30) + Nem puanı (30) = 100
function hesaplaKonfor($co2, $temp, $nem) {
    $puan = 0;

    // CO2 puanı (ASHRAE 62.1)
    if ($co2 < 800)       $puan += 40;
    elseif ($co2 < 1000)  $puan += 20;
    else                  $puan += 0;

    // Sıcaklık puanı (ASHRAE 55-2017)
    if ($temp >= 20 && $temp <= 24)      $puan += 30;
    elseif ($temp >= 18 && $temp <= 26)  $puan += 15;
    else                                 $puan += 0;

    // Nem puanı (ASHRAE)
    if ($nem >= 40 && $nem <= 60)        $puan += 30;
    elseif ($nem >= 30 && $nem <= 70)    $puan += 15;
    else                                 $puan += 0;

    return $puan;
}

// Otomatik kontrol kararları
// Sensör verilerine göre cihazları yönet
function otomatikKontrol(&$sinif) {
    if ($sinif['mod'] !== 'auto') return;

    $co2    = $sinif['co2'];
    $temp   = $sinif['temp'];
    $nem    = $sinif['nem'];
    $ldr    = $sinif['ldr'];
    $pir    = $sinif['pir'];

    // PIR: Hareket yoksa ışık kapat (10 dk simülasyonu)
    if (!$pir && $sinif['ogrenci'] == 0) {
        $sinif['isik'] = false;
    }

    // LDR: Doğal ışık yeterliyse yapay ışık kapat (EN 12464-1: 300 lx)
    if ($ldr >= 300 && $sinif['ogrenci'] > 0) {
        $sinif['isik'] = false;
    } elseif ($ldr < 300 && $sinif['ogrenci'] > 0) {
        $sinif['isik'] = true;
    }

    // CO2: 800 ppm üstü pencere aç (ASHRAE 62.1)
    if ($co2 > 800) {
        $sinif['pencere'] = true;
    } elseif ($co2 < 700) {
        $sinif['pencere'] = false;
    }

    // Sıcaklık: Klima kontrolü (ASHRAE 55-2017)
    if ($temp > 24) {
        $sinif['klima'] = 20; // Soğutma
    } elseif ($temp < 19) {
        $sinif['klima'] = 24; // Isıtma
    }

    // Nem: %60 üstü nem alma modu
    if ($nem > 60) {
        $sinif['klima'] = min($sinif['klima'], 18);
    }
}

// Tüm sınıfların sensör verilerini güncelle
function guncelleVeriler() {
    foreach ($_SESSION['siniflar'] as $id => &$sinif) {
        $sinif['co2']   = hesaplaC02($sinif['ogrenci']);
        $sinif['temp']  = hesaplaSicaklik($sinif['ogrenci']);
        $sinif['nem']   = hesaplaNem($sinif['ogrenci']);
        $sinif['ldr']   = hesaplaLDR();
        $sinif['