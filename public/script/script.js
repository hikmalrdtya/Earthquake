// Calendar
const monthYearElement = document.getElementById("monthYear");
const dayElement = document.getElementById("day");
const timeElement = document.getElementById("time");

const updateCalendar = () => {
  const date = new Date();

  const monthYear = date.toLocaleString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const day = date.toLocaleString("id-ID", { weekday: "long", day: "numeric" });

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const time = `${hours}:${minutes}:${seconds}`;

  monthYearElement.textContent = monthYear;
  dayElement.textContent = day;
  timeElement.textContent = time;
};

updateCalendar();
setInterval(updateCalendar, 1000);

// Map Gempa
const map = L.map("map").setView([-2.5489, 118.0149], 4);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 20,
}).addTo(map);

const usgsApiUrl =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";

function getMarkerColor(magnitude) {
  if (magnitude < 4.0) {
    return "#64B5F6"; 
  } else if (magnitude < 6.0) {
    return "#FFD54F"; 
  } else {
    return "#E57373"; 
  }
}

fetch(usgsApiUrl)
  .then((response) => response.json())
  .then((data) => {
    const gempaList = data.features;
    console.log("Data berhasil diambil dari USGS:", gempaList);

    gempaList.forEach((gempa) => {
      const props = gempa.properties;
      const coords = gempa.geometry.coordinates; 

      const lon = coords[0];
      const lat = coords[1];
      const depth = coords[2];
      const magnitude = props.mag;
      const region = props.place;

      const time = new Date(props.time).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });

      const popupContent = `
                        <b>${region}</b><br>
                        Magnitudo: ${magnitude} M<br>
                        Kedalaman: ${depth.toFixed(2)} km<br>
                        Waktu: ${time} WIB
                    `;

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
        event.preventDefault();

        navLinks.forEach(nav => nav.classList.remove('active'));

        link.classList.add('active');

        contentPanels.forEach(panel => {
            panel.style.display = 'none';
        });

        const contentId = link.id + '-content';
        const activePanel = document.querySelector('.' + contentId);
        
        if (activePanel) {
            activePanel.style.display = 'flex';

            if (link.id === 'history') {
                if (typeof loadRekapData === 'function') {
                    loadRekapData(); 
                }
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('home').click();
});

// Grafik
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
        tension: 0.4,
      },
    ],
  },
  options: {
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
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

function addData(chart, label, value) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);

  if (chart.data.labels.length > 20) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update();
}

async function fetchSensorData() {
  try {
    const res = await fetch("/sensor-history");
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      const last = data.data[data.data.length - 1];
      const timeLabel = new Date(last.created_at).toLocaleTimeString(); 

      const acc = Math.sqrt(
        Math.pow(last.accelX || 0, 2) +
          Math.pow(last.accelY || 0, 2) +
          Math.pow(last.accelZ || 0, 2)
      );

      addData(chart1, timeLabel, acc.toFixed(2));
      addData(chart2, timeLabel, last.temperature);
      addData(chart3, timeLabel, last.humidity);
    }
  } catch (err) {
    console.error("Gagal ambil data sensor:", err);
  }
}
setInterval(fetchSensorData, 5000);

// Rekap Data
const rekapDateElement = document.getElementById('rekapDate');
const rekapTableBody = document.querySelector('#rekapTable tbody');

async function fetchAndDisplayRekap(date) {
    try {
        rekapTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat data...</td></tr>';
        
        const response = await fetch(`/sensor-history?date=${date}`);
        const result = await response.json();

        rekapTableBody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach((item, index) => {
                const tr = document.createElement('tr');
                const formattedTime = new Date(item.created_at).toLocaleString('id-ID', { hour12: false });

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${formattedTime}</td>
                    <td>${item.temperature}</td>
                    <td>${item.humidity}</td>
                    <td>${item.accelX}, ${item.accelY}, ${item.accelZ}</td>
                `;
                
                rekapTableBody.appendChild(tr);
            });
        } else {
            rekapTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada data untuk tanggal ini.</td></tr>';
        }

    } catch (error) {
        console.error('Gagal memuat data rekap:', error);
        rekapTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Gagal memuat data. Silakan coba lagi.</td></tr>';
    }
}

rekapDateElement.addEventListener('change', () => {
    const selectedDate = rekapDateElement.value;
    if (selectedDate) {
        fetchAndDisplayRekap(selectedDate);
    }
});

function loadRekapData() {
    const today = new Date().toISOString().slice(0, 10);
    rekapDateElement.value = today;

    fetchAndDisplayRekap(today);
}

document.getElementById("btnDownloadRekap").addEventListener("click", function () {
    const date = rekapDateElement.value;
    if (date) {
        window.location.href = `/rekap-pdf?date=${date}`;
    } else {
        window.location.href = `/rekap-pdf`;
    }
});

// Safety PDF
const downloadTipsButton = document.getElementById('btnDownloadSafetyTips');
if (downloadTipsButton) {
    downloadTipsButton.addEventListener('click', function() {
        window.location.href = '/download-safety-tips';
    });
}
