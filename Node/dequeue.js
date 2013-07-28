// http://david-burger.blogspot.com/2009/07/javascript-dequeue.html
var Dequeue = function() {
  this._front = new Dequeue.Node();
  this._back = new Dequeue.Node();
  this._front._prev = this._back;
  this._back._next = this._front;
  this.length = 0;
}

Dequeue.Node = function(data) {
  this._data = data;
  this._prev = null;
  this._next = null;
};
 
Dequeue.prototype.empty = function() {
  return this._front._prev === this._back;
};
 
Dequeue.prototype.push = function(data) {
  if (data) {
    var node = new Dequeue.Node(data);
    node._prev = this._front._prev;
    node._next = this._front;
    this._front._prev._next = node;
    this._front._prev = node;
    this.length += 1;
  }
};
 
Dequeue.prototype.pop_front = function() {
  if (this.empty()) {
    throw new Error("pop_front() called on empty dequeue");
  } else {
    var node = this._front._prev;
    this._front._prev = node._prev;
    this._front._prev._next = this._front;
    this.length -= 1;
    return node._data;
  }
};

Dequeue.prototype.pop_back = function() {
  if (this.empty()) {
    throw new Error("pop_back() called on empty dequeue");
  } else {
    var node = this._back._next;
    this._back._next = node._next;
    this._back._next._prev = this._back;
    this.length -= 1;
    return node._data;
  }
};

Dequeue.prototype.peek_front = function() {
  if (this.empty()) {
    return null;
  }
  return this._front._prev._data;
};

Dequeue.prototype.peek_back = function() {
  if (this.empty()) {
    return null;
  }
  return this._back._next._data;
};

Dequeue.prototype.to_array = function() {
  var out = []
  node = this._front;
  while (node) {
    if (node._data) {
      out.push(node._data);
    }
    node = node._prev;
  }
  return out;
}

/** Simple Peak-Finding Algorithm **/
Dequeue.prototype.find_peaks = function() {
  var data = this.to_array();
  var high_peaks = []
  var low_peaks = []
  for (var i = 1; i < data.length() - 1; i++) {
    if(data[i-1] < data[i] && data[i] > data[i+1]) {
      high_peaks.push(i);
    } else if(data[i-1] > data[i] && data[i] < data[i+1]) {
      low_peaks.push(i);
    }
  }
}

module.exports = Dequeue;
