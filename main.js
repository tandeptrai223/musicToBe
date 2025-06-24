const API_KEY = "AIzaSyB8dfKvUw2Xvjr_-B0v4w_1zGBWYu_YYbY";

let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let ytPlayer;
let ytReady = false;
let volume = 70;

// Danh sách ảnh đĩa nhạc, thêm đường dẫn các ảnh đĩa bạn muốn
const discImages = [
  '/assets/img/1.png',
  '/assets/img/2.png',
  '/assets/img/3.png',
  '/assets/img/4.png'
];
let currentDisc = discImages[0];

const playerCard = document.getElementById("player-card");
const trackAuthor = document.getElementById("track-author");
const trackTitle = document.getElementById("track-title");
const trackThumbSmall = document.getElementById("track-thumb-small");
const musicDisc = document.getElementById("music-disc");

const btnRepeat = document.getElementById("btn-repeat");
const btnPrev = document.getElementById("btn-prev");
const btnPlay = document.getElementById("btn-play");
const btnNext = document.getElementById("btn-next");
const btnShuffle = document.getElementById("btn-shuffle");
const playerVolume = document.getElementById("player-volume");

const playlistDiv = document.getElementById("play-list-scroll");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const ytAudioDiv = document.getElementById("yt-audio");

// Progress bar elements
const progressBar = document.getElementById("progress-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

let progressInterval = null;
let userSeeking = false;

// Render player info
function renderPlayer() {
  if (!playlist.length) {
    trackAuthor.innerText = "Chưa có bài hát";
    trackTitle.innerText = "Playlist trống";
    //trackThumbSmall.innerHTML = `<img src="/assets/img/3.png">`;
    if (musicDisc) {
      musicDisc.src = currentDisc;
      musicDisc.classList.remove('rotate');
    }
    btnPlay.innerHTML = "<span>▶</span>";
    return;
  }
  const song = playlist[currentIndex];
  trackThumbSmall.innerHTML = `<img src="${song.thumb}">`;
  trackAuthor.innerText = song.channel;
  trackTitle.innerText = song.title;
  btnPlay.innerHTML = isPlaying ? "<span>❚❚</span>" : "<span>▶</span>";
  btnRepeat.classList.toggle('active', isRepeat);
  btnShuffle.classList.toggle('active', isShuffle);

  // Cập nhật disc nhạc
  if (musicDisc) {
    musicDisc.src = currentDisc;
    if (isPlaying) {
      musicDisc.classList.add('rotate');
    } else {
      musicDisc.classList.remove('rotate');
    }
  }
}
renderPlayer();

// Render playlist
function renderPlaylist() {
  playlistDiv.innerHTML = "";
  playlist.forEach((song, idx) => {
    const div = document.createElement("div");
    div.className = "playlist-track" + (currentIndex === idx && isPlaying ? " active" : "");
    // Khi nhấp vào bài hát bất kỳ sẽ phát ngay bài đó
    div.onclick = () => {
      currentIndex = idx;
      playCurrent();
    };
    div.innerHTML = `
      <div class="playlist-thumb"><img src="${song.thumb}"></div>
      <div class="playlist-info">
        <div class="playlist-title">${song.title}</div>
        <div class="playlist-channel">${song.channel}</div>
      </div>
      <button class="playlist-menu" onclick="removeFromPlaylist(event,${idx})">❌</button>
    `;
    playlistDiv.appendChild(div);
  });
}
window.removeFromPlaylist = (e, idx) => {
  e.stopPropagation();
  playlist.splice(idx, 1);
  if (currentIndex >= playlist.length) currentIndex = 0;
  renderPlaylist();
  renderPlayer();
  if (playlist.length === 0) stopYT();
};
renderPlaylist();

// Search
searchForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  searchResults.innerHTML = "<div style='color:#888;text-align:center'>Đang tìm kiếm...</div>";
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}+music&type=video&maxResults=10&key=${API_KEY}`);
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      searchResults.innerHTML = "<div style='color:#e53935;text-align:center'>Không tìm thấy bài hát nào.</div>";
      return;
    }
    searchResults.innerHTML = "";
    data.items.forEach(item => {
      const div = document.createElement("div");
      div.className = "song-search-item";
      div.innerHTML = `
        <img src="${item.snippet.thumbnails.medium.url}" alt="">
        <div class="song-search-info">
          <div class="song-search-title">${item.snippet.title}</div>
          <div class="song-search-channel">${item.snippet.channelTitle}</div>
        </div>
        <button>Thêm</button>
      `;
      div.querySelector("button").onclick = (ev) => {
        ev.stopPropagation();
        addToPlaylist({
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumb: item.snippet.thumbnails.medium.url
        });
      };
      searchResults.appendChild(div);
    });
  } catch (err) {
    searchResults.innerHTML = "<div style='color:#e53935;text-align:center'>Lỗi khi gọi API YouTube!</div>";
  }
});

function addToPlaylist(song) {
  playlist.push(song);
  renderPlaylist();
  if (playlist.length === 1) {
    currentIndex = 0;
    playCurrent();
  }
}

// Player controls
btnPlay.onclick = () => {
  if (!playlist.length) return;
  if (!isPlaying) {
    playCurrent();
  } else {
    pauseYT();
  }
};
btnNext.onclick = () => {
  if (!playlist.length) return;
  nextSong();
};
btnPrev.onclick = () => {
  if (!playlist.length) return;
  prevSong();
};
btnShuffle.onclick = () => {
  isShuffle = !isShuffle;
  renderPlayer();
};
btnRepeat.onclick = () => {
  isRepeat = !isRepeat;
  renderPlayer();
};
playerVolume.oninput = (e) => {
  volume = +e.target.value;
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(volume);
};

// Play current song
function playCurrent() {
  if (!playlist.length) return;
  isPlaying = true;
  // Random đĩa nhạc khi phát bài mới
  currentDisc = discImages[Math.floor(Math.random() * discImages.length)];
  renderPlayer();
  renderPlaylist();
  playSongAudio(playlist[currentIndex].id);
}

// Next/Prev logic
function nextSong() {
  if (!playlist.length) return;
  if (isShuffle) {
    let idx;
    do {
      idx = Math.floor(Math.random() * playlist.length);
    } while (playlist.length > 1 && idx === currentIndex);
    currentIndex = idx;
  } else {
    currentIndex = (currentIndex + 1) % playlist.length;
  }
  playCurrent();
}
function prevSong() {
  if (!playlist.length) return;
  if (isShuffle) {
    let idx;
    do {
      idx = Math.floor(Math.random() * playlist.length);
    } while (playlist.length > 1 && idx === currentIndex);
    currentIndex = idx;
  } else {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  }
  playCurrent();
}

// YouTube API
function playSongAudio(videoId) {
  ytAudioDiv.innerHTML = `<div id="yt-inner"></div>`;
  loadYouTubeAPI(videoId);
}
function loadYouTubeAPI(videoId) {
  if(window.YT && window.YT.Player){
    createYTPlayer(videoId);
  } else {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => createYTPlayer(videoId);
  }
}
function createYTPlayer(videoId) {
  if (ytPlayer) ytPlayer.destroy();
  ytPlayer = new YT.Player('yt-inner', {
    height: '1',
    width: '1',
    videoId: videoId,
    playerVars: {
      'autoplay': 1,
      'controls': 0
    },
    events: {
      'onReady': (event) => {
        ytReady = true;
        event.target.setVolume(volume);
        event.target.playVideo();
      },
      'onStateChange': onPlayerStateChange
    }
  });
}

// Gộp logic chuyển bài và progress bar vào 1 hàm duy nhất!
function onPlayerStateChange(event) {
  // Khi hết bài (state == 0)
  if (event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    renderPlayer();
    stopProgressTracking();
    if (isRepeat) {
      playCurrent();
    } else {
      nextSong();
    }
    return;
  }
  // Đang phát
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    renderPlayer();
    startProgressTracking();
  }
  // Pause
  if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    renderPlayer();
    stopProgressTracking();
  }
}

function pauseYT() {
  if (ytPlayer && ytPlayer.pauseVideo) {
    ytPlayer.pauseVideo();
    isPlaying = false;
    renderPlayer();
  }
}
function stopYT() {
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
    isPlaying = false;
    renderPlayer();
  }
}

// Keyboard shortcut
window.addEventListener('keydown', function(e){
  if(document.activeElement.tagName==="INPUT") return;
  if(e.code === 'Space') {
    e.preventDefault();
    btnPlay.click();
  }
  if(e.code === 'ArrowRight') btnNext.click();
  if(e.code === 'ArrowLeft') btnPrev.click();
});

// Progress Bar logic
function formatTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateProgressBar() {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const duration = ytPlayer.getDuration() || 0;
  const current = ytPlayer.getCurrentTime() || 0;
  if (!userSeeking) progressBar.value = duration ? (current / duration) * 100 : 0;
  currentTimeEl.textContent = formatTime(current);
  durationEl.textContent = formatTime(duration);
}

function startProgressTracking() {
  stopProgressTracking();
  progressInterval = setInterval(updateProgressBar, 500);
}
function stopProgressTracking() {
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = null;
}

progressBar.addEventListener("input", function() {
  userSeeking = true;
  const duration = ytPlayer && ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
  const seekTime = (progressBar.value / 100) * duration;
  currentTimeEl.textContent = formatTime(seekTime);
});

progressBar.addEventListener("change", function() {
  const duration = ytPlayer && ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
  const seekTime = (progressBar.value / 100) * duration;
  if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(seekTime, true);
  userSeeking = false;
  updateProgressBar();
});

// Top Chart logic
const chartList = document.getElementById("chart-list");

// Hàm lấy top thịnh hành YouTube Music Việt Nam
async function loadChart() {
  chartList.innerHTML = "<div style='color:#888;text-align:center'>Đang tải...</div>";
  try {
    // Sử dụng regionCode=VN cho Việt Nam, videoCategoryId=10 là Music
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=VN&videoCategoryId=10&maxResults=10&key=${API_KEY}`);
    const data = await res.json();
    chartList.innerHTML = "";
    data.items.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "chart-item";
      div.innerHTML = `
        <div class="chart-rank">${idx + 1}</div>
        <div class="chart-thumb"><img src="${item.snippet.thumbnails.medium.url}"></div>
        <div class="chart-info">
          <div class="chart-title">${item.snippet.title}</div>
          <div class="chart-channel">${item.snippet.channelTitle}</div>
        </div>
        <button>✚</button>
      `;
      div.querySelector("button").onclick = (ev) => {
        ev.stopPropagation();
        addToPlaylist({
          id: item.id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumb: item.snippet.thumbnails.medium.url
        });
      };
      chartList.appendChild(div);
    });
  } catch (err) {
    chartList.innerHTML = "<div style='color:#e53935;text-align:center'>Lỗi khi lấy top thịnh hành!</div>";
  }
}
loadChart();