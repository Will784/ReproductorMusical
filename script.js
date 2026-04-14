class SongNode {
  constructor(song) {
    this.song = song;
    this.prev = null;
    this.next = null;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.current = null;
    this.size = 0;
  }

  addLast(song) {
    const node = new SongNode(song);
    if (!this.tail) {
      this.head = this.tail = node;
      if (!this.current) this.current = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.size++;
    return node;
  }

  addFirst(song) {
    const node = new SongNode(song);
    if (!this.head) {
      this.head = this.tail = node;
      if (!this.current) this.current = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    this.size++;
    return node;
  }

  addAt(song, position) {
    if (position <= 1) return this.addFirst(song);
    if (position > this.size) return this.addLast(song);

    const node = new SongNode(song);
    let cur = this.head;
    let idx = 1;
    while (idx < position - 1 && cur) { cur = cur.next; idx++; }

    if (!cur) return null;

    const nextNode = cur.next;
    cur.next = node;
    node.prev = cur;
    node.next = nextNode;
    if (nextNode) nextNode.prev = node;
    if (!nextNode) this.tail = node;
    this.size++;
    return node;
  }

  remove(node) {
    if (!node) return;
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    if (this.current === node) {
      this.current = node.next || node.prev;
    }

    if (node.song.url) URL.revokeObjectURL(node.song.url);
    if (node.song.cover) URL.revokeObjectURL(node.song.cover);

    this.size--;
  }

  goNext() {
    if (this.current && this.current.next) {
      this.current = this.current.next;
      return true;
    }
    return false;
  }

  goPrev() {
    if (this.current && this.current.prev) {
      this.current = this.current.prev;
      return true;
    }
    return false;
  }

  toArray() {
    const arr = [];
    let node = this.head;
    while (node) { arr.push(node); node = node.next; }
    return arr;
  }

  findById(id) {
    let node = this.head;
    while (node) { if (node.song.id === id) return node; node = node.next; }
    return null;
  }

  moveAfter(moveNode, afterNode) {
    if (!moveNode || moveNode === afterNode) return;
    if (afterNode === moveNode.prev) return;

    if (moveNode.prev) {
      moveNode.prev.next = moveNode.next;
    } else {
      this.head = moveNode.next;
    }

    if (moveNode.next) {
      moveNode.next.prev = moveNode.prev;
    } else {
      this.tail = moveNode.prev;
    }

    if (!afterNode) {
      moveNode.prev = null;
      moveNode.next = this.head;

      if (this.head) this.head.prev = moveNode;
      this.head = moveNode;

      if (!this.tail) this.tail = moveNode;
    } else {
      moveNode.prev = afterNode;
      moveNode.next = afterNode.next;

      if (afterNode.next) {
        afterNode.next.prev = moveNode;
      } else {
        this.tail = moveNode;
      }

      afterNode.next = moveNode;
    }
  }
}

// ============================================================
// FOLDER MANAGEMENT
// ============================================================

class FolderManager {
  constructor() {
    this.folders = new Map();
    this.nextFolderId = 1;
  }

  createFolder(name) {
    const id = this.nextFolderId++;
    const folder = { id, name, songs: [], expanded: true };
    this.folders.set(id, folder);
    return folder;
  }

  addSongToFolder(folderId, song) {
    const folder = this.folders.get(folderId);
    if (folder) folder.songs.push(song);
  }

  getFolder(folderId) {
    return this.folders.get(folderId);
  }

  toggleExpanded(folderId) {
    const folder = this.folders.get(folderId);
    if (folder) folder.expanded = !folder.expanded;
  }

  getAllFolders() {
    return Array.from(this.folders.values());
  }

  getTotalSongs() {
    let total = 0;
    this.folders.forEach(f => total += f.songs.length);
    return total;
  }

  deleteFolder(folderId) {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.songs.forEach(song => {
        if (song.url) URL.revokeObjectURL(song.url);
        if (song.cover) URL.revokeObjectURL(song.cover);
      });
      this.folders.delete(folderId);
    }
  }

  moveFolder(fromId, toId) {
    const folders = this.getAllFolders();
    const fromIndex = folders.findIndex(f => f.id === fromId);
    const toIndex = folders.findIndex(f => f.id === toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const movedFolder = folders.splice(fromIndex, 1)[0];
    folders.splice(toIndex, 0, movedFolder);
    
    this.folders.clear();
    folders.forEach(f => this.folders.set(f.id, f));
  }
}

// ============================================================
// PLAYER STATE
// ============================================================

const playlist = new DoublyLinkedList();
const folderManager = new FolderManager();
let idCounter = 0;
let isPlaying = false;
let pendingFiles = null;
let pendingPosition = null;
let lastFolderId = null;
let currentFolderId = null;

// Audio
const audio = new Audio();
audio.volume = 0.8;

// Web Audio API
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let animFrame = null;
let vizAnimFrame = null;
let audioContextReady = false;

// Dynamic colors
const songColors = {
  default: { bg: '#F7F4EF', gradient: 'linear-gradient(135deg, #E8D5C4 0%, #D4956A 100%)' },
  warm: { bg: '#FFF5F0', gradient: 'linear-gradient(135deg, #FFD4C4 0%, #FF8C4B 100%)' },
  cool: { bg: '#F0F5FF', gradient: 'linear-gradient(135deg, #C4D4FF 0%, #4B8CFF 100%)' },
  nature: { bg: '#F0FFF5', gradient: 'linear-gradient(135deg, #C4FFDC 0%, #4BFF8C 100%)' },
  purple: { bg: '#F5F0FF', gradient: 'linear-gradient(135deg, #E0C4FF 0%, #8C4BFF 100%)' },
  dark: { bg: '#1A1A1A', gradient: 'linear-gradient(135deg, #3A3A3A 0%, #1A1A1A 100%)' }
};

const colorKeys = Object.keys(songColors);

function initAudioContext() {
  if (audioContextReady) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return;
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioCtx) return;
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    sourceNode = audioCtx.createMediaElementSource(audio);
    if (!sourceNode) return;
    
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioContextReady = true;
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch(e) {
    console.warn('Web Audio API init failed:', e);
    audioContextReady = true;
  }
}

// ============================================================
// FILE HANDLING
// ============================================================

function triggerFileInput() { 
  const input = document.getElementById('fileInput');
  if (input) input.click(); 
}

function triggerFolderInput() { 
  const input = document.getElementById('folderInput');
  if (input) input.click(); 
}

async function handleFiles(files) {
  if (!files || !files.length) return;
  
  const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
  if (!audioFiles.length) { showToast('No se encontraron archivos de audio'); return; }

  const isFolder = files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/');
  
  if (isFolder) {
    const folderName = extractFolderName(files[0].webkitRelativePath);
    const folder = folderManager.createFolder(folderName);
    lastFolderId = folder.id;
    currentFolderId = folder.id;
    
    for (const file of audioFiles) {
      const song = await buildSong(file);
      song.folderId = folder.id;
      folderManager.addSongToFolder(folder.id, song);
      playlist.addLast(song);
    }
    
    renderPlaylist();
    updateDynamicBackground(playlist.current ? playlist.current.song : null);
  } else {
    for (const file of audioFiles) {
      const song = await buildSong(file);
      playlist.addLast(song);
    }
  }

  renderPlaylist();
  updateQueueCount();

  if (!isPlaying && playlist.current) {
    loadSong(playlist.current);
  }

  showToast(audioFiles.length + ' cancion(es) agregada(s)');
  
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  if (fileInput) fileInput.value = '';
  if (folderInput) folderInput.value = '';
}

function extractFolderName(path) {
  const parts = path.split('/');
  return parts.length > 1 ? parts[0] : 'Carpeta';
}

async function buildSong(file) {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/, '');

  let cover = null;
  let artist = 'Artista desconocido';
  let title = name;

  try {
    const meta = await readID3(file);
    if (meta) {
      if (meta.tags && meta.tags.title) title = meta.tags.title;
      if (meta.tags && meta.tags.artist) artist = meta.tags.artist;
      if (meta.tags && meta.tags.picture) {
        const pic = meta.tags.picture;
        const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format });
        cover = URL.createObjectURL(blob);
      }
    }
  } catch(e) { }

  const duration = await getAudioDuration(url);
  return { id: ++idCounter, name: title, artist: artist, duration: duration, url: url, cover: cover, folderId: currentFolderId };
}

