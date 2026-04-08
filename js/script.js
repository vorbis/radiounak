// ========================
// НАСТРОЙКИ (отредактируйте под себя)
// ========================
const RADIO_NAME = 'RadioUnak';
const URL_STREAMING = 'https://drh-node-03.dline-media.com/RadioUnak';

// Показывать/скрывать элементы интерфейса
const SHOW_VOLUME = true;
const SHOW_PLAYLIST = true;

// Тексты интерфейса
const LIVE_TEXT = 'ЭФИР';
const NOW_PLAYING = 'Сейчас играет';

// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================
let audioPlayer = null;
let isPlaying = false;
let songHistory = [];
let currentSong = { title: 'Неизвестно', artist: '' };

// ========================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    initEventListeners();
    loadHistoryFromStorage();
    updateUI();
});

function initAudio() {
    // Создаём аудиоплеер
    audioPlayer = new Audio(URL_STREAMING);
    audioPlayer.volume = 0.8;
    
    // При получении метаданных обновляем информацию о треке
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateSongInfo();
    });
    
    // Периодическое обновление (каждые 5 секунд)
    setInterval(updateSongInfo, 5000);
    
    // Автоматическое переподключение при ошибках
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
    // КНОПКА PLAY/PAUSE — самое главное!
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }
    
    // Кнопка громкости
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumePercent = document.getElementById('volumePercent');
    
    if (volumeBtn && volumeSlider) {
        volumeBtn.addEventListener('click', () => {
            const control = document.querySelector('.volume-control');
            if (control) control.style.display = control.style.display === 'none' ? 'flex' : 'none';
        });
        
        volumeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            audioPlayer.volume = val / 100;
            if (volumePercent) volumePercent.textContent = `${val}%`;
        });
    }
    
    // Кнопка истории
    const historyBtn = document.getElementById('showHistoryBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', showHistory);
    }
    
    // Закрытие модального окна истории
    const closeBtn = document.querySelector('.close');
    const historyModal = document.getElementById('historyModal');
    if (closeBtn && historyModal) {
        closeBtn.addEventListener('click', () => {
            historyModal.style.display = 'none';
        });
        window.addEventListener('click', (e) => {
            if (e.target === historyModal) historyModal.style.display = 'none';
        });
    }
}

// ========================
// УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
// ========================
function togglePlayPause() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const liveIndicator = document.getElementById('liveIndicator');
    
    if (isPlaying) {
        // Пауза
        audioPlayer.pause();
        isPlaying = false;
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play-circle"></i>';
        if (liveIndicator) liveIndicator.classList.remove('active');
    } else {
        // Воспроизведение
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause-circle"></i>';
                if (liveIndicator) liveIndicator.classList.add('active');
            })
            .catch(error => {
                console.error('Ошибка воспроизведения:', error);
                alert('Не удалось подключиться к радиостанции. Проверьте интернет или URL потока.');
            });
    }
}

// ========================
// ИНФОРМАЦИЯ О ТРЕКЕ
// ========================
function updateSongInfo() {
    // Пытаемся получить метаданные через fetch
    fetch(URL_STREAMING, { headers: { 'Icy-MetaData': '1' } })
        .then(response => {
            const icyTitle = response.headers.get('icy-title');
            if (icyTitle && icyTitle !== RADIO_NAME) {
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
    
    // Если трек изменился — добавляем в историю
    if (title !== currentSong.title && title !== RADIO_NAME && title !== '') {
        addToHistory(title, artist);
        currentSong.title = title;
        currentSong.artist = artist;
    }
    
    // Обновляем отображение на странице
    const currentSongEl = document.getElementById('currentSong');
    const currentArtistEl = document.getElementById('currentArtist');
    if (currentSongEl) currentSongEl.textContent = title;
    if (currentArtistEl) currentArtistEl.textContent = artist;
}

// ========================
// ИСТОРИЯ ТРЕКОВ
// ========================
function addToHistory(songTitle, songArtist) {
    if (!songTitle || songTitle === 'Неизвестно' || songTitle === RADIO_NAME) return;
    
    const song = {
        title: songTitle,
        artist: songArtist || '',
        timestamp: new Date().toLocaleTimeString()
    };
    
    songHistory.unshift(song);
    if (songHistory.length > 20) songHistory.pop();
    
    localStorage.setItem('radio_song_history', JSON.stringify(songHistory));
    renderHistory();
}

function loadHistoryFromStorage() {
    const stored = localStorage.getItem('radio_song_history');
    if (stored) songHistory = JSON.parse(stored);
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (songHistory.length === 0) {
        container.innerHTML = '<p class="text-center">История пока пуста</p>';
        return;
    }
    
    songHistory.forEach(song => {
        const el = document.createElement('div');
        el.className = 'historic-item';
        el.innerHTML = `
            <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
            <div class="music-info">
                <div class="song">${escapeHtml(song.title)}</div>
                <div class="artist">${escapeHtml(song.artist) || '—'}</div>
                <div class="time">${song.timestamp}</div>
            </div>
        `;
        container.appendChild(el);
    });
}

function showHistory() {
    renderHistory();
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'block';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateUI() {
    const liveIndicator = document.getElementById('liveIndicator');
    if (liveIndicator) liveIndicator.textContent = LIVE_TEXT;
    
    if (!SHOW_VOLUME) {
        const volContainer = document.querySelector('.volume-container');
        if (volContainer) volContainer.style.display = 'none';
    }
    if (!SHOW_PLAYLIST) {
        const historyBtn = document.getElementById('showHistoryBtn');
        if (historyBtn) historyBtn.style.display = 'none';
    }
}
