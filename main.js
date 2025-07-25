const API_KEY = "AIzaSyB8dfKvUw2Xvjr_-B0v4w_1zGBWYu_YYbY";

let playlist = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let ytPlayer;
let ytReady = false;
let volume = 70;
let autoNextSimilar = false;
let transparentModeOn = false;
let progressInterval = null;
let userSeeking = false;

const discImages = [
  '/assets/img/11.png','/assets/img/22.png','/assets/img/33.png','/assets/img/44.png',
  '/assets/img/55.png','/assets/img/66.png','/assets/img/77.png','/assets/img/88.png','/assets/img/99.png'
];
let currentDisc = discImages[0];

// DOM elements
const $ = id => document.getElementById(id);
const playerCard = $("player-card");
const trackAuthor = $("track-author");
const trackTitle = $("track-title");
const trackThumbSmall = $("track-thumb-small");
const musicDisc = $("music-disc");

const btnRepeat = $("btn-repeat");
const btnPrev = $("btn-prev");
const btnPlay = $("btn-play");
const btnNext = $("btn-next");
const btnShuffle = $("btn-shuffle");
const playerVolume = $("player-volume");
const playlistDiv = $("play-list-scroll");
const searchForm = $("search-form");
const searchInput = $("search-input");
const searchResults = $("search-results");
const ytAudioDiv = $("yt-audio");
const progressBar = $("progress-bar");
const currentTimeEl = $("current-time");
const durationEl = $("duration");
const FvList = $("FV-list");
const fvBtn = $("favorite-popup-btn");

const toggleBtn = $("toggle-transparent-btn");
const autoNextBox = $("auto-next-similar");
const chartList = $("chart-list");
const chartPopupBtn = $("chart-popup-btn");
const chartPopup = $("chart-popup");
const chartPopupClose = $("chart-popup-close");
const playlistPopupBtn = $("playlist-popup-btn");
const playlistPopup = $("playlist-popup");
const playlistPopupClose = $("playlist-popup-close");
const searchClear = $("search-clear");
const logo = $("logo-top-left");
const aboutPopup = $("about-popup");
const aboutPopupClose = $("about-popup-close");
const chartFixed = document.querySelector('.chart-fixed');

// Transparent UI
toggleBtn.addEventListener('click', function() {
  transparentModeOn = !transparentModeOn;
  toggleBtn.classList.toggle('active');
  [
    playerCard, chartFixed, chartPopup, playlistPopup, searchResults, chartPopupBtn, playlistPopupBtn,
    searchInput, btnRepeat, btnPrev, btnPlay, btnNext, btnShuffle, loginBtn, fvBtn, FvList
  ].forEach(el => el && el.classList.toggle('transparent-bg', transparentModeOn));
  document.querySelectorAll('.chart-item,.song-search-item').forEach(item => item.classList.toggle('transparent-bg', transparentModeOn));
  const favPopup = document.getElementById('favorite-popup-btn');
  const FvLlist = document.getElementById('FV-list');
  if (favPopup) favPopup.classList.toggle('transparent-bg', transparentModeOn);
//   if (FvLlist) FvLlist.classList.toggle('transparent-bg', transparentModeOn);
//   const favPopupContainer = document.getElementById('favorite-popup');
// if (favPopupContainer) favPopupContainer.classList.toggle('transparent-bg', transparentModeOn);

  // Với danh sách bài hát yêu thích:
  document.querySelectorAll('.favorite-song').forEach(item =>
    item.classList.toggle('transparent-bg', transparentModeOn)
  );
  renderPlaylist();
});

// Auto Next Similar
autoNextBox.addEventListener('change', function() {
  autoNextSimilar = autoNextBox.checked;
});

