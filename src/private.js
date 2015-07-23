// =======================================================================

// Code below doesn't form part of the public API for UNDUM, so
// you shouldn't find you need to use it.

// -----------------------------------------------------------------------
// Internal Data
// -----------------------------------------------------------------------

/* The global system object. */
var system = new System();

/* This is the data on the player's progress that gets saved. */
var progress = {
  // A random seed string, used internally to make random
  // sequences predictable.
seed: null,
      // Keeps track of the links clicked, and when.
      sequence: [],
      // The time when the progress was saved.
      saveTime: null
};

/* The Id of the current situation the player is in. */
var current = null;

/* This is the current character. It should be reconstructable
 * from the above progress data. */
var character = null;

/* Tracks whether we're in interactive mode or batch mode. */
var interactive = true;

/* The system time when the game was initialized. */
var startTime;

/* The stack of links, resulting from the last action, still be to
 * resolved. */
var linkStack = null;

// -----------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------

var getCurrentSituation = function() {
  if (current) {
    return game.situations[current];
  } else {
    return null;
  }
};

var parse = function(str) {
  if (str === undefined) {
    return str;
  } else {
    return parseFloat(str);
  }
};

var parseList = function(str, canBeUndefined) {
  if (str === undefined || str === null) {
    if (canBeUndefined) {
      return undefined;
    } else {
      return [];
    }
  } else {
    return str.split(/[ ,\t]+/);
  }
};

var parseFn = function(str) {
  if (str === undefined) {
    return str;
  } else {
    var fstr = "(function(character, system, situation) {\n" +
      str + "\n})";
    var fn = eval(fstr);
    return fn;
  }
};

var loadHTMLSituations = function() {
  var $htmlSituations = document.querySelectorAll("div.situation");
  Array.prototype.forEach.call($htmlSituations, function($situation){
    var id = $situation.getAttribute("id");
    assert(game.situations[id] === undefined, "existing_situation".l({id:id}));

    var content = $situation.innerHTML;
    var opts = {
      // Situation content
      optionText: $situation.getAttribute("data-option-text"),
      canView: parseFn($situation.getAttribute("data-can-view")),
      canChoose: parseFn($situation.getAttribute("data-can-choose")),
      priority: parse($situation.getAttribute("data-priority")),
      frequency: parse($situation.getAttribute("data-frequency")),
      displayOrder: parse($situation.getAttribute("data-display-order")),
      tags: parseList($situation.getAttribute("data-tags"), false),
      // Simple Situation content.
      heading: $situation.getAttribute("data-heading"),
      choices: parseList($situation.getAttribute("data-choices"), true),
      minChoices: parse($situation.getAttribute("data-min-choices")),
      maxChoices: parse($situation.getAttribute("data-max-choices"))
    };

    game.situations[id] = new SimpleSituation(content, opts);
  });
};


/* Outputs regular content to the page. Used by write and
 * writeBefore, the last two arguments control what jQuery methods
 * are used to add the content.
 */
// TODO: this function can append text, prepend text or replace text in selector with the supplied one.
var doWrite = function(content, selector) {
  continueOutputTransaction();
  var output = augmentLinks(content);
  var element;
  if (selector) element = document.querySelector(selector);
  if (element) {
    // TODO: scroll to the last position
    dimensions = element.getBoundingClientRect();
    console.log(dimensions);
    window.scroll(0,150);
    // TODO: scrollStack[scrollStack.length-1] = scrollPoint;*/
  }
  if (!element) {
    document.getElementById('content').innerHTML = output;
  }
  else {
    element.appendChild(output);
  }
  /* We want to scroll this new element to the bottom of the screen.
   * while still being visible. The easiest way is to find the
   * top edge of the *following* element and move that exactly
   * to the bottom (while still ensuring that this element is fully
   * visible.) */
  /*var nextel = output.last().next();
    var scrollPoint;
    if (!nextel.length) {
    scrollPoint = $("#content").height() + $("#title").height() + 60;
    } else {
    scrollPoint = nextel.offset().top - $(window).height();
    }
    if (scrollPoint > output.offset().top)
    scrollPoint = output.offset().top;
    scrollStack[scrollStack.length-1] = scrollPoint;*/
};