function readID3(file) {
  return new Promise(function(resolve) {
    if (!window.jsmediatags) { resolve(null); return; }
    window.jsmediatags.read(file, {
      onSuccess: function(tag) { resolve(tag); },
      onError: function() { resolve(null); }
    });
  });
}

function getAudioDuration(url) {
  return new Promise(function(resolve) {
    const tmp = new Audio(url);
    tmp.addEventListener('loadedmetadata', function() { resolve(tmp.duration || 0); });
    tmp.addEventListener('error', function() { resolve(0); });
  });
}

// ============================================================
// DYNAMIC BACKGROUND
// ============================================================

function updateDynamicBackground(song) {
  if (!song) {
    document.body.style.removeProperty('--bg-dynamic');
    document.body.style.removeProperty('--bg-gradient');
    return;
  }

  const colorIndex = (song.id - 1) % colorKeys.length;
  const colorKey = colorKeys[colorIndex];
  const colors = songColors[colorKey];
  
  if (colors) {
    document.body.style.setProperty('--bg-dynamic', colors.bg);
    document.body.style.setProperty('--bg-gradient', colors.gradient);
  }
}

function extractDominantColor(coverUrl) {
  return new Promise(function(resolve) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      resolve({ r: r, g: g, b: b, hex: '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0') });
    };
    img.onerror = function() { resolve(null); };
    img.src = coverUrl;
  });
}