// ===== PLAYLIST & PLAYER =====
function renderPlayer() {
  if (!playlist.length) {
    trackAuthor.innerText = "Chưa có bài hát";
    trackTitle.innerText = "Playlist trống";
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

  if (musicDisc) {
    musicDisc.src = currentDisc;
    musicDisc.classList.toggle('rotate', isPlaying);
  }
  updateDocumentTitle();
}

function renderPlaylist() {
  playlistDiv.innerHTML = "";
  playlist.forEach((song, idx) => {
    const div = document.createElement("div");
    div.className = "playlist-track" + (currentIndex === idx && isPlaying ? " active" : "");
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
    if (transparentModeOn) div.classList.add('transparent-bg');
    playlistDiv.appendChild(div);
  });
}
window.removeFromPlaylist = (e, idx) => {
  e.stopPropagation();
  playlist.splice(idx, 1);
  if (currentIndex >= playlist.length) currentIndex = 0;
  renderPlaylist();
  renderPlayer();
  if (!playlist.length) stopYT();
};

// Search
searchForm.addEventListener("submit", async function(e) {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  searchResults.innerHTML = "<div style='color:#888;text-align:center'>Đang tìm kiếm...</div>";
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}+music&type=video&maxResults=10&key=${API_KEY}`);
    const data = await res.json();
    if (!data.items?.length) {
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
        <button>✚</button>
      `;
      div.querySelector("button").onclick = ev => {
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
  } catch {
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
  if (playlistPopup && playlistPopupBtn) {
    playlistPopup.style.display = 'flex';
    playlistPopupBtn.style.display = 'none';
  }
}

// ===== PLAYER CONTROL =====
btnPlay.onclick = () => {
  if (!playlist.length) return;
  if (!isPlaying) {
    // Nếu đang pause và đúng bài hiện tại, tiếp tục phát
    if (ytPlayer?.playVideo && ytPlayer.getVideoData) {
      const playingId = ytPlayer.getVideoData().video_id;
      if (playingId === playlist[currentIndex].id) {
        ytPlayer.playVideo();
        isPlaying = true;
        renderPlayer();
        return;
      }
    }
    playCurrent();
  } else {
    pauseYT();
  }
};
btnNext.onclick = () => playlist.length && nextSong();
btnPrev.onclick = () => playlist.length && prevSong();
btnShuffle.onclick = () => { isShuffle = !isShuffle; renderPlayer(); };
btnRepeat.onclick = () => { isRepeat = !isRepeat; renderPlayer(); };
playerVolume.oninput = e => {
  volume = +e.target.value;
  ytPlayer?.setVolume?.(volume);
};

function playCurrent() {
  if (!playlist.length) return;
  isPlaying = true;
  currentDisc = discImages[Math.floor(Math.random() * discImages.length)];
  renderPlayer();
  renderPlaylist();
  playSongAudio(playlist[currentIndex].id);
}

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
  // Nếu hết playlist và không repeat/shuffle
  if (currentIndex === 0 && !isRepeat && !isShuffle) {
    if (autoNextSimilar) {
      playSimilarSong();
      return;
    }
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

// ===== YOUTUBE PLAYER =====
function playSongAudio(videoId) {
  // Nếu player đã tồn tại thì chỉ cần load lại video mới, không destroy player
  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(videoId);
    ytPlayer.playVideo();
  } else {
    ytAudioDiv.innerHTML = `<div id="yt-inner"></div>`;
    loadYouTubeAPI(videoId);
  }
}
function loadYouTubeAPI(videoId) {
  if (window.YT?.Player) {
    createYTPlayer(videoId);
  } else {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => createYTPlayer(videoId);
  }
}
function createYTPlayer(videoId) {
  ytPlayer = new YT.Player('yt-inner', {
    height: '1', width: '1', videoId,
    playerVars: { 'autoplay': 1, 'controls': 0 },
    events: {
      'onReady': e => { ytReady = true; e.target.setVolume(volume); e.target.playVideo(); },
      'onStateChange': onPlayerStateChange
    }
  });
}
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    renderPlayer();
    stopProgressTracking();
    if (isRepeat) {
      playCurrent();
    } else if (currentIndex === playlist.length - 1) {
      if (autoNextSimilar) {
        playSimilarSong();
        return;
      }
      // Dừng lại khi hết playlist, hoặc lặp lại nếu muốn: currentIndex = 0; playCurrent();
    } else {
      nextSong();
    }
    return;
  }
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true; renderPlayer(); startProgressTracking();
  }
  if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false; renderPlayer(); stopProgressTracking();
  }
}

function pauseYT() {
  ytPlayer?.pauseVideo?.();
  isPlaying = false;
  renderPlayer();
}
function stopYT() {
  ytPlayer?.stopVideo?.();
  isPlaying = false;
  renderPlayer();
}

// ===== PROGRESS BAR =====
function formatTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function updateProgressBar() {
  if (!ytPlayer?.getDuration) return;
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
  const duration = ytPlayer?.getDuration?.() || 0;
  const seekTime = (progressBar.value / 100) * duration;
  currentTimeEl.textContent = formatTime(seekTime);
});
progressBar.addEventListener("change", function() {
  const duration = ytPlayer?.getDuration?.() || 0;
  const seekTime = (progressBar.value / 100) * duration;
  ytPlayer?.seekTo?.(seekTime, true);
  userSeeking = false;
  updateProgressBar();
});

// ===== SIMILAR SONG SEARCH =====
async function playSimilarSong() {
  const lastSong = playlist[playlist.length - 1];
  if (!lastSong) return;
  let keyword = lastSong.channel;
  if (lastSong.category) keyword += ' ' + lastSong.category;
  else if (lastSong.genre) keyword += ' ' + lastSong.genre;
  keyword += ' music';
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${API_KEY}`
    );
    const data = await res.json();
    const existIds = playlist.map(song => song.id);
    const similarSong = data.items.find(i => !existIds.includes(i.id.videoId));
    if (similarSong) {
      const song = {
        id: similarSong.id.videoId,
        title: similarSong.snippet.title,
        channel: similarSong.snippet.channelTitle,
        thumb: similarSong.snippet.thumbnails.medium.url
      };
      playlist.push(song);
      currentIndex = playlist.length - 1;
      playCurrent();
    } else {
      alert('Không tìm thấy bài tương tự!');
    }
  } catch {
    alert('Lỗi khi tìm bài tương tự!');
  }
}

// ===== TOP CHART =====
async function loadChart() {
  chartList.innerHTML = "<div style='color:#888;text-align:center'>Đang tải...</div>";
  try {
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
      div.querySelector("button").onclick = ev => {
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
  } catch {
    chartList.innerHTML = "<div style='color:#e53935;text-align:center'>Lỗi khi lấy top thịnh hành!</div>";
  }
}
loadChart();

// ===== POPUP & MISC =====
function setupPopup(btn, popup, closeBtn) {
  btn.onclick = () => { popup.style.display = 'flex'; btn.style.display = 'none'; };
  closeBtn.onclick = () => { popup.style.display = 'none'; btn.style.display = 'flex'; };
  popup.addEventListener('mousedown', e => {
    if (e.target === popup) { popup.style.display = 'none'; btn.style.display = 'flex'; }
  });
  popup.style.display = 'none'; btn.style.display = 'flex';
}
setupPopup(chartPopupBtn, chartPopup, chartPopupClose);
setupPopup(playlistPopupBtn, playlistPopup, playlistPopupClose);

searchInput.addEventListener('input', function() {
  searchClear.style.display = this.value.trim() ? 'block' : 'none';
});
searchClear.addEventListener('click', function() {
  searchInput.value = '';
  searchClear.style.display = 'none';
  if (searchResults) searchResults.innerHTML = '';
  searchInput.focus();
});

logo.onclick = () => { aboutPopup.style.display = 'flex'; };
aboutPopupClose.onclick = () => { aboutPopup.style.display = 'none'; };
aboutPopup.addEventListener('mousedown', e => { if (e.target === aboutPopup) aboutPopup.style.display = 'none'; });

// ====== KEYBOARD SHORTCUTS =====
window.addEventListener('keydown', function(e) {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
  if (e.code === 'ArrowRight') btnNext.click();
  if (e.code === 'ArrowLeft') btnPrev.click();
});
let marqueeInterval = null;
let marqueeBaseTitle = "";
let marqueePosition = 0;

function startMarqueeTitle(text) {
  stopMarqueeTitle();
  if (!text) {
    document.title = "MusicToBe";
    return;
  }
  marqueeBaseTitle = text + " • ";
  marqueePosition = 0;
  marqueeInterval = setInterval(() => {
    document.title =
      marqueeBaseTitle.substring(marqueePosition) +
      marqueeBaseTitle.substring(0, marqueePosition);
    marqueePosition = (marqueePosition + 1) % marqueeBaseTitle.length;
  }, 300); // tốc độ chạy, chỉnh lớn hơn cho chạy chậm
}

function stopMarqueeTitle() {
  if (marqueeInterval) clearInterval(marqueeInterval);
  marqueeInterval = null;
}

function updateDocumentTitle() {
  if (playlist.length && isPlaying) {
    startMarqueeTitle(playlist[currentIndex].title);
  } else if (playlist.length && !isPlaying) {
    document.title = playlist[currentIndex].title + " - Đã dừng ⏸️";
    stopMarqueeTitle();
  } else {
    document.title = "MusicToBe";
    stopMarqueeTitle();
  }
}


const firebaseConfig = {
  apiKey: "AIzaSyCAbmAxpb5nIpW9WTiHMdVW41pA6vAH-gA",
  authDomain: "nhaccuayou-23fb1.firebaseapp.com",
  projectId: "nhaccuayou-23fb1",
  storageBucket: "nhaccuayou-23fb1.firebasestorage.app",
  messagingSenderId: "724049458431",
  appId: "1:724049458431:web:6514ded94761649aca88ca",
  measurementId: "G-9G4J6XC4GV",
  databaseURL: "https://nhaccuayou-23fb1-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// 1. Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==== Quản lý user và danh sách yêu thích ====
let currentUser = null;
let favoriteSongs = [];

function getFavKey() {
  return currentUser ? 'favorites/' + currentUser.uid : null;
}

const loginBtn = document.getElementById('login-btn');

// 2. Đăng nhập với Google
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => {
      // Thành công!
      const user = result.user;
      alert("Đăng nhập thành công: " + user.displayName);
      // Lưu user info, cập nhật UI...
      // user.uid, user.email, user.photoURL, user.displayName
    })
    .catch(error => {
      alert("Đăng nhập thất bại: " + error.message);
    });
}

// 3. Đăng xuất

function showLogoutConfirm() {
  // Xóa popup cũ nếu có
  const old = document.getElementById('logout-confirm-popup');
  if (old) old.remove();

  // Tạo popup mới
  const div = document.createElement('div');
  div.id = 'logout-confirm-popup';
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100vw';
  div.style.height = '100vh';
  div.style.background = 'rgba(0,0,0,0.5)';
  div.style.display = 'flex';
  div.style.justifyContent = 'center';
  div.style.alignItems = 'center';
  div.style.zIndex = '9999';

  div.innerHTML = `
    <div style="background:#fff;padding:24px 32px;border-radius:8px;box-shadow:0 8px 32px #0002;min-width:280px;text-align:center;">
      <h3>Bạn có chắc muốn đăng xuất?</h3>
      <div style="margin-top:18px;">
        <button id="confirm-logout-yes" style="margin-right:16px;padding:6px 24px;">Có</button>
        <button id="confirm-logout-no" style="padding:6px 24px;">Không</button>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  document.getElementById('confirm-logout-yes').onclick = function() {
    div.remove();
    firebase.auth().signOut();
  };
  document.getElementById('confirm-logout-no').onclick = function() {
    div.remove();
  };
}

