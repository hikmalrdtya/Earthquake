// Calendar
const monthYearElement = document.getElementById("monthYear");
const dayElement = document.getElementById("day");
const timeElement = document.getElementById("time");

const updateCalendar = () => {
    const date = new Date();

    // Format bulan & tahun (contoh: Februari 2025)
    const monthYear = date.toLocaleString("id-ID", { month: "long", year: "numeric" });

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


// active nav & display content
const tabs = document.querySelectorAll('#home, #graph, #location, #history, #safety, #settings');
const contents = {
    home: document.querySelector('.home-content'),
    graph: document.querySelector('.graph-content'),
    location: document.querySelector('.location-content'),
    history: document.querySelector('.historical-content'),
    safety: document.querySelector('.safety-content'),
    settings: document.querySelector('.settings-content')
};

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        Object.values(contents).forEach(content => content.classList.add('hide'));

        contents[tab.id].classList.remove('hide');
        contents[tab.id].classList.add('display');
    })
})

// Grafik
// Grafik Getaran
const chartOptions = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: '',
            data: [],
            borderColor: 'blue',
            borderWidth: 2,
            fill: false,
            tension: 0.4 // <-- Membuat garis jadi melengkung halus
        }]
    },
    options: {
        animation: {
            duration: 1000, // Durasi animasi 800ms
            easing: 'easeOutQuart' // Efek animasi halus
        },
        scales: {
            x: { display: true },
            y: { beginAtZero: true }
        },
        plugins: {
            legend: {
                display: true
            }
        },
        responsive: true,
        maintainAspectRatio: false
    }
};


const ctx1 = document.getElementById('chart1').getContext('2d');
const chart1 = new Chart(ctx1, structuredClone(chartOptions));
chart1.data.datasets[0].label = 'Akselerasi (Total)';

const ctx2 = document.getElementById('chart2').getContext('2d');
const chart2 = new Chart(ctx2, structuredClone(chartOptions));
chart2.data.datasets[0].label = 'Suhu (°C)';
chart2.data.datasets[0].borderColor = 'red';

const ctx3 = document.getElementById('chart3').getContext('2d');
const chart3 = new Chart(ctx3, structuredClone(chartOptions));
chart3.data.datasets[0].label = 'Kelembapan (%)';
chart3.data.datasets[0].borderColor = 'green';

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
        const res = await fetch('/sensor-history');
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
        console.error('Gagal ambil data sensor:', err);
    }
}

setInterval(fetchSensorData, 5000); // ambil setiap 5 detik


// google map
let map;

function initMap() {
    var defaultLocation = { lat: -6.200000, lng: 106.816666 }; // Default to Jakarta
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: defaultLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true
    });

    // Tambahkan event listener untuk tombol
    document.getElementById('checkLocation').addEventListener('click', findUserLocation);
}

function findUserLocation() {
    var infoText = document.getElementById("info");
    infoText.innerHTML = "Mencari lokasi Anda...";

    // Reset existing markers and circles
    if (window.currentMarker) {
        window.currentMarker.setMap(null);
    }
    if (window.accuracyCircle) {
        window.accuracyCircle.setMap(null);
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,        // Reduced timeout to 10 seconds
        maximumAge: 0
    };

    if (navigator.geolocation) {
        try {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    updatePosition(position);

                    // Start watching position for better accuracy
                    window.watchId = navigator.geolocation.watchPosition(
                        updatePosition,
                        handleError,
                        options
                    );

                    // Stop watching after 20 seconds
                    setTimeout(() => {
                        if (window.watchId) {
                            navigator.geolocation.clearWatch(window.watchId);
                        }
                    }, 20000);
                },
                handleError,
                options
            );
        } catch (e) {
            infoText.innerHTML = `<span id='error-message'>Error: ${e.message}</span>`;
        }
    } else {
        infoText.innerHTML = "<span id='error-message'>Browser Anda tidak mendukung geolocation</span>";
    }
}