// ============================================================
// PLAYBACK
// ============================================================

function loadSong(node) {
  if (!node) return;
  playlist.current = node;
  const song = node.song;

  if (song.folderId) {
    currentFolderId = song.folderId;
    folderManager.toggleExpanded(song.folderId);
  }

  audio.src = song.url;

  const nowTitle = document.getElementById('nowTitle');
  const nowArtist = document.getElementById('nowArtist');
  if (nowTitle) nowTitle.textContent = song.name;
  if (nowArtist) nowArtist.textContent = song.artist;

  const circle = document.getElementById('artworkCircle');
  const emoji = document.getElementById('artworkEmoji');
  if (circle) {
    const oldImg = circle.querySelector('img');
    if (oldImg) oldImg.remove();

    if (song.cover) {
      circle.classList.remove('no-cover');
      if (emoji) emoji.style.display = 'none';
      const img = document.createElement('img');
      img.src = song.cover;
      circle.appendChild(img);
      
      updateDynamicBackground(song);
    } else {
      circle.classList.add('no-cover');
      if (emoji) emoji.style.display = '';
      
      updateDynamicBackground(song);
    }
  }

  renderPlaylist();
}

function togglePlay() {
  if (!playlist.current) return;

  if (isPlaying) {
    audio.pause();
    setPlayingState(false);
    return;
  }

  if (!audio.src || audio.src === window.location.href) {
    audio.src = playlist.current.song.url;
  }

  initAudioContext();

  audio.play().then(function() {
    setPlayingState(true);
  }).catch(function(err) {
    console.warn('Playback error:', err);
    showToast('Error al reproducir el audio');
  });
}

function setPlayingState(playing) {
  isPlaying = playing;
  const circle = document.getElementById('artworkCircle');
  const ring = document.getElementById('artworkRing');
  const playIcon = document.getElementById('playIcon');

  if (playing) {
    if (circle) circle.classList.add('spinning');
    if (circle) circle.classList.remove('paused');
    if (ring) ring.classList.add('playing');
    if (playIcon) playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    startVisualizer();
  } else {
    if (circle) circle.classList.add('paused');
    if (ring) ring.classList.remove('playing');
    if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    stopVisualizer();
  }

  document.querySelectorAll('.eq-icon').forEach(function(el) {
    el.classList.toggle('eq-paused', !playing);
  });
}

function nextSong() {
  if (!playlist.current) return;
  const moved = playlist.goNext();
  if (!moved) {
    playlist.current = playlist.head;
  }
  loadSong(playlist.current);
  if (isPlaying) audio.play().then(function() { setPlayingState(true); }).catch(function() {});
}

