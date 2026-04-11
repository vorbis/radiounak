// ========================
// НАСТРОЙКИ
// ========================
const RADIO_NAME = 'RadioUnak';
const URL_STREAMING = 'https://drh-node-03.dline-media.com/RadioUnak';

// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================
let audioPlayer = null;
let isPlaying = false;
let songHistory = [];
let currentMetadata = { title: '...', artist: '...' };

// ========================
// ИНИЦИАЛИЗАЦИЯ
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initEventListeners();
    loadHistoryFromStorage();
    startMetadataPolling(); // начинаем активно опрашивать метаданные
});

function initAudio() {
    audioPlayer = new Audio(URL_STREAMING);
    audioPlayer.volume = 0.8;
    
    audioPlayer.addEventListener('error', () => {
        console.log('Ошибка потока, переподключение...');
        if (isPlaying) {
            setTimeout(() => {
                audioPlayer.play().catch(e => console.log('Ошибка переподключения:', e));
            }, 3000);
        }
    });
}

function initEventListeners() {
    // Отключаем кнопку LETRA, если она ещё есть
    const lyricsLink = document.querySelector('.lyrics');
    if (lyricsLink) {
        lyricsLink.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
}

// ========================
// АКТИВНЫЙ ЗАХВАТ МЕТАДАННЫХ (КАЖДЫЕ 5 СЕКУНД)
// ========================
function startMetadataPolling() {
    // Первый запрос сразу после загрузки
    fetchMetadata();
    // Затем каждые 5 секунд
    setInterval(fetchMetadata, 5000);
}

function fetchMetadata() {
    // Пытаемся получить метаданные через специальный запрос к Icecast-серверу
    fetch(URL_STREAMING, { 
        headers: { 
            'Icy-MetaData': '1'
        }
    })
    .then(response => {
        // Проверяем заголовки Icecast
        const icyTitle = response.headers.get('icy-title');
        if (icyTitle && icyTitle !== RADIO_NAME && icyTitle !== '') {
            parseAndSetSong(icyTitle);
            return;
        }
        
        // Если заголовка icy-title нет, пробуем прочитать тело ответа (для некоторых серверов)
        return response.text();
    })
    .then(body => {
        if (body && typeof body === 'string') {
            // Ищем StreamTitle в теле ответа (метод для SHOUTcast)
            const match = body.match(/StreamTitle='([^']+)'/);
            if (match && match[1]) {
                parseAndSetSong(match[1]);
            }
        }
    })
    .catch(e => console.log('Не удалось получить метаданные:', e));
}

function parseAndSetSong(metadata) {
    if (!metadata || metadata === RADIO_NAME || metadata === '') return;
    
    let title = metadata;
    let artist = '';
    
    // Пробуем разные разделители
    if (metadata.includes(' - ')) {
        const parts = metadata.split(' - ');
        artist = parts[0];
        title = parts[1];
    } else if (metadata.includes(' – ')) {
        const parts = metadata.split(' – ');
        artist = parts[0];
        title = parts[1];
    } else if (metadata.includes(' — ')) {
        const parts = metadata.split(' — ');
        artist = parts[0];
        title = parts[1];
    }
    
    // Если ничего не распарсилось, считаем всю строку названием
    if (artist === '' && title === metadata) {
        title = metadata;
        artist = '';
    }
    
    // Обновляем отображение, только если информация изменилась
    if (currentMetadata.title === title && currentMetadata.artist === artist) return;
    
    currentMetadata = { title, artist };
    
    const currentSongEl = document.getElementById('currentSong');
    const currentArtistEl = document.getElementById('currentArtist');
    
    if (currentSongEl) currentSongEl.textContent = title || '—';
    if (currentArtistEl) currentArtistEl.textContent = artist || '—';
    
    console.log(`Сейчас играет: ${artist} - ${title}`);
    
    // Добавляем в историю
    if (title && title !== '—' && title !== RADIO_NAME) {
        addToHistory(title, artist);
    }
}

// ========================
// ФУНКЦИЯ PLAY/PAUSE
// ========================
window.togglePlay = function() {
    const playBtn = document.getElementById('playerButton');
    
    if (!audioPlayer) {
        console.error('Аудиоплеер не инициализирован');
        return;
    }
    
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        if (playBtn) playBtn.className = 'fa fa-play-circle';
    } else {
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playBtn) playBtn.className = 'fa fa-pause-circle';
                // При запуске воспроизведения сразу запрашиваем метаданные
                fetchMetadata();
            })
            .catch(error => {
                console.error('Ошибка воспроизведения:', error);
                alert('Не удалось подключиться к радиостанции.');
            });
    }
};

// ========================
// ИСТОРИЯ (без изменений)
// ========================
function addToHistory(songTitle, songArtist) {
    if (!songTitle || songTitle === '...' || songTitle === RADIO_NAME) return;
    
    const song = {
        title: songTitle,
        artist: songArtist || '',
        timestamp: new Date().toLocaleTimeString()
    };
    
    if (songHistory.length > 0 && songHistory[0].title === songTitle) return;
    
    songHistory.unshift(song);
    if (songHistory.length > 8) songHistory.pop();
    
    localStorage.setItem('radio_song_history', JSON.stringify(songHistory));
    renderHistory();
}

function loadHistoryFromStorage() {
    const stored = localStorage.getItem('radio_song_history');
    if (stored) {
        songHistory = JSON.parse(stored);
        renderHistory();
    }
}

function renderHistory() {
    const historyContainer = document.getElementById('historicSong');
    if (!historyContainer) return;
    
    const articles = historyContainer.querySelectorAll('article');
    
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const song = songHistory[i];
        
        const songDiv = article.querySelector('.song');
        const artistDiv = article.querySelector('.artist');
        const coverDiv = article.querySelector('.cover-historic');
        
        if (song) {
            if (songDiv) songDiv.textContent = song.title;
            if (artistDiv) artistDiv.textContent = song.artist || '—';
            if (coverDiv) coverDiv.style.backgroundImage = "url('img/cover.png')";
        } else {
            if (songDiv) songDiv.textContent = '—';
            if (artistDiv) artistDiv.textContent = '—';
        }
    }
}
