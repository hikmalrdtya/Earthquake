const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const mqtt = require('mqtt');
const http = require('http');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');
const PDFDocument = require('pdfkit');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Koneksi ke MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sensor_db'
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // penting untuk parsing JSON POST
app.use(cookieParser());

// Dummy login
const validUsername = "admin";
const validPass = "123";

// === Endpoint Web ===
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/check-login', (req, res) => {
    res.json({ loggedIn: !!req.cookies.username, username: req.cookies.username || null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === validUsername && password === validPass) {
        res.cookie('username', username, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.json({ success: true, username });
    } else {
        res.json({ success: false, message: "Username atau password salah!" });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('username');
    res.json({ success: true });
});

// === Endpoint POST dari ESP32 ===
// Endpoint untuk menerima data dari ESP32 via HTTP POST
app.post('/api/sensor', async (req, res) => {
    const { temperature, humidity, accelX, accelY, accelZ } = req.body;

    if (!temperature || !humidity || accelX === undefined || accelY === undefined || accelZ === undefined) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap!" });
    }

    const query = `INSERT INTO sensor_data (temperature, humidity, accelX, accelY, accelZ, created_at)
                   VALUES (?, ?, ?, ?, ?, NOW())`;

    try {
        await db.query(query, [temperature, humidity, accelX, accelY, accelZ]);
        console.log('Data berhasil disimpan ke database');

        const sensorData = { temperature, humidity, accelX, accelY, accelZ };
        io.emit('sensorUpdate', sensorData); // Optional kalau kamu tetap mau pakai realtime juga
        res.json({ success: true, message: "Data berhasil disimpan!" });
    } catch (err) {
        console.error('Gagal menyimpan data ke database:', err);
        res.status(500).json({ success: false, message: "Gagal simpan data" });
    }
});

// Endpoint untuk ambil 20 data terakhir untuk grafik (misalnya real-time fetch per 5 detik)
app.get('/sensor-history', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 20");
        res.json({ success: true, data: rows.reverse() }); // dibalik agar dari lama ke baru
    } catch (err) {
        console.error('Gagal ambil data:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil data dari database' });
    }
});

// Rekap PDF
app.get('/rekap-pdf', async (req, res) => {
    try {
        // Ambil parameter date dari URL
        const requestedDate = req.query.date || new Date().toISOString().slice(0, 10); // default: hari ini
        const startTime = `${requestedDate} 00:00:00`;
        const endTime = `${requestedDate} 23:59:59`;

        const [rows] = await db.query(
            "SELECT * FROM sensor_data WHERE created_at BETWEEN ? AND ? ORDER BY created_at ASC",
            [startTime, endTime]
        );

        if (rows.length === 0) {
            return res.status(404).send('Tidak ada data untuk tanggal tersebut');
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="rekap-data-sensor-${requestedDate}.pdf"`);
        doc.pipe(res);

        doc.fontSize(20).text(`Rekap Data Sensor - ${requestedDate}`, { align: 'center' });
        doc.moveDown();

        // Header tabel
        doc.fontSize(12);
        doc.text('No', 50, doc.y);
        doc.text('Tanggal', 100, doc.y);
        doc.text('Suhu (°C)', 200, doc.y);
        doc.text('Kelembapan (%)', 300, doc.y);
        doc.text('Akselerasi', 420, doc.y);
        doc.moveDown();

        // Data tabel
        rows.forEach((row, index) => {
            const acc = Math.sqrt(
                Math.pow(row.accelX || 0, 2) +
                Math.pow(row.accelY || 0, 2) +
                Math.pow(row.accelZ || 0, 2)
            ).toFixed(2);

            doc.text(index + 1, 50, doc.y);
            doc.text(new Date(row.created_at).toLocaleString(), 100, doc.y);
            doc.text(row.temperature, 200, doc.y);
            doc.text(row.humidity, 300, doc.y);
            doc.text(acc, 420, doc.y);
            doc.moveDown();
        });

        doc.end();
    } catch (err) {
        console.error('Gagal membuat PDF:', err);
        res.status(500).send('Gagal membuat PDF');
    }
});

// Jalankan server
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
