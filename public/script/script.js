// Calendar
const monthYearElement = document.getElementById("monthYear");
const dayElement = document.getElementById("day");
const timeElement = document.getElementById("time");

const updateCalendar = () => {
  const date = new Date();

  // Format bulan & tahun (contoh: Februari 2025)
  const monthYear = date.toLocaleString("id-ID", {
    month: "long",
    year: "numeric",
  });

  // Format hari & tanggal (contoh: Senin, 17)
  const day = date.toLocaleString("id-ID", { weekday: "long", day: "numeric" });

  // jam
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const time = `${hours}:${minutes}:${seconds}`;

  // Tampilkan di elemen HTML
  monthYearElement.textContent = monthYear;
  dayElement.textContent = day;
  timeElement.textContent = time;
};

// Panggil fungsi saat halaman dimuat
updateCalendar();
setInterval(updateCalendar, 1000);

// Map Gempa
const map = L.map("map").setView([-2.5489, 118.0149], 4);

// --- PERUBAHAN 1: MENGGANTI TILE LAYER MENJADI TEMA GELAP ---
// Menggunakan tile layer dari CartoDB (tema Positron) yang gelap dan gratis
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
}).addTo(map);

// --- PERUBAHAN 2: MENGGANTI URL API KE USGS ---
// API USGS untuk gempa magnitudo 2.5+ dalam 7 hari terakhir
const usgsApiUrl =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";

// Fungsi untuk menentukan warna marker berdasarkan magnitudo (tidak berubah)
function getMarkerColor(magnitude) {
  if (magnitude < 4.0) {
    return "#64B5F6"; // Biru muda
  } else if (magnitude < 6.0) {
    return "#FFD54F"; // Kuning
  } else {
    return "#E57373"; // Merah
  }
}

// Mengambil data gempa menggunakan Fetch API
fetch(usgsApiUrl)
  .then((response) => response.json())
  .then((data) => {
    // --- PERUBAHAN 3: MENYESUAIKAN STRUKTUR DATA USGS ---
    // Data gempa USGS ada di dalam array 'features'
    const gempaList = data.features;
    console.log("Data berhasil diambil dari USGS:", gempaList);

    gempaList.forEach((gempa) => {
      // Ekstrak informasi dari struktur GeoJSON USGS
      const props = gempa.properties; // properties berisi semua detail
      const coords = gempa.geometry.coordinates; // geometry berisi koordinat

      const lon = coords[0];
      const lat = coords[1];
      const depth = coords[2];
      const magnitude = props.mag;
      const region = props.place;

      // Waktu dalam format timestamp, perlu diubah agar mudah dibaca
      const time = new Date(props.time).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });

      // Membuat konten untuk popup
      const popupContent = `
                        <b>${region}</b><br>
                        Magnitudo: ${magnitude} M<br>
                        Kedalaman: ${depth.toFixed(2)} km<br>
                        Waktu: ${time} WIB
                    `;

      // Membuat marker lingkaran (CircleMarker)
      // Radius diatur agar tidak terlalu besar untuk data global
      L.circleMarker([lat, lon], {
        radius: magnitude * 1.5,
        color: getMarkerColor(magnitude),
        fillColor: getMarkerColor(magnitude),
        fillOpacity: 0.8,
      })
        .addTo(map)
        .bindPopup(popupContent);
    });
  })
  .catch((error) => {
    console.error("Gagal mengambil data gempa dari USGS:", error);
    document.getElementById("map").innerHTML =
      '<h2 style="text-align:center; color: #f0f0f0;">Gagal memuat data gempa. Coba lagi nanti.</h2>';
  });

