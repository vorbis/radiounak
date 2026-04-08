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
    updateSongInfo(); // первое обновление информации о треке
});

function initAudio() {
    // Создаём аудиоплеер
    audioPlayer = new Audio(URL_STREAMING);
    
    // Устанавливаем громкость из ползунка (если он есть)
    const volumeSlider = document.getElementById('volume');
    if (volumeSlider) {
        audioPlayer.volume = volumeSlider.value / 100;
    } else {
        audioPlayer.volume = 0.8;
    }
    
    // При ошибке потока — пробуем переподключиться
    audioPlayer.addEventListener('error', () => {
        console.log('Ошибка потока, переподключение...');
        if (isPlaying) {
            setTimeout(() => {
                audioPlayer.play().catch(e => console.log('Ошибка переподключения:', e));
            }, 3000);
        }
    });
    
    // Когда поток загружен, обновляем информацию о треке
    audioPlayer.addEventListener('loadedmetadata', () => {
        updateSongInfo();
    });
    
    // Периодическое обновление метаданных (каждые 10 секунд)
    setInterval(updateSongInfo, 10000);
}

function initEventListeners() {
    // ===== КНОПКА PLAY/PAUSE =====
    const playBtn = document.getElementById('playerButton');
    if (playBtn) {
        playBtn.addEventListener('click', togglePlay);
    }
    
    // ===== ПОЛЗУНОК ГРОМКОСТИ =====
    const volumeSlider = document.getElementById('volume');
    const volIndicator = document.getElementById('volIndicator');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (audioPlayer) audioPlayer.volume = val / 100;
            if (volIndicator) volIndicator.textContent = val;
        });
        
        // Устанавливаем начальное отображение громкости
        if (volIndicator) volIndicator.textContent = volumeSlider.value;
    }
}

// ========================
// ФУНКЦИЯ ВОСПРОИЗВЕДЕНИЯ/ПАУЗЫ (вызывается из onclick)
// ========================
window.togglePlay = function() {
    const playBtn = document.getElementById('playerButton');
    
    if (isPlaying) {
        // Пауза
        audioPlayer.pause();
        isPlaying = false;
        if (playBtn) {
            playBtn.className = 'fa fa-play-circle';
        }
    } else {
        // Воспроизведение
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                if (playBtn) {
                    playBtn.className = 'fa fa-pause-circle';
                }
            })
            .catch(error => {
                console.error('Ошибка воспроизведения:', error);
                alert('Не удалось подключиться к радиостанции.\nПроверьте интернет или URL потока.');
            });
    }
};

// ========================
// ИНФОРМАЦИЯ О ТРЕКЕ (метаданные)
// ========================
function updateSongInfo() {
    // Пытаемся получить метаданные через fetch с заголовком Icy-MetaData
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
    
    // Разбираем формат "Исполнитель - Название"
    if (metadata.includes(' - ')) {
        const parts = metadata.split(' - ');
        artist = parts[0];
        title = parts[1];
    } else if (metadata.includes(' – ')) {
        const parts = metadata.split(' – ');
        artist = parts[0];
        title = parts[1];
    }
    
    // Обновляем отображение на странице
    const currentSongEl = document.getElementById('currentSong');
    const currentArtistEl = document.getElementById('currentArtist');
    
    if (currentSongEl) currentSongEl.textContent = title;
    if (currentArtistEl) currentArtistEl.textContent = artist || '—';
    
    // Добавляем в историю, если трек новый
    if (title !== 'Song' && title !== '' && title !== RADIO_NAME) {
        addToHistory(title, artist);
    }
}

// ========================
// ИСТОРИЯ ПРОСЛУШАННЫХ ТРЕКОВ
// ========================
function addToHistory(songTitle, songArtist) {
    if (!songTitle || songTitle === 'Song' || songTitle === RADIO_NAME) return;
    
    const song = {
        title: songTitle,
        artist: songArtist || '',
        timestamp: new Date().toLocaleTimeString()
    };
    
    // Проверяем, не дублируется ли последний трек
    if (songHistory.length > 0 && songHistory[0].title === songTitle) return;
    
    songHistory.unshift(song);
    
    // Ограничиваем историю 8 треками (по количеству мест в HTML)
    if (songHistory.length > 8) songHistory.pop();
    
    // Сохраняем в localStorage
    localStorage.setItem('radio_song_history', JSON.stringify(songHistory));
    
    // Обновляем отображение истории
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
    
    // Очищаем контейнер, но сохраняем структуру (оставляем пустые <article>)
    const articles = historyContainer.querySelectorAll('article');
    
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const song = songHistory[i];
        
        if (song) {
            // Заполняем данными из истории
            const songDiv = article.querySelector('.song');
            const artistDiv = article.querySelector('.artist');
            const coverDiv = article.querySelector('.cover-historic');
            
            if (songDiv) songDiv.textContent = song.title;
            if (artistDiv) artistDiv.textContent = song.artist || '—';
            if (coverDiv) coverDiv.style.backgroundImage = "url('img/cover.png')";
        } else {
            // Пустые слоты
            const songDiv = article.querySelector('.song');
            const artistDiv = article.querySelector('.artist');
            
            if (songDiv) songDiv.textContent = '—';
            if (artistDiv) artistDiv.textContent = '—';
        }
    }
}

// ========================
// УДАЛЯЕМ ФУНКЦИОНАЛ ТЕКСТОВ ПЕСЕН (LETRA)
// ========================
// Отключаем кнопку "LETRA", чтобы ничего не происходило при клике
document.addEventListener('DOMContentLoaded', () => {
    const lyricsLink = document.querySelector('.lyrics');
    if (lyricsLink) {
        lyricsLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Ничего не делаем — функционал текстов песен отключён
            console.log('Функция текстов песен отключена');
        });
    }
});
