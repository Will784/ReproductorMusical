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

    while (idx < position - 1 && cur) {
      cur = cur.next;
      idx++;
    }

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
    while (node) {
      arr.push(node);
      node = node.next;
    }
    return arr;
  }

  findById(id) {
    let node = this.head;
    while (node) {
      if (node.song.id === id) return node;
      node = node.next;
    }
    return null;
  }

  moveAfter(moveNode, afterNode) {
    if (!moveNode || moveNode === afterNode) return;
    if (afterNode === moveNode.prev) return;

    // detach
    if (moveNode.prev) moveNode.prev.next = moveNode.next;
    else this.head = moveNode.next;

    if (moveNode.next) moveNode.next.prev = moveNode.prev;
    else this.tail = moveNode.prev;

    // insert
    if (!afterNode) {
      moveNode.prev = null;
      moveNode.next = this.head;

      if (this.head) this.head.prev = moveNode;
      this.head = moveNode;
    } else {
      moveNode.prev = afterNode;
      moveNode.next = afterNode.next;

      if (afterNode.next) afterNode.next.prev = moveNode;
      else this.tail = moveNode;

      afterNode.next = moveNode;
    }
  }
}

// ================= PLAYER =================

const playlist = new DoublyLinkedList();
let idCounter = 0;
let isPlaying = false;

const audio = new Audio();
audio.volume = 0.8;

// ================= AUDIO CONTEXT =================

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let audioContextReady = false;

function initAudioContext() {
  if (audioContextReady) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  sourceNode = audioCtx.createMediaElementSource(audio);

  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioContextReady = true;
}

// ================= LOAD SONG (🔥 FIX PRINCIPAL) =================

function loadSong(node, autoPlay = true) {
  if (!node) return;

  playlist.current = node;
  const song = node.song;

  audio.src = song.url;

  // limpiar handler previo
  audio.onloadedmetadata = null;

  audio.onloadedmetadata = function () {
    if (autoPlay) {
      initAudioContext();

      audio.play()
        .then(() => setPlayingState(true))
        .catch(() => {
          setPlayingState(false);
        });
    }
  };

  document.getElementById('nowTitle').textContent = song.name;
  document.getElementById('nowArtist').textContent = song.artist;

  renderPlaylist();
}

// ================= CONTROLES =================

function togglePlay() {
  if (!playlist.current) return;

  if (isPlaying) {
    audio.pause();
    setPlayingState(false);
  } else {
    initAudioContext();
    audio.play().then(() => setPlayingState(true));
  }
}

function setPlayingState(playing) {
  isPlaying = playing;
}

function nextSong() {
  if (!playlist.current) return;

  const moved = playlist.goNext();
  if (!moved) playlist.current = playlist.head;

  loadSong(playlist.current, true);
}

function prevSong() {
  if (!playlist.current) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  const moved = playlist.goPrev();
  if (!moved) playlist.current = playlist.tail;

  loadSong(playlist.current, true);
}

function playSongById(id) {
  const node = playlist.findById(id);
  if (!node) return;

  loadSong(node, true);
}

// autoplay al terminar
audio.addEventListener('ended', nextSong);

// ================= FILES =================

async function handleFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;

    const song = await buildSong(file);
    playlist.addLast(song);
  }

  renderPlaylist();

  if (!playlist.current) {
    loadSong(playlist.head, false);
  }
}

async function buildSong(file) {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.[^.]+$/, '');

  return {
    id: ++idCounter,
    name,
    artist: 'Desconocido',
    url
  };
}

// ================= UI =================

function renderPlaylist() {
  const container = document.getElementById('playlistContainer');
  if (!container) return;

  container.innerHTML = '';

  playlist.toArray().forEach((node, i) => {
    const row = document.createElement('div');
    row.className = 'song-row' + (playlist.current === node ? ' active' : '');

    row.innerHTML = `
      <div>${i + 1}</div>
      <div>${node.song.name}</div>
      <button onclick="playSongById(${node.song.id})">▶</button>
    `;

    container.appendChild(row);
  });
}
