// ========================
// ПРОСТОЙ И НАДЁЖНЫЙ ПЛЕЕР
// ========================
const URL_STREAMING = 'https://drh-node-03.dline-media.com/RadioUnak';
let audio = null;
let isPlaying = false;
let history = [];

// Загрузка страницы
document.addEventListener('DOMContentLoaded', () => {
    audio = new Audio(URL_STREAMING);
    audio.volume = 0.8;
    
    loadHistory();
    startMetadataCheck();
});

// Проверка метаданных каждые 10 секунд
function startMetadataCheck() {
    setInterval(() => {
        if (!audio || audio.paused) return;
        
        fetch(URL_STREAMING, { 
            headers: { 'Icy-MetaData': '1' } 
        })
        .then(res => {
            const title = res.headers.get('icy-title');
            if (title && title !== 'RadioUnak') {
                updateDisplay(title);
            }
        })
        .catch(e => console.log('Metadata error:', e));
    }, 10000);
}

// Обновление экрана
function updateDisplay(fullTitle) {
    let artist = '';
    let title = fullTitle;
    
    if (fullTitle.includes(' - ')) {
        const parts = fullTitle.split(' - ');
        artist = parts[0];
        title = parts[1];
    }
    
    document.getElementById('currentSong').textContent = title;
    document.getElementById('currentArtist').textContent = artist;
    
    // Сохраняем в историю
    if (title && title !== 'RadioUnak') {
        addToHistory(title, artist);
    }
}

// Play/Pause
window.togglePlay = function() {
    const btn = document.getElementById('playerButton');
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        btn.className = 'fa fa-play-circle';
    } else {
        audio.play()
            .then(() => {
                isPlaying = true;
                btn.className = 'fa fa-pause-circle';
            })
            .catch(e => alert('Ошибка: ' + e.message));
    }
};

// История
function addToHistory(title, artist) {
    if (!title || title === 'RadioUnak') return;
    if (history.length > 0 && history[0].title === title) return;
    
    history.unshift({ title, artist, time: new Date().toLocaleTimeString() });
    if (history.length > 8) history.pop();
    
    localStorage.setItem('radio_history', JSON.stringify(history));
    renderHistory();
}

function loadHistory() {
    const saved = localStorage.getItem('radio_history');
    if (saved) {
        history = JSON.parse(saved);
        renderHistory();
    }
}

function renderHistory() {
    const container = document.getElementById('historicSong');
    if (!container) return;
    
    const articles = container.querySelectorAll('article');
    for (let i = 0; i < articles.length; i++) {
        const art = articles[i];
        const song = history[i];
        const songDiv = art.querySelector('.song');
        const artistDiv = art.querySelector('.artist');
        
        if (song) {
            songDiv.textContent = song.title;
            artistDiv.textContent = song.artist || '—';
        } else {
            songDiv.textContent = '—';
            artistDiv.textContent = '—';
        }
    }
}
