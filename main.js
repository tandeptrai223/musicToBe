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
  '/assets/img/4.png',
  '/assets/img/5.png',
  '/assets/img/6.png',
  '/assets/img/7.png',
  '/assets/img/8.png',
  '/assets/img/9.png'
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



// Lấy các thành phần cần chuyển trong suốt
let transparentModeOn = false; 

const chartFixed = document.querySelector('.chart-fixed');
// Toggle button như trước
const toggleBtn = document.getElementById('toggle-transparent-btn');

toggleBtn.addEventListener('click', function() {
  transparentModeOn = !transparentModeOn;
  toggleBtn.classList.toggle('active');
  // Toggle player
  playerCard.classList.toggle('transparent-bg');
  // Toggle các thành phần khác nếu có
  if(chartFixed) chartFixed.classList.toggle('transparent-bg');
  if(chartPopup) chartPopup.classList.toggle('transparent-bg');
  if(playlistPopup) playlistPopup.classList.toggle('transparent-bg');
  if(searchResults) searchResults.classList.toggle('transparent-bg');
  if(chartPopupBtn) chartPopupBtn.classList.toggle('transparent-bg');
  if(playlistPopupBtn) playlistPopupBtn.classList.toggle('transparent-bg');
  if(searchInput) searchInput.classList.toggle('transparent-bg');
  if(btnRepeat) btnRepeat.classList.toggle('transparent-bg');
  if(btnPrev) btnPrev.classList.toggle('transparent-bg');
  if(btnPlay) btnPlay.classList.toggle('transparent-bg');
  if(btnNext) btnNext.classList.toggle('transparent-bg');
  if(btnShuffle) btnShuffle.classList.toggle('transparent-bg');

  // Chart items
  const chartItems = document.querySelectorAll('.chart-item');
  chartItems.forEach(item => item.classList.toggle('transparent-bg'));
  const searchItems = document.querySelectorAll('.song-search-item');
  searchItems.forEach(item => item.classList.toggle('transparent-bg'));
  // Render lại playlist để cập nhật class (vì các playlist-track có thể render lại)
  renderPlaylist();
});

function updatePlaylistTransparent() {
  const playlistItems = document.querySelectorAll('.playlist-item'); // đổi theo class item thực tế
  playlistItems.forEach(item => {
    if (transparentModeOn) {
      item.classList.add('transparent-bg');
    } else {
      item.classList.remove('transparent-bg');
    }
  });
}

let autoNextSimilar = false;

const autoNextBox = document.getElementById('auto-next-similar');
autoNextBox.addEventListener('change', function() {
  autoNextSimilar = autoNextBox.checked;
});

// Hàm lấy bài tương tự theo ca sĩ và thể loại (nếu có)
async function playSimilarSong() {
  const lastSong = playlist[playlist.length - 1];
  if (!lastSong) return;

  // Lấy ca sĩ (channel) và thể loại (nếu có)
  let keyword = lastSong.channel;
  if (lastSong.category) {
    keyword += ' ' + lastSong.category;
  } else if (lastSong.genre) {
    keyword += ' ' + lastSong.genre;
  }
  // Nếu không có thể loại, chỉ tìm với ca sĩ
  keyword += ' music'; // tăng độ chính xác

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${API_KEY}`
    );
    const data = await res.json();

    // Lọc bài không trùng với playlist hiện tại
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
  } catch (err) {
    alert('Lỗi khi tìm bài tương tự!');
  }
}


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
    // Thêm class trong suốt nếu đang bật transparent
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
        <button>✚</button>
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
    // Tự động bật popup playlist
  const playlistPopup = document.getElementById('playlist-popup');
  const playlistPopupBtn = document.getElementById('playlist-popup-btn');
  if (playlistPopup && playlistPopupBtn) {
    playlistPopup.style.display = 'flex';
    playlistPopupBtn.style.display = 'none';
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
    // Khi đã tới cuối playlist
  if (currentIndex === 0 && !isRepeat && !isShuffle) {
    // Nếu bật tự động phát nhạc tương tự
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
  // if (event.data === YT.PlayerState.ENDED) {
  //   isPlaying = false;
  //   renderPlayer();
  //   stopProgressTracking();
  //   if (isRepeat) {
  //     playCurrent();
  //   } else {
  //     nextSong();
  //   }
  //   return;
  // }
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
      nextSong();
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


// Ẩn bảng BXH cũ trên layout nếu có (không cần nếu đã bỏ khỏi HTML)
const chartPopupBtn = document.getElementById('chart-popup-btn');
const chartPopup = document.getElementById('chart-popup');
const chartPopupClose = document.getElementById('chart-popup-close');

chartPopupBtn.onclick = function() {
  chartPopup.style.display = 'flex';
  chartPopupBtn.style.display = 'none';
};
chartPopupClose.onclick = function() {
  chartPopup.style.display = 'none';
  chartPopupBtn.style.display = 'flex';
};
// Đóng popup nếu click ra ngoài
chartPopup.addEventListener('mousedown', function(e) {
  if(e.target === chartPopup) {
    chartPopup.style.display = 'none';
    chartPopupBtn.style.display = 'flex';
  }
});

// Khi load lần đầu, chỉ hiện nút, ẩn popup
chartPopup.style.display = 'none';
chartPopupBtn.style.display = 'flex';


// Popup Playlist
const playlistPopupBtn = document.getElementById('playlist-popup-btn');
const playlistPopup = document.getElementById('playlist-popup');
const playlistPopupClose = document.getElementById('playlist-popup-close');

playlistPopupBtn.onclick = function() {
  playlistPopup.style.display = 'flex';
  playlistPopupBtn.style.display = 'none';
};
playlistPopupClose.onclick = function() {
  playlistPopup.style.display = 'none';
  playlistPopupBtn.style.display = 'flex';
};
// Đóng popup nếu click ra ngoài (nếu muốn)
playlistPopup.addEventListener('mousedown', function(e) {
  if(e.target === playlistPopup) {
    playlistPopup.style.display = 'none';
    playlistPopupBtn.style.display = 'flex';
  }
});

// Khi load lần đầu, chỉ hiện nút, ẩn popup
playlistPopup.style.display = 'none';
playlistPopupBtn.style.display = 'flex';


const searchClear = document.getElementById('search-clear');

searchInput.addEventListener('input', function() {
  searchClear.style.display = this.value.trim() ? 'block' : 'none';
});
searchClear.addEventListener('click', function() {
  searchInput.value = '';
  searchClear.style.display = 'none';
  if (searchResults) searchResults.innerHTML = '';
  searchInput.focus();
});


const logo = document.getElementById('logo-top-left');
const aboutPopup = document.getElementById('about-popup');
const aboutPopupClose = document.getElementById('about-popup-close');

logo.onclick = function() {
  aboutPopup.style.display = 'flex';
};
aboutPopupClose.onclick = function() {
  aboutPopup.style.display = 'none';
};
// Đóng popup khi click ra ngoài nội dung
aboutPopup.addEventListener('mousedown', function(e) {
  if (e.target === aboutPopup) aboutPopup.style.display = 'none';
});

