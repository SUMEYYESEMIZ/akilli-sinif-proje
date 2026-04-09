# 🏫 Akıllı Sınıf Sistemi

Okul sınıflarında enerji tasarrufu ve hava kalitesi yönetimi için geliştirilmiş web tabanlı simülasyon sistemi.

## 📋 Proje Hakkında

Bu proje, sınıf ortamındaki CO2, sıcaklık, nem, hareket ve ışık verilerini matematiksel modellerle simüle ederek otomatik enerji yönetimi gerçekleştiren bir akıllı sınıf sistemidir.

**Referans Standartlar:**
- CO2 kontrolü: ASHRAE 62.1
- Sıcaklık konforu: ASHRAE 55-2017  
- Aydınlatma: EN 12464-1

## 📁 Dosya Yapısı

```
akilli-sinif/
├── index.html       → Dashboard (ana sayfa)
├── class.html       → Sınıf yönetimi ve koltuk haritası
├── sensors.html     → Sensör verileri ve karar mekanizması
├── report.html      → Analiz ve raporlama
├── settings.html    → Eşik değerleri ve sistem ayarları
├── css/
│   └── style.css    → Tüm stiller
└── js/
    └── data.js      → Sensör hesaplamaları ve veri yönetimi
```

## 🚀 Kurulum

1. Dosyaları indirin
2. `index.html` dosyasını tarayıcıda açın

**XAMPP ile:**
1. `akilli-sinif` klasörünü `C:/xampp/htdocs/` içine kopyalayın
2. `localhost/akilli-sinif` adresinden açın

## 🌡 Sensörler

| Sensör | Model | Ölçüm |
|--------|-------|-------|
| CO2 | Matematiksel model | 400 + (öğrenci × 45) ppm |
| Sıcaklık | DHT22 simülasyonu | T_ortam + (öğrenci × 0.3) °C |
| Nem | DHT22 simülasyonu | Doluluk bazlı model |
| Işık | LDR simülasyonu | Saat bazlı doğal ışık modeli |
| Hareket | PIR simülasyonu | Öğrenci giriş/çıkış tabanlı |

## 📊 Eşik Değerleri

| Parametre | Normal | Uyarı | Kritik |
|-----------|--------|-------|--------|
| CO2 | < 800 ppm | 800–1000 ppm | > 1000 ppm |
| Sıcaklık | 20–24°C | 18–26°C | Dışarısı |
| Nem | %40–60 | %30–70 | Dışarısı |
| Işık (masa) | > 300 lx | 150–300 lx | < 150 lx |

## ⚡ Özellikler

- 3 sınıf eş zamanlı izleme (A, B, C)
- Otomatik ve manuel kontrol modu
- CO2, sıcaklık, nem, LDR ve PIR sensör simülasyonu
- Konfor puanı hesaplama (0–100)
- Koltuk doluluk haritası (15 koltuk)
- Otomatik simülasyon (öğrenci giriş/çıkış)
- Gerçek zamanlı CO2 zaman serisi grafiği
- Enerji tasarrufu analizi ve karşılaştırmalı raporlama
- Eşik değerleri ayarlama paneli
