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
let metadataInterval = null;

// ========================
// ЗАПУСК ПРИ ЗАГРУЗКЕ
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    loadHistoryFromStorage();
});

function initAudio() {
    audioPlayer = new Audio(URL_STREAMING);
    audioPlayer.volume = 0.8;
    
    // Когда поток начинает играть, запускаем прослушку метаданных
    audioPlayer.addEventListener('play', () => {
        startMetadataListening();
    });
    
    audioPlayer.addEventListener('error', () => {
        console.log('Ошибка потока');
        if (isPlaying) {
            setTimeout(() => audioPlayer.play().catch(e => console.log(e)), 3000);
        }
    });
}

// ========================
// ПРОСЛУШКА МЕТАДАННЫХ ИЗ АУДИОПОТОКА
// ========================
function startMetadataListening() {
    if (metadataInterval) clearInterval(metadataInterval);
    
    // Каждые 8 секунд пытаемся извлечь метаданные из текущего источника
    metadataInterval = setInterval(() => {
        if (!audioPlayer || !audioPlayer.src) return;
        
        // Пробуем получить метаданные через fetch с правильными заголовками
        fetch(URL_STREAMING, {
            method: 'GET',
            headers: {
                'Icy-MetaData': '1',
                'User-Agent': 'WinampMPEG/5.09',
                'Accept': '*/*'
            }
        })
        .then(response => {
            // Проверяем заголовки Icecast/SHOUTcast
            const icyTitle = response.headers.get('icy-title');
            if (icyTitle && icyTitle !== lastSongTitle) {
                lastSongTitle = icyTitle;
                updateNowPlaying(icyTitle);
                return;
            }
            
            // Если заголовка нет, пробуем прочитать тело ответа (для SHOUTcast v1)
            return response.text();
        })
        .then(body => {
            if (body && typeof body === 'string') {
                // Ищем StreamTitle в теле (SHOUTcast style)
                const match = body.match(/StreamTitle='([^']+)'/);
                if (match && match[1] && match[1] !== lastSongTitle) {
                    lastSongTitle = match[1];
                    updateNowPlaying(match[1]);
                }
            }
        })
        .catch(e => console.log('Metadata fetch error:', e));
    }, 8000);
}

function updateNowPlaying(metadata) {
    if (!metadata || metadata === RADIO_NAME || metadata === '') return;
    
    // Разбираем "Исполнитель - Название"
    let artist = '';
    let title = metadata;
    
    // Пробуем разные разделители
    const separators = [' - ', ' – ', ' — ', ': '];
    for (const sep of separators) {
        if (metadata.includes(sep)) {
            const parts = metadata.split(sep);
            artist = parts[0];
            title = parts[1];
            break;
        }
    }
    
    // Если артист не найден, пробуем искать в скобках (например "Artist (Title)")
    if (!artist && metadata.includes('(') && metadata.includes(')')) {
        const match = metadata.match(/^(.+?)\s*\((.+?)\)/);
        if (match) {
            artist = match[1];
            title = match[2];
        }
    }
    
    // Обновляем HTML
    const songEl = document.getElementById('currentSong');
    const artistEl = document.getElementById('currentArtist');
    
    if (songEl) songEl.textContent = title || metadata;
    if (artistEl) artistEl.textContent = artist || '';
    
    console.log(`🎵 ${artist} - ${title}`);
    
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
        if (metadataInterval) clearInterval(metadataInterval);
    } else {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playBtn) playBtn.className = 'fa fa-pause-circle';
                startMetadataListening();
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Не удалось подключиться к радиостанции. Проверьте интернет.');
            });
    }
};

// ========================
// ИСТОРИЯ
// ========================
function addToHistory(title, artist) {
    if (!title || title === RADIO_NAME || title === '...') return;
    
    const song = { title, artist, time: new Date().toLocaleTimeString() };
    
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