/* Gets the unique id used to identify saved games. */
var getSaveId = function() {
  return 'undum_'+game.id+"_"+game.version;
};

/* Adds the quality blocks to the character tools. */
var showQualities = function() {
  document.getElementById("qualities").innerHTML = '';
  for (var qualityId in character.qualities) {
    addQualityBlock(qualityId);
  }
};

/* Fades in and out a highlight on the given element. */
var showHighlight = function(domElement) {
  var highlight = domElement.querySelector(".highlight");
  if (highlight.length <= 0) {
    highlight = document.createElement("<div></div>").classList.add('highlight');
    domElement.appendChild(highlight);
  }
  showBlock(highlight);
  setTimeout(function() {
    hideBlock(highlight);
  }, 2000);
};

/* Finds the correct location and inserts a particular DOM element
 * fits into an existing list of DOM elements. This is done by
 * priority order, so all elements (existing and new) must have
 * their data-priority attribute set. */
var insertAtCorrectPosition = function(parent, newItem) {
  var newPriority = newItem.getAttribute('data-priority');
  var _children = parent.children;
  if (_children != undefined)
  {
    for (var i = 0; i < _children.length; i++) {
      var child = _children[i];
      if (newPriority < child.getAttribute('data-priority')) {
        child.before(newItem);
        return;
      }
    }
    parent.appendChild(newItem);
  }
};

/* Adds a new group to the correct location in the quality list. */
var addGroupBlock = function(groupId) {
  var groupDefinition = game.qualityGroups[groupId];

  // Build the group div with appropriate heading.
  var groupBlock = document.getElementById("quality_group").cloneNode(true);
  groupBlock.setAttribute("id", "g_"+groupId);
  groupBlock.setAttribute("data-priority", groupDefinition.priority);

  var titleElement = groupBlock.querySelectorAll("[data-attr='title']");
  if (groupDefinition.title) {
    titleElement.innerHTML = groupDefinition.title;
  } else {
    if (titleElement.parentNode != undefined)
    {
      titleElement.parentNode.removeChild(titleElement);
    }
  }

  if (groupDefinition.extraClasses) {
    for (var i = 0; i < groupDefinition.extraClasses.length; i++) {
      groupBlock.addClass(groupDefinition.extraClasses[i]);
    }
  }

  // Add the block to the correct place.
  var qualities = document.getElementById("qualities");
  insertAtCorrectPosition(qualities, groupBlock);
  return groupBlock;
};

/* Adds a new quality to the correct location in the quality list. */
var addQualityBlock = function(qualityId) {
  // Make sure we want to display this quality.
  var qualityDefinition = game.qualities[qualityId];
  if (!qualityDefinition) {
    throw new Error("Can't display a quality that hasn't been defined: "+
        qualityId);
  }

  // Work out how the value should be displayed.
  var name = qualityDefinition.title;
  var val = qualityDefinition.format(
      character, character.qualities[qualityId]
      );
  if (val === null) return null;

  // Create the quality output.
  var qualityBlock = document.getElementById("quality").cloneNode(true);
  qualityBlock.setAttribute("id", "q_"+qualityId);
  qualityBlock.setAttribute("data-priority", qualityDefinition.priority);
  qualityBlock.querySelectorAll("[data-attr='name']").innerHTML = name;
  qualityBlock.querySelectorAll("[data-attr='value']").innerHTML = val;
  if (qualityDefinition.extraClasses) {
    for (var i = 0; i < qualityDefinition.extraClasses.length; i++) {
      qualityBlock.className.add(qualityDefinition.extraClasses[i]);
    }
  }

  // Find or create the group block.
  var groupBlock;
  var groupId = qualityDefinition.group;
  if (groupId) {
    var group = game.qualityGroups[groupId];
    assert(group, "no_group_definition".l({id: groupId}));
    groupBlock = document.getElementById("g_"+groupId);
    if (groupBlock == null || groupBlock.length <= 0) {
      groupBlock = addGroupBlock(groupId);
    }
  }

  // Position it correctly.
  var groupQualityList = groupBlock.querySelectorAll(".qualities_in_group");
  insertAtCorrectPosition(groupQualityList, qualityBlock);
  return qualityBlock;
};