function logout() {
  firebase.auth().signOut().then(() => {
    alert("Đã đăng xuất!");
    // Cập nhật lại giao diện
  });
}

// 4. Theo dõi trạng thái đăng nhập
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    loginBtn.textContent = user.displayName + " 📴"; // Hiển thị tên người dùng
    loginBtn.onclick = showLogoutConfirm;
    loginBtn.classList.add('logged-in');
    currentUser = user;

    renderFavoriteBtn();
    db.ref(getFavKey()).once('value').then(snapshot => {
      favoriteSongs = snapshot.val() || [];
      renderPlaylist();
      renderFavoriteList();
      // Sau khi có dữ liệu, gắn listener realtime
      listenFavoriteSongsRealtime();
    });

  } else {
    loginBtn.textContent = "Đăng nhập với Google";
    loginBtn.onclick = loginWithGoogle;
    loginBtn.classList.remove('logged-in');
    currentUser = null;
    favoriteSongs = [];
    renderFavoriteBtn();
  }
});

function listenFavoriteSongsRealtime() {
  db.ref(getFavKey()).on('value', snapshot => {
    favoriteSongs = snapshot.val() || [];
    renderFavoriteList();
    renderPlaylist(); // gọi lại nếu muốn cập nhật giao diện tim
  });
}

function saveFavoriteSongsToFirebase() {
  db.ref(getFavKey()).set(favoriteSongs);
}

