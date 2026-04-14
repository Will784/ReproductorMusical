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

  add(song) {
    const newNode = new SongNode(song);

    if (!this.head) {
      this.head = this.tail = this.current = newNode;
    } else {
      this.tail.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }

    this.size++;
  }

  next() {
    if (this.current && this.current.next) {
      this.current = this.current.next;
    }
    return this.current;
  }

  prev() {
    if (this.current && this.current.prev) {
      this.current = this.current.prev;
    }
    return this.current;
  }

  toArray() {
    let arr = [];
    let temp = this.head;

    while (temp) {
      arr.push(temp);
      temp = temp.next;
    }

    return arr;
  }
}

const playlist = new DoublyLinkedList();
const audio = new Audio();

const container = document.getElementById("playlistContainer");
const emptyState = document.getElementById("emptyState");
const nowTitle = document.getElementById("nowTitle");
const playBtn = document.getElementById("playBtn");


// =======================
// CARGA DE ARCHIVOS
// =======================
function triggerFileInput() {
  document.getElementById("fileInput").click();
}

function handleFiles(files) {
  for (let file of files) {
    const url = URL.createObjectURL(file);

    playlist.add({
      name: file.name,
      url: url
    });
  }

  renderPlaylist();
}


// =======================
// RENDER
// =======================
function renderPlaylist(filter = "") {
  container.innerHTML = "";

  const songs = playlist.toArray();

  const filtered = songs.filter(node =>
    node.song.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p>No hay resultados</p>`;
    return;
  }

  filtered.forEach(node => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.textContent = node.song.name;

    div.onclick = () => {
      playlist.current = node;
      playCurrent();
    };

    container.appendChild(div);
  });
}


// =======================
// BUSCADOR
// =======================
function filterSongs(query) {
  renderPlaylist(query);
}


// =======================
// REPRODUCCIÓN
// =======================
function playCurrent() {
  if (!playlist.current) return;

  audio.src = playlist.current.song.url;
  audio.play();

  nowTitle.textContent = playlist.current.song.name;
  playBtn.textContent = "⏸";
}

function togglePlay() {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
}

function nextSong() {
  playlist.next();
  playCurrent();
}

function prevSong() {
  playlist.prev();
  playCurrent();
}