/* Output events are tracked, so we can make sure we scroll
 * correctly. We do this in a stack because one click might cause
 * a chain reaction. Of output events, only when we return to the
 * top level will we do the scroll.
 *
 * However, that leaves the question of where to scroll *to*.
 * (Remember that elements could be inserted anywhere in the
 * document.) Whenever we do a write(), we'll have to update the
 * top (last) stack element to that position.
 */
var scrollStack = [];
var pendingFirstWrite = false;
var startOutputTransaction = function() {
  if (scrollStack.length === 0) {
    pendingFirstWrite = true;
  }
  // The default is "all the way down".
  scrollStack.push(
      $("#content").height() + $("#title").height() + 60
      );
};
var continueOutputTransaction = function() {
  if (pendingFirstWrite) {
    pendingFirstWrite = false;
    var separator = $("#ui_library #turn_separator").clone();
    separator.removeAttr("id");
    $("#content").append(separator);
  }
};
var endOutputTransaction = function() {
  var scrollPoint = scrollStack.pop();
  if (scrollStack.length === 0 && scrollPoint !== null) {
    if (interactive) {
      window.scroll(0,scrollPoint);
    }
    scrollPoint = null;
  }
};

/* This gets called when a link needs to be followed, regardless
 * of whether it was user action that initiated it. */
var linkRe = /^([a-z0-9_-]+|\.)(\/([0-9a-z_-]+))?$/;
var processLink = function(code) {
  // Check if we should do this now, or if processing is already
  // underway.
  if (linkStack !== null) {
    linkStack.push(code);
    return;
  }

  // Track where we're about to add new content.
  startOutputTransaction();

  // We're processing, so make the stack available.
  linkStack = [];

  // Handle each link in turn.
  processOneLink(code);
  while (linkStack.length > 0) {
    code = linkStack.shift();
    processOneLink(code);
  }

  // We're done, so remove the stack to prevent future pushes.
  linkStack = null;

  // Scroll to the top of the new content.
  endOutputTransaction();

  // We're able to save, if we weren't already.
  $("#save").attr('disabled', false);
};

/* This gets called to actually do the work of processing a code.
 * When one doLink is called (or a link is clicked), this may set call
 * code that further calls doLink, and so on. This method processes
 * each one, and processLink manages this.
 */
var processOneLink = function(code) {
  var match = code.match(linkRe);
  assert(match, "link_not_valid".l({link:code}));

  var situation = match[1];
  var action = match[3];

  // Change the situation
  if (situation !== '.') {
    if (situation !== current) {
      doTransitionTo(situation);
    }
  } else {
    // We should have an action if we have no situation change.
    assert(action, "link_no_action".l());
  }

  // Carry out the action
  if (action) {
    situation = getCurrentSituation();
    if (situation) {
      if (game.beforeAction) {
        // Try the global act handler, and see if we need
        // to notify the situation.
        var consumed = game.beforeAction(
            character, system, current, action
            );
        if (consumed !== true) {
          situation.act(character, system, action);
        }
      } else {
        // We have no global act handler, always notify
        // the situation.
        situation.act(character, system, action);
      }
      if (game.afterAction) {
        game.afterAction(character, system, current, action);
      }
    }
  }
};

/* This gets called when the user clicks a link to carry out an
 * action. */
var processClick = function(code) {
  var now = (new Date()).getTime() * 0.001;
  system.time = now - startTime;
  progress.sequence.push({link:code, when:system.time});
  processLink(code);
};