function prevSong() {
  if (!playlist.current) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const moved = playlist.goPrev();
  if (!moved) playlist.current = playlist.tail;
  loadSong(playlist.current);
  if (isPlaying) audio.play().then(function() { setPlayingState(true); }).catch(function() {});
}

function skipForward() {
  if (!audio.duration) return;
  audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
}

function skipBackward() {
  if (!audio.duration) return;
  audio.currentTime = Math.max(audio.currentTime - 5, 0);
}

function playSongById(id) {
  const node = playlist.findById(id);
  if (!node) return;
  audio.pause();
  setPlayingState(false);
  loadSong(node);
  initAudioContext();
  audio.play().then(function() {
    setPlayingState(true);
  }).catch(function(err) {
    console.warn('Playback error:', err);
    showToast('Error al reproducir el audio');
  });
}

function removeSong(id, e) {
  e.stopPropagation();
  const node = playlist.findById(id);
  if (!node) return;
  const wasActive = playlist.current === node;
  playlist.remove(node);
  if (wasActive && playlist.current) {
    loadSong(playlist.current);
    if (isPlaying) audio.play().catch(function() {});
  } else if (!playlist.current) {
    audio.pause();
    setPlayingState(false);
    resetPlayerUI();
  }
  renderPlaylist();
  updateQueueCount();
}

function deleteFolder(folderId, e) {
  e.stopPropagation();
  const folder = folderManager.getFolder(folderId);
  if (!folder) return;
  
  const folderSongs = playlist.toArray().filter(function(n) { return n.song.folderId === folderId; });
  const isFolderPlaying = folderSongs.some(function(n) { return playlist.current === n; });
  
  playlist.toArray().forEach(function(node) {
    if (node.song.folderId === folderId) {
      playlist.remove(node);
    }
  });
  
  folderManager.deleteFolder(folderId);
  
  if (isFolderPlaying || !playlist.current) {
    audio.pause();
    setPlayingState(false);
    if (playlist.current) {
      loadSong(playlist.current);
    } else {
      resetPlayerUI();
    }
  }
  
  renderPlaylist();
  updateQueueCount();
  showToast('"' + folder.name + '" eliminada');
}

function resetPlayerUI() {
  const nowTitle = document.getElementById('nowTitle');
  const nowArtist = document.getElementById('nowArtist');
  const progressFill = document.getElementById('progressFill');
  const timeElapsed = document.getElementById('timeElapsed');
  const timeDuration = document.getElementById('timeDuration');
  
  if (nowTitle) nowTitle.textContent = 'Sin reproduccion';
  if (nowArtist) nowArtist.textContent = '—';
  if (progressFill) progressFill.style.width = '0%';
  if (timeElapsed) timeElapsed.textContent = '0:00';
  if (timeDuration) timeDuration.textContent = '0:00';
  updateDynamicBackground(null);
}

audio.addEventListener('ended', function() { nextSong(); });

audio.addEventListener('timeupdate', function() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  const progressFill = document.getElementById('progressFill');
  const timeElapsed = document.getElementById('timeElapsed');
  const timeDuration = document.getElementById('timeDuration');
  
  if (progressFill) progressFill.style.width = pct + '%';
  if (timeElapsed) timeElapsed.textContent = fmtTime(audio.currentTime);
  if (timeDuration) timeDuration.textContent = fmtTime(audio.duration);
});

function seekAudio(e) {
  if (!audio.duration) return;
  const wrap = document.getElementById('progressWrap');
  if (!wrap) return;
  
  const rect = wrap.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
}

function setVolume(v) { audio.volume = parseFloat(v); }

function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return m + ':' + sec;
}

// ============================================================
// VISUALIZER
// ============================================================