function updatePosition(position) {
    var userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };

    // Update map center and zoom
    map.setCenter(userLocation);
    map.setZoom(17);

    // Update or create marker
    if (!window.currentMarker) {
        window.currentMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            animation: google.maps.Animation.DROP,
            title: 'Lokasi Anda'
        });
    } else {
        window.currentMarker.setPosition(userLocation);
    }

    // Update accuracy circle
    if (window.accuracyCircle) {
        window.accuracyCircle.setMap(null);
    }

    window.accuracyCircle = new google.maps.Circle({
        map: map,
        center: userLocation,
        radius: position.coords.accuracy,
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 1
    });

    // Update info text
    document.getElementById("info").innerHTML =
        `<strong>Lokasi ditemukan!</strong><br>
        Latitude: ${userLocation.lat.toFixed(6)}<br>
        Longitude: ${userLocation.lng.toFixed(6)}<br>
        Akurasi: ${position.coords.accuracy.toFixed(1)} meter`;
}

function handleError(error) {
    var infoText = document.getElementById("info");
    switch (error.code) {
        case error.PERMISSION_DENIED:
            infoText.innerHTML = "<span id='error-message'>Mohon izinkan akses lokasi pada browser Anda</span>";
            break;
        case error.POSITION_UNAVAILABLE:
            infoText.innerHTML = "<span id='error-message'>Lokasi tidak dapat ditemukan. Pastikan GPS Anda aktif</span>";
            break;
        case error.TIMEOUT:
            infoText.innerHTML = "<span id='error-message'>Waktu pencarian lokasi habis. Silakan coba lagi</span>";
            break;
        default:
            infoText.innerHTML = "<span id='error-message'>Terjadi kesalahan saat mencari lokasi</span>";
            break;
    }
}
// Login
$(document).ready(function () {
    const validUsername = "aku";
    const validPass = "123";

    // Set cookie dengan debugging
    function setCookie(name, value, days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        let cookieString = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
        document.cookie = cookieString;
        console.log("Set Cookie:", cookieString);  // Debugging
    }

    // Ambil cookie dengan debugging
    function getCookie(name) {
        let cookies = document.cookie.split('; ');
        console.log("Cookies yang ditemukan:", document.cookie); // Debugging
        for (let cookie of cookies) {
            let [key, value] = cookie.split('=');
            if (key === name) {
                console.log(`Cookie ditemukan: ${key} = ${decodeURIComponent(value)}`); // Debugging
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Hapus cookie dengan debugging
    function deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    }

    // Cek apakah pengguna sudah login
    function checkLogin() {
        let username = getCookie('username');
        if (username) {
            $("#welcomeMsg").text(`Selamat datang, ${username}!`);
            $("#logout").show();
            $(".overlay").hide();
            $(".overlay").removeClass("show-overlay");
        } else {
            $(".overlay").addClass("show-overlay");
            $('.overlay').fadeIn(300);
        }
    }

    // Cek saat halaman dimuat
    checkLogin();

    $("#loginBtn").click(function () {
        let inputUsername = $("#username").val().trim();
        let inputPass = $("#password").val().trim();

        if (inputUsername === validUsername && inputPass === validPass) {
            setCookie('username', inputUsername, 7);
            $(".overlay").fadeOut(300);
            $("#welcomeMsg").text(`Selamat datang, ${inputUsername}!`);
            $("#logout").show();
            $("#errorMsg").hide();
        } else {
            $("#errorMsg").fadeIn();
        }
    });

    $("#logout").click(function () {
        deleteCookie('username');
        location.reload();
    });
});

// PDF Dwonload
document.getElementById('btnDownloadRekap').addEventListener('click', function () {
    const date = document.getElementById('rekapDate').value;
    if (date) {
        window.location.href = `/rekap-pdf?date=${date}`;
    } else {
        window.location.href = `/rekap-pdf`; // default hari ini
    }
});