// ==== Thêm nút tim vào mỗi bài hát ====
function renderPlaylist() {
  playlistDiv.innerHTML = "";
  playlist.forEach((song, idx) => {
    const isFav = favoriteSongs.some(s => s.id === song.id);
    const div = document.createElement("div");
    div.className = "playlist-track" + (currentIndex === idx && isPlaying ? " active" : "");
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
      <button class="favorite-btn" onclick="toggleFavorite(event, '${song.id}')">${isFav ? "❤️" : "🤍"}</button>
      <button class="playlist-menu" onclick="removeFromPlaylist(event,${idx})">❌</button>
    `;
    playlistDiv.appendChild(div);
  });
}

// ==== Hàm xử lý nút tim ====
window.toggleFavorite = function(e, id) {
  e.stopPropagation();
    const buttonFv = event.currentTarget;
    buttonFv.classList.toggle('favorited');
    buttonFv.textContent = buttonFv.classList.contains('favorited') ? '❤️' : '🤍';
  if (!currentUser) {
    alert("Bạn cần đăng nhập để lưu bài yêu thích!");
    return;
  }
  // Tìm bài hát
  const song =
    playlist.find(s => s.id === id)
    || favoriteSongs.find(s => s.id === id);
  if (!song) return;
  const idx = favoriteSongs.findIndex(s => s.id === id);
  if (idx !== -1) {
    favoriteSongs.splice(idx, 1);
  } else {
    favoriteSongs.push(song);
  }
  saveFavoriteSongsToFirebase();
  // UI sẽ tự cập nhật nhờ listenFavoriteSongsRealtime
}

// ==== Nút bật/tắt popup danh sách yêu thích ====
function renderFavoriteBtn() {
  let favBtn = document.getElementById('favorite-popup-btn');
  if (!favBtn) {

    favBtn = document.createElement('button');
    favBtn.id = 'favorite-popup-btn';
    favBtn.textContent = '❤️ Bài hát yêu thích';
    favBtn.onclick = showFavoritePopup;
    document.body.appendChild(favBtn);
  }
  favBtn.style.display = currentUser ? 'block' : 'none';
}

// ==== Popup danh sách bài hát yêu thích ====
function showFavoritePopup() {
  let popup = document.getElementById('favorite-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'favorite-popup';
    popup.className = 'popup-bg';
    popup.innerHTML = `
      <div id="FV-list" class="popup-content">
        <h2>❤️ Bài hát yêu thích</h2>
        <div id="favorite-list"></div>
        <button id="favorite-close">❌</button>
      </div>
    `;
    document.body.appendChild(popup);
    document.getElementById('favorite-close').onclick = () => popup.remove();
  }
  renderFavoriteList();
  popup.style.display = 'flex';
}


function renderFavoriteList() {
  const favList = document.getElementById('favorite-list');
  favList.innerHTML = '';

  if (favoriteSongs.length === 0) {
    favList.innerHTML = '<div>Chưa có bài nào yêu thích.</div>';
    return;
  }

  favoriteSongs.forEach((song, idx) => {
    const div = document.createElement('div');
    div.className = 'favorite-songs';
    if (transparentModeOn) div.classList.add('transparent-bg');


    // Thumbnail
    const thumbDiv = document.createElement('div');
    thumbDiv.className = 'playlist-thumb';
    const img = document.createElement('img');
    img.src = song.thumb;
    thumbDiv.appendChild(img);

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'playlist-info';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'playlist-title';
    titleDiv.textContent = song.title;

    const channelDiv = document.createElement('div');
    channelDiv.className = 'playlist-channel';
    channelDiv.textContent = song.channel;

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(channelDiv);

    // Add to playlist
    const addBtn = document.createElement('button');
    addBtn.className = 'playlist-menu';
    addBtn.textContent = '✚';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      addToPlaylist({
        id: song.id,
        title: song.title,
        channel: song.channel,
        thumb: song.thumb
      });
    };

    // Remove from favorites
    const removeBtn = document.createElement('button');
    removeBtn.className = 'playlist-menu';
    removeBtn.textContent = '✖';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeFavoriteSong(song.id);
    };

    // Gắn các thành phần vào div chính
    div.appendChild(thumbDiv);
    div.appendChild(infoDiv);
    div.appendChild(addBtn);
    div.appendChild(removeBtn);

    favList.appendChild(div);
  });
}

window.playFavoriteSong = function(id) {
  const idx = playlist.findIndex(s => s.id === id);
  if (idx !== -1) {
    currentIndex = idx;
    playCurrent();
  } else {
    const song = favoriteSongs.find(s => s.id === id);
    if (song) {
      addToPlaylist(song);
      currentIndex = playlist.length - 1;
      playCurrent();
    }
  }
}
window.removeFavoriteSong = function(id) {
  favoriteSongs = favoriteSongs.filter(s => s.id !== id);
  saveFavoriteSongsToFirebase();
  renderFavoriteList();
  renderPlaylist();
}


// ====== INITIAL RENDER =====
renderPlayer();
renderPlaylist();