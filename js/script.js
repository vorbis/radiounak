// ========================
// НАСТРОЙКИ
// ========================
const RADIO_NAME = 'RadioUnak';
const URL_STREAMING = 'https://drh-node-03.dline-media.com/RadioUnak';

// ========================
// ПЕРЕМЕННЫЕ
// ========================
let audioPlayer = null;
let isPlaying = false;
let songHistory = [];
let lastSongTitle = '';

// ========================
// ЗАПУСК ПРИ ЗАГРУЗКЕ
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    loadHistoryFromStorage();
    startMetadataProxy(); // запускаем обходной путь для метаданных
});

function initAudio() {
    audioPlayer = new Audio(URL_STREAMING);
    audioPlayer.volume = 0.8;
    
    audioPlayer.addEventListener('error', () => {
        if (isPlaying) {
            setTimeout(() => audioPlayer.play().catch(e => console.log(e)), 3000);
        }
    });
}

// ========================
// ОБХОДНОЙ ПУТЬ ДЛЯ МЕТАДАННЫХ
// Используем CORS-прокси или альтернативный метод
// ========================
function startMetadataProxy() {
    // Пробуем получить метаданные через публичный CORS-прокси
    // Это временное решение, но работает с большинством серверов
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(URL_STREAMING);
    
    setInterval(() => {
        fetch(proxyUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.text())
        .then(data => {
            // Ищем StreamTitle в теле ответа (метод для SHOUTcast/Icecast)
            const match = data.match(/StreamTitle='([^']+)'/);
            if (match && match[1] && match[1] !== lastSongTitle) {
                lastSongTitle = match[1];
                updateNowPlaying(match[1]);
            }
        })
        .catch(e => console.log('Proxy fetch error:', e));
    }, 10000); // каждые 10 секунд
}

function updateNowPlaying(metadata) {
    if (!metadata || metadata === RADIO_NAME) return;
    
    // Разбираем "Исполнитель - Название"
    let artist = '';
    let title = metadata;
    
    if (metadata.includes(' - ')) {
        const parts = metadata.split(' - ');
        artist = parts[0];
        title = parts[1];
    } else if (metadata.includes(' – ')) {
        const parts = metadata.split(' – ');
        artist = parts[0];
        title = parts[1];
    }
    
    // Обновляем HTML
    const songEl = document.getElementById('currentSong');
    const artistEl = document.getElementById('currentArtist');
    
    if (songEl) songEl.textContent = title || metadata;
    if (artistEl) artistEl.textContent = artist || '';
    
    console.log(`🎵 Сейчас играет: ${artist} - ${title}`);
    
    // Сохраняем в историю
    addToHistory(title, artist);
}

// ========================
// PLAY/PAUSE
// ========================
window.togglePlay = function() {
    const playBtn = document.getElementById('playerButton');
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        if (playBtn) playBtn.className = 'fa fa-play-circle';
    } else {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playBtn) playBtn.className = 'fa fa-pause-circle';
            })
            .catch(err => alert('Ошибка: ' + err.message));
    }
};

// ========================
// ИСТОРИЯ (8 треков)
// ========================
function addToHistory(title, artist) {
    if (!title || title === RADIO_NAME) return;
    
    const song = { title, artist, time: new Date().toLocaleTimeString() };
    
    // Не дублируем последний трек
    if (songHistory.length > 0 && songHistory[0].title === title) return;
    
    songHistory.unshift(song);
    if (songHistory.length > 8) songHistory.pop();
    localStorage.setItem('radio_history', JSON.stringify(songHistory));
    
    renderHistory();
}

function loadHistoryFromStorage() {
    const stored = localStorage.getItem('radio_history');
    if (stored) {
        songHistory = JSON.parse(stored);
        renderHistory();
    }
}

function renderHistory() {
    const container = document.getElementById('historicSong');
    if (!container) return;
    
    const articles = container.querySelectorAll('article');
    
    for (let i = 0; i < articles.length; i++) {
        const art = articles[i];
        const song = songHistory[i];
        const songDiv = art.querySelector('.song');
        const artistDiv = art.querySelector('.artist');
        
        if (song) {
            if (songDiv) songDiv.textContent = song.title;
            if (artistDiv) artistDiv.textContent = song.artist || '—';
        } else {
            if (songDiv) songDiv.textContent = '—';
            if (artistDiv) artistDiv.textContent = '—';
        }
    }
}