/* Transitions between situations. */
var doTransitionTo = function(newSituationId) {
  var oldSituationId = current;
  var oldSituation = getCurrentSituation();
  var newSituation = game.situations[newSituationId];

  assert(newSituation, "unknown_situation".l({id:newSituationId}));

  // We might not have an old situation if this is the start of
  // the game.
  if (oldSituation) {
    // Notify the exiting situation.
    oldSituation.exit(character, system, newSituationId);
    if (game.exit) {
      game.exit(character, system, oldSituationId, newSituationId);
    }
  }

  //  Remove links and transient sections.
  var content = document.getElementById("content");
  links = content.querySelectorAll("a");
  Array.prototype.forEach.call(links, function(element, index) {
    var a = element;
    if (a.classList.contains('sticky') || a.getAttribute("href").match(/[?&]sticky[=&]?/))
      return;
    if (a.getAttribute("href").match(/[?&]transient[=&]?/)) {
      hideBlock(a);
    }
    a.innerHTML = "<span class='ex_link'>"+a.innerHTML+"</span>";
  });
  hideBlock(content.querySelectorAll(".transient"));
  hideBlock(content.querySelectorAll("ul.options"));

  // Move the character.
  current = newSituationId;

  // Notify the incoming situation.
  if (game.enter) {
    game.enter(character, system, oldSituationId, newSituationId);
  }
  newSituation.enter(character, system, oldSituationId);

  // additional hook for when the situation text has already been printed
  if (game.afterEnter) {
    game.afterEnter(character, system, oldSituationId, newSituationId);
  }
};

/* Returns HTML from the given content with the non-raw links
 * wired up. 
 * @param content string HTML code 
 * @retval string */
var augmentLinks = function(content) {
  // Wire up the links for regular <a> tags.
  output = document.createElement('div');
  output.innerHTML = content;
  var links = output.querySelectorAll("a");
  Array.prototype.forEach.call(links, function(element, index){
    var href = element.getAttribute('href');
    if (!element.classList.contains("raw")|| href.match(/[?&]raw[=&]?/)) {
      if (href.match(linkRe)) {
        element.onclick = function(event) {
          event.preventDefault();

          // If we're a once-click, remove all matching links.
          if (element.classList.contains("once") || href.match(/[?&]once[=&]?/)) {
            system.clearLinks(href);
          }

          processClick(href);
          return false;
        };
      } else {
        element.classList.add("raw");
      }
    }
  });

  return output.innerHTML;
};

/* Erases the character in local storage. This is permanent! */
var doErase = function(force) {
  var saveId = getSaveId();
  if (localStorage[saveId]) {
    if (force || confirm("erase_message".l())) {
      delete localStorage[saveId];
      document.getElementById("erase").setAttribute('disabled', true);
      startGame();
    }
  }
};

/* Find and return a list of ids for all situations with the given tag. */
var getSituationIdsWithTag = function(tag) {
  var result = [];
  for (var situationId in game.situations) {
    var situation = game.situations[situationId];

    for (var i = 0; i < situation.tags.length; ++i) {
      if (situation.tags[i] == tag) {
        result.push(situationId);
        break;
      }
    }
  }
  return result;
};

/* Set up the screen from scratch to reflect the current game
 * state. */
var initGameDisplay = function() {
  // Transition into the first situation,
  document.getElementById("content").innerHTML = "";

  var situation = getCurrentSituation();
  assert(situation, "no_current_situation".l());

  showQualities();
};

/* Clear the current game output and start again. */
var startGame = function() {
  progress.seed = new Date().toString();

  character = new Character();
  system.rnd = new Random(progress.seed);
  progress.sequence = [{link:game.start, when:0}];

  // Empty the display
  document.getElementById("content").innerHTML = '';

  // Start the game
  startTime = new Date().getTime() * 0.001;
  system.time = 0;
  if (game.init) game.init(character, system);
  showQualities();

  // Do the first state.
  doTransitionTo(game.start);
};

/* Saves the character to local storage. */
var saveGame = function() {
  // Store when we're saving the game, to avoid exploits where a
  // player loads their file to gain extra time.
  var now = (new Date()).getTime() * 0.001;
  progress.saveTime = now - startTime;

  // Save the game.
  localStorage[getSaveId()] = JSON.stringify(progress);

  // Switch the button highlights.
  document.getElementById("erase").setAttribute('disabled', false);
  document.getElementById("save").setAttribute('disabled', true);
};