function startVisualizer() {
  if (!analyser) return;
  const canvas = document.getElementById('visualizer');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const bufLen = analyser.frequencyBinCount;
  const data = new Uint8Array(bufLen);

  function draw() {
    vizAnimFrame = requestAnimationFrame(draw);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    analyser.getByteFrequencyData(data);

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bars = 64;
    const barW = (W / bars) - 1;

    for (let i = 0; i < bars; i++) {
      const val = data[Math.floor(i * bufLen / bars)] / 255;
      const barH = val * H * 0.9;
      const hue = 20 + (i / bars) * 30;
      const alpha = 0.6 + val * 0.4;
      ctx.fillStyle = 'hsla(' + hue + ', 85%, 55%, ' + alpha + ')';
      ctx.beginPath();
      ctx.roundRect(i * (barW + 1), H - barH, barW, barH, 2);
      ctx.fill();
    }
  }

  if (vizAnimFrame) cancelAnimationFrame(vizAnimFrame);
  draw();
}

function stopVisualizer() {
  if (vizAnimFrame) cancelAnimationFrame(vizAnimFrame);
  const canvas = document.getElementById('visualizer');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const W = canvas.width;
  const H = canvas.height;
  const bars = 64;
  const barW = (W / bars) - 1;
  for (let i = 0; i < bars; i++) {
    const h = 4 + Math.random() * 6;
    ctx.fillStyle = 'rgba(232,98,26,0.2)';
    ctx.beginPath();
    ctx.roundRect(i * (barW + 1), H - h, barW, h, 1);
    ctx.fill();
  }
}

// ============================================================
// RENDER PLAYLIST
// ============================================================

