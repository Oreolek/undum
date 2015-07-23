// -----------------------------------------------------------------------
// Internal Infrastructure Implementations [NB: These have to be
// at the top, because we use them below, but you can safely
// ignore them and skip down to the next section.]
// -----------------------------------------------------------------------

/* Crockford's inherit function */
Function.prototype.inherits = function(Parent) {
  var d = {}, p = (this.prototype = new Parent());
  this.prototype.uber = function(name) {
    if (!(name in d)) d[name] = 0;
    var f, r, t = d[name], v = Parent.prototype;
    if (t) {
      while (t) {
        v = v.constructor.prototype;
        t -= 1;
      }
      f = v[name];
    } else {
      f = p[name];
      if (f == this[name]) {
        f = v[name];
      }
    }
    d[name] += 1;
    r = f.apply(this, Array.prototype.slice.apply(arguments, [1]));
    d[name] -= 1;
    return r;
  };
  return this;
};

// Feature detection

var hasLocalStorage = function() {
  var hasStorage = false;
  try {
    hasStorage = ('localStorage' in window) &&
      window.localStorage !== null &&
      window.localStorage !== undefined;
  }
  catch (err) {
    // Firefox with the "Always Ask" cookie accept setting
    // will throw an error when attempting to access localStorage
    hasStorage = false;
  }
  return hasStorage;
};

/// Animations - you can totally redefine these! Fade in and fade out by default.
/// @param id string or object
var showBlock = function(id) {
  var block = id;
  if (typeof id === "string") {
    var block = document.getElementById(id);
  }
  block.classList.add('show');
  block.classList.remove('hide');
  block.style.display = 'block';
}

var hideBlock = function(id) {
  var block = id; // typeof block === "element"
  if (typeof id === "string") {
    var block = document.getElementById(id);
  }
  if (typeof id === "object") { // probably NodeList
    if (id.length == 0)
      return;
    Array.prototype.forEach.call(id, function(element, index) {
      element.classList.add('hide');
      element.classList.remove('show');
    });
    return;
  }
  if (typeof block.classList === "undefined")
  {
    console.log("Tried to hide an undefined block.");
    console.log(id);
    return;
  }
  block.classList.add('hide');
  block.classList.remove('show');
}

// Assertion

var AssertionError = function(message) {
  this.message = message;
  this.name = AssertionError;
};
AssertionError.inherits(Error);

var assert = function(expression, message) {
  if (!expression) {
    throw new AssertionError(message);
  }
};

// Object extention
var extend = function(out) {
  out = out || {};
  for (var i = 1; i < arguments.length; i++) {
    var obj = arguments[i];

    if (!obj)
      continue;

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object')
          extend(out[key], obj[key]);
        else
          out[key] = obj[key];
      }
    }
  }

  return out;
};
