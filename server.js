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
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

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
        io.emit('sensorUpdate', sensorData);
        res.json({ success: true, message: "Data berhasil disimpan!" });
    } catch (err) {
        console.error('Gagal menyimpan data ke database:', err);
        res.status(500).json({ success: false, message: "Gagal simpan data" });
    }
});

app.get('/sensor-history', async (req, res) => {
    try {
        const date = req.query.date;

        if (date) {
            const [rows] = await db.query(
                "SELECT * FROM sensor_data WHERE DATE(created_at) = ? ORDER BY created_at DESC", 
                [date]
            );
            res.json({ success: true, data: rows });

        } else {
            const [rows] = await db.query("SELECT * FROM sensor_data ORDER BY created_at DESC LIMIT 20");
            res.json({ success: true, data: rows.reverse() });
        }

    } catch (err) {
        console.error('Gagal ambil data:', err);
        res.status(500).json({ success: false, message: 'Gagal ambil data dari database' });
    }
});

// PDF Safety Tips
app.get('/download-safety-tips', (req, res) => {
    try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Panduan_Keselamatan_Gempa.pdf');

        doc.pipe(res);

        doc.fontSize(20).font('Helvetica-Bold').text('Panduan Keselamatan Gempa Bumi', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(16).font('Helvetica-Bold').text('SEBELUM GEMPA (Kesiapsiagaan)', { underline: true });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').list([
            'Siapkan Tas Siaga Bencana berisi P3K, makanan, air, senter, baterai, peluit, dll.',
            'Amankan perabotan berat (lemari, rak buku) dengan mengencangkannya ke dinding.',
            'Ketahui jalur evakuasi dan tentukan titik kumpul yang aman bersama keluarga.'
        ], { bulletRadius: 2, textIndent: 10 });
        doc.moveDown();

        doc.fontSize(16).font('Helvetica-Bold').text('SAAT GEMPA (Tindakan Cepat)', { underline: true });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').list([
            'Terapkan metode "Merunduk, Berlindung, dan Bertahan (Drop, Cover, and Hold On)". Segera berlindung di bawah meja yang kokoh.',
            'Jauhi jendela, kaca, cermin, dan benda-benda yang mudah jatuh.',
            'Jangan panik. Tetap tenang dan ikuti prosedur evakuasi jika diperlukan.'
        ], { bulletRadius: 2, textIndent: 10 });
        doc.moveDown();
        
        doc.fontSize(16).font('Helvetica-Bold').text('SETELAH GEMPA (Evaluasi & Pemulihan)', { underline: true });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').list([
            'Periksa kondisi diri dan orang di sekitar Anda dari cedera.',
            'Jika aman, matikan listrik dan gas untuk mencegah bahaya kebakaran.',
            'Dengarkan informasi resmi dari sumber terpercaya (BMKG, BNPB) mengenai potensi gempa susulan.'
        ], { bulletRadius: 2, textIndent: 10 });

        doc.end();

    } catch (err) {
        console.error("Gagal membuat PDF Safety Tips:", err);
        res.status(500).send("Gagal membuat dokumen PDF.");
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