/* Loads the game from the given data */
var loadGame = function(characterData) {
  progress = characterData;

  character = new Character();
  system.rnd = new Random(progress.seed);

  // Empty the display
  document.getElementById("content").innerHTML = "";
  showQualities();

  // Now play through the actions so far:
  if (game.init) game.init(character, system);

  // Run through all the player's history.
  interactive = false;
  for (var i = 0; i < progress.sequence.length; i++) {
    var step = progress.sequence[i];
    // The action must be done at the recorded time.
    system.time = step.when;
    processLink(step.link);
  }
  interactive = true;

  // Reverse engineer the start time.
  var now = new Date().getTime() * 0.001;
  startTime = now - progress.saveTime;

  // Because we did the run through non-interactively, now we
  // need to update the UI.
  showQualities();
};

// Internationalization support based on the code provided by Oreolek.
(function() {
 var codesToTry = {};
 /* Compiles a list of fallback languages to try if the given code
  * doesn't have the message we need. Caches it for future use. */
 var getCodesToTry = function(languageCode) {
 var codeArray = codesToTry[languageCode];
 if (codeArray) return codeArray;

 codeArray = [];
 if (languageCode in undum.language) {
 codeArray.push(languageCode);
 }
 var elements = languageCode.split('-');
 for (var i = elements.length-2; i > 0; i--) {
 var thisCode = elements.slice(0, i).join('-');
 if (thisCode in undum.language) {
 codeArray.push(thisCode);
 }
 }
 codeArray.push("");
 codesToTry[languageCode] = codeArray;
 return codeArray;
 };
 var lookup = function(languageCode, message) {
   var languageData = undum.language[languageCode];
   if (!languageData) return null;
   return languageData[message];
 };
 var localize = function(languageCode, message) {
   var localized, thisCode;
   var languageCodes = getCodesToTry(languageCode);
   for (var i = 0; i < languageCodes.length; i++) {
     thisCode = languageCodes[i];
     localized = lookup(thisCode, message);
     if (localized) return localized;
   }
   return message;
 };

 // API
 String.prototype.l = function(args) {
   // Get lang attribute from html tag.
   var lang = document.querySelector("html").getAttribute("lang") || "";

   // Find the localized form.
   var localized = localize(lang, this);

   // Merge in any replacement content.
   if (args) {
     for (var name in args) {
       localized = localized.replace(
           new RegExp("\\{"+name+"\\}"), args[name]
           );
     }
   }
   return localized;
 };
})();

