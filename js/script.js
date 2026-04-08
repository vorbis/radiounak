// ========================
// НАСТРОЙКИ (отредактируйте под себя)
// ========================
const RADIO_NAME = 'RadioUnak';
const URL_STREAMING = 'https://drh-node-03.dline-media.com/RadioUnak';

// Показывать/скрывать элементы интерфейса
const SHOW_PLAYER = true;
const SHOW_BACKGROUND_IMAGE = true;
const SHOW_COVER = true;
const URL_COVER = 'img/cover.png';
const SHOW_VOLUME = true;
const SHOW_PLAYLIST = true; // история песен

// Тексты интерфейса (теперь на русском)
const LIVE_TEXT = 'ЭФИР';
const NOW_PLAYING = 'Сейчас играет';

// ========================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ========================
let audioPlayer = null;
let currentVolume = 80;
let isPlaying = false;
let songHistory = [];
let currentSong = {
    title: 'Неизвестно',
    artist: ''
};

// DOM элементы
let playPauseBtn, volumeBtn, volumeSlider, volumePercent, historyContainer, historyModal, currentSongEl, currentArtistEl, liveIndicator;

// ========================
// ИНИЦИАЛИЗАЦИЯ ПЛЕЕРА
// ========================
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initAudio();
    initEventListeners();
    loadHistoryFromStorage();
    updateUI();
});

function initElements() {
    playPauseBtn = document.getElementById('playPauseBtn');
    volumeBtn = document.getElementById('volumeBtn');
    volumeSlider = document.getElementById('volumeSlider');
    volumePercent = document.getElementById('volumePercent');
    historyContainer = document.getElementById('historyContainer');
    historyModal = document.getElementById('historyModal');
    currentSongEl = document.getElementById('currentSong');
    currentArtistEl = document.getElementById('currentArtist');
    liveIndicator = document.getElementById('liveIndicator');
}

function initAudio() {
    audioPlayer = new Audio(URL_STREAMING);
    audioPlayer.volume = currentVolume / 100;
    
    // Отслеживаем метаданные потока (название трека)
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateSongInfo();
    });
    
    // Периодически обновляем информацию о треке (каждые 5 секунд)
    setInterval(updateSongInfo, 5000);
    
    // Обработка окончания потока (переподключение)
    audioPlayer.addEventListener('ended', () => {
        if (isPlaying) {
            setTimeout(() => {
                audioPlayer.play().catch(e => console.log('Auto-reconnect failed:', e));
            }, 1000);
        }
    });
    
    // Обработка ошибок
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        if (isPlaying) {
            setTimeout(() => {
                audioPlayer.play().catch(e => console.log('Reconnect failed:', e));
            }, 3000);
        }
    });
}

function initEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    volumeBtn.addEventListener('click', toggleVolumeSlider);
    volumeSlider.addEventListener('input', updateVolume);
    
    // Закрытие модального окна истории
    document.querySelector('.close').addEventListener('click', () => {
        historyModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });
}

// ========================
// ОСНОВНЫЕ ФУНКЦИИ ПЛЕЕРА
// ========================
function togglePlayPause() {
    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play-circle"></i>';
        liveIndicator.classList.remove('active');
    } else {
        audioPlayer.play().catch(error => {
            console.error('Playback error:', error);
            alert('Не удалось воспроизвести поток. Проверьте подключение к интернету.');
        });
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause-circle"></i>';
        liveIndicator.classList.add('active');
    }
}

function updateVolume() {
    currentVolume = volumeSlider.value;
    audioPlayer.volume = currentVolume / 100;
    volumePercent.textContent = `${currentVolume}%`;
}

function toggleVolumeSlider() {
    const slider = document.querySelector('.volume-control');
    if (slider.style.display === 'none' || !slider.style.display) {
        slider.style.display = 'flex';
    } else {
        slider.style.display = 'none';
    }
}

