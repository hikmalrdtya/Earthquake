const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const mqtt = require('mqtt');
const http = require('http');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');
const PDFDocument = require('pdfkit');
const { Table } = require('pdfkit-table');

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
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const [rows] = await db.query(
            "SELECT * FROM sensor_data WHERE DATE(created_at) = ? ORDER BY created_at ASC", [date]
        );

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        // Atur response headers supaya langsung download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=rekap_sensor_${date}.pdf`);
        doc.pipe(res);

        doc.fontSize(16).text(`Rekap Data Sensor - ${date}`, { align: 'center' });
        doc.moveDown();

        // Format tabel
        const table = {
            headers: [
                { label: "No", width: 40 },
                { label: "Waktu", width: 130 },
                { label: "Suhu (°C)", width: 80 },
                { label: "Kelembapan (%)", width: 100 },
                { label: "Akselerasi (X,Y,Z)", width: 160 }
            ],
            rows: rows.map((row, index) => [
                index + 1,
                row.created_at.toLocaleString(),
                row.temperature,
                row.humidity,
                `${row.accelX}, ${row.accelY}, ${row.accelZ}`
            ])
        };

        // Buat tabel
        await doc.table(table, { prepareHeader: () => doc.fontSize(10), prepareRow: () => doc.fontSize(10) });

        doc.end();
    } catch (err) {
        console.error("Gagal buat PDF:", err);
        res.status(500).send("Terjadi kesalahan saat membuat PDF.");
    }
});


// Jalankan server
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
