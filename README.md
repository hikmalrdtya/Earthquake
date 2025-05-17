# 🌍 Monitoring Gempa dengan ESP32 + Sensor Akselerometer

Proyek ini adalah sistem pemantauan getaran atau potensi gempa secara **real-time** menggunakan **ESP32** dan **sensor akselerometer** seperti MPU6050/MPU6500. Data getaran dikirim ke backend menggunakan metode **HTTP POST**, disimpan ke database, dan ditampilkan di web melalui antarmuka yang responsif.

## 🚀 Fitur

- Deteksi getaran sumbu X, Y, Z secara real-time
- Kirim data ke server via HTTP POST
- Simpan data ke database MySQL
- Tampilkan data historis dengan tampilan tabel yang bisa discroll
- Dukungan rekap data harian (opsional)

## 🧰 Teknologi

### Perangkat Keras:
- ESP32
- Sensor MPU6050 / MPU6500
- Kabel jumper

### Perangkat Lunak:
- Arduino IDE (untuk ESP32)
- Node.js + Express (backend)
- MySQL (database)
- HTML + CSS + JS (frontend)
- Axios (untuk HTTP request)
- Bootstrap (untuk UI)
- FastIMU (library sensor akselerometer)


## 📋 Cara Menjalankan

### ESP32
1. Sambungkan sensor MPU ke ESP32 (I2C: SDA ke D21, SCL ke D22 misalnya)
2. Upload kode menggunakan Arduino IDE
3. Pastikan koneksi WiFi dan URL backend sudah sesuai

### Backend
```bash
cd backend
npm install
node server.js