// ========================
// ИНФОРМАЦИЯ О ТРЕКЕ (метаданные из потока)
// ========================
function updateSongInfo() {
    // Пытаемся извлечь метаданные из потока
    // В большинстве случаев метаданные приходят в виде текста "Artist - Title"
    let songTitle = 'Неизвестно';
    let songArtist = '';
    
    // Способ 1: если аудиоплеер предоставляет метаданные
    if (audioPlayer.src && audioPlayer.textTracks) {
        // Не все браузеры поддерживают, поэтому используем альтернативный способ
    }
    
    // Способ 2: делаем запрос к серверу потока для получения Icecast-метаданных
    fetch(URL_STREAMING, { headers: { 'Icy-MetaData': '1' } })
        .then(response => {
            const icyName = response.headers.get('icy-name');
            const icyGenre = response.headers.get('icy-genre');
            const icyBr = response.headers.get('icy-br');
            
            // Иногда название трека приходит в заголовке icy-title
            const icyTitle = response.headers.get('icy-title');
            if (icyTitle && icyTitle !== RADIO_NAME) {
                parseAndSetSong(icyTitle);
            }
        })
        .catch(e => console.log('Could not fetch metadata:', e));
    
    // Способ 3: если метаданные не пришли, оставляем "Неизвестно"
    if (currentSong.title === 'Неизвестно') {
        currentSongEl.textContent = currentSong.title;
        currentArtistEl.textContent = '';
    }
}

function parseAndSetSong(metadata) {
    // Ожидаемый формат: "Исполнитель - Название"
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
    
    // Если название песни изменилось — добавляем в историю
    if (title !== currentSong.title) {
        addToHistory(title, artist);
    }
    
    currentSong.title = title;
    currentSong.artist = artist;
    
    currentSongEl.textContent = title;
    currentArtistEl.textContent = artist;
    
    // Обновляем фон (если есть функция смены обложки по треку)
    updateBackgroundForSong(title);
}

function updateBackgroundForSong(songTitle) {
    // Опционально: можно менять фон или обложку в зависимости от трека
    // Пока просто заглушка
    if (SHOW_BACKGROUND_IMAGE) {
        // Можно добавить логику смены фона
    }
}

// ========================
// ИСТОРИЯ ПРОСЛУШАННЫХ ТРЕКОВ
// ========================
function addToHistory(songTitle, songArtist) {
    if (!songTitle || songTitle === 'Неизвестно') return;
    
    const song = {
        title: songTitle,
        artist: songArtist,
        timestamp: new Date().toLocaleTimeString()
    };
    
    // Добавляем в начало, чтобы последний трек был сверху
    songHistory.unshift(song);
    
    // Ограничиваем историю 20 треками
    if (songHistory.length > 20) {
        songHistory.pop();
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('radio_song_history', JSON.stringify(songHistory));
    
    // Обновляем отображение истории, если модальное окно открыто
    renderHistory();
}

function loadHistoryFromStorage() {
    const stored = localStorage.getItem('radio_song_history');
    if (stored) {
        songHistory = JSON.parse(stored);
    }
}

function renderHistory() {
    if (!historyContainer) return;
    
    historyContainer.innerHTML = '';
    
    if (songHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-center">История пока пуста</p>';
        return;
    }
    
    songHistory.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'historic-item';
        songElement.innerHTML = `
            <div class="cover-historic" style="background-image: url('${URL_COVER}');"></div>
            <div class="music-info">
                <div class="song">${escapeHtml(song.title)}</div>
                <div class="artist">${escapeHtml(song.artist) || '—'}</div>
                <div class="time">${song.timestamp}</div>
            </div>
        `;
        historyContainer.appendChild(songElement);
    });
}

// Вспомогательная функция для защиты от XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateUI() {
    if (!SHOW_VOLUME) {
        document.querySelector('.volume-container')?.remove();
    }
    if (!SHOW_PLAYLIST) {
        document.getElementById('showHistoryBtn')?.remove();
    }
    if (!SHOW_COVER) {
        document.querySelector('.cover-album')?.remove();
    }
    
    // Устанавливаем текст "Эфир"
    if (liveIndicator) {
        liveIndicator.textContent = LIVE_TEXT;
    }
}

// Показать историю (вызывается из кнопки)
window.showHistory = function() {
    renderHistory();
    if (historyModal) {
        historyModal.style.display = 'block';
    }
}; 