// Random Number generation based on seedrandom.js code by David Bau.
// Copyright 2010 David Bau, all rights reserved.
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
//   1. Redistributions of source code must retain the above
//      copyright notice, this list of conditions and the
//      following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above
//      copyright notice, this list of conditions and the
//      following disclaimer in the documentation and/or other
//      materials provided with the distribution.
//
//   3. Neither the name of this module nor the names of its
//      contributors may be used to endorse or promote products
//      derived from this software without specific prior written
//      permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
// CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
// NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
// OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
var Random = (function() {
  // Within this closure function the code is basically
  // David's. Undum's custom extensions are added to the
  // prototype outside of this function.
  var width = 256;
  var chunks = 6;
  var significanceExponent = 52;
  var startdenom = Math.pow(width, chunks);
  var significance = Math.pow(2, significanceExponent);
  var overflow = significance * 2;

  var Random = function(seed) {
    this.random = null;
    if (!seed) throw {
      name: "RandomSeedError",
      message: "random_seed_error".l()
    };
    var key = [];
    mixkey(seed, key);
    var arc4 = new ARC4(key);
    this.random = function() {
      var n = arc4.g(chunks);
      var d = startdenom;
      var x = 0;
      while (n < significance) {
        n = (n + x) * width;
        d *= width;
        x = arc4.g(1);
      }
      while (n >= overflow) {
        n /= 2;
        d /= 2;
        x >>>= 1;
      }
      return (n + x) / d;
    };
  };
  // Helper type.
  var ARC4 = function(key) {
    var t, u, me = this, keylen = key.length;
    var i = 0, j = me.i = me.j = me.m = 0;
    me.S = [];
    me.c = [];
    if (!keylen) { key = [keylen++]; }
    while (i < width) { me.S[i] = i++; }
    for (i = 0; i < width; i++) {
      t = me.S[i];
      j = lowbits(j + t + key[i % keylen]);
      u = me.S[j];
      me.S[i] = u;
      me.S[j] = t;
    }
    me.g = function getnext(count) {
      var s = me.S;
      var i = lowbits(me.i + 1); var t = s[i];
      var j = lowbits(me.j + t); var u = s[j];
      s[i] = u;
      s[j] = t;
      var r = s[lowbits(t + u)];
      while (--count) {
        i = lowbits(i + 1); t = s[i];
        j = lowbits(j + t); u = s[j];
        s[i] = u;
        s[j] = t;
        r = r * width + s[lowbits(t + u)];
      }
      me.i = i;
      me.j = j;
      return r;
    };
    me.g(width);
  };
  // Helper functions.
  var mixkey = function(seed, key) {
    seed += '';
    var smear = 0;
    for (var j = 0; j < seed.length; j++) {
      var lb = lowbits(j);
      smear ^= key[lb];
      key[lb] = lowbits(smear*19 + seed.charCodeAt(j));
    }
    seed = '';
    for (j in key) {
      seed += String.fromCharCode(key[j]);
    }
    return seed;
  };
  var lowbits = function(n) {
    return n & (width - 1);
  };

  return Random;
})();
/* Returns a random floating point number between zero and
 * one. NB: The prototype implementation below just throws an
 * error, it will be overridden in each Random object when the
 * seed has been correctly configured. */
Random.prototype.random = function() {
  throw {
    name:"RandomError",
    message: "random_error".l()
  };
};
/* Returns an integer between the given min and max values,
 * inclusive. */
Random.prototype.randomInt = function(min, max) {
  return min + Math.floor((max-min+1)*this.random());
};
/* Returns the result of rolling n dice with dx sides, and adding
 * plus. */
Random.prototype.dice = function(n, dx, plus) {
  var result = 0;
  for (var i = 0; i < n; i++) {
    result += this.randomInt(1, dx);
  }
  if (plus) result += plus;
  return result;
};
/* Returns the result of rolling n averaging dice (i.e. 6 sided dice
 * with sides 2,3,3,4,4,5). And adding plus. */
Random.prototype.aveDice = (function() {
  var mapping = [2,3,3,4,4,5];
  return function(n, plus) {
    var result = 0;
    for (var i = 0; i < n; i++) {
      result += mapping[this.randomInt(0, 5)];
    }
    if (plus) result += plus;
    return result;
  };
})();
/* Returns a dice-roll result from the given string dice
 * specification. The specification should be of the form xdy+z,
 * where the x component and z component are optional. This rolls
 * x dice of with y sides, and adds z to the result, the z
 * component can also be negative: xdy-z. The y component can be
 * either a number of sides, or can be the special values 'F', for
 * a fudge die (with 3 sides, +,0,-), '%' for a 100 sided die, or
 * 'A' for an averaging die (with sides 2,3,3,4,4,5).
 */
Random.prototype.diceString = (function() {
  var diceRe = /^([1-9][0-9]*)?d([%FA]|[1-9][0-9]*)([-+][1-9][0-9]*)?$/;
  return function(def) {
    var match = def.match(diceRe);
    if (!match) {
      throw new Error("dice_string_error".l({string:def}));
    }

    var num = match[1]?parseInt(match[1], 10):1;
    var sides;
    var bonus = match[3]?parseInt(match[3], 10):0;

    switch (match[2]) {
      case 'A':
        return this.aveDice(num, bonus);
      case 'F':
        sides = 3;
        bonus -= num*2;
        break;
      case '%':
        sides = 100;
        break;
      default:
        sides = parseInt(match[2], 10);
      break;
    }
    return this.dice(num, sides, bonus);
  };
})();