// active nav & display content
const navLinks = document.querySelectorAll('nav a');
const contentPanels = document.querySelectorAll('.content > div[class$="-content"]');

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault(); // Mencegah link pindah halaman

        // 1. Hapus kelas 'active' dari semua link nav
        navLinks.forEach(nav => nav.classList.remove('active'));

        // 2. Tambahkan kelas 'active' ke link yang baru diklik
        link.classList.add('active');

        // 3. Sembunyikan semua panel konten
        contentPanels.forEach(panel => {
            panel.style.display = 'none';
        });

        // 4. Tampilkan panel konten yang sesuai
        const contentId = link.id + '-content'; // contoh: 'home' -> 'home-content'
        const activePanel = document.querySelector('.' + contentId);
        
        if (activePanel) { // Pemeriksaan penting: hanya tampilkan jika elemennya ada
            activePanel.style.display = 'flex'; // atau 'flex' jika Anda menggunakan flexbox

            // Panggil fungsi spesifik jika diperlukan
            if (link.id === 'history') {
                // Pastikan fungsi loadRekapData sudah didefinisikan
                if (typeof loadRekapData === 'function') {
                    loadRekapData(); 
                }
            }
        }
    });
});

// Tambahkan ini untuk memastikan tampilan awal benar saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('home').click();
});

// Rekap Data
function loadRekapData() {
  fetch("/sensor-history")
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const tbody = document.querySelector("#rekapTable tbody");
        tbody.innerHTML = ""; // kosongkan dulu

        data.data.forEach((item, index) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${new Date(item.created_at).toLocaleString()}</td>
                        <td>${item.temperature}</td>
                        <td>${item.humidity}</td>
                        <td>${item.accelX}, ${item.accelY}, ${item.accelZ}</td>
                    `;
          tbody.appendChild(tr);
        });
      } else {
        alert("Gagal ambil data rekap!");
      }
    })
    .catch((err) => {
      console.error("Error ambil data:", err);
    });
}

// Grafik
// Grafik Getaran
const chartOptions = {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "",
        data: [],
        borderColor: "blue",
        borderWidth: 2,
        fill: false,
        tension: 0.4, // <-- Membuat garis jadi melengkung halus
      },
    ],
  },
  options: {
    animation: {
      duration: 1000, // Durasi animasi 800ms
      easing: "easeOutQuart", // Efek animasi halus
    },
    scales: {
      x: { display: true },
      y: { beginAtZero: true },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  },
};

const ctx1 = document.getElementById("chart1").getContext("2d");
const chart1 = new Chart(ctx1, structuredClone(chartOptions));
chart1.data.datasets[0].label = "Akselerasi (Total)";

const ctx2 = document.getElementById("chart2").getContext("2d");
const chart2 = new Chart(ctx2, structuredClone(chartOptions));
chart2.data.datasets[0].label = "Suhu (°C)";
chart2.data.datasets[0].borderColor = "red";

const ctx3 = document.getElementById("chart3").getContext("2d");
const chart3 = new Chart(ctx3, structuredClone(chartOptions));
chart3.data.datasets[0].label = "Kelembapan (%)";
chart3.data.datasets[0].borderColor = "green";

// Tambahkan data ke chart
function addData(chart, label, value) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);

  // Maksimum 20 data
  if (chart.data.labels.length > 20) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

// Ambil data dari backend setiap 5 detik
async function fetchSensorData() {
  try {
    const res = await fetch("/sensor-history");
    const data = await res.json();

    // Pastikan data berhasil diterima
    if (data.success && data.data.length > 0) {
      const last = data.data[data.data.length - 1]; // ambil data paling baru
      const timeLabel = new Date(last.created_at).toLocaleTimeString(); // gunakan created_at sebagai waktu

      // Menghitung akselerasi total
      const acc = Math.sqrt(
        Math.pow(last.accelX || 0, 2) +
          Math.pow(last.accelY || 0, 2) +
          Math.pow(last.accelZ || 0, 2)
      );

      // Menambahkan data ke grafik
      addData(chart1, timeLabel, acc.toFixed(2));
      addData(chart2, timeLabel, last.temperature); // pastikan nama kolom sesuai
      addData(chart3, timeLabel, last.humidity); // pastikan nama kolom sesuai
    }
  } catch (err) {
    console.error("Gagal ambil data sensor:", err);
  }
}
setInterval(fetchSensorData, 5000); // ambil setiap 5 detik 

// PDF Dwonload
document
  .getElementById("btnDownloadRekap")
  .addEventListener("click", function () {
    const date = document.getElementById("rekapDate").value;
    if (date) {
      window.location.href = `/rekap-pdf?date=${date}`;
    } else {
      window.location.href = `/rekap-pdf`; // default hari ini
    }
  });
