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

// ========================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initEventListeners();
    loadHistoryFromStorage();
    updateSongInfo();
});

function initAudio() {
    audioPlayer = new Audio(URL_STREAMING);
    
    const volumeSlider = document.getElementById('volume');
    if (volumeSlider) {
        audioPlayer.volume = volumeSlider.value / 100;
    } else {
        audioPlayer.volume = 0.8;
    }
    
    audioPlayer.addEventListener('error', () => {
        console.log('Ошибка потока, переподключение...');
        if (isPlaying) {
            setTimeout(() => {
                audioPlayer.play().catch(e => console.log('Ошибка переподключения:', e));
            }, 3000);
        }
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateSongInfo();
    });
    
    setInterval(updateSongInfo, 10000);
}

function initEventListeners() {
    // ===== ПОЛЗУНОК ГРОМКОСТИ =====
    const volumeSlider = document.getElementById('volume');
    const volIndicator = document.getElementById('volIndicator');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (audioPlayer) audioPlayer.volume = val / 100;
            if (volIndicator) volIndicator.textContent = val;
        });
        
        if (volIndicator) volIndicator.textContent = volumeSlider.value;
    }
    
    // ===== ОТКЛЮЧАЕМ КНОПКУ "LETRA" =====
    const lyricsLink = document.querySelector('.lyrics');
    if (lyricsLink) {
        lyricsLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Функция текстов песен отключена');
        });
    }
}

// ========================
// ГЛАВНАЯ ФУНКЦИЯ PLAY/PAUSE
// Вызывается из onclick в HTML
// ========================
window.togglePlay = function() {
    const playBtn = document.getElementById('playerButton');
    
    if (!audioPlayer) {
        console.error('Аудиоплеер не инициализирован');
        return;
    }
    
    if (isPlaying) {
        // Останавливаем воспроизведение
        audioPlayer.pause();
        isPlaying = false;
        if (playBtn) {
            playBtn.className = 'fa fa-play-circle';
        }
        console.log('Воспроизведение остановлено');
    } else {
        // Запускаем воспроизведение
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playBtn) {
                    playBtn.className = 'fa fa-pause-circle';
                }
                console.log('Воспроизведение запущено');
            })
            .catch(error => {
                console.error('Ошибка воспроизведения:', error);
                alert('Не удалось подключиться к радиостанции.\nПроверьте интернет или URL потока.');
            });
    }
};

// ========================
// ИНФОРМАЦИЯ О ТРЕКЕ
// ========================
function updateSongInfo() {
    fetch(URL_STREAMING, { headers: { 'Icy-MetaData': '1' } })
        .then(response => {
            const icyTitle = response.headers.get('icy-title');
            if (icyTitle && icyTitle !== RADIO_NAME && icyTitle !== '') {
                parseAndSetSong(icyTitle);
            }
        })
        .catch(e => console.log('Не удалось получить метаданные:', e));
}

function parseAndSetSong(metadata) {
    let title = metadata;
    let artist = '';
    
    if (metadata.includes(' - ')) {
        const parts = metadata.split(' - ');
        artist = parts[0];
        title = parts[1];
    } else if (metadata.includes(' – ')) {
        const parts = metadata.split(' – ');
        artist = parts[0];
        title = parts[1];
    }
    
    const currentSongEl = document.getElementById('currentSong');
    const currentArtistEl = document.getElementById('currentArtist');
    
    if (currentSongEl) currentSongEl.textContent = title;
    if (currentArtistEl) currentArtistEl.textContent = artist || '—';
    
    if (title !== 'Song' && title !== '' && title !== RADIO_NAME) {
        addToHistory(title, artist);
    }
}

// ========================
// ИСТОРИЯ
// ========================
function addToHistory(songTitle, songArtist) {
    if (!songTitle || songTitle === 'Song' || songTitle === RADIO_NAME) return;
    
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
