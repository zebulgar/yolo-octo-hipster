// http://david-burger.blogspot.com/2009/07/javascript-dequeue.html
var Dequeue = function() {
  this._front = new Dequeue.node();
  this._back = new Dequeue.node();
  this._front._prev = this._back;
  this._back._next = this._front;
}

Dequeue.node = function(data) {
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
    node._prev = this._front;
    this._front._next = node;
    this._front = node;
  }
};
 
Dequeue.prototype.pop_front = function() {
  if (this.empty()) {
    throw new Error("pop_front() called on empty dequeue");
  } else {
    var node = this._front;
    this._front = node._prev;
    this._front._next = null;
    return node._data;
  }
};

Dequeue.prototype.pop_back = function() {
  if (this.empty()) {
    throw new Error("pop_back() called on empty dequeue");
  } else {
    var node = this._back;
    this._back = node._next;
    this._back._prev = null;
    return node._data;
  }
};

Dequeue.prototype.peek_front = function() {
  if (this.empty()) {
    return null;
  }
  return this._front._data;
};

Dequeue.prototype.peek_back = function() {
  if (this.empty()) {
    return null;
  }
  return this._back._data;
};

Dequeue.prototype.to_array = function() {
  var out = []
  node = this._front;
  while (node) {
    out.push(node)
    node = node._prev;
  }
  return out;
}

/** Simple Peak-Finding Algorithm **/
Dequeue.prototype.find_peaks = function() {
  var data = this.to_array();
  var high_peaks = []
  var low_peaks = []
  for (int i = 1; i < data.length() - 1; i++) {
    if(data[i-1] < data[i] && data[i] > data[i+1]) {
      high_peaks.push(i);
    } else if(data[i-1] > data[i] && data[i] < data[i+1]) {
      low_peaks.push(i);
    }
  }
}

module.exports = Dequeue;
