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

  isEmpty() {
    return this.size === 0;
  }

  clear() {
    let node = this.head;
    while (node) {
      this._cleanupNode(node);
      node = node.next;
    }
    this.head = this.tail = this.current = null;
    this.size = 0;
  }

  addLast(song) {
    const node = new SongNode(song);

    if (this.isEmpty()) {
      this.head = this.tail = this.current = node;
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

    if (this.isEmpty()) {
      this.head = this.tail = this.current = node;
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

    let current = this.head;
    let index = 1;

    while (index < position - 1) {
      current = current.next;
      index++;
    }

    const node = new SongNode(song);
    const nextNode = current.next;

    current.next = node;
    node.prev = current;
    node.next = nextNode;

    if (nextNode) nextNode.prev = node;

    this.size++;
    return node;
  }

  remove(node) {
    if (!node || this.isEmpty()) return;

    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    if (this.current === node) {
      this.current = node.next || node.prev || null;
    }

    this._cleanupNode(node);

    this.size--;
  }

  goNext() {
    if (this.current?.next) {
      this.current = this.current.next;
      return true;
    }
    return false;
  }

  goPrev() {
    if (this.current?.prev) {
      this.current = this.current.prev;
      return true;
    }
    return false;
  }

  toArray() {
    const result = [];
    let node = this.head;

    while (node) {
      result.push(node);
      node = node.next;
    }

    return result;
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

   
    if (moveNode.prev) moveNode.prev.next = moveNode.next;
    else this.head = moveNode.next;

    if (moveNode.next) moveNode.next.prev = moveNode.prev;
    else this.tail = moveNode.prev;

 
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

  _cleanupNode(node) {
    if (node.song?.url) URL.revokeObjectURL(node.song.url);
    if (node.song?.cover) URL.revokeObjectURL(node.song.cover);
  }
}