function renderPlaylist() {
  const container = document.getElementById('playlistContainer');
  if (!container) return;
  
  const nodes = playlist.toArray();
  const folders = folderManager.getAllFolders();

  container.innerHTML = '';

  if (nodes.length === 0) {
    container.innerHTML = '<div class="playlist-empty"><div class="playlist-empty-icon">♪</div><div><strong>Sin canciones aun</strong><br>Agrega archivos de audio para comenzar</div></div>';
    return;
  }

  folders.forEach(function(folder) {
    if (folder.songs.length === 0) return;

    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder-group' + (folder.expanded ? ' expanded' : '');
    folderDiv.dataset.folderId = String(folder.id);
    folderDiv.draggable = true;
    folderDiv.innerHTML = '<div class="folder-drag-handle" title="Arrastrar para reordenar"><svg width="12" height="16" fill="currentColor" viewBox="0 0 12 16"><circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/></svg></div><div class="folder-icon"><svg width="16" height="16" fill="#fff" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></div><div class="folder-arrow">▶</div><div class="folder-name">' + escHtml(folder.name) + '</div><div class="folder-count">' + folder.songs.length + ' cancion' + (folder.songs.length !== 1 ? 'es' : '') + '</div><button class="folder-delete" onclick="deleteFolder(' + folder.id + ', event)" title="Eliminar carpeta"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    
    folderDiv.addEventListener('click', function(e) {
      if (e.target.closest('.folder-delete')) return;
      folderManager.toggleExpanded(folder.id);
      renderPlaylist();
    });

    folderDiv.addEventListener('dragstart', function(e) {
      dragSrcFolderId = folder.id;
      folderDiv.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    folderDiv.addEventListener('dragend', function() {
      folderDiv.classList.remove('dragging');
      document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(function(el) {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });

    folderDiv.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (parseInt(folderDiv.dataset.folderId || '0') === dragSrcFolderId) return;
      const rect = folderDiv.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(function(el) {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      folderDiv.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
    });

    folderDiv.addEventListener('drop', function(e) {
      e.preventDefault();
      if (parseInt(folderDiv.dataset.folderId || '0') === dragSrcFolderId) return;
      folderManager.moveFolder(dragSrcFolderId, parseInt(folderDiv.dataset.folderId || '0'));
      renderPlaylist();
    });

    container.appendChild(folderDiv);

    if (folder.expanded) {
      const folderSongs = nodes.filter(function(n) { return n.song.folderId === folder.id; });
      folderSongs.forEach(function(node, idx) {
        const song = node.song;
        const isActive = playlist.current === node;
        const row = createSongRow(song, isActive, folderSongs.length > idx ? idx + 1 : null);
        row.dataset.folderId = String(folder.id);
        container.appendChild(row);
      });
    }
  });

  const rootSongs = nodes.filter(function(n) { return !n.song.folderId; });
  if (rootSongs.length > 0) {
    rootSongs.forEach(function(node, idx) {
      const song = node.song;
      const isActive = playlist.current === node;
      const row = createSongRow(song, isActive, idx + 1);
      container.appendChild(row);
    });
  }

  const activeRow = container.querySelector('.song-row.active');
  if (activeRow) activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function createSongRow(song, isActive, number) {
  const row = document.createElement('div');
  row.className = 'song-row' + (isActive ? ' active' : '');
  row.dataset.id = String(song.id);
  row.draggable = true;

  row.innerHTML = '<div class="drag-handle" title="Arrastrar para reordenar"><svg width="12" height="16" fill="currentColor" viewBox="0 0 12 16"><circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/></svg></div><div class="song-number">' + (number || '—') + '</div><div class="eq-icon ' + (!isActive || !isPlaying ? 'eq-paused' : '') + '"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div><div class="song-thumb">' + (song.cover ? '<img src="' + song.cover + '" alt="">' : '🎵') + '</div><div class="song-info"><div class="song-title">' + escHtml(song.name) + '</div><div class="song-artist">' + escHtml(song.artist) + '</div></div><div class="song-duration">' + fmtTime(song.duration) + '</div><button class="song-remove" onclick="removeSong(' + song.id + ', event)" title="Eliminar"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';

  row.addEventListener('click', function() { playSongById(song.id); });
  setupDragEvents(row, song.id);

  return row;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateQueueCount() {
  const queueCount = document.getElementById('queueCount');
  if (queueCount) queueCount.textContent = playlist.size + ' cancion' + (playlist.size !== 1 ? 'es' : '');
}

// ============================================================
// DRAG & DROP REORDER
// ============================================================

let dragSrcId = null;
let dragSrcFolderId = null;

function setupDragEvents(row, id) {
  row.addEventListener('dragstart', function(e) {
    dragSrcId = id;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  row.addEventListener('dragend', function() {
    row.classList.remove('dragging');
    document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(function(el) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  row.addEventListener('dragover', function(e) {
    e.preventDefault();
    if (parseInt(row.dataset.id || '0') === dragSrcId) return;
    const rect = row.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    document.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach(function(el) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    row.classList.add(e.clientY < mid ? 'drag-over-top' : 'drag-over-bottom');
  });

  row.addEventListener('drop', function(e) {
    e.preventDefault();
    if (parseInt(row.dataset.id || '0') === dragSrcId) return;
    const srcNode = playlist.findById(dragSrcId);
    const tgtNode = playlist.findById(parseInt(row.dataset.id || '0'));
    if (!srcNode || !tgtNode) return;

    const rect = row.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      playlist.moveAfter(srcNode, tgtNode.prev);
    } else {
      playlist.moveAfter(srcNode, tgtNode);
    }

    renderPlaylist();
  });
}

// ============================================================
// MODAL
// ============================================================

function openModal(files) {
  pendingFiles = files;
  const posInput = document.getElementById('posInput');
  const posModal = document.getElementById('posModal');
  if (posInput) {
    posInput.value = '1';
    posInput.max = String(playlist.size + 1);
  }
  if (posModal) posModal.classList.add('open');
}

function closeModal() {
  const posModal = document.getElementById('posModal');
  if (posModal) posModal.classList.remove('open');
  pendingFiles = null;
}

async function confirmInsert() {
  const posInput = document.getElementById('posInput');
  const pos = parseInt(posInput ? posInput.value : '1') || 1;
  if (pendingFiles) {
    for (const file of Array.from(pendingFiles)) {
      if (!file.type.startsWith('audio/')) continue;
      const song = await buildSong(file);
      playlist.addAt(song, pos);
    }
    renderPlaylist();
    updateQueueCount();
    showToast('Cancion(es) insertada(s)');
  }
  closeModal();
}

// ============================================================
// TOAST
// ============================================================

let toastTimer = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2800);
}

// ============================================================
// INIT
// ============================================================

window.addEventListener('load', function() {
  setTimeout(stopVisualizer, 100);
});

(function() {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.7/jsmediatags.min.js';
  document.head.appendChild(s);
})();
