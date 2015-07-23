(function () {// -----------------------------------------------------------------------
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

// -----------------------------------------------------------------------
// Types for Author Use
// -----------------------------------------------------------------------

/* The game is split into situations, which respond to user
 * choices. Situation is the base type. It has three methods:
 * enter, act and exit, which you implement to perform any
 * processing and output any content. The default implementations
 * do nothing.
 *
 * You can either create your own type of Situation, and add
 * enter, act and/or exit functions to the prototype (see
 * SimpleSituation in this file for an example of that), or you
 * can give those functions in the opts parameter. The opts
 * parameter is an object. So you could write:
 *
 *    var situation = Situation({
 *        enter: function(character, system, from) {
 *            ... your implementation ...
 *        }
 *    });
 *
 * If you pass in enter, act and/or exit through these options,
 * then they should have the same function signature as the full
 * function definitions, below.
 *
 * Note that SimpleSituation, a derived type of Situation, calls
 * passed in enter, act and exit functions AS WELL AS their normal
 * action. This is most often what you want: the normal behavior
 * plus a little extra custom behavior. If you want to override
 * the behavior of a SimpleSituation, you'll have to create a
 * derived type and set the enter, act and/or exit function on
 * their prototypes. In most cases, however, if you want to do
 * something completely different, it is better to derive your
 * type from this type: Situation, rather than one of its
 * children.
 *
 * In addition to enter, exit and act, the following options
 * related to implicit situation selection are available:
 *
 * optionText: a string or a function(character, system,
 *     situation) which should return the label to put in an
 *     option block where a link to this situation can be
 *     chosen. The situation passed in is the situation where the
 *     option block is being displayed.
 *
 * canView: a function(character, system, situation) which should
 *     return true if this situation should be visible in an
 *     option block in the given situation.
 *
 * canChoose: a function(character, system, situation) which should
 *     return true if this situation should appear clickable in an
 *     option block. Returning false allows you to present the
 *     option but prevent it being selected. You may want to
 *     indicate to the player that they need to collect some
 *     important object before the option is available, for
 *     example.
 *
 * tags: a list of tags for this situation, which can be used for
 *     implicit situation selection. The tags can also be given as
 *     space, tab or comma separated tags in a string. Note that,
 *     when calling `getSituationIdChoices`, tags are prefixed with
 *     a hash, but that should not be the case here. Just use the
 *     plain tag name.
 *
 * priority: a numeric priority value (default = 1). When
 *     selecting situations implicitly, higher priority situations
 *     are considered first.
 *
 * frequency: a numeric relative frequency (default = 1), so 100
 *     would be 100 times more frequent. When there are more
 *     options that can be displayed, situations will be selected
 *     randomly based on their frequency.
 *
 * displayOrder: a numeric ordering value (default = 1). When
*     situations are selected implicitly, the results are ordered
*     by increasing displayOrder.
*/
var Situation = function(opts) {
  if (opts) {
    if (opts.enter) this._enter = opts.enter;
    if (opts.act) this._act = opts.act;
    if (opts.exit) this._exit = opts.exit;

    // Options related to this situation being automatically
    // selected and displayed in a list of options.
    this._optionText = opts.optionText;
    this._canView = opts.canView || true;
    this._canChoose = opts.canChoose || true;
    this._priority = (opts.priority !== undefined) ? opts.priority : 1;
    this._frequency =
      (opts.frequency !== undefined) ? opts.frequency : 1;
    this._displayOrder =
      (opts.displayOrder !== undefined) ? opts.displayOrder : 1;

    // Tag are not stored with an underscore, because they are
    // accessed directy. They should not be context sensitive
    // (use the canView function to do context sensitive
    // manipulation).
    if (opts.tags !== undefined) {
      if (Array.isArray(opts.tags)) {
        this.tags = opts.tags;
      } else {
        this.tags = opts.tags.split(/[ \t,]+/);
      }
    } else {
      this.tags = [];
    }
  } else {
    this._canView = true;
    this._canChoose = true;
    this._priority = 1;
    this._frequency = 1;
    this._displayOrder = 1;
    this.tags = [];
  }
};
/* A function that takes action when we enter a situation. The
 * last parameter indicates the situation we have just left: it
 * may be null if this is the starting situation. Unlike the
 * exit() method, this method cannot prevent the transition
 * happening: its return value is ignored. */
Situation.prototype.enter = function(character, system, from) {
  if (this._enter) this._enter(character, system, from);
};
/* A function that takes action when we carry out some action in a
 * situation that isn't intended to lead to a new situation. */
Situation.prototype.act = function(character, system, action) {
  if (this._act) this._act(character, system, action);
};
/* A function that takes action when we exit a situation. The last
 * parameter indicates the situation we are going to. */
Situation.prototype.exit = function(character, system, to) {
  if (this._exit) this._exit(character, system, to);
};
/* Determines whether this situation should be contained within a
 * list of options generated automatically by the given
 * situation. */
Situation.prototype.canView = function(character, system, situation) {
  if (typeof(this._canView) === "function" ) {
    return this._canView(character, system, situation);
  } else {
    return this._canView;
  }
};
/* Determines whether this situation should be clickable within a
 * list of options generated automatically by the given situation. */
Situation.prototype.canChoose = function(character, system, situation) {
  if (typeof(this._canChoose) === "function") {
    return this._canChoose(character, system, situation);
  } else {
    return this._canChoose;
  }
};
/* Returns the text that should be used to display this situation
 * in an automatically generated list of choices. */
Situation.prototype.optionText = function(character, system, situation) {
  if (typeof(this._optionText) === "function") {
    return this._optionText(character, system, situation);
  } else {
    return this._optionText;
  }
};
/* Returns the priority, frequency and displayOrder for this situation,
 * when being selected using `system.getSituationIdChoices`. */
Situation.prototype.choiceData = function(character, system, situation) {
  return {
priority: this._priority,
            frequency: this._frequency,
            displayOrder: this._displayOrder
  };
};

/* A simple situation has a block of content that it displays when
 * the situation is entered. The content must be valid "Display
 * Content" (see `System.prototype.write` for a definition). This
 * constructor has options that control its behavior:
 *
 * heading: The optional `heading` will be used as a section title
 *     before the content is displayed. The heading can be any
 *     HTML string, it doesn't need to be "Display Content". If
 *     the heading is not given, no heading will be displayed. If
 *     a heading is given, and no optionText is specified (see
 *     `Situation` for more information on `optionText`), then the
 *     heading will also be used for the situation's option text.
 *
 * actions: This should be an object mapping action Ids to a
 *     response. The response should either be "Display Content"
 *     to display if this action is carried out, or it should be a
 *     function(character, system, action) that will process the
 *     action.
 *
 * choices: A list of situation ids and tags that, if given, will
 *     be used to compile an implicit option block using
 *     `getSituationIdChoices` (see that function for more details
 *     of how this works). Tags in this list should be prefixed
 *     with a hash # symbol, to distinguish them from situation
 *     ids. If just a single tag or id is needed, it can be passed
 *     in as a string without wrapping into a list.
 *
 * minChoices: If `choices` is given, and an implicit choice block
 *     should be compiled, set this option to require at least
 *     this number of options to be displayed. See
 *     `getSituationIdChoices` for a description of the algorithm by
 *     which this happens. If you do not specify the `choices`
 *     option, then this option will be ignored.
 *
 * maxChoices: If `choices` is given, and an implicit choice block
 *     should be compiled, set this option to require no more than
 *     this number of options to be displayed. See
 *     `getSituationIdChoices` for a description of the algorithm
 *     by which this happens. If you do not specify the `choices`
 *     option, then this option will be ignored.
 *
 * The remaining options in the `opts` parameter are the same as for
 * the base Situation.
 */
var SimpleSituation = function(content, opts) {
  Situation.call(this, opts);
  this.content = content;
  this.heading = opts && opts.heading;
  this.actions = opts && opts.actions;

  this.choices = opts && opts.choices;
  this.minChoices = opts && opts.minChoices;
  this.maxChoices = opts && opts.maxChoices;
};
SimpleSituation.inherits(Situation);
SimpleSituation.prototype.enter = function(character, system, from) {
  if (this.heading) {
    if (typeof(this.heading) === "function") {
      system.writeHeading(this.heading());
    } else {
      system.writeHeading(this.heading);
    }
  }
  if (this._enter) this._enter(character, system, from);
  if (this.content) {
    if (typeof(this.content) === "function") {
      system.write(this.content());
    } else {
      system.write(this.content);
    }
  }
  if (this.choices) {
    var choices = system.getSituationIdChoices(this.choices,
        this.minChoices,
        this.maxChoices);
    system.writeChoices(choices);
  }
};
SimpleSituation.prototype.act = function(character, system, action) {
  var response = this.actions[action];
  try {
    response(character, system, action);
  } catch (err) {
    if (response) system.write(response);
  }
  if (this._act) this._act(character, system, action);
};
SimpleSituation.prototype.optionText = function(character, system, sitn) {
  var parentResult = Situation.prototype.optionText.call(this, character,
      system, sitn);
  if (parentResult === undefined) {
    return this.heading;
  } else {
    return parentResult;
  }
};

/* Instances of this class define the qualities that characters
 * may possess. The title should be a string, and can contain
 * HTML. Options are passed in in the opts parameter. The
 * following options are available.
 *
 * priority - A string used to sort qualities within their
 *     groups. When the system displays a list of qualities they
 *     will be sorted by this string. If you don't give a
 *     priority, then the title will be used, so you'll get
 *     alphabetic order. Normally you either don't give a
 *     priority, or else use a priority string containing 0-padded
 *     numbers (e.g. "00001").
 *
 * group - The Id of a group in which to display this
 *     parameter. The corresponding group must be defined in
 *     your `undum.game.qualityGroups` property.
 *
 * extraClasses - These classes will be attached to the <div> tag
 *     that surrounds the quality when it is displayed. A common
 *     use for this is to add icons representing the quality. In
 *     your CSS define a class for each icon, then pass those
 *     classes into the appropriate quality definitions.
 *
 * One key purpose of QualityDefinition is to format the quality
 * value for display. Quality values are always stored as numeric
 * values, but may be displayed in words or symbols. A number of
 * sub-types of QualityDefinition are given that format their
 * values in different ways.
 */
var QualityDefinition = function(title, opts) {
  var myOpts = extend(opts, {
    priority: title,
    group: null,
    extraClasses: null
  });
  this.title = title;
  this.priority = myOpts.priority;
  this.group = myOpts.group;
  this.extraClasses = myOpts.extraClasses;
};
/* Formats the value (which is always numeric) into the value to
 * be displayed. The result should be HTML (but no tags are
 * needed). If null is returned, then the quality definition will
 * not be displayed, so if you want an empty value return an empty
 * string. */
QualityDefinition.prototype.format = function(character, value) {
  return value.toString();
};

/* A quality that is always displayed as the nearest integer of
 * the current value, rounded down. Options (in the opts
 * parameter) are the same as for QualityDefinition. */
var IntegerQuality = function(title, opts) {
  QualityDefinition.call(this, title, opts);
};
IntegerQuality.inherits(QualityDefinition);
IntegerQuality.prototype.format = function(character, value) {
  return Math.floor(value).toString();
};

/* A quality that displays as an IntegerQuality, unless it is
 * zero, when it is omitted. Options (in the opts * parameter) are
 * the same as for QualityDefinition. */
var NonZeroIntegerQuality = function(title, opts) {
  IntegerQuality.call(this, title, opts);
};
NonZeroIntegerQuality.inherits(IntegerQuality);
NonZeroIntegerQuality.prototype.format = function(character, value) {
  if (value === 0) {
    return null;
  } else {
    return IntegerQuality.prototype.format.call(
      this, character, value
    );
  }
};

/* A quality that displays its full numeric value, including
 * decimal component. This is actually a trivial wrapper around
 * the QualityDefinition class, which formats in the same
 * way. Options (in the opts parameter) are the same as for
 * QualityDefinition. */
var NumericQuality = function(title, opts) {
  QualityDefinition.call(this, title, opts);
};
NumericQuality.inherits(QualityDefinition);

/* A quality that displays its values as one of a set of
 * words. The quality value is first rounded down to the nearest
 * integer, then this value is used to select a word to
 * display. The offset parameter (optionally passed in as part of
 * the opts object) controls what number maps to what word.
 *
 * The following options (in the opts parameter) are available:
 *
 * offset - With offset=0 (the default), the quantity value of 0
 *     will map to the first word, and so on. If offset is
 *     non-zero then the value given will correspond to the first
 *     word in the list. So if offset=4, then the first word in
 *     the list will be used for value=4.
 *
 * useBonuses - If this is true (the default), then values outside
 *     the range of words will be construced from the word and a
 *     numeric bonus. So with offset=0 and five words, the last of
 *     which is 'amazing', a score of six would give 'amazing+1'.
 *     if this is false, then the bonus would be omitted, so
 *     anything beyond 'amazing' is still 'amazing'.
 *
 * Other options are the same as for QualityDefinition.
 */
var WordScaleQuality = function(title, values, opts) {
  var myOpts = extend(opts, {
    offset: null,
    useBonuses: true
  });
  QualityDefinition.call(this, title, opts);
  this.values = values;
  this.offset = myOpts.offset;
  this.useBonuses = myOpts.useBonuses;
};
WordScaleQuality.inherits(QualityDefinition);
WordScaleQuality.prototype.format = function(character, value) {
  var val = Math.floor(value - this.offset);
  var mod = "";
  if (val < 0) {
    mod = val.toString();
    val = 0;
  } else if (val >= this.values.length) {
    mod = "+" + (val - this.values.length + 1).toString();
    val = this.values.length - 1;
  }
  if (!this.useBonuses) mod = "";
  if (this.values[val] === null) return null;
  return this.values[val] + mod; // Type coercion
};

/* A specialization of WordScaleQuality that uses the FUDGE RPG's
 * adjective scale (from 'terrible' at -3 to 'superb' at +3). The
 * options are as for WordScaleQuality. In particular you can use
 * the offset option to control where the scale starts. So you
 * could model a quality that everyone starts off as 'terrible'
 * (such as Nuclear Physics) with an offset of 0, while another that
 * is more common (such as Health) could have an offset of -5 so
 * everyone starts with 'great'.
 */
var FudgeAdjectivesQuality = function(title, opts) {
  WordScaleQuality.call(this, title, [
    "terrible".l(),
    "poor".l(),
    "mediocre".l(),
    "fair".l(),
    "good".l(),
    "great".l(),
    "superb".l()
  ], opts);
  if (!('offset' in opts)) this.offset = -3;
};
FudgeAdjectivesQuality.inherits(WordScaleQuality);

/* An boolean quality that removes itself from the quality list if
 * it has a zero value. If it has a non-zero value, its value
 * field is usually left empty, but you can specify your own
 * string to display as the `onDisplay` parameter of the opts
 * object. Other options (in the opts parameter) are the same as
 * for QualityDefinition. */
var OnOffQuality = function(title, opts) {
  var myOpts = extend(opts, {
    onDisplay: ""
  });
  QualityDefinition.call(this, title, opts);
  this.onDisplay = myOpts.onDisplay;
};
OnOffQuality.inherits(QualityDefinition);
OnOffQuality.prototype.format = function(character, value) {
  if (value) return this.onDisplay;
  else return null;
};

/* A boolean quality that has different output text for zero or
 * non-zero quality values. Unlike OnOffQuality, this definition
 * doesn't remove itself from the list when it is 0. The options
 * are as for QualityDefinition, with the addition of options
 * 'yesDisplay' and 'noDisplay', which contain the HTML fragments
 * used to display true and false values. If not given, these
 * default to 'yes' and 'no'.
 */
var YesNoQuality = function(title, opts) {
  var myOpts = extend(opts,{
    yesDisplay: "yes".l(),
    noDisplay: "no".l()
  });
  QualityDefinition.call(this, title, opts);
  this.yesDisplay = myOpts.yesDisplay;
  this.noDisplay = myOpts.noDisplay;
};
YesNoQuality.inherits(QualityDefinition);
YesNoQuality.prototype.format = function(character, value) {
  if (value) return this.yesDisplay;
  else return this.noDisplay;
};

/* Defines a group of qualities that should be displayed together,
 * under the given optional title. These should be defined in the
 * `undum.game.qualityGroups` parameter. */
var QualityGroup = function(title, opts) {
  var myOpts = extend(opts,{
    priority: title,
    extraClasses: null
  });
  this.title = title;
  this.priority = myOpts.priority;
  this.extraClasses = myOpts.extraClasses;
};

/* A system object is passed into the enter, act and exit
 * functions of each situation. It is used to interact with the
 * UI.
 */
var System = function() {
  this.rnd = null;
  this.time = 0;
};

/* Removes all content from the page, clearing the main content area.
 *
 * If an elementSelector is given, then only that selector will be
 * cleared. Note that all content from the cleared element is removed,
 * but the element itself remains, ready to be filled again using
 * System.write.
 */
System.prototype.clearContent = function(elementSelector) {
  var $element;
  if (elementSelector) $element = document.querySelectorAll(elementSelector);
  if (!$element) $element = document.getElementById("content");
  $element.innerHTML = '';
};

/* Outputs regular content to the page. The content supplied must
 * be valid "Display Content".
 *
 * "Display Content" is any HTML string that begins with a HTML
 * start tag, ends with either an end or a closed tag, and is a
 * valid and self-contained snippet of HTML. Note that the string
 * doesn't have to consist of only one HTML tag. You could have
 * several paragraphs, for example, as long as the content starts
 * with the <p> of the first paragraph, and ends with the </p> of
 * the last. So "<p>Foo</p><img src='bar'>" is valid, but "foo<img
 * src='bar'>" is not.
 *
 * The content goes to the end of the page, unless you supply the
 * optional selector argument. If you do, the content appears
 * after the element that matches that selector.
 */
System.prototype.write = function(content, elementSelector) {
  doWrite(content, elementSelector);
};

/* Outputs the given content in a heading on the page. The content
 * supplied must be valid "Display Content".
 *
 * The content goes to the end of the page, unless you supply the
 * optional selector argument. If you do, the content appears
 * after the element that matches that selector.
 */
System.prototype.writeHeading = function(headingContent, elementSelector) {
  var heading = document.createElement("<h1>");
  heading.innerHTML = headingContent;
  doWrite(heading, elementSelector);
};

/* Outputs regular content to the page. The content supplied must
 * be valid "Display Content".
 *
 * The content goes to the beginning of the page, unless you
 * supply the optional selector argument. If you do, the content
 * appears after the element that matches that selector.
 */
System.prototype.writeBefore = function(content, elementSelector) {
  doWrite(content, elementSelector, 'prepend', 'before');
};

/* Outputs regular content to the page. The content supplied must
 * be valid "Display Content".
 *
 * When a selector is not specified, this behaves identically to
 * System.prototype.write. If you supply a selector, the content
 * appears as a child node at the end of the content of the
 * element that matches that selector.
 */

System.prototype.writeInto = function(content, elementSelector) {
  doWrite(content, elementSelector, 'append', 'append');
};

/* Replaces content with the content supplied, which must be valid
 * "Display Content".
 *
 * When a selector is not specified, this replaces the entire
 * content of the page. Otherwise, it replaces the element matched
 * with the selector. This replaces the entire element, including
 * the matched tags, so ideally the content supplied should fit
 * in its place in the DOM with the same kind of display element.
 */

System.prototype.replaceWith = function(content, elementSelector) {
  doWrite(content, elementSelector, 'replaceWith', 'replaceWith');
};

/* Carries out the given situation change or action, as if it were
 * in a link that has been clicked. This allows you to do
 * procedural transitions. You might have an action that builds up
 * the character's strength, and depletes their magic. When the
 * magic is all gone, you can force a situation change by calling
 * this method. */
System.prototype.doLink = function(code) {
  processLink(code);
};

/* Turns any links that target the given href into plain
 * text. This can be used to remove action options when an action
 * is no longer available. It is used automatically when you give
 * a link the 'once' class. */
System.prototype.clearLinks = function(code) {
  var links = document.querySelectorAll("a[href='" + code + "']");
  Array.prototype.forEach.call(links, function(element, index){
    element.querySelectorAll("span").classList.add("ex_link");
  });
};

/* Given a list of situation ids, this outputs a standard option
 * block with the situation choices in the given order.
 *
 * The contents of each choice will be a link to the situation,
 * the text of the link will be given by the situation's
 * outputText property. Note that the canChoose function is
 * called, and if it returns false, then the text will appear, but
 * the link will not be clickable.
 *
 * Although canChoose is honored, canView and displayOrder are
 * not. If you need to honor these, you should either do so
 * manually, ot else use the `getSituationIdChoices` method to
 * return an ordered list of valid viewable situation ids.
 */
System.prototype.writeChoices = function(listOfIds, elementSelector) {
  if (listOfIds.length === 0) return;

  var currentSituation = getCurrentSituation();
  var $options = document.getElementById("content").querySelectorAll("ul").classList.add("options");
  for (var i = 0; i < listOfIds.length; ++i) {
    var situationId = listOfIds[i];
    var situation = game.situations[situationId];
    assert(situation, "unknown_situation".l({id:situationId}));

    var optionText = situation.optionText(character, this,
        currentSituation);
    if (!optionText) optionText = "choice".l({number:i+1});
    var $option = document.getElementById("content").querySelectorAll("li");
    var $a;
    if (situation.canChoose(character, this, currentSituation)) {
      $a = "<a href='"+situationId+"'>"+optionText+"</a>"
    } else {
      $a = "<span>"+optionText+"</span>";
    }
    $option.innerHTML = $a;
    $options.appendChild($option);
  }
  doWrite($options, elementSelector, 'append', 'after');
};

/* Returns a list of situation ids to choose from, given a set of
 * specifications.
 *
 * This function is a complex and powerful way of compiling
 * implicit situation choices. You give it a list of situation ids
 * and situation tags (if a single id or tag is needed just that
 * string can be given, it doesn't need to be wrapped in a
 * list). Tags should be prefixed with a hash # to differentiate
 * them from situation ids. The function then considers all
 * matching situations in descending priority order, calling their
 * canView functions and filtering out any that should not be
 * shown, given the current state. Without additional parameters
 * the function returns a list of the situation ids at the highest
 * level of priority that has any valid results. So, for example,
 * if a tag #places matches three situations, one with priority 2,
 * and two with priority 3, and all of them can be viewed in the
 * current context, then only the two with priority 3 will be
 * returned. This allows you to have high-priority situations that
 * trump any lower situations when they are valid, such as
 * situations that force the player to go to one destination if
 * the player is out of money, for example.
 *
 * If a minChoices value is given, then the function will attempt
 * to return at least that many results. If not enough results are
 * available at the highest priority, then lower priorities will
 * be considered in turn, until enough situations are found. In
 * the example above, if we had a minChoices of three, then all
 * three situations would be returned, even though they have
 * different priorities. If you need to return all valid
 * situations, regardless of their priorities, set minChoices to a
 * large number, such as `Number.MAX_VALUE`, and leave maxChoices
 * undefined.
 *
 * If a maxChoices value is given, then the function will not
 * return any more than the given number of results. If there are
 * more than this number of results possible, then the highest
 * priority resuls will be guaranteed to be returned, but the
 * lowest priority group will have to fight it out for the
 * remaining places. In this case, a random sample is chosen,
 * taking into account the frequency of each situation. So a
 * situation with a frequency of 100 will be chosen 100 times more
 * often than a situation with a frequency of 1, if there is one
 * space available. Often these frequencies have to be taken as a
 * guideline, and the actual probabilities will only be
 * approximate. Consider three situations with frequencies of 1,
 * 1, 100, competing for two spaces. The 100-frequency situation
 * will be chosen almost every time, but for the other space, one
 * of the 1-frequency situations must be chosen. So the actual
 * probabilities will be roughly 50%, 50%, 100%. When selecting
 * more than one result, frequencies can only be a guide.
 *
 * Before this function returns its result, it sorts the
 * situations in increasing order of their displayOrder values.
 */
System.prototype.getSituationIdChoices = function(listOfOrOneIdsOrTags,
    minChoices, maxChoices)
{
  var datum;
  var i;

  // First check if we have a single string for the id or tag.
  if (Object.prototype.toString.call(listOfOrOneIdsOrTags).replace(/^\[object (.+)\]$/, "$1").toLowerCase() == 'string') {
    listOfOrOneIdsOrTags = [listOfOrOneIdsOrTags];
  }

  // First we build a list of all candidate ids.
  var allIds = {};
  for (i = 0; i < listOfOrOneIdsOrTags.length; ++i) {
    var tagOrId = listOfOrOneIdsOrTags[i];
    if (tagOrId.substr(0, 1) == '#') {
      var ids = getSituationIdsWithTag(tagOrId.substr(1));
      for (var j = 0; j < ids.length; ++j) {
        allIds[ids[j]] = true;
      }
    } else {
      allIds[tagOrId] = true;
    }
  }

  // Filter out anything that can't be viewed right now.
  var currentSituation = getCurrentSituation();
  var viewableSituationData = [];
  for (var situationId in allIds) {
    var situation = game.situations[situationId];
    assert(situation, "unknown_situation".l({id:situationId}));

    if (situation.canView(character, system, currentSituation)) {
      // While we're here, get the selection data.
      var viewableSituationDatum =
        situation.choiceData(character, system, currentSituation);
      viewableSituationDatum.id = situationId;
      viewableSituationData.push(viewableSituationDatum);
    }
  }

  // Then we sort in descending priority order.
  viewableSituationData.sort(function(a, b) {
      return b.priority - a.priority;
      });

  var committed = [];
  var candidatesAtLastPriority = [];
  var lastPriority;
  // In descending priority order.
  for (i = 0; i < viewableSituationData.length; ++i) {
    datum = viewableSituationData[i];
    if (datum.priority != lastPriority) {
      if (lastPriority !== undefined) {
        // We've dropped a priority group, see if we have enough
        // situations so far, and stop if we do.
        if (minChoices === undefined || i >= minChoices) break;
      }
      // Continue to acccumulate more options.
      committed.push.apply(committed, candidatesAtLastPriority);
      candidatesAtLastPriority = [];
      lastPriority = datum.priority;
    }
    candidatesAtLastPriority.push(datum);
  }

  // So the values in committed we're committed to, because without
  // them we wouldn't hit our minimum. But those in
  // candidatesAtLastPriority might take us over our maximum, so
  // figure out how many we should choose.
  var totalChoices = committed.length + candidatesAtLastPriority.length;
  if (maxChoices === undefined || maxChoices >= totalChoices) {
    // We can use all the choices.
    committed.push.apply(committed, candidatesAtLastPriority);
  } else if (maxChoices >= committed.length) {
    // We can only use the commited ones.
    // NO-OP
  } else {
    // We have to sample the candidates, using their relative frequency.
    var candidatesToInclude = maxChoices - committed.length;
    for (i = 0; i < candidatesAtLastPriority.length; ++i) {
      datum = candidatesAtLastPriority[i];
      datum._frequencyValue = this.rnd.random() / datum.frequency;
    }
    candidatesToInclude.sort(function(a, b) {
        return a._frequencyValue - b._frequencyValue;
        });
    var chosen = candidatesToInclude.slice(0, candidatesToInclude);
    committed.push.apply(committed, chosen);
  }

  // Now sort in ascending display order.
  committed.sort(function(a, b) {
      return a.displayOrder - b.displayOrder;
      });

  // And return as a list of ids only.
  var result = [];
  for (i = 0; i < committed.length; ++i) {
    result.push(committed[i].id);
  }
  return result;
};

/* Call this to change the character text: the text in the right
 * toolbar before the qualities list. This text is designed to be
 * a short description of the current state of your character. The
 * content you give should be "Display Content" (see
 * `System.prototype.write` for the definition).
 */
System.prototype.setCharacterText = function(content) {
  var block = document.getElementById("character_text_content");
  var oldContent = block.innerHTML;
  var newContent = augmentLinks(content);
  if (interactive && block.offsetWidth > 0 && block.offsetHeight > 0) {
    hideBlock(block);
    block.innerHTML = newContent;
    showBlock(block);
    showHighlight(block.parent);
  } else {
    block.innerHTML = newContent;
  }
};

/* Call this to change the value of a character quality. Don't
 * directly change quality values, because that will not update
 * the UI. (You can change any data in the character's sandbox
 * directly, however, since that isn't displayed). */
System.prototype.setQuality = function(quality, newValue) {
  var oldValue = character.qualities[quality];
  character.qualities[quality] = newValue;
  if (!interactive) return;

  // Work out how to display the values.
  var newDisplay;
  var qualityDefinition = game.qualities[quality];
  if (qualityDefinition) {
    newDisplay = qualityDefinition.format(character, newValue);
  } else {
    // We shouldn't display qualities that have no definition.
    return;
  }

  // Add the data block, if we need it.
  var qualityBlock = document.getElementById("#q_"+quality);
  if (qualityBlock.length <= 0) {
    if (newDisplay === null) return;
    qualityBlock = addQualityBlock(quality).hide().fadeIn(500);
  } else {
    // Do nothing if there's nothing to do.
    if (oldValue == newValue) return;

    // Change the value.
    if (newDisplay === null) {
      // Remove the block, and possibly the whole group, if
      // it is the last quality in the group.
      var toRemove = null;
      var groupBlock = qualityBlock.parents('.quality_group');
      if (groupBlock.find('.quality').length <= 1) {
        toRemove = groupBlock;
      } else {
        toRemove = qualityBlock;
      }

      toRemove.fadeOut(1000, function() {
          toRemove.remove();
          });
    } else {
      var valBlock = qualityBlock.find("[data-attr='value']");
      valBlock.fadeOut(250, function() {
          valBlock.html(newDisplay);
          valBlock.fadeIn(750);
          });
    }
  }
  showHighlight(qualityBlock);
};

/* Changes a quality to a new value, but also should show a progress bar
 * animation of the change. Removed with the progress bar functionality. */
System.prototype.animateQuality = function(quality, newValue, opts) {
  this.setQuality(quality, newValue);
};

/* The character that is passed into each situation is of this
 * form.
 *
 * The `qualities` data member maps the Ids of each quality to its
 * current value. When implementing enter, act or exit functions,
 * you should consider this to be read-only. Make all
 * modifications through `System.prototype.setQuality`, or
 * `System.prototype.animateQuality`. In your `init` function, you
 * can set these values directly.
 *
 * The `sandbox` data member is designed to allow your code to
 * track any data it needs to. The only proviso is that the data
 * structure should be serializable into JSON (this means it must
 * only consist of primitive types [objects, arrays, numbers,
 * booleans, strings], and it must not contain circular series of
 * references). The data in the sandbox is not displayed in the
 * UI, although you are free to use it to create suitable output
 * for the player..
 */
var Character = function() {
  this.qualities = {};
  this.sandbox = {};
};

/* The data structure holding the content for the game. By default
 * this holds nothing. It is this data structure that is populated
 * in the `.game.js` file. Each element in the structure is
 * commented, below.
 *
 * This should be static data that never changes through the
 * course of the game. It is never saved, so anything that might
 * change should be stored in the character.
 */
var game = {

  // Situations

  /* An object mapping from the unique id of each situation, to
   * the situation object itself. This is the heart of the game
   * specification. */
  situations: {},

  /* The unique id of the situation to enter at the start of a
   * new game. */
  start: "start",

  // Quality display definitions

  /* An object mapping the unique id of each quality to its
   * QualityDefinition. You don't need definitions for every
   * quality, but only qualities in this mapping will be
   * displayed in the character box of the UI. */
  qualities: {},

  /* Qualities can have an optional group Id. This maps those
   * Ids to the group definitions that says how to format its
   * qualities.
   */
  qualityGroups: {},

  // Hooks

  /* This function is called at the start of the game. It is
   * normally overridden to provide initial character creation
   * (setting initial quality values, setting the
   * character-text. This is optional, however, as set-up
   * processing could also be done by the first situation's
   * enter function. If this function is given it should have
   * the signature function(character, system).
   */
  init: null,

  /* This function is called before entering any new
   * situation. It is called before the corresponding situation
   * has its `enter` method called. It can be used to implement
   * timed triggers, but is totally optional. If this function
   * is given it should have the signature:
   *
   * function(character, system, oldSituationId, newSituationId);
   */
  enter: null,

  /* Hook for when the situation has already been carried out
   * and printed. The signature is:
   *
   * function(character, system, oldSituationId, newSituationId);
   */
  afterEnter: null,

  /* This function is called before carrying out any action in
   * any situation. It is called before the corresponding
   * situation has its `act` method called. If this optional
   * function is given it should have the signature:
   *
   * function(character, system, situationId, actionId);
   *
   * If the function returns true, then it is indicating that it
   * has consumed the action, and the action will not be passed
   * on to the situation. Note that this is the only one of
   * these global handlers that can consume the event.
   */
  beforeAction: null,

  /* This function is called after carrying out any action in
   * any situation. It is called after the corresponding
   * situation has its `act` method called. If this optional
   * function is given it should have the signature:
   *
   * function(character, system, situationId, actionId);
   */
  afterAction: null,

  /* This function is called after leaving any situation. It is
   * called after the corresponding situation has its `exit`
   * method called. If this optional function is given it should
   * have the signature:
   *
   * function(character, system, oldSituationId, newSituationId);
   */
  exit: null
};

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

// -----------------------------------------------------------------------
// Setup
// -----------------------------------------------------------------------

/* Export our API. */
window.undum = {
  Situation: Situation,
  SimpleSituation: SimpleSituation,

  QualityDefinition: QualityDefinition,
  IntegerQuality: IntegerQuality,
  NonZeroIntegerQuality: NonZeroIntegerQuality,
  NumericQuality: NumericQuality,
  WordScaleQuality: WordScaleQuality,
  FudgeAdjectivesQuality: FudgeAdjectivesQuality,
  OnOffQuality: OnOffQuality,
  YesNoQuality: YesNoQuality,

  QualityGroup: QualityGroup,

  game: game,

  isInteractive: function() { return interactive; },

  // The undum set of translated strings.
  language: {}
};

// -----------------------------------------------------------------------
// Default Messages
// -----------------------------------------------------------------------
var en = {
  terrible: "terrible",
  poor: "poor",
  mediocre: "mediocre",
  fair: "fair",
  good: "good",
  great: "great",
  superb: "superb",
  yes: "yes",
  no: "no",
  choice: "Choice {number}",
  no_group_definition: "Couldn't find a group definition for {id}.",
  link_not_valid: "The link '{link}' doesn't appear to be valid.",
  link_no_action: "A link with a situation of '.', must have an action.",
  unknown_situation: "You can't move to an unknown situation: {id}.",
  existing_situation: "You can't override situation {id} in HTML.",
  erase_message: "This will permanently delete this character and immediately return you to the start of the game. Are you sure?",
  no_current_situation: "I can't display, because we don't have a current situation.",
  no_local_storage: "No local storage available.",
  random_seed_error: "You must provide a valid random seed.",
  random_error: "Initialize the Random with a non-empty seed before use.",
  dice_string_error: "Couldn't interpret your dice string: '{string}'."
};

// Set this data as both the default fallback language, and the english
// preferred language.
undum.language[""] = en;
undum.language["en"] = en;

/* Set up the game when everything is loaded. */
function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

ready(function() {
  // Compile additional situations from HTML
  loadHTMLSituations();

  // Handle storage.
  if (hasLocalStorage()) {
    var erase = document.getElementById("erase");
    erase.onclick = doErase;
    erase.keydown = doErase;
    var save = document.getElementById("save");
    save.onclick = saveGame;
    save.keydown = saveGame;

    var storedCharacter = localStorage[getSaveId()];
    if (storedCharacter) {
      try {
        loadGame(JSON.parse(storedCharacter));
        save.setAttribute('disabled', true);
        erase.setAttribute("disabled", false);
      } catch(err) {
        doErase(true);
      }
    } else {
      save.setAttribute('disabled', true);
      erase.setAttribute("disabled", true);
      startGame();
    }
  } else {
    document.querySelector(".buttons").innerHTML = "<p>"+"no_local_storage".l()+"</p>";
    startGame();
  }

  // Display the "click to begin" message. (We do this in code
  // so that, if Javascript is off, it doesn't happen.)
  showBlock("click_message");

  // Show the game when we click on the title.
  // Note: if you do events with onclick, you have to have only one click event handler.
  // You can use more complex methods if you expect to have more.
  document.getElementById("title").onclick = function() {
    showBlock("content")
    showBlock("content_wrapper");
    showBlock("legal");
    showBlock("tools_wrapper");
    document.getElementById("title").style.cursor = "default";
    hideBlock("click_message");
  };

/*
  // Any point that an option list appears, its options are its
  // first links.
  var optionLinkEvent = function(event) {
    // Make option clicks pass through to their first link.
    var link = $("a", this);
    if (link.length > 0) {
      $(link.get(0)).click();
    }
  };
  items = document.querySelectorAll("ul.options li, #menu li");
  Array.prototype.forEach.call(items, function(element, index){
    element.addEventListener('click', optionLinkEvent);
  });
*/
});
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImludGVybmFsLmpzIiwiYXV0aG9yLmpzIiwic3lzdGVtLmpzIiwicHJpdmF0ZS5qcyIsInNldHVwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbmVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4MUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoidW5kdW0uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gSW50ZXJuYWwgSW5mcmFzdHJ1Y3R1cmUgSW1wbGVtZW50YXRpb25zIFtOQjogVGhlc2UgaGF2ZSB0byBiZVxuLy8gYXQgdGhlIHRvcCwgYmVjYXVzZSB3ZSB1c2UgdGhlbSBiZWxvdywgYnV0IHlvdSBjYW4gc2FmZWx5XG4vLyBpZ25vcmUgdGhlbSBhbmQgc2tpcCBkb3duIHRvIHRoZSBuZXh0IHNlY3Rpb24uXVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyogQ3JvY2tmb3JkJ3MgaW5oZXJpdCBmdW5jdGlvbiAqL1xuRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzID0gZnVuY3Rpb24oUGFyZW50KSB7XG4gIHZhciBkID0ge30sIHAgPSAodGhpcy5wcm90b3R5cGUgPSBuZXcgUGFyZW50KCkpO1xuICB0aGlzLnByb3RvdHlwZS51YmVyID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGlmICghKG5hbWUgaW4gZCkpIGRbbmFtZV0gPSAwO1xuICAgIHZhciBmLCByLCB0ID0gZFtuYW1lXSwgdiA9IFBhcmVudC5wcm90b3R5cGU7XG4gICAgaWYgKHQpIHtcbiAgICAgIHdoaWxlICh0KSB7XG4gICAgICAgIHYgPSB2LmNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgdCAtPSAxO1xuICAgICAgfVxuICAgICAgZiA9IHZbbmFtZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGYgPSBwW25hbWVdO1xuICAgICAgaWYgKGYgPT0gdGhpc1tuYW1lXSkge1xuICAgICAgICBmID0gdltuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgZFtuYW1lXSArPSAxO1xuICAgIHIgPSBmLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShhcmd1bWVudHMsIFsxXSkpO1xuICAgIGRbbmFtZV0gLT0gMTtcbiAgICByZXR1cm4gcjtcbiAgfTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBGZWF0dXJlIGRldGVjdGlvblxuXG52YXIgaGFzTG9jYWxTdG9yYWdlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoYXNTdG9yYWdlID0gZmFsc2U7XG4gIHRyeSB7XG4gICAgaGFzU3RvcmFnZSA9ICgnbG9jYWxTdG9yYWdlJyBpbiB3aW5kb3cpICYmXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSBudWxsICYmXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgY2F0Y2ggKGVycikge1xuICAgIC8vIEZpcmVmb3ggd2l0aCB0aGUgXCJBbHdheXMgQXNrXCIgY29va2llIGFjY2VwdCBzZXR0aW5nXG4gICAgLy8gd2lsbCB0aHJvdyBhbiBlcnJvciB3aGVuIGF0dGVtcHRpbmcgdG8gYWNjZXNzIGxvY2FsU3RvcmFnZVxuICAgIGhhc1N0b3JhZ2UgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gaGFzU3RvcmFnZTtcbn07XG5cbi8vLyBBbmltYXRpb25zIC0geW91IGNhbiB0b3RhbGx5IHJlZGVmaW5lIHRoZXNlISBGYWRlIGluIGFuZCBmYWRlIG91dCBieSBkZWZhdWx0LlxuLy8vIEBwYXJhbSBpZCBzdHJpbmcgb3Igb2JqZWN0XG52YXIgc2hvd0Jsb2NrID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIGJsb2NrID0gaWQ7XG4gIGlmICh0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIpIHtcbiAgICB2YXIgYmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gIH1cbiAgYmxvY2suY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuICBibG9jay5jbGFzc0xpc3QucmVtb3ZlKCdoaWRlJyk7XG4gIGJsb2NrLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufVxuXG52YXIgaGlkZUJsb2NrID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIGJsb2NrID0gaWQ7IC8vIHR5cGVvZiBibG9jayA9PT0gXCJlbGVtZW50XCJcbiAgaWYgKHR5cGVvZiBpZCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHZhciBibG9jayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgfVxuICBpZiAodHlwZW9mIGlkID09PSBcIm9iamVjdFwiKSB7IC8vIHByb2JhYmx5IE5vZGVMaXN0XG4gICAgaWYgKGlkLmxlbmd0aCA9PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoaWQsIGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTtcbiAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodHlwZW9mIGJsb2NrLmNsYXNzTGlzdCA9PT0gXCJ1bmRlZmluZWRcIilcbiAge1xuICAgIGNvbnNvbGUubG9nKFwiVHJpZWQgdG8gaGlkZSBhbiB1bmRlZmluZWQgYmxvY2suXCIpO1xuICAgIGNvbnNvbGUubG9nKGlkKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYmxvY2suY2xhc3NMaXN0LmFkZCgnaGlkZScpO1xuICBibG9jay5jbGFzc0xpc3QucmVtb3ZlKCdzaG93Jyk7XG59XG5cbi8vIEFzc2VydGlvblxuXG52YXIgQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIHRoaXMubmFtZSA9IEFzc2VydGlvbkVycm9yO1xufTtcbkFzc2VydGlvbkVycm9yLmluaGVyaXRzKEVycm9yKTtcblxudmFyIGFzc2VydCA9IGZ1bmN0aW9uKGV4cHJlc3Npb24sIG1lc3NhZ2UpIHtcbiAgaWYgKCFleHByZXNzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpO1xuICB9XG59O1xuXG4vLyBPYmplY3QgZXh0ZW50aW9uXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24ob3V0KSB7XG4gIG91dCA9IG91dCB8fCB7fTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgb2JqID0gYXJndW1lbnRzW2ldO1xuXG4gICAgaWYgKCFvYmopXG4gICAgICBjb250aW51ZTtcblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBpZiAodHlwZW9mIG9ialtrZXldID09PSAnb2JqZWN0JylcbiAgICAgICAgICBleHRlbmQob3V0W2tleV0sIG9ialtrZXldKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIG91dFtrZXldID0gb2JqW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dDtcbn07XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVHlwZXMgZm9yIEF1dGhvciBVc2Vcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qIFRoZSBnYW1lIGlzIHNwbGl0IGludG8gc2l0dWF0aW9ucywgd2hpY2ggcmVzcG9uZCB0byB1c2VyXG4gKiBjaG9pY2VzLiBTaXR1YXRpb24gaXMgdGhlIGJhc2UgdHlwZS4gSXQgaGFzIHRocmVlIG1ldGhvZHM6XG4gKiBlbnRlciwgYWN0IGFuZCBleGl0LCB3aGljaCB5b3UgaW1wbGVtZW50IHRvIHBlcmZvcm0gYW55XG4gKiBwcm9jZXNzaW5nIGFuZCBvdXRwdXQgYW55IGNvbnRlbnQuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uc1xuICogZG8gbm90aGluZy5cbiAqXG4gKiBZb3UgY2FuIGVpdGhlciBjcmVhdGUgeW91ciBvd24gdHlwZSBvZiBTaXR1YXRpb24sIGFuZCBhZGRcbiAqIGVudGVyLCBhY3QgYW5kL29yIGV4aXQgZnVuY3Rpb25zIHRvIHRoZSBwcm90b3R5cGUgKHNlZVxuICogU2ltcGxlU2l0dWF0aW9uIGluIHRoaXMgZmlsZSBmb3IgYW4gZXhhbXBsZSBvZiB0aGF0KSwgb3IgeW91XG4gKiBjYW4gZ2l2ZSB0aG9zZSBmdW5jdGlvbnMgaW4gdGhlIG9wdHMgcGFyYW1ldGVyLiBUaGUgb3B0c1xuICogcGFyYW1ldGVyIGlzIGFuIG9iamVjdC4gU28geW91IGNvdWxkIHdyaXRlOlxuICpcbiAqICAgIHZhciBzaXR1YXRpb24gPSBTaXR1YXRpb24oe1xuICogICAgICAgIGVudGVyOiBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgZnJvbSkge1xuICogICAgICAgICAgICAuLi4geW91ciBpbXBsZW1lbnRhdGlvbiAuLi5cbiAqICAgICAgICB9XG4gKiAgICB9KTtcbiAqXG4gKiBJZiB5b3UgcGFzcyBpbiBlbnRlciwgYWN0IGFuZC9vciBleGl0IHRocm91Z2ggdGhlc2Ugb3B0aW9ucyxcbiAqIHRoZW4gdGhleSBzaG91bGQgaGF2ZSB0aGUgc2FtZSBmdW5jdGlvbiBzaWduYXR1cmUgYXMgdGhlIGZ1bGxcbiAqIGZ1bmN0aW9uIGRlZmluaXRpb25zLCBiZWxvdy5cbiAqXG4gKiBOb3RlIHRoYXQgU2ltcGxlU2l0dWF0aW9uLCBhIGRlcml2ZWQgdHlwZSBvZiBTaXR1YXRpb24sIGNhbGxzXG4gKiBwYXNzZWQgaW4gZW50ZXIsIGFjdCBhbmQgZXhpdCBmdW5jdGlvbnMgQVMgV0VMTCBBUyB0aGVpciBub3JtYWxcbiAqIGFjdGlvbi4gVGhpcyBpcyBtb3N0IG9mdGVuIHdoYXQgeW91IHdhbnQ6IHRoZSBub3JtYWwgYmVoYXZpb3JcbiAqIHBsdXMgYSBsaXR0bGUgZXh0cmEgY3VzdG9tIGJlaGF2aW9yLiBJZiB5b3Ugd2FudCB0byBvdmVycmlkZVxuICogdGhlIGJlaGF2aW9yIG9mIGEgU2ltcGxlU2l0dWF0aW9uLCB5b3UnbGwgaGF2ZSB0byBjcmVhdGUgYVxuICogZGVyaXZlZCB0eXBlIGFuZCBzZXQgdGhlIGVudGVyLCBhY3QgYW5kL29yIGV4aXQgZnVuY3Rpb24gb25cbiAqIHRoZWlyIHByb3RvdHlwZXMuIEluIG1vc3QgY2FzZXMsIGhvd2V2ZXIsIGlmIHlvdSB3YW50IHRvIGRvXG4gKiBzb21ldGhpbmcgY29tcGxldGVseSBkaWZmZXJlbnQsIGl0IGlzIGJldHRlciB0byBkZXJpdmUgeW91clxuICogdHlwZSBmcm9tIHRoaXMgdHlwZTogU2l0dWF0aW9uLCByYXRoZXIgdGhhbiBvbmUgb2YgaXRzXG4gKiBjaGlsZHJlbi5cbiAqXG4gKiBJbiBhZGRpdGlvbiB0byBlbnRlciwgZXhpdCBhbmQgYWN0LCB0aGUgZm9sbG93aW5nIG9wdGlvbnNcbiAqIHJlbGF0ZWQgdG8gaW1wbGljaXQgc2l0dWF0aW9uIHNlbGVjdGlvbiBhcmUgYXZhaWxhYmxlOlxuICpcbiAqIG9wdGlvblRleHQ6IGEgc3RyaW5nIG9yIGEgZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sXG4gKiAgICAgc2l0dWF0aW9uKSB3aGljaCBzaG91bGQgcmV0dXJuIHRoZSBsYWJlbCB0byBwdXQgaW4gYW5cbiAqICAgICBvcHRpb24gYmxvY2sgd2hlcmUgYSBsaW5rIHRvIHRoaXMgc2l0dWF0aW9uIGNhbiBiZVxuICogICAgIGNob3Nlbi4gVGhlIHNpdHVhdGlvbiBwYXNzZWQgaW4gaXMgdGhlIHNpdHVhdGlvbiB3aGVyZSB0aGVcbiAqICAgICBvcHRpb24gYmxvY2sgaXMgYmVpbmcgZGlzcGxheWVkLlxuICpcbiAqIGNhblZpZXc6IGEgZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikgd2hpY2ggc2hvdWxkXG4gKiAgICAgcmV0dXJuIHRydWUgaWYgdGhpcyBzaXR1YXRpb24gc2hvdWxkIGJlIHZpc2libGUgaW4gYW5cbiAqICAgICBvcHRpb24gYmxvY2sgaW4gdGhlIGdpdmVuIHNpdHVhdGlvbi5cbiAqXG4gKiBjYW5DaG9vc2U6IGEgZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikgd2hpY2ggc2hvdWxkXG4gKiAgICAgcmV0dXJuIHRydWUgaWYgdGhpcyBzaXR1YXRpb24gc2hvdWxkIGFwcGVhciBjbGlja2FibGUgaW4gYW5cbiAqICAgICBvcHRpb24gYmxvY2suIFJldHVybmluZyBmYWxzZSBhbGxvd3MgeW91IHRvIHByZXNlbnQgdGhlXG4gKiAgICAgb3B0aW9uIGJ1dCBwcmV2ZW50IGl0IGJlaW5nIHNlbGVjdGVkLiBZb3UgbWF5IHdhbnQgdG9cbiAqICAgICBpbmRpY2F0ZSB0byB0aGUgcGxheWVyIHRoYXQgdGhleSBuZWVkIHRvIGNvbGxlY3Qgc29tZVxuICogICAgIGltcG9ydGFudCBvYmplY3QgYmVmb3JlIHRoZSBvcHRpb24gaXMgYXZhaWxhYmxlLCBmb3JcbiAqICAgICBleGFtcGxlLlxuICpcbiAqIHRhZ3M6IGEgbGlzdCBvZiB0YWdzIGZvciB0aGlzIHNpdHVhdGlvbiwgd2hpY2ggY2FuIGJlIHVzZWQgZm9yXG4gKiAgICAgaW1wbGljaXQgc2l0dWF0aW9uIHNlbGVjdGlvbi4gVGhlIHRhZ3MgY2FuIGFsc28gYmUgZ2l2ZW4gYXNcbiAqICAgICBzcGFjZSwgdGFiIG9yIGNvbW1hIHNlcGFyYXRlZCB0YWdzIGluIGEgc3RyaW5nLiBOb3RlIHRoYXQsXG4gKiAgICAgd2hlbiBjYWxsaW5nIGBnZXRTaXR1YXRpb25JZENob2ljZXNgLCB0YWdzIGFyZSBwcmVmaXhlZCB3aXRoXG4gKiAgICAgYSBoYXNoLCBidXQgdGhhdCBzaG91bGQgbm90IGJlIHRoZSBjYXNlIGhlcmUuIEp1c3QgdXNlIHRoZVxuICogICAgIHBsYWluIHRhZyBuYW1lLlxuICpcbiAqIHByaW9yaXR5OiBhIG51bWVyaWMgcHJpb3JpdHkgdmFsdWUgKGRlZmF1bHQgPSAxKS4gV2hlblxuICogICAgIHNlbGVjdGluZyBzaXR1YXRpb25zIGltcGxpY2l0bHksIGhpZ2hlciBwcmlvcml0eSBzaXR1YXRpb25zXG4gKiAgICAgYXJlIGNvbnNpZGVyZWQgZmlyc3QuXG4gKlxuICogZnJlcXVlbmN5OiBhIG51bWVyaWMgcmVsYXRpdmUgZnJlcXVlbmN5IChkZWZhdWx0ID0gMSksIHNvIDEwMFxuICogICAgIHdvdWxkIGJlIDEwMCB0aW1lcyBtb3JlIGZyZXF1ZW50LiBXaGVuIHRoZXJlIGFyZSBtb3JlXG4gKiAgICAgb3B0aW9ucyB0aGF0IGNhbiBiZSBkaXNwbGF5ZWQsIHNpdHVhdGlvbnMgd2lsbCBiZSBzZWxlY3RlZFxuICogICAgIHJhbmRvbWx5IGJhc2VkIG9uIHRoZWlyIGZyZXF1ZW5jeS5cbiAqXG4gKiBkaXNwbGF5T3JkZXI6IGEgbnVtZXJpYyBvcmRlcmluZyB2YWx1ZSAoZGVmYXVsdCA9IDEpLiBXaGVuXG4qICAgICBzaXR1YXRpb25zIGFyZSBzZWxlY3RlZCBpbXBsaWNpdGx5LCB0aGUgcmVzdWx0cyBhcmUgb3JkZXJlZFxuKiAgICAgYnkgaW5jcmVhc2luZyBkaXNwbGF5T3JkZXIuXG4qL1xudmFyIFNpdHVhdGlvbiA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgaWYgKG9wdHMpIHtcbiAgICBpZiAob3B0cy5lbnRlcikgdGhpcy5fZW50ZXIgPSBvcHRzLmVudGVyO1xuICAgIGlmIChvcHRzLmFjdCkgdGhpcy5fYWN0ID0gb3B0cy5hY3Q7XG4gICAgaWYgKG9wdHMuZXhpdCkgdGhpcy5fZXhpdCA9IG9wdHMuZXhpdDtcblxuICAgIC8vIE9wdGlvbnMgcmVsYXRlZCB0byB0aGlzIHNpdHVhdGlvbiBiZWluZyBhdXRvbWF0aWNhbGx5XG4gICAgLy8gc2VsZWN0ZWQgYW5kIGRpc3BsYXllZCBpbiBhIGxpc3Qgb2Ygb3B0aW9ucy5cbiAgICB0aGlzLl9vcHRpb25UZXh0ID0gb3B0cy5vcHRpb25UZXh0O1xuICAgIHRoaXMuX2NhblZpZXcgPSBvcHRzLmNhblZpZXcgfHwgdHJ1ZTtcbiAgICB0aGlzLl9jYW5DaG9vc2UgPSBvcHRzLmNhbkNob29zZSB8fCB0cnVlO1xuICAgIHRoaXMuX3ByaW9yaXR5ID0gKG9wdHMucHJpb3JpdHkgIT09IHVuZGVmaW5lZCkgPyBvcHRzLnByaW9yaXR5IDogMTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPVxuICAgICAgKG9wdHMuZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpID8gb3B0cy5mcmVxdWVuY3kgOiAxO1xuICAgIHRoaXMuX2Rpc3BsYXlPcmRlciA9XG4gICAgICAob3B0cy5kaXNwbGF5T3JkZXIgIT09IHVuZGVmaW5lZCkgPyBvcHRzLmRpc3BsYXlPcmRlciA6IDE7XG5cbiAgICAvLyBUYWcgYXJlIG5vdCBzdG9yZWQgd2l0aCBhbiB1bmRlcnNjb3JlLCBiZWNhdXNlIHRoZXkgYXJlXG4gICAgLy8gYWNjZXNzZWQgZGlyZWN0eS4gVGhleSBzaG91bGQgbm90IGJlIGNvbnRleHQgc2Vuc2l0aXZlXG4gICAgLy8gKHVzZSB0aGUgY2FuVmlldyBmdW5jdGlvbiB0byBkbyBjb250ZXh0IHNlbnNpdGl2ZVxuICAgIC8vIG1hbmlwdWxhdGlvbikuXG4gICAgaWYgKG9wdHMudGFncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRzLnRhZ3MpKSB7XG4gICAgICAgIHRoaXMudGFncyA9IG9wdHMudGFncztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGFncyA9IG9wdHMudGFncy5zcGxpdCgvWyBcXHQsXSsvKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YWdzID0gW107XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2NhblZpZXcgPSB0cnVlO1xuICAgIHRoaXMuX2NhbkNob29zZSA9IHRydWU7XG4gICAgdGhpcy5fcHJpb3JpdHkgPSAxO1xuICAgIHRoaXMuX2ZyZXF1ZW5jeSA9IDE7XG4gICAgdGhpcy5fZGlzcGxheU9yZGVyID0gMTtcbiAgICB0aGlzLnRhZ3MgPSBbXTtcbiAgfVxufTtcbi8qIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhY3Rpb24gd2hlbiB3ZSBlbnRlciBhIHNpdHVhdGlvbi4gVGhlXG4gKiBsYXN0IHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhlIHNpdHVhdGlvbiB3ZSBoYXZlIGp1c3QgbGVmdDogaXRcbiAqIG1heSBiZSBudWxsIGlmIHRoaXMgaXMgdGhlIHN0YXJ0aW5nIHNpdHVhdGlvbi4gVW5saWtlIHRoZVxuICogZXhpdCgpIG1ldGhvZCwgdGhpcyBtZXRob2QgY2Fubm90IHByZXZlbnQgdGhlIHRyYW5zaXRpb25cbiAqIGhhcHBlbmluZzogaXRzIHJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLiAqL1xuU2l0dWF0aW9uLnByb3RvdHlwZS5lbnRlciA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBmcm9tKSB7XG4gIGlmICh0aGlzLl9lbnRlcikgdGhpcy5fZW50ZXIoY2hhcmFjdGVyLCBzeXN0ZW0sIGZyb20pO1xufTtcbi8qIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhY3Rpb24gd2hlbiB3ZSBjYXJyeSBvdXQgc29tZSBhY3Rpb24gaW4gYVxuICogc2l0dWF0aW9uIHRoYXQgaXNuJ3QgaW50ZW5kZWQgdG8gbGVhZCB0byBhIG5ldyBzaXR1YXRpb24uICovXG5TaXR1YXRpb24ucHJvdG90eXBlLmFjdCA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pIHtcbiAgaWYgKHRoaXMuX2FjdCkgdGhpcy5fYWN0KGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pO1xufTtcbi8qIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhY3Rpb24gd2hlbiB3ZSBleGl0IGEgc2l0dWF0aW9uLiBUaGUgbGFzdFxuICogcGFyYW1ldGVyIGluZGljYXRlcyB0aGUgc2l0dWF0aW9uIHdlIGFyZSBnb2luZyB0by4gKi9cblNpdHVhdGlvbi5wcm90b3R5cGUuZXhpdCA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCB0bykge1xuICBpZiAodGhpcy5fZXhpdCkgdGhpcy5fZXhpdChjaGFyYWN0ZXIsIHN5c3RlbSwgdG8pO1xufTtcbi8qIERldGVybWluZXMgd2hldGhlciB0aGlzIHNpdHVhdGlvbiBzaG91bGQgYmUgY29udGFpbmVkIHdpdGhpbiBhXG4gKiBsaXN0IG9mIG9wdGlvbnMgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhlIGdpdmVuXG4gKiBzaXR1YXRpb24uICovXG5TaXR1YXRpb24ucHJvdG90eXBlLmNhblZpZXcgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0dWF0aW9uKSB7XG4gIGlmICh0eXBlb2YodGhpcy5fY2FuVmlldykgPT09IFwiZnVuY3Rpb25cIiApIHtcbiAgICByZXR1cm4gdGhpcy5fY2FuVmlldyhjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0dWF0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5fY2FuVmlldztcbiAgfVxufTtcbi8qIERldGVybWluZXMgd2hldGhlciB0aGlzIHNpdHVhdGlvbiBzaG91bGQgYmUgY2xpY2thYmxlIHdpdGhpbiBhXG4gKiBsaXN0IG9mIG9wdGlvbnMgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHkgYnkgdGhlIGdpdmVuIHNpdHVhdGlvbi4gKi9cblNpdHVhdGlvbi5wcm90b3R5cGUuY2FuQ2hvb3NlID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikge1xuICBpZiAodHlwZW9mKHRoaXMuX2NhbkNob29zZSkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiB0aGlzLl9jYW5DaG9vc2UoY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhbkNob29zZTtcbiAgfVxufTtcbi8qIFJldHVybnMgdGhlIHRleHQgdGhhdCBzaG91bGQgYmUgdXNlZCB0byBkaXNwbGF5IHRoaXMgc2l0dWF0aW9uXG4gKiBpbiBhbiBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBsaXN0IG9mIGNob2ljZXMuICovXG5TaXR1YXRpb24ucHJvdG90eXBlLm9wdGlvblRleHQgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0dWF0aW9uKSB7XG4gIGlmICh0eXBlb2YodGhpcy5fb3B0aW9uVGV4dCkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25UZXh0KGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25UZXh0O1xuICB9XG59O1xuLyogUmV0dXJucyB0aGUgcHJpb3JpdHksIGZyZXF1ZW5jeSBhbmQgZGlzcGxheU9yZGVyIGZvciB0aGlzIHNpdHVhdGlvbixcbiAqIHdoZW4gYmVpbmcgc2VsZWN0ZWQgdXNpbmcgYHN5c3RlbS5nZXRTaXR1YXRpb25JZENob2ljZXNgLiAqL1xuU2l0dWF0aW9uLnByb3RvdHlwZS5jaG9pY2VEYXRhID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikge1xuICByZXR1cm4ge1xucHJpb3JpdHk6IHRoaXMuX3ByaW9yaXR5LFxuICAgICAgICAgICAgZnJlcXVlbmN5OiB0aGlzLl9mcmVxdWVuY3ksXG4gICAgICAgICAgICBkaXNwbGF5T3JkZXI6IHRoaXMuX2Rpc3BsYXlPcmRlclxuICB9O1xufTtcblxuLyogQSBzaW1wbGUgc2l0dWF0aW9uIGhhcyBhIGJsb2NrIG9mIGNvbnRlbnQgdGhhdCBpdCBkaXNwbGF5cyB3aGVuXG4gKiB0aGUgc2l0dWF0aW9uIGlzIGVudGVyZWQuIFRoZSBjb250ZW50IG11c3QgYmUgdmFsaWQgXCJEaXNwbGF5XG4gKiBDb250ZW50XCIgKHNlZSBgU3lzdGVtLnByb3RvdHlwZS53cml0ZWAgZm9yIGEgZGVmaW5pdGlvbikuIFRoaXNcbiAqIGNvbnN0cnVjdG9yIGhhcyBvcHRpb25zIHRoYXQgY29udHJvbCBpdHMgYmVoYXZpb3I6XG4gKlxuICogaGVhZGluZzogVGhlIG9wdGlvbmFsIGBoZWFkaW5nYCB3aWxsIGJlIHVzZWQgYXMgYSBzZWN0aW9uIHRpdGxlXG4gKiAgICAgYmVmb3JlIHRoZSBjb250ZW50IGlzIGRpc3BsYXllZC4gVGhlIGhlYWRpbmcgY2FuIGJlIGFueVxuICogICAgIEhUTUwgc3RyaW5nLCBpdCBkb2Vzbid0IG5lZWQgdG8gYmUgXCJEaXNwbGF5IENvbnRlbnRcIi4gSWZcbiAqICAgICB0aGUgaGVhZGluZyBpcyBub3QgZ2l2ZW4sIG5vIGhlYWRpbmcgd2lsbCBiZSBkaXNwbGF5ZWQuIElmXG4gKiAgICAgYSBoZWFkaW5nIGlzIGdpdmVuLCBhbmQgbm8gb3B0aW9uVGV4dCBpcyBzcGVjaWZpZWQgKHNlZVxuICogICAgIGBTaXR1YXRpb25gIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIGBvcHRpb25UZXh0YCksIHRoZW4gdGhlXG4gKiAgICAgaGVhZGluZyB3aWxsIGFsc28gYmUgdXNlZCBmb3IgdGhlIHNpdHVhdGlvbidzIG9wdGlvbiB0ZXh0LlxuICpcbiAqIGFjdGlvbnM6IFRoaXMgc2hvdWxkIGJlIGFuIG9iamVjdCBtYXBwaW5nIGFjdGlvbiBJZHMgdG8gYVxuICogICAgIHJlc3BvbnNlLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGVpdGhlciBiZSBcIkRpc3BsYXkgQ29udGVudFwiXG4gKiAgICAgdG8gZGlzcGxheSBpZiB0aGlzIGFjdGlvbiBpcyBjYXJyaWVkIG91dCwgb3IgaXQgc2hvdWxkIGJlIGFcbiAqICAgICBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKSB0aGF0IHdpbGwgcHJvY2VzcyB0aGVcbiAqICAgICBhY3Rpb24uXG4gKlxuICogY2hvaWNlczogQSBsaXN0IG9mIHNpdHVhdGlvbiBpZHMgYW5kIHRhZ3MgdGhhdCwgaWYgZ2l2ZW4sIHdpbGxcbiAqICAgICBiZSB1c2VkIHRvIGNvbXBpbGUgYW4gaW1wbGljaXQgb3B0aW9uIGJsb2NrIHVzaW5nXG4gKiAgICAgYGdldFNpdHVhdGlvbklkQ2hvaWNlc2AgKHNlZSB0aGF0IGZ1bmN0aW9uIGZvciBtb3JlIGRldGFpbHNcbiAqICAgICBvZiBob3cgdGhpcyB3b3JrcykuIFRhZ3MgaW4gdGhpcyBsaXN0IHNob3VsZCBiZSBwcmVmaXhlZFxuICogICAgIHdpdGggYSBoYXNoICMgc3ltYm9sLCB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gc2l0dWF0aW9uXG4gKiAgICAgaWRzLiBJZiBqdXN0IGEgc2luZ2xlIHRhZyBvciBpZCBpcyBuZWVkZWQsIGl0IGNhbiBiZSBwYXNzZWRcbiAqICAgICBpbiBhcyBhIHN0cmluZyB3aXRob3V0IHdyYXBwaW5nIGludG8gYSBsaXN0LlxuICpcbiAqIG1pbkNob2ljZXM6IElmIGBjaG9pY2VzYCBpcyBnaXZlbiwgYW5kIGFuIGltcGxpY2l0IGNob2ljZSBibG9ja1xuICogICAgIHNob3VsZCBiZSBjb21waWxlZCwgc2V0IHRoaXMgb3B0aW9uIHRvIHJlcXVpcmUgYXQgbGVhc3RcbiAqICAgICB0aGlzIG51bWJlciBvZiBvcHRpb25zIHRvIGJlIGRpc3BsYXllZC4gU2VlXG4gKiAgICAgYGdldFNpdHVhdGlvbklkQ2hvaWNlc2AgZm9yIGEgZGVzY3JpcHRpb24gb2YgdGhlIGFsZ29yaXRobSBieVxuICogICAgIHdoaWNoIHRoaXMgaGFwcGVucy4gSWYgeW91IGRvIG5vdCBzcGVjaWZ5IHRoZSBgY2hvaWNlc2BcbiAqICAgICBvcHRpb24sIHRoZW4gdGhpcyBvcHRpb24gd2lsbCBiZSBpZ25vcmVkLlxuICpcbiAqIG1heENob2ljZXM6IElmIGBjaG9pY2VzYCBpcyBnaXZlbiwgYW5kIGFuIGltcGxpY2l0IGNob2ljZSBibG9ja1xuICogICAgIHNob3VsZCBiZSBjb21waWxlZCwgc2V0IHRoaXMgb3B0aW9uIHRvIHJlcXVpcmUgbm8gbW9yZSB0aGFuXG4gKiAgICAgdGhpcyBudW1iZXIgb2Ygb3B0aW9ucyB0byBiZSBkaXNwbGF5ZWQuIFNlZVxuICogICAgIGBnZXRTaXR1YXRpb25JZENob2ljZXNgIGZvciBhIGRlc2NyaXB0aW9uIG9mIHRoZSBhbGdvcml0aG1cbiAqICAgICBieSB3aGljaCB0aGlzIGhhcHBlbnMuIElmIHlvdSBkbyBub3Qgc3BlY2lmeSB0aGUgYGNob2ljZXNgXG4gKiAgICAgb3B0aW9uLCB0aGVuIHRoaXMgb3B0aW9uIHdpbGwgYmUgaWdub3JlZC5cbiAqXG4gKiBUaGUgcmVtYWluaW5nIG9wdGlvbnMgaW4gdGhlIGBvcHRzYCBwYXJhbWV0ZXIgYXJlIHRoZSBzYW1lIGFzIGZvclxuICogdGhlIGJhc2UgU2l0dWF0aW9uLlxuICovXG52YXIgU2ltcGxlU2l0dWF0aW9uID0gZnVuY3Rpb24oY29udGVudCwgb3B0cykge1xuICBTaXR1YXRpb24uY2FsbCh0aGlzLCBvcHRzKTtcbiAgdGhpcy5jb250ZW50ID0gY29udGVudDtcbiAgdGhpcy5oZWFkaW5nID0gb3B0cyAmJiBvcHRzLmhlYWRpbmc7XG4gIHRoaXMuYWN0aW9ucyA9IG9wdHMgJiYgb3B0cy5hY3Rpb25zO1xuXG4gIHRoaXMuY2hvaWNlcyA9IG9wdHMgJiYgb3B0cy5jaG9pY2VzO1xuICB0aGlzLm1pbkNob2ljZXMgPSBvcHRzICYmIG9wdHMubWluQ2hvaWNlcztcbiAgdGhpcy5tYXhDaG9pY2VzID0gb3B0cyAmJiBvcHRzLm1heENob2ljZXM7XG59O1xuU2ltcGxlU2l0dWF0aW9uLmluaGVyaXRzKFNpdHVhdGlvbik7XG5TaW1wbGVTaXR1YXRpb24ucHJvdG90eXBlLmVudGVyID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIGZyb20pIHtcbiAgaWYgKHRoaXMuaGVhZGluZykge1xuICAgIGlmICh0eXBlb2YodGhpcy5oZWFkaW5nKSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBzeXN0ZW0ud3JpdGVIZWFkaW5nKHRoaXMuaGVhZGluZygpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3lzdGVtLndyaXRlSGVhZGluZyh0aGlzLmhlYWRpbmcpO1xuICAgIH1cbiAgfVxuICBpZiAodGhpcy5fZW50ZXIpIHRoaXMuX2VudGVyKGNoYXJhY3Rlciwgc3lzdGVtLCBmcm9tKTtcbiAgaWYgKHRoaXMuY29udGVudCkge1xuICAgIGlmICh0eXBlb2YodGhpcy5jb250ZW50KSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBzeXN0ZW0ud3JpdGUodGhpcy5jb250ZW50KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzeXN0ZW0ud3JpdGUodGhpcy5jb250ZW50KTtcbiAgICB9XG4gIH1cbiAgaWYgKHRoaXMuY2hvaWNlcykge1xuICAgIHZhciBjaG9pY2VzID0gc3lzdGVtLmdldFNpdHVhdGlvbklkQ2hvaWNlcyh0aGlzLmNob2ljZXMsXG4gICAgICAgIHRoaXMubWluQ2hvaWNlcyxcbiAgICAgICAgdGhpcy5tYXhDaG9pY2VzKTtcbiAgICBzeXN0ZW0ud3JpdGVDaG9pY2VzKGNob2ljZXMpO1xuICB9XG59O1xuU2ltcGxlU2l0dWF0aW9uLnByb3RvdHlwZS5hY3QgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKSB7XG4gIHZhciByZXNwb25zZSA9IHRoaXMuYWN0aW9uc1thY3Rpb25dO1xuICB0cnkge1xuICAgIHJlc3BvbnNlKGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAocmVzcG9uc2UpIHN5c3RlbS53cml0ZShyZXNwb25zZSk7XG4gIH1cbiAgaWYgKHRoaXMuX2FjdCkgdGhpcy5fYWN0KGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pO1xufTtcblNpbXBsZVNpdHVhdGlvbi5wcm90b3R5cGUub3B0aW9uVGV4dCA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXRuKSB7XG4gIHZhciBwYXJlbnRSZXN1bHQgPSBTaXR1YXRpb24ucHJvdG90eXBlLm9wdGlvblRleHQuY2FsbCh0aGlzLCBjaGFyYWN0ZXIsXG4gICAgICBzeXN0ZW0sIHNpdG4pO1xuICBpZiAocGFyZW50UmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5oZWFkaW5nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJlbnRSZXN1bHQ7XG4gIH1cbn07XG5cbi8qIEluc3RhbmNlcyBvZiB0aGlzIGNsYXNzIGRlZmluZSB0aGUgcXVhbGl0aWVzIHRoYXQgY2hhcmFjdGVyc1xuICogbWF5IHBvc3Nlc3MuIFRoZSB0aXRsZSBzaG91bGQgYmUgYSBzdHJpbmcsIGFuZCBjYW4gY29udGFpblxuICogSFRNTC4gT3B0aW9ucyBhcmUgcGFzc2VkIGluIGluIHRoZSBvcHRzIHBhcmFtZXRlci4gVGhlXG4gKiBmb2xsb3dpbmcgb3B0aW9ucyBhcmUgYXZhaWxhYmxlLlxuICpcbiAqIHByaW9yaXR5IC0gQSBzdHJpbmcgdXNlZCB0byBzb3J0IHF1YWxpdGllcyB3aXRoaW4gdGhlaXJcbiAqICAgICBncm91cHMuIFdoZW4gdGhlIHN5c3RlbSBkaXNwbGF5cyBhIGxpc3Qgb2YgcXVhbGl0aWVzIHRoZXlcbiAqICAgICB3aWxsIGJlIHNvcnRlZCBieSB0aGlzIHN0cmluZy4gSWYgeW91IGRvbid0IGdpdmUgYVxuICogICAgIHByaW9yaXR5LCB0aGVuIHRoZSB0aXRsZSB3aWxsIGJlIHVzZWQsIHNvIHlvdSdsbCBnZXRcbiAqICAgICBhbHBoYWJldGljIG9yZGVyLiBOb3JtYWxseSB5b3UgZWl0aGVyIGRvbid0IGdpdmUgYVxuICogICAgIHByaW9yaXR5LCBvciBlbHNlIHVzZSBhIHByaW9yaXR5IHN0cmluZyBjb250YWluaW5nIDAtcGFkZGVkXG4gKiAgICAgbnVtYmVycyAoZS5nLiBcIjAwMDAxXCIpLlxuICpcbiAqIGdyb3VwIC0gVGhlIElkIG9mIGEgZ3JvdXAgaW4gd2hpY2ggdG8gZGlzcGxheSB0aGlzXG4gKiAgICAgcGFyYW1ldGVyLiBUaGUgY29ycmVzcG9uZGluZyBncm91cCBtdXN0IGJlIGRlZmluZWQgaW5cbiAqICAgICB5b3VyIGB1bmR1bS5nYW1lLnF1YWxpdHlHcm91cHNgIHByb3BlcnR5LlxuICpcbiAqIGV4dHJhQ2xhc3NlcyAtIFRoZXNlIGNsYXNzZXMgd2lsbCBiZSBhdHRhY2hlZCB0byB0aGUgPGRpdj4gdGFnXG4gKiAgICAgdGhhdCBzdXJyb3VuZHMgdGhlIHF1YWxpdHkgd2hlbiBpdCBpcyBkaXNwbGF5ZWQuIEEgY29tbW9uXG4gKiAgICAgdXNlIGZvciB0aGlzIGlzIHRvIGFkZCBpY29ucyByZXByZXNlbnRpbmcgdGhlIHF1YWxpdHkuIEluXG4gKiAgICAgeW91ciBDU1MgZGVmaW5lIGEgY2xhc3MgZm9yIGVhY2ggaWNvbiwgdGhlbiBwYXNzIHRob3NlXG4gKiAgICAgY2xhc3NlcyBpbnRvIHRoZSBhcHByb3ByaWF0ZSBxdWFsaXR5IGRlZmluaXRpb25zLlxuICpcbiAqIE9uZSBrZXkgcHVycG9zZSBvZiBRdWFsaXR5RGVmaW5pdGlvbiBpcyB0byBmb3JtYXQgdGhlIHF1YWxpdHlcbiAqIHZhbHVlIGZvciBkaXNwbGF5LiBRdWFsaXR5IHZhbHVlcyBhcmUgYWx3YXlzIHN0b3JlZCBhcyBudW1lcmljXG4gKiB2YWx1ZXMsIGJ1dCBtYXkgYmUgZGlzcGxheWVkIGluIHdvcmRzIG9yIHN5bWJvbHMuIEEgbnVtYmVyIG9mXG4gKiBzdWItdHlwZXMgb2YgUXVhbGl0eURlZmluaXRpb24gYXJlIGdpdmVuIHRoYXQgZm9ybWF0IHRoZWlyXG4gKiB2YWx1ZXMgaW4gZGlmZmVyZW50IHdheXMuXG4gKi9cbnZhciBRdWFsaXR5RGVmaW5pdGlvbiA9IGZ1bmN0aW9uKHRpdGxlLCBvcHRzKSB7XG4gIHZhciBteU9wdHMgPSBleHRlbmQob3B0cywge1xuICAgIHByaW9yaXR5OiB0aXRsZSxcbiAgICBncm91cDogbnVsbCxcbiAgICBleHRyYUNsYXNzZXM6IG51bGxcbiAgfSk7XG4gIHRoaXMudGl0bGUgPSB0aXRsZTtcbiAgdGhpcy5wcmlvcml0eSA9IG15T3B0cy5wcmlvcml0eTtcbiAgdGhpcy5ncm91cCA9IG15T3B0cy5ncm91cDtcbiAgdGhpcy5leHRyYUNsYXNzZXMgPSBteU9wdHMuZXh0cmFDbGFzc2VzO1xufTtcbi8qIEZvcm1hdHMgdGhlIHZhbHVlICh3aGljaCBpcyBhbHdheXMgbnVtZXJpYykgaW50byB0aGUgdmFsdWUgdG9cbiAqIGJlIGRpc3BsYXllZC4gVGhlIHJlc3VsdCBzaG91bGQgYmUgSFRNTCAoYnV0IG5vIHRhZ3MgYXJlXG4gKiBuZWVkZWQpLiBJZiBudWxsIGlzIHJldHVybmVkLCB0aGVuIHRoZSBxdWFsaXR5IGRlZmluaXRpb24gd2lsbFxuICogbm90IGJlIGRpc3BsYXllZCwgc28gaWYgeW91IHdhbnQgYW4gZW1wdHkgdmFsdWUgcmV0dXJuIGFuIGVtcHR5XG4gKiBzdHJpbmcuICovXG5RdWFsaXR5RGVmaW5pdGlvbi5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbn07XG5cbi8qIEEgcXVhbGl0eSB0aGF0IGlzIGFsd2F5cyBkaXNwbGF5ZWQgYXMgdGhlIG5lYXJlc3QgaW50ZWdlciBvZlxuICogdGhlIGN1cnJlbnQgdmFsdWUsIHJvdW5kZWQgZG93bi4gT3B0aW9ucyAoaW4gdGhlIG9wdHNcbiAqIHBhcmFtZXRlcikgYXJlIHRoZSBzYW1lIGFzIGZvciBRdWFsaXR5RGVmaW5pdGlvbi4gKi9cbnZhciBJbnRlZ2VyUXVhbGl0eSA9IGZ1bmN0aW9uKHRpdGxlLCBvcHRzKSB7XG4gIFF1YWxpdHlEZWZpbml0aW9uLmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xufTtcbkludGVnZXJRdWFsaXR5LmluaGVyaXRzKFF1YWxpdHlEZWZpbml0aW9uKTtcbkludGVnZXJRdWFsaXR5LnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLmZsb29yKHZhbHVlKS50b1N0cmluZygpO1xufTtcblxuLyogQSBxdWFsaXR5IHRoYXQgZGlzcGxheXMgYXMgYW4gSW50ZWdlclF1YWxpdHksIHVubGVzcyBpdCBpc1xuICogemVybywgd2hlbiBpdCBpcyBvbWl0dGVkLiBPcHRpb25zIChpbiB0aGUgb3B0cyAqIHBhcmFtZXRlcikgYXJlXG4gKiB0aGUgc2FtZSBhcyBmb3IgUXVhbGl0eURlZmluaXRpb24uICovXG52YXIgTm9uWmVyb0ludGVnZXJRdWFsaXR5ID0gZnVuY3Rpb24odGl0bGUsIG9wdHMpIHtcbiAgSW50ZWdlclF1YWxpdHkuY2FsbCh0aGlzLCB0aXRsZSwgb3B0cyk7XG59O1xuTm9uWmVyb0ludGVnZXJRdWFsaXR5LmluaGVyaXRzKEludGVnZXJRdWFsaXR5KTtcbk5vblplcm9JbnRlZ2VyUXVhbGl0eS5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gSW50ZWdlclF1YWxpdHkucHJvdG90eXBlLmZvcm1hdC5jYWxsKFxuICAgICAgdGhpcywgY2hhcmFjdGVyLCB2YWx1ZVxuICAgICk7XG4gIH1cbn07XG5cbi8qIEEgcXVhbGl0eSB0aGF0IGRpc3BsYXlzIGl0cyBmdWxsIG51bWVyaWMgdmFsdWUsIGluY2x1ZGluZ1xuICogZGVjaW1hbCBjb21wb25lbnQuIFRoaXMgaXMgYWN0dWFsbHkgYSB0cml2aWFsIHdyYXBwZXIgYXJvdW5kXG4gKiB0aGUgUXVhbGl0eURlZmluaXRpb24gY2xhc3MsIHdoaWNoIGZvcm1hdHMgaW4gdGhlIHNhbWVcbiAqIHdheS4gT3B0aW9ucyAoaW4gdGhlIG9wdHMgcGFyYW1ldGVyKSBhcmUgdGhlIHNhbWUgYXMgZm9yXG4gKiBRdWFsaXR5RGVmaW5pdGlvbi4gKi9cbnZhciBOdW1lcmljUXVhbGl0eSA9IGZ1bmN0aW9uKHRpdGxlLCBvcHRzKSB7XG4gIFF1YWxpdHlEZWZpbml0aW9uLmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xufTtcbk51bWVyaWNRdWFsaXR5LmluaGVyaXRzKFF1YWxpdHlEZWZpbml0aW9uKTtcblxuLyogQSBxdWFsaXR5IHRoYXQgZGlzcGxheXMgaXRzIHZhbHVlcyBhcyBvbmUgb2YgYSBzZXQgb2ZcbiAqIHdvcmRzLiBUaGUgcXVhbGl0eSB2YWx1ZSBpcyBmaXJzdCByb3VuZGVkIGRvd24gdG8gdGhlIG5lYXJlc3RcbiAqIGludGVnZXIsIHRoZW4gdGhpcyB2YWx1ZSBpcyB1c2VkIHRvIHNlbGVjdCBhIHdvcmQgdG9cbiAqIGRpc3BsYXkuIFRoZSBvZmZzZXQgcGFyYW1ldGVyIChvcHRpb25hbGx5IHBhc3NlZCBpbiBhcyBwYXJ0IG9mXG4gKiB0aGUgb3B0cyBvYmplY3QpIGNvbnRyb2xzIHdoYXQgbnVtYmVyIG1hcHMgdG8gd2hhdCB3b3JkLlxuICpcbiAqIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyAoaW4gdGhlIG9wdHMgcGFyYW1ldGVyKSBhcmUgYXZhaWxhYmxlOlxuICpcbiAqIG9mZnNldCAtIFdpdGggb2Zmc2V0PTAgKHRoZSBkZWZhdWx0KSwgdGhlIHF1YW50aXR5IHZhbHVlIG9mIDBcbiAqICAgICB3aWxsIG1hcCB0byB0aGUgZmlyc3Qgd29yZCwgYW5kIHNvIG9uLiBJZiBvZmZzZXQgaXNcbiAqICAgICBub24temVybyB0aGVuIHRoZSB2YWx1ZSBnaXZlbiB3aWxsIGNvcnJlc3BvbmQgdG8gdGhlIGZpcnN0XG4gKiAgICAgd29yZCBpbiB0aGUgbGlzdC4gU28gaWYgb2Zmc2V0PTQsIHRoZW4gdGhlIGZpcnN0IHdvcmQgaW5cbiAqICAgICB0aGUgbGlzdCB3aWxsIGJlIHVzZWQgZm9yIHZhbHVlPTQuXG4gKlxuICogdXNlQm9udXNlcyAtIElmIHRoaXMgaXMgdHJ1ZSAodGhlIGRlZmF1bHQpLCB0aGVuIHZhbHVlcyBvdXRzaWRlXG4gKiAgICAgdGhlIHJhbmdlIG9mIHdvcmRzIHdpbGwgYmUgY29uc3RydWNlZCBmcm9tIHRoZSB3b3JkIGFuZCBhXG4gKiAgICAgbnVtZXJpYyBib251cy4gU28gd2l0aCBvZmZzZXQ9MCBhbmQgZml2ZSB3b3JkcywgdGhlIGxhc3Qgb2ZcbiAqICAgICB3aGljaCBpcyAnYW1hemluZycsIGEgc2NvcmUgb2Ygc2l4IHdvdWxkIGdpdmUgJ2FtYXppbmcrMScuXG4gKiAgICAgaWYgdGhpcyBpcyBmYWxzZSwgdGhlbiB0aGUgYm9udXMgd291bGQgYmUgb21pdHRlZCwgc29cbiAqICAgICBhbnl0aGluZyBiZXlvbmQgJ2FtYXppbmcnIGlzIHN0aWxsICdhbWF6aW5nJy5cbiAqXG4gKiBPdGhlciBvcHRpb25zIGFyZSB0aGUgc2FtZSBhcyBmb3IgUXVhbGl0eURlZmluaXRpb24uXG4gKi9cbnZhciBXb3JkU2NhbGVRdWFsaXR5ID0gZnVuY3Rpb24odGl0bGUsIHZhbHVlcywgb3B0cykge1xuICB2YXIgbXlPcHRzID0gZXh0ZW5kKG9wdHMsIHtcbiAgICBvZmZzZXQ6IG51bGwsXG4gICAgdXNlQm9udXNlczogdHJ1ZVxuICB9KTtcbiAgUXVhbGl0eURlZmluaXRpb24uY2FsbCh0aGlzLCB0aXRsZSwgb3B0cyk7XG4gIHRoaXMudmFsdWVzID0gdmFsdWVzO1xuICB0aGlzLm9mZnNldCA9IG15T3B0cy5vZmZzZXQ7XG4gIHRoaXMudXNlQm9udXNlcyA9IG15T3B0cy51c2VCb251c2VzO1xufTtcbldvcmRTY2FsZVF1YWxpdHkuaW5oZXJpdHMoUXVhbGl0eURlZmluaXRpb24pO1xuV29yZFNjYWxlUXVhbGl0eS5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICB2YXIgdmFsID0gTWF0aC5mbG9vcih2YWx1ZSAtIHRoaXMub2Zmc2V0KTtcbiAgdmFyIG1vZCA9IFwiXCI7XG4gIGlmICh2YWwgPCAwKSB7XG4gICAgbW9kID0gdmFsLnRvU3RyaW5nKCk7XG4gICAgdmFsID0gMDtcbiAgfSBlbHNlIGlmICh2YWwgPj0gdGhpcy52YWx1ZXMubGVuZ3RoKSB7XG4gICAgbW9kID0gXCIrXCIgKyAodmFsIC0gdGhpcy52YWx1ZXMubGVuZ3RoICsgMSkudG9TdHJpbmcoKTtcbiAgICB2YWwgPSB0aGlzLnZhbHVlcy5sZW5ndGggLSAxO1xuICB9XG4gIGlmICghdGhpcy51c2VCb251c2VzKSBtb2QgPSBcIlwiO1xuICBpZiAodGhpcy52YWx1ZXNbdmFsXSA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIHJldHVybiB0aGlzLnZhbHVlc1t2YWxdICsgbW9kOyAvLyBUeXBlIGNvZXJjaW9uXG59O1xuXG4vKiBBIHNwZWNpYWxpemF0aW9uIG9mIFdvcmRTY2FsZVF1YWxpdHkgdGhhdCB1c2VzIHRoZSBGVURHRSBSUEcnc1xuICogYWRqZWN0aXZlIHNjYWxlIChmcm9tICd0ZXJyaWJsZScgYXQgLTMgdG8gJ3N1cGVyYicgYXQgKzMpLiBUaGVcbiAqIG9wdGlvbnMgYXJlIGFzIGZvciBXb3JkU2NhbGVRdWFsaXR5LiBJbiBwYXJ0aWN1bGFyIHlvdSBjYW4gdXNlXG4gKiB0aGUgb2Zmc2V0IG9wdGlvbiB0byBjb250cm9sIHdoZXJlIHRoZSBzY2FsZSBzdGFydHMuIFNvIHlvdVxuICogY291bGQgbW9kZWwgYSBxdWFsaXR5IHRoYXQgZXZlcnlvbmUgc3RhcnRzIG9mZiBhcyAndGVycmlibGUnXG4gKiAoc3VjaCBhcyBOdWNsZWFyIFBoeXNpY3MpIHdpdGggYW4gb2Zmc2V0IG9mIDAsIHdoaWxlIGFub3RoZXIgdGhhdFxuICogaXMgbW9yZSBjb21tb24gKHN1Y2ggYXMgSGVhbHRoKSBjb3VsZCBoYXZlIGFuIG9mZnNldCBvZiAtNSBzb1xuICogZXZlcnlvbmUgc3RhcnRzIHdpdGggJ2dyZWF0Jy5cbiAqL1xudmFyIEZ1ZGdlQWRqZWN0aXZlc1F1YWxpdHkgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICBXb3JkU2NhbGVRdWFsaXR5LmNhbGwodGhpcywgdGl0bGUsIFtcbiAgICBcInRlcnJpYmxlXCIubCgpLFxuICAgIFwicG9vclwiLmwoKSxcbiAgICBcIm1lZGlvY3JlXCIubCgpLFxuICAgIFwiZmFpclwiLmwoKSxcbiAgICBcImdvb2RcIi5sKCksXG4gICAgXCJncmVhdFwiLmwoKSxcbiAgICBcInN1cGVyYlwiLmwoKVxuICBdLCBvcHRzKTtcbiAgaWYgKCEoJ29mZnNldCcgaW4gb3B0cykpIHRoaXMub2Zmc2V0ID0gLTM7XG59O1xuRnVkZ2VBZGplY3RpdmVzUXVhbGl0eS5pbmhlcml0cyhXb3JkU2NhbGVRdWFsaXR5KTtcblxuLyogQW4gYm9vbGVhbiBxdWFsaXR5IHRoYXQgcmVtb3ZlcyBpdHNlbGYgZnJvbSB0aGUgcXVhbGl0eSBsaXN0IGlmXG4gKiBpdCBoYXMgYSB6ZXJvIHZhbHVlLiBJZiBpdCBoYXMgYSBub24temVybyB2YWx1ZSwgaXRzIHZhbHVlXG4gKiBmaWVsZCBpcyB1c3VhbGx5IGxlZnQgZW1wdHksIGJ1dCB5b3UgY2FuIHNwZWNpZnkgeW91ciBvd25cbiAqIHN0cmluZyB0byBkaXNwbGF5IGFzIHRoZSBgb25EaXNwbGF5YCBwYXJhbWV0ZXIgb2YgdGhlIG9wdHNcbiAqIG9iamVjdC4gT3RoZXIgb3B0aW9ucyAoaW4gdGhlIG9wdHMgcGFyYW1ldGVyKSBhcmUgdGhlIHNhbWUgYXNcbiAqIGZvciBRdWFsaXR5RGVmaW5pdGlvbi4gKi9cbnZhciBPbk9mZlF1YWxpdHkgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICB2YXIgbXlPcHRzID0gZXh0ZW5kKG9wdHMsIHtcbiAgICBvbkRpc3BsYXk6IFwiXCJcbiAgfSk7XG4gIFF1YWxpdHlEZWZpbml0aW9uLmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xuICB0aGlzLm9uRGlzcGxheSA9IG15T3B0cy5vbkRpc3BsYXk7XG59O1xuT25PZmZRdWFsaXR5LmluaGVyaXRzKFF1YWxpdHlEZWZpbml0aW9uKTtcbk9uT2ZmUXVhbGl0eS5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICBpZiAodmFsdWUpIHJldHVybiB0aGlzLm9uRGlzcGxheTtcbiAgZWxzZSByZXR1cm4gbnVsbDtcbn07XG5cbi8qIEEgYm9vbGVhbiBxdWFsaXR5IHRoYXQgaGFzIGRpZmZlcmVudCBvdXRwdXQgdGV4dCBmb3IgemVybyBvclxuICogbm9uLXplcm8gcXVhbGl0eSB2YWx1ZXMuIFVubGlrZSBPbk9mZlF1YWxpdHksIHRoaXMgZGVmaW5pdGlvblxuICogZG9lc24ndCByZW1vdmUgaXRzZWxmIGZyb20gdGhlIGxpc3Qgd2hlbiBpdCBpcyAwLiBUaGUgb3B0aW9uc1xuICogYXJlIGFzIGZvciBRdWFsaXR5RGVmaW5pdGlvbiwgd2l0aCB0aGUgYWRkaXRpb24gb2Ygb3B0aW9uc1xuICogJ3llc0Rpc3BsYXknIGFuZCAnbm9EaXNwbGF5Jywgd2hpY2ggY29udGFpbiB0aGUgSFRNTCBmcmFnbWVudHNcbiAqIHVzZWQgdG8gZGlzcGxheSB0cnVlIGFuZCBmYWxzZSB2YWx1ZXMuIElmIG5vdCBnaXZlbiwgdGhlc2VcbiAqIGRlZmF1bHQgdG8gJ3llcycgYW5kICdubycuXG4gKi9cbnZhciBZZXNOb1F1YWxpdHkgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICB2YXIgbXlPcHRzID0gZXh0ZW5kKG9wdHMse1xuICAgIHllc0Rpc3BsYXk6IFwieWVzXCIubCgpLFxuICAgIG5vRGlzcGxheTogXCJub1wiLmwoKVxuICB9KTtcbiAgUXVhbGl0eURlZmluaXRpb24uY2FsbCh0aGlzLCB0aXRsZSwgb3B0cyk7XG4gIHRoaXMueWVzRGlzcGxheSA9IG15T3B0cy55ZXNEaXNwbGF5O1xuICB0aGlzLm5vRGlzcGxheSA9IG15T3B0cy5ub0Rpc3BsYXk7XG59O1xuWWVzTm9RdWFsaXR5LmluaGVyaXRzKFF1YWxpdHlEZWZpbml0aW9uKTtcblllc05vUXVhbGl0eS5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICBpZiAodmFsdWUpIHJldHVybiB0aGlzLnllc0Rpc3BsYXk7XG4gIGVsc2UgcmV0dXJuIHRoaXMubm9EaXNwbGF5O1xufTtcblxuLyogRGVmaW5lcyBhIGdyb3VwIG9mIHF1YWxpdGllcyB0aGF0IHNob3VsZCBiZSBkaXNwbGF5ZWQgdG9nZXRoZXIsXG4gKiB1bmRlciB0aGUgZ2l2ZW4gb3B0aW9uYWwgdGl0bGUuIFRoZXNlIHNob3VsZCBiZSBkZWZpbmVkIGluIHRoZVxuICogYHVuZHVtLmdhbWUucXVhbGl0eUdyb3Vwc2AgcGFyYW1ldGVyLiAqL1xudmFyIFF1YWxpdHlHcm91cCA9IGZ1bmN0aW9uKHRpdGxlLCBvcHRzKSB7XG4gIHZhciBteU9wdHMgPSBleHRlbmQob3B0cyx7XG4gICAgcHJpb3JpdHk6IHRpdGxlLFxuICAgIGV4dHJhQ2xhc3NlczogbnVsbFxuICB9KTtcbiAgdGhpcy50aXRsZSA9IHRpdGxlO1xuICB0aGlzLnByaW9yaXR5ID0gbXlPcHRzLnByaW9yaXR5O1xuICB0aGlzLmV4dHJhQ2xhc3NlcyA9IG15T3B0cy5leHRyYUNsYXNzZXM7XG59O1xuIiwiLyogQSBzeXN0ZW0gb2JqZWN0IGlzIHBhc3NlZCBpbnRvIHRoZSBlbnRlciwgYWN0IGFuZCBleGl0XG4gKiBmdW5jdGlvbnMgb2YgZWFjaCBzaXR1YXRpb24uIEl0IGlzIHVzZWQgdG8gaW50ZXJhY3Qgd2l0aCB0aGVcbiAqIFVJLlxuICovXG52YXIgU3lzdGVtID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucm5kID0gbnVsbDtcbiAgdGhpcy50aW1lID0gMDtcbn07XG5cbi8qIFJlbW92ZXMgYWxsIGNvbnRlbnQgZnJvbSB0aGUgcGFnZSwgY2xlYXJpbmcgdGhlIG1haW4gY29udGVudCBhcmVhLlxuICpcbiAqIElmIGFuIGVsZW1lbnRTZWxlY3RvciBpcyBnaXZlbiwgdGhlbiBvbmx5IHRoYXQgc2VsZWN0b3Igd2lsbCBiZVxuICogY2xlYXJlZC4gTm90ZSB0aGF0IGFsbCBjb250ZW50IGZyb20gdGhlIGNsZWFyZWQgZWxlbWVudCBpcyByZW1vdmVkLFxuICogYnV0IHRoZSBlbGVtZW50IGl0c2VsZiByZW1haW5zLCByZWFkeSB0byBiZSBmaWxsZWQgYWdhaW4gdXNpbmdcbiAqIFN5c3RlbS53cml0ZS5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS5jbGVhckNvbnRlbnQgPSBmdW5jdGlvbihlbGVtZW50U2VsZWN0b3IpIHtcbiAgdmFyICRlbGVtZW50O1xuICBpZiAoZWxlbWVudFNlbGVjdG9yKSAkZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZWxlbWVudFNlbGVjdG9yKTtcbiAgaWYgKCEkZWxlbWVudCkgJGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIik7XG4gICRlbGVtZW50LmlubmVySFRNTCA9ICcnO1xufTtcblxuLyogT3V0cHV0cyByZWd1bGFyIGNvbnRlbnQgdG8gdGhlIHBhZ2UuIFRoZSBjb250ZW50IHN1cHBsaWVkIG11c3RcbiAqIGJlIHZhbGlkIFwiRGlzcGxheSBDb250ZW50XCIuXG4gKlxuICogXCJEaXNwbGF5IENvbnRlbnRcIiBpcyBhbnkgSFRNTCBzdHJpbmcgdGhhdCBiZWdpbnMgd2l0aCBhIEhUTUxcbiAqIHN0YXJ0IHRhZywgZW5kcyB3aXRoIGVpdGhlciBhbiBlbmQgb3IgYSBjbG9zZWQgdGFnLCBhbmQgaXMgYVxuICogdmFsaWQgYW5kIHNlbGYtY29udGFpbmVkIHNuaXBwZXQgb2YgSFRNTC4gTm90ZSB0aGF0IHRoZSBzdHJpbmdcbiAqIGRvZXNuJ3QgaGF2ZSB0byBjb25zaXN0IG9mIG9ubHkgb25lIEhUTUwgdGFnLiBZb3UgY291bGQgaGF2ZVxuICogc2V2ZXJhbCBwYXJhZ3JhcGhzLCBmb3IgZXhhbXBsZSwgYXMgbG9uZyBhcyB0aGUgY29udGVudCBzdGFydHNcbiAqIHdpdGggdGhlIDxwPiBvZiB0aGUgZmlyc3QgcGFyYWdyYXBoLCBhbmQgZW5kcyB3aXRoIHRoZSA8L3A+IG9mXG4gKiB0aGUgbGFzdC4gU28gXCI8cD5Gb288L3A+PGltZyBzcmM9J2Jhcic+XCIgaXMgdmFsaWQsIGJ1dCBcImZvbzxpbWdcbiAqIHNyYz0nYmFyJz5cIiBpcyBub3QuXG4gKlxuICogVGhlIGNvbnRlbnQgZ29lcyB0byB0aGUgZW5kIG9mIHRoZSBwYWdlLCB1bmxlc3MgeW91IHN1cHBseSB0aGVcbiAqIG9wdGlvbmFsIHNlbGVjdG9yIGFyZ3VtZW50LiBJZiB5b3UgZG8sIHRoZSBjb250ZW50IGFwcGVhcnNcbiAqIGFmdGVyIHRoZSBlbGVtZW50IHRoYXQgbWF0Y2hlcyB0aGF0IHNlbGVjdG9yLlxuICovXG5TeXN0ZW0ucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY29udGVudCwgZWxlbWVudFNlbGVjdG9yKSB7XG4gIGRvV3JpdGUoY29udGVudCwgZWxlbWVudFNlbGVjdG9yKTtcbn07XG5cbi8qIE91dHB1dHMgdGhlIGdpdmVuIGNvbnRlbnQgaW4gYSBoZWFkaW5nIG9uIHRoZSBwYWdlLiBUaGUgY29udGVudFxuICogc3VwcGxpZWQgbXVzdCBiZSB2YWxpZCBcIkRpc3BsYXkgQ29udGVudFwiLlxuICpcbiAqIFRoZSBjb250ZW50IGdvZXMgdG8gdGhlIGVuZCBvZiB0aGUgcGFnZSwgdW5sZXNzIHlvdSBzdXBwbHkgdGhlXG4gKiBvcHRpb25hbCBzZWxlY3RvciBhcmd1bWVudC4gSWYgeW91IGRvLCB0aGUgY29udGVudCBhcHBlYXJzXG4gKiBhZnRlciB0aGUgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS53cml0ZUhlYWRpbmcgPSBmdW5jdGlvbihoZWFkaW5nQ29udGVudCwgZWxlbWVudFNlbGVjdG9yKSB7XG4gIHZhciBoZWFkaW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIjxoMT5cIik7XG4gIGhlYWRpbmcuaW5uZXJIVE1MID0gaGVhZGluZ0NvbnRlbnQ7XG4gIGRvV3JpdGUoaGVhZGluZywgZWxlbWVudFNlbGVjdG9yKTtcbn07XG5cbi8qIE91dHB1dHMgcmVndWxhciBjb250ZW50IHRvIHRoZSBwYWdlLiBUaGUgY29udGVudCBzdXBwbGllZCBtdXN0XG4gKiBiZSB2YWxpZCBcIkRpc3BsYXkgQ29udGVudFwiLlxuICpcbiAqIFRoZSBjb250ZW50IGdvZXMgdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgcGFnZSwgdW5sZXNzIHlvdVxuICogc3VwcGx5IHRoZSBvcHRpb25hbCBzZWxlY3RvciBhcmd1bWVudC4gSWYgeW91IGRvLCB0aGUgY29udGVudFxuICogYXBwZWFycyBhZnRlciB0aGUgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS53cml0ZUJlZm9yZSA9IGZ1bmN0aW9uKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcikge1xuICBkb1dyaXRlKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3RvciwgJ3ByZXBlbmQnLCAnYmVmb3JlJyk7XG59O1xuXG4vKiBPdXRwdXRzIHJlZ3VsYXIgY29udGVudCB0byB0aGUgcGFnZS4gVGhlIGNvbnRlbnQgc3VwcGxpZWQgbXVzdFxuICogYmUgdmFsaWQgXCJEaXNwbGF5IENvbnRlbnRcIi5cbiAqXG4gKiBXaGVuIGEgc2VsZWN0b3IgaXMgbm90IHNwZWNpZmllZCwgdGhpcyBiZWhhdmVzIGlkZW50aWNhbGx5IHRvXG4gKiBTeXN0ZW0ucHJvdG90eXBlLndyaXRlLiBJZiB5b3Ugc3VwcGx5IGEgc2VsZWN0b3IsIHRoZSBjb250ZW50XG4gKiBhcHBlYXJzIGFzIGEgY2hpbGQgbm9kZSBhdCB0aGUgZW5kIG9mIHRoZSBjb250ZW50IG9mIHRoZVxuICogZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAqL1xuXG5TeXN0ZW0ucHJvdG90eXBlLndyaXRlSW50byA9IGZ1bmN0aW9uKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcikge1xuICBkb1dyaXRlKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3RvciwgJ2FwcGVuZCcsICdhcHBlbmQnKTtcbn07XG5cbi8qIFJlcGxhY2VzIGNvbnRlbnQgd2l0aCB0aGUgY29udGVudCBzdXBwbGllZCwgd2hpY2ggbXVzdCBiZSB2YWxpZFxuICogXCJEaXNwbGF5IENvbnRlbnRcIi5cbiAqXG4gKiBXaGVuIGEgc2VsZWN0b3IgaXMgbm90IHNwZWNpZmllZCwgdGhpcyByZXBsYWNlcyB0aGUgZW50aXJlXG4gKiBjb250ZW50IG9mIHRoZSBwYWdlLiBPdGhlcndpc2UsIGl0IHJlcGxhY2VzIHRoZSBlbGVtZW50IG1hdGNoZWRcbiAqIHdpdGggdGhlIHNlbGVjdG9yLiBUaGlzIHJlcGxhY2VzIHRoZSBlbnRpcmUgZWxlbWVudCwgaW5jbHVkaW5nXG4gKiB0aGUgbWF0Y2hlZCB0YWdzLCBzbyBpZGVhbGx5IHRoZSBjb250ZW50IHN1cHBsaWVkIHNob3VsZCBmaXRcbiAqIGluIGl0cyBwbGFjZSBpbiB0aGUgRE9NIHdpdGggdGhlIHNhbWUga2luZCBvZiBkaXNwbGF5IGVsZW1lbnQuXG4gKi9cblxuU3lzdGVtLnByb3RvdHlwZS5yZXBsYWNlV2l0aCA9IGZ1bmN0aW9uKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcikge1xuICBkb1dyaXRlKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3RvciwgJ3JlcGxhY2VXaXRoJywgJ3JlcGxhY2VXaXRoJyk7XG59O1xuXG4vKiBDYXJyaWVzIG91dCB0aGUgZ2l2ZW4gc2l0dWF0aW9uIGNoYW5nZSBvciBhY3Rpb24sIGFzIGlmIGl0IHdlcmVcbiAqIGluIGEgbGluayB0aGF0IGhhcyBiZWVuIGNsaWNrZWQuIFRoaXMgYWxsb3dzIHlvdSB0byBkb1xuICogcHJvY2VkdXJhbCB0cmFuc2l0aW9ucy4gWW91IG1pZ2h0IGhhdmUgYW4gYWN0aW9uIHRoYXQgYnVpbGRzIHVwXG4gKiB0aGUgY2hhcmFjdGVyJ3Mgc3RyZW5ndGgsIGFuZCBkZXBsZXRlcyB0aGVpciBtYWdpYy4gV2hlbiB0aGVcbiAqIG1hZ2ljIGlzIGFsbCBnb25lLCB5b3UgY2FuIGZvcmNlIGEgc2l0dWF0aW9uIGNoYW5nZSBieSBjYWxsaW5nXG4gKiB0aGlzIG1ldGhvZC4gKi9cblN5c3RlbS5wcm90b3R5cGUuZG9MaW5rID0gZnVuY3Rpb24oY29kZSkge1xuICBwcm9jZXNzTGluayhjb2RlKTtcbn07XG5cbi8qIFR1cm5zIGFueSBsaW5rcyB0aGF0IHRhcmdldCB0aGUgZ2l2ZW4gaHJlZiBpbnRvIHBsYWluXG4gKiB0ZXh0LiBUaGlzIGNhbiBiZSB1c2VkIHRvIHJlbW92ZSBhY3Rpb24gb3B0aW9ucyB3aGVuIGFuIGFjdGlvblxuICogaXMgbm8gbG9uZ2VyIGF2YWlsYWJsZS4gSXQgaXMgdXNlZCBhdXRvbWF0aWNhbGx5IHdoZW4geW91IGdpdmVcbiAqIGEgbGluayB0aGUgJ29uY2UnIGNsYXNzLiAqL1xuU3lzdGVtLnByb3RvdHlwZS5jbGVhckxpbmtzID0gZnVuY3Rpb24oY29kZSkge1xuICB2YXIgbGlua3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYVtocmVmPSdcIiArIGNvZGUgKyBcIiddXCIpO1xuICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGxpbmtzLCBmdW5jdGlvbihlbGVtZW50LCBpbmRleCl7XG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFwic3BhblwiKS5jbGFzc0xpc3QuYWRkKFwiZXhfbGlua1wiKTtcbiAgfSk7XG59O1xuXG4vKiBHaXZlbiBhIGxpc3Qgb2Ygc2l0dWF0aW9uIGlkcywgdGhpcyBvdXRwdXRzIGEgc3RhbmRhcmQgb3B0aW9uXG4gKiBibG9jayB3aXRoIHRoZSBzaXR1YXRpb24gY2hvaWNlcyBpbiB0aGUgZ2l2ZW4gb3JkZXIuXG4gKlxuICogVGhlIGNvbnRlbnRzIG9mIGVhY2ggY2hvaWNlIHdpbGwgYmUgYSBsaW5rIHRvIHRoZSBzaXR1YXRpb24sXG4gKiB0aGUgdGV4dCBvZiB0aGUgbGluayB3aWxsIGJlIGdpdmVuIGJ5IHRoZSBzaXR1YXRpb24nc1xuICogb3V0cHV0VGV4dCBwcm9wZXJ0eS4gTm90ZSB0aGF0IHRoZSBjYW5DaG9vc2UgZnVuY3Rpb24gaXNcbiAqIGNhbGxlZCwgYW5kIGlmIGl0IHJldHVybnMgZmFsc2UsIHRoZW4gdGhlIHRleHQgd2lsbCBhcHBlYXIsIGJ1dFxuICogdGhlIGxpbmsgd2lsbCBub3QgYmUgY2xpY2thYmxlLlxuICpcbiAqIEFsdGhvdWdoIGNhbkNob29zZSBpcyBob25vcmVkLCBjYW5WaWV3IGFuZCBkaXNwbGF5T3JkZXIgYXJlXG4gKiBub3QuIElmIHlvdSBuZWVkIHRvIGhvbm9yIHRoZXNlLCB5b3Ugc2hvdWxkIGVpdGhlciBkbyBzb1xuICogbWFudWFsbHksIG90IGVsc2UgdXNlIHRoZSBgZ2V0U2l0dWF0aW9uSWRDaG9pY2VzYCBtZXRob2QgdG9cbiAqIHJldHVybiBhbiBvcmRlcmVkIGxpc3Qgb2YgdmFsaWQgdmlld2FibGUgc2l0dWF0aW9uIGlkcy5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS53cml0ZUNob2ljZXMgPSBmdW5jdGlvbihsaXN0T2ZJZHMsIGVsZW1lbnRTZWxlY3Rvcikge1xuICBpZiAobGlzdE9mSWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIHZhciBjdXJyZW50U2l0dWF0aW9uID0gZ2V0Q3VycmVudFNpdHVhdGlvbigpO1xuICB2YXIgJG9wdGlvbnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIikucXVlcnlTZWxlY3RvckFsbChcInVsXCIpLmNsYXNzTGlzdC5hZGQoXCJvcHRpb25zXCIpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RPZklkcy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBzaXR1YXRpb25JZCA9IGxpc3RPZklkc1tpXTtcbiAgICB2YXIgc2l0dWF0aW9uID0gZ2FtZS5zaXR1YXRpb25zW3NpdHVhdGlvbklkXTtcbiAgICBhc3NlcnQoc2l0dWF0aW9uLCBcInVua25vd25fc2l0dWF0aW9uXCIubCh7aWQ6c2l0dWF0aW9uSWR9KSk7XG5cbiAgICB2YXIgb3B0aW9uVGV4dCA9IHNpdHVhdGlvbi5vcHRpb25UZXh0KGNoYXJhY3RlciwgdGhpcyxcbiAgICAgICAgY3VycmVudFNpdHVhdGlvbik7XG4gICAgaWYgKCFvcHRpb25UZXh0KSBvcHRpb25UZXh0ID0gXCJjaG9pY2VcIi5sKHtudW1iZXI6aSsxfSk7XG4gICAgdmFyICRvcHRpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIikucXVlcnlTZWxlY3RvckFsbChcImxpXCIpO1xuICAgIHZhciAkYTtcbiAgICBpZiAoc2l0dWF0aW9uLmNhbkNob29zZShjaGFyYWN0ZXIsIHRoaXMsIGN1cnJlbnRTaXR1YXRpb24pKSB7XG4gICAgICAkYSA9IFwiPGEgaHJlZj0nXCIrc2l0dWF0aW9uSWQrXCInPlwiK29wdGlvblRleHQrXCI8L2E+XCJcbiAgICB9IGVsc2Uge1xuICAgICAgJGEgPSBcIjxzcGFuPlwiK29wdGlvblRleHQrXCI8L3NwYW4+XCI7XG4gICAgfVxuICAgICRvcHRpb24uaW5uZXJIVE1MID0gJGE7XG4gICAgJG9wdGlvbnMuYXBwZW5kQ2hpbGQoJG9wdGlvbik7XG4gIH1cbiAgZG9Xcml0ZSgkb3B0aW9ucywgZWxlbWVudFNlbGVjdG9yLCAnYXBwZW5kJywgJ2FmdGVyJyk7XG59O1xuXG4vKiBSZXR1cm5zIGEgbGlzdCBvZiBzaXR1YXRpb24gaWRzIHRvIGNob29zZSBmcm9tLCBnaXZlbiBhIHNldCBvZlxuICogc3BlY2lmaWNhdGlvbnMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBpcyBhIGNvbXBsZXggYW5kIHBvd2VyZnVsIHdheSBvZiBjb21waWxpbmdcbiAqIGltcGxpY2l0IHNpdHVhdGlvbiBjaG9pY2VzLiBZb3UgZ2l2ZSBpdCBhIGxpc3Qgb2Ygc2l0dWF0aW9uIGlkc1xuICogYW5kIHNpdHVhdGlvbiB0YWdzIChpZiBhIHNpbmdsZSBpZCBvciB0YWcgaXMgbmVlZGVkIGp1c3QgdGhhdFxuICogc3RyaW5nIGNhbiBiZSBnaXZlbiwgaXQgZG9lc24ndCBuZWVkIHRvIGJlIHdyYXBwZWQgaW4gYVxuICogbGlzdCkuIFRhZ3Mgc2hvdWxkIGJlIHByZWZpeGVkIHdpdGggYSBoYXNoICMgdG8gZGlmZmVyZW50aWF0ZVxuICogdGhlbSBmcm9tIHNpdHVhdGlvbiBpZHMuIFRoZSBmdW5jdGlvbiB0aGVuIGNvbnNpZGVycyBhbGxcbiAqIG1hdGNoaW5nIHNpdHVhdGlvbnMgaW4gZGVzY2VuZGluZyBwcmlvcml0eSBvcmRlciwgY2FsbGluZyB0aGVpclxuICogY2FuVmlldyBmdW5jdGlvbnMgYW5kIGZpbHRlcmluZyBvdXQgYW55IHRoYXQgc2hvdWxkIG5vdCBiZVxuICogc2hvd24sIGdpdmVuIHRoZSBjdXJyZW50IHN0YXRlLiBXaXRob3V0IGFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICogdGhlIGZ1bmN0aW9uIHJldHVybnMgYSBsaXN0IG9mIHRoZSBzaXR1YXRpb24gaWRzIGF0IHRoZSBoaWdoZXN0XG4gKiBsZXZlbCBvZiBwcmlvcml0eSB0aGF0IGhhcyBhbnkgdmFsaWQgcmVzdWx0cy4gU28sIGZvciBleGFtcGxlLFxuICogaWYgYSB0YWcgI3BsYWNlcyBtYXRjaGVzIHRocmVlIHNpdHVhdGlvbnMsIG9uZSB3aXRoIHByaW9yaXR5IDIsXG4gKiBhbmQgdHdvIHdpdGggcHJpb3JpdHkgMywgYW5kIGFsbCBvZiB0aGVtIGNhbiBiZSB2aWV3ZWQgaW4gdGhlXG4gKiBjdXJyZW50IGNvbnRleHQsIHRoZW4gb25seSB0aGUgdHdvIHdpdGggcHJpb3JpdHkgMyB3aWxsIGJlXG4gKiByZXR1cm5lZC4gVGhpcyBhbGxvd3MgeW91IHRvIGhhdmUgaGlnaC1wcmlvcml0eSBzaXR1YXRpb25zIHRoYXRcbiAqIHRydW1wIGFueSBsb3dlciBzaXR1YXRpb25zIHdoZW4gdGhleSBhcmUgdmFsaWQsIHN1Y2ggYXNcbiAqIHNpdHVhdGlvbnMgdGhhdCBmb3JjZSB0aGUgcGxheWVyIHRvIGdvIHRvIG9uZSBkZXN0aW5hdGlvbiBpZlxuICogdGhlIHBsYXllciBpcyBvdXQgb2YgbW9uZXksIGZvciBleGFtcGxlLlxuICpcbiAqIElmIGEgbWluQ2hvaWNlcyB2YWx1ZSBpcyBnaXZlbiwgdGhlbiB0aGUgZnVuY3Rpb24gd2lsbCBhdHRlbXB0XG4gKiB0byByZXR1cm4gYXQgbGVhc3QgdGhhdCBtYW55IHJlc3VsdHMuIElmIG5vdCBlbm91Z2ggcmVzdWx0cyBhcmVcbiAqIGF2YWlsYWJsZSBhdCB0aGUgaGlnaGVzdCBwcmlvcml0eSwgdGhlbiBsb3dlciBwcmlvcml0aWVzIHdpbGxcbiAqIGJlIGNvbnNpZGVyZWQgaW4gdHVybiwgdW50aWwgZW5vdWdoIHNpdHVhdGlvbnMgYXJlIGZvdW5kLiBJblxuICogdGhlIGV4YW1wbGUgYWJvdmUsIGlmIHdlIGhhZCBhIG1pbkNob2ljZXMgb2YgdGhyZWUsIHRoZW4gYWxsXG4gKiB0aHJlZSBzaXR1YXRpb25zIHdvdWxkIGJlIHJldHVybmVkLCBldmVuIHRob3VnaCB0aGV5IGhhdmVcbiAqIGRpZmZlcmVudCBwcmlvcml0aWVzLiBJZiB5b3UgbmVlZCB0byByZXR1cm4gYWxsIHZhbGlkXG4gKiBzaXR1YXRpb25zLCByZWdhcmRsZXNzIG9mIHRoZWlyIHByaW9yaXRpZXMsIHNldCBtaW5DaG9pY2VzIHRvIGFcbiAqIGxhcmdlIG51bWJlciwgc3VjaCBhcyBgTnVtYmVyLk1BWF9WQUxVRWAsIGFuZCBsZWF2ZSBtYXhDaG9pY2VzXG4gKiB1bmRlZmluZWQuXG4gKlxuICogSWYgYSBtYXhDaG9pY2VzIHZhbHVlIGlzIGdpdmVuLCB0aGVuIHRoZSBmdW5jdGlvbiB3aWxsIG5vdFxuICogcmV0dXJuIGFueSBtb3JlIHRoYW4gdGhlIGdpdmVuIG51bWJlciBvZiByZXN1bHRzLiBJZiB0aGVyZSBhcmVcbiAqIG1vcmUgdGhhbiB0aGlzIG51bWJlciBvZiByZXN1bHRzIHBvc3NpYmxlLCB0aGVuIHRoZSBoaWdoZXN0XG4gKiBwcmlvcml0eSByZXN1bHMgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGJlIHJldHVybmVkLCBidXQgdGhlXG4gKiBsb3dlc3QgcHJpb3JpdHkgZ3JvdXAgd2lsbCBoYXZlIHRvIGZpZ2h0IGl0IG91dCBmb3IgdGhlXG4gKiByZW1haW5pbmcgcGxhY2VzLiBJbiB0aGlzIGNhc2UsIGEgcmFuZG9tIHNhbXBsZSBpcyBjaG9zZW4sXG4gKiB0YWtpbmcgaW50byBhY2NvdW50IHRoZSBmcmVxdWVuY3kgb2YgZWFjaCBzaXR1YXRpb24uIFNvIGFcbiAqIHNpdHVhdGlvbiB3aXRoIGEgZnJlcXVlbmN5IG9mIDEwMCB3aWxsIGJlIGNob3NlbiAxMDAgdGltZXMgbW9yZVxuICogb2Z0ZW4gdGhhbiBhIHNpdHVhdGlvbiB3aXRoIGEgZnJlcXVlbmN5IG9mIDEsIGlmIHRoZXJlIGlzIG9uZVxuICogc3BhY2UgYXZhaWxhYmxlLiBPZnRlbiB0aGVzZSBmcmVxdWVuY2llcyBoYXZlIHRvIGJlIHRha2VuIGFzIGFcbiAqIGd1aWRlbGluZSwgYW5kIHRoZSBhY3R1YWwgcHJvYmFiaWxpdGllcyB3aWxsIG9ubHkgYmVcbiAqIGFwcHJveGltYXRlLiBDb25zaWRlciB0aHJlZSBzaXR1YXRpb25zIHdpdGggZnJlcXVlbmNpZXMgb2YgMSxcbiAqIDEsIDEwMCwgY29tcGV0aW5nIGZvciB0d28gc3BhY2VzLiBUaGUgMTAwLWZyZXF1ZW5jeSBzaXR1YXRpb25cbiAqIHdpbGwgYmUgY2hvc2VuIGFsbW9zdCBldmVyeSB0aW1lLCBidXQgZm9yIHRoZSBvdGhlciBzcGFjZSwgb25lXG4gKiBvZiB0aGUgMS1mcmVxdWVuY3kgc2l0dWF0aW9ucyBtdXN0IGJlIGNob3Nlbi4gU28gdGhlIGFjdHVhbFxuICogcHJvYmFiaWxpdGllcyB3aWxsIGJlIHJvdWdobHkgNTAlLCA1MCUsIDEwMCUuIFdoZW4gc2VsZWN0aW5nXG4gKiBtb3JlIHRoYW4gb25lIHJlc3VsdCwgZnJlcXVlbmNpZXMgY2FuIG9ubHkgYmUgYSBndWlkZS5cbiAqXG4gKiBCZWZvcmUgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGl0cyByZXN1bHQsIGl0IHNvcnRzIHRoZVxuICogc2l0dWF0aW9ucyBpbiBpbmNyZWFzaW5nIG9yZGVyIG9mIHRoZWlyIGRpc3BsYXlPcmRlciB2YWx1ZXMuXG4gKi9cblN5c3RlbS5wcm90b3R5cGUuZ2V0U2l0dWF0aW9uSWRDaG9pY2VzID0gZnVuY3Rpb24obGlzdE9mT3JPbmVJZHNPclRhZ3MsXG4gICAgbWluQ2hvaWNlcywgbWF4Q2hvaWNlcylcbntcbiAgdmFyIGRhdHVtO1xuICB2YXIgaTtcblxuICAvLyBGaXJzdCBjaGVjayBpZiB3ZSBoYXZlIGEgc2luZ2xlIHN0cmluZyBmb3IgdGhlIGlkIG9yIHRhZy5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChsaXN0T2ZPck9uZUlkc09yVGFncykucmVwbGFjZSgvXlxcW29iamVjdCAoLispXFxdJC8sIFwiJDFcIikudG9Mb3dlckNhc2UoKSA9PSAnc3RyaW5nJykge1xuICAgIGxpc3RPZk9yT25lSWRzT3JUYWdzID0gW2xpc3RPZk9yT25lSWRzT3JUYWdzXTtcbiAgfVxuXG4gIC8vIEZpcnN0IHdlIGJ1aWxkIGEgbGlzdCBvZiBhbGwgY2FuZGlkYXRlIGlkcy5cbiAgdmFyIGFsbElkcyA9IHt9O1xuICBmb3IgKGkgPSAwOyBpIDwgbGlzdE9mT3JPbmVJZHNPclRhZ3MubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgdGFnT3JJZCA9IGxpc3RPZk9yT25lSWRzT3JUYWdzW2ldO1xuICAgIGlmICh0YWdPcklkLnN1YnN0cigwLCAxKSA9PSAnIycpIHtcbiAgICAgIHZhciBpZHMgPSBnZXRTaXR1YXRpb25JZHNXaXRoVGFnKHRhZ09ySWQuc3Vic3RyKDEpKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgaWRzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgIGFsbElkc1tpZHNbal1dID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYWxsSWRzW3RhZ09ySWRdID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBGaWx0ZXIgb3V0IGFueXRoaW5nIHRoYXQgY2FuJ3QgYmUgdmlld2VkIHJpZ2h0IG5vdy5cbiAgdmFyIGN1cnJlbnRTaXR1YXRpb24gPSBnZXRDdXJyZW50U2l0dWF0aW9uKCk7XG4gIHZhciB2aWV3YWJsZVNpdHVhdGlvbkRhdGEgPSBbXTtcbiAgZm9yICh2YXIgc2l0dWF0aW9uSWQgaW4gYWxsSWRzKSB7XG4gICAgdmFyIHNpdHVhdGlvbiA9IGdhbWUuc2l0dWF0aW9uc1tzaXR1YXRpb25JZF07XG4gICAgYXNzZXJ0KHNpdHVhdGlvbiwgXCJ1bmtub3duX3NpdHVhdGlvblwiLmwoe2lkOnNpdHVhdGlvbklkfSkpO1xuXG4gICAgaWYgKHNpdHVhdGlvbi5jYW5WaWV3KGNoYXJhY3Rlciwgc3lzdGVtLCBjdXJyZW50U2l0dWF0aW9uKSkge1xuICAgICAgLy8gV2hpbGUgd2UncmUgaGVyZSwgZ2V0IHRoZSBzZWxlY3Rpb24gZGF0YS5cbiAgICAgIHZhciB2aWV3YWJsZVNpdHVhdGlvbkRhdHVtID1cbiAgICAgICAgc2l0dWF0aW9uLmNob2ljZURhdGEoY2hhcmFjdGVyLCBzeXN0ZW0sIGN1cnJlbnRTaXR1YXRpb24pO1xuICAgICAgdmlld2FibGVTaXR1YXRpb25EYXR1bS5pZCA9IHNpdHVhdGlvbklkO1xuICAgICAgdmlld2FibGVTaXR1YXRpb25EYXRhLnB1c2godmlld2FibGVTaXR1YXRpb25EYXR1bSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlbiB3ZSBzb3J0IGluIGRlc2NlbmRpbmcgcHJpb3JpdHkgb3JkZXIuXG4gIHZpZXdhYmxlU2l0dWF0aW9uRGF0YS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbiAgICAgIH0pO1xuXG4gIHZhciBjb21taXR0ZWQgPSBbXTtcbiAgdmFyIGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eSA9IFtdO1xuICB2YXIgbGFzdFByaW9yaXR5O1xuICAvLyBJbiBkZXNjZW5kaW5nIHByaW9yaXR5IG9yZGVyLlxuICBmb3IgKGkgPSAwOyBpIDwgdmlld2FibGVTaXR1YXRpb25EYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgZGF0dW0gPSB2aWV3YWJsZVNpdHVhdGlvbkRhdGFbaV07XG4gICAgaWYgKGRhdHVtLnByaW9yaXR5ICE9IGxhc3RQcmlvcml0eSkge1xuICAgICAgaWYgKGxhc3RQcmlvcml0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFdlJ3ZlIGRyb3BwZWQgYSBwcmlvcml0eSBncm91cCwgc2VlIGlmIHdlIGhhdmUgZW5vdWdoXG4gICAgICAgIC8vIHNpdHVhdGlvbnMgc28gZmFyLCBhbmQgc3RvcCBpZiB3ZSBkby5cbiAgICAgICAgaWYgKG1pbkNob2ljZXMgPT09IHVuZGVmaW5lZCB8fCBpID49IG1pbkNob2ljZXMpIGJyZWFrO1xuICAgICAgfVxuICAgICAgLy8gQ29udGludWUgdG8gYWNjY3VtdWxhdGUgbW9yZSBvcHRpb25zLlxuICAgICAgY29tbWl0dGVkLnB1c2guYXBwbHkoY29tbWl0dGVkLCBjYW5kaWRhdGVzQXRMYXN0UHJpb3JpdHkpO1xuICAgICAgY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5ID0gW107XG4gICAgICBsYXN0UHJpb3JpdHkgPSBkYXR1bS5wcmlvcml0eTtcbiAgICB9XG4gICAgY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5LnB1c2goZGF0dW0pO1xuICB9XG5cbiAgLy8gU28gdGhlIHZhbHVlcyBpbiBjb21taXR0ZWQgd2UncmUgY29tbWl0dGVkIHRvLCBiZWNhdXNlIHdpdGhvdXRcbiAgLy8gdGhlbSB3ZSB3b3VsZG4ndCBoaXQgb3VyIG1pbmltdW0uIEJ1dCB0aG9zZSBpblxuICAvLyBjYW5kaWRhdGVzQXRMYXN0UHJpb3JpdHkgbWlnaHQgdGFrZSB1cyBvdmVyIG91ciBtYXhpbXVtLCBzb1xuICAvLyBmaWd1cmUgb3V0IGhvdyBtYW55IHdlIHNob3VsZCBjaG9vc2UuXG4gIHZhciB0b3RhbENob2ljZXMgPSBjb21taXR0ZWQubGVuZ3RoICsgY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5Lmxlbmd0aDtcbiAgaWYgKG1heENob2ljZXMgPT09IHVuZGVmaW5lZCB8fCBtYXhDaG9pY2VzID49IHRvdGFsQ2hvaWNlcykge1xuICAgIC8vIFdlIGNhbiB1c2UgYWxsIHRoZSBjaG9pY2VzLlxuICAgIGNvbW1pdHRlZC5wdXNoLmFwcGx5KGNvbW1pdHRlZCwgY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5KTtcbiAgfSBlbHNlIGlmIChtYXhDaG9pY2VzID49IGNvbW1pdHRlZC5sZW5ndGgpIHtcbiAgICAvLyBXZSBjYW4gb25seSB1c2UgdGhlIGNvbW1pdGVkIG9uZXMuXG4gICAgLy8gTk8tT1BcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBoYXZlIHRvIHNhbXBsZSB0aGUgY2FuZGlkYXRlcywgdXNpbmcgdGhlaXIgcmVsYXRpdmUgZnJlcXVlbmN5LlxuICAgIHZhciBjYW5kaWRhdGVzVG9JbmNsdWRlID0gbWF4Q2hvaWNlcyAtIGNvbW1pdHRlZC5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eS5sZW5ndGg7ICsraSkge1xuICAgICAgZGF0dW0gPSBjYW5kaWRhdGVzQXRMYXN0UHJpb3JpdHlbaV07XG4gICAgICBkYXR1bS5fZnJlcXVlbmN5VmFsdWUgPSB0aGlzLnJuZC5yYW5kb20oKSAvIGRhdHVtLmZyZXF1ZW5jeTtcbiAgICB9XG4gICAgY2FuZGlkYXRlc1RvSW5jbHVkZS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEuX2ZyZXF1ZW5jeVZhbHVlIC0gYi5fZnJlcXVlbmN5VmFsdWU7XG4gICAgICAgIH0pO1xuICAgIHZhciBjaG9zZW4gPSBjYW5kaWRhdGVzVG9JbmNsdWRlLnNsaWNlKDAsIGNhbmRpZGF0ZXNUb0luY2x1ZGUpO1xuICAgIGNvbW1pdHRlZC5wdXNoLmFwcGx5KGNvbW1pdHRlZCwgY2hvc2VuKTtcbiAgfVxuXG4gIC8vIE5vdyBzb3J0IGluIGFzY2VuZGluZyBkaXNwbGF5IG9yZGVyLlxuICBjb21taXR0ZWQuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYS5kaXNwbGF5T3JkZXIgLSBiLmRpc3BsYXlPcmRlcjtcbiAgICAgIH0pO1xuXG4gIC8vIEFuZCByZXR1cm4gYXMgYSBsaXN0IG9mIGlkcyBvbmx5LlxuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAoaSA9IDA7IGkgPCBjb21taXR0ZWQubGVuZ3RoOyArK2kpIHtcbiAgICByZXN1bHQucHVzaChjb21taXR0ZWRbaV0uaWQpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKiBDYWxsIHRoaXMgdG8gY2hhbmdlIHRoZSBjaGFyYWN0ZXIgdGV4dDogdGhlIHRleHQgaW4gdGhlIHJpZ2h0XG4gKiB0b29sYmFyIGJlZm9yZSB0aGUgcXVhbGl0aWVzIGxpc3QuIFRoaXMgdGV4dCBpcyBkZXNpZ25lZCB0byBiZVxuICogYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB0aGUgY3VycmVudCBzdGF0ZSBvZiB5b3VyIGNoYXJhY3Rlci4gVGhlXG4gKiBjb250ZW50IHlvdSBnaXZlIHNob3VsZCBiZSBcIkRpc3BsYXkgQ29udGVudFwiIChzZWVcbiAqIGBTeXN0ZW0ucHJvdG90eXBlLndyaXRlYCBmb3IgdGhlIGRlZmluaXRpb24pLlxuICovXG5TeXN0ZW0ucHJvdG90eXBlLnNldENoYXJhY3RlclRleHQgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIHZhciBibG9jayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhcmFjdGVyX3RleHRfY29udGVudFwiKTtcbiAgdmFyIG9sZENvbnRlbnQgPSBibG9jay5pbm5lckhUTUw7XG4gIHZhciBuZXdDb250ZW50ID0gYXVnbWVudExpbmtzKGNvbnRlbnQpO1xuICBpZiAoaW50ZXJhY3RpdmUgJiYgYmxvY2sub2Zmc2V0V2lkdGggPiAwICYmIGJsb2NrLm9mZnNldEhlaWdodCA+IDApIHtcbiAgICBoaWRlQmxvY2soYmxvY2spO1xuICAgIGJsb2NrLmlubmVySFRNTCA9IG5ld0NvbnRlbnQ7XG4gICAgc2hvd0Jsb2NrKGJsb2NrKTtcbiAgICBzaG93SGlnaGxpZ2h0KGJsb2NrLnBhcmVudCk7XG4gIH0gZWxzZSB7XG4gICAgYmxvY2suaW5uZXJIVE1MID0gbmV3Q29udGVudDtcbiAgfVxufTtcblxuLyogQ2FsbCB0aGlzIHRvIGNoYW5nZSB0aGUgdmFsdWUgb2YgYSBjaGFyYWN0ZXIgcXVhbGl0eS4gRG9uJ3RcbiAqIGRpcmVjdGx5IGNoYW5nZSBxdWFsaXR5IHZhbHVlcywgYmVjYXVzZSB0aGF0IHdpbGwgbm90IHVwZGF0ZVxuICogdGhlIFVJLiAoWW91IGNhbiBjaGFuZ2UgYW55IGRhdGEgaW4gdGhlIGNoYXJhY3RlcidzIHNhbmRib3hcbiAqIGRpcmVjdGx5LCBob3dldmVyLCBzaW5jZSB0aGF0IGlzbid0IGRpc3BsYXllZCkuICovXG5TeXN0ZW0ucHJvdG90eXBlLnNldFF1YWxpdHkgPSBmdW5jdGlvbihxdWFsaXR5LCBuZXdWYWx1ZSkge1xuICB2YXIgb2xkVmFsdWUgPSBjaGFyYWN0ZXIucXVhbGl0aWVzW3F1YWxpdHldO1xuICBjaGFyYWN0ZXIucXVhbGl0aWVzW3F1YWxpdHldID0gbmV3VmFsdWU7XG4gIGlmICghaW50ZXJhY3RpdmUpIHJldHVybjtcblxuICAvLyBXb3JrIG91dCBob3cgdG8gZGlzcGxheSB0aGUgdmFsdWVzLlxuICB2YXIgbmV3RGlzcGxheTtcbiAgdmFyIHF1YWxpdHlEZWZpbml0aW9uID0gZ2FtZS5xdWFsaXRpZXNbcXVhbGl0eV07XG4gIGlmIChxdWFsaXR5RGVmaW5pdGlvbikge1xuICAgIG5ld0Rpc3BsYXkgPSBxdWFsaXR5RGVmaW5pdGlvbi5mb3JtYXQoY2hhcmFjdGVyLCBuZXdWYWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gV2Ugc2hvdWxkbid0IGRpc3BsYXkgcXVhbGl0aWVzIHRoYXQgaGF2ZSBubyBkZWZpbml0aW9uLlxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEFkZCB0aGUgZGF0YSBibG9jaywgaWYgd2UgbmVlZCBpdC5cbiAgdmFyIHF1YWxpdHlCbG9jayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiI3FfXCIrcXVhbGl0eSk7XG4gIGlmIChxdWFsaXR5QmxvY2subGVuZ3RoIDw9IDApIHtcbiAgICBpZiAobmV3RGlzcGxheSA9PT0gbnVsbCkgcmV0dXJuO1xuICAgIHF1YWxpdHlCbG9jayA9IGFkZFF1YWxpdHlCbG9jayhxdWFsaXR5KS5oaWRlKCkuZmFkZUluKDUwMCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gRG8gbm90aGluZyBpZiB0aGVyZSdzIG5vdGhpbmcgdG8gZG8uXG4gICAgaWYgKG9sZFZhbHVlID09IG5ld1ZhbHVlKSByZXR1cm47XG5cbiAgICAvLyBDaGFuZ2UgdGhlIHZhbHVlLlxuICAgIGlmIChuZXdEaXNwbGF5ID09PSBudWxsKSB7XG4gICAgICAvLyBSZW1vdmUgdGhlIGJsb2NrLCBhbmQgcG9zc2libHkgdGhlIHdob2xlIGdyb3VwLCBpZlxuICAgICAgLy8gaXQgaXMgdGhlIGxhc3QgcXVhbGl0eSBpbiB0aGUgZ3JvdXAuXG4gICAgICB2YXIgdG9SZW1vdmUgPSBudWxsO1xuICAgICAgdmFyIGdyb3VwQmxvY2sgPSBxdWFsaXR5QmxvY2sucGFyZW50cygnLnF1YWxpdHlfZ3JvdXAnKTtcbiAgICAgIGlmIChncm91cEJsb2NrLmZpbmQoJy5xdWFsaXR5JykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgdG9SZW1vdmUgPSBncm91cEJsb2NrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9SZW1vdmUgPSBxdWFsaXR5QmxvY2s7XG4gICAgICB9XG5cbiAgICAgIHRvUmVtb3ZlLmZhZGVPdXQoMTAwMCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdG9SZW1vdmUucmVtb3ZlKCk7XG4gICAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB2YWxCbG9jayA9IHF1YWxpdHlCbG9jay5maW5kKFwiW2RhdGEtYXR0cj0ndmFsdWUnXVwiKTtcbiAgICAgIHZhbEJsb2NrLmZhZGVPdXQoMjUwLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YWxCbG9jay5odG1sKG5ld0Rpc3BsYXkpO1xuICAgICAgICAgIHZhbEJsb2NrLmZhZGVJbig3NTApO1xuICAgICAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBzaG93SGlnaGxpZ2h0KHF1YWxpdHlCbG9jayk7XG59O1xuXG4vKiBDaGFuZ2VzIGEgcXVhbGl0eSB0byBhIG5ldyB2YWx1ZSwgYnV0IGFsc28gc2hvdWxkIHNob3cgYSBwcm9ncmVzcyBiYXJcbiAqIGFuaW1hdGlvbiBvZiB0aGUgY2hhbmdlLiBSZW1vdmVkIHdpdGggdGhlIHByb2dyZXNzIGJhciBmdW5jdGlvbmFsaXR5LiAqL1xuU3lzdGVtLnByb3RvdHlwZS5hbmltYXRlUXVhbGl0eSA9IGZ1bmN0aW9uKHF1YWxpdHksIG5ld1ZhbHVlLCBvcHRzKSB7XG4gIHRoaXMuc2V0UXVhbGl0eShxdWFsaXR5LCBuZXdWYWx1ZSk7XG59O1xuXG4vKiBUaGUgY2hhcmFjdGVyIHRoYXQgaXMgcGFzc2VkIGludG8gZWFjaCBzaXR1YXRpb24gaXMgb2YgdGhpc1xuICogZm9ybS5cbiAqXG4gKiBUaGUgYHF1YWxpdGllc2AgZGF0YSBtZW1iZXIgbWFwcyB0aGUgSWRzIG9mIGVhY2ggcXVhbGl0eSB0byBpdHNcbiAqIGN1cnJlbnQgdmFsdWUuIFdoZW4gaW1wbGVtZW50aW5nIGVudGVyLCBhY3Qgb3IgZXhpdCBmdW5jdGlvbnMsXG4gKiB5b3Ugc2hvdWxkIGNvbnNpZGVyIHRoaXMgdG8gYmUgcmVhZC1vbmx5LiBNYWtlIGFsbFxuICogbW9kaWZpY2F0aW9ucyB0aHJvdWdoIGBTeXN0ZW0ucHJvdG90eXBlLnNldFF1YWxpdHlgLCBvclxuICogYFN5c3RlbS5wcm90b3R5cGUuYW5pbWF0ZVF1YWxpdHlgLiBJbiB5b3VyIGBpbml0YCBmdW5jdGlvbiwgeW91XG4gKiBjYW4gc2V0IHRoZXNlIHZhbHVlcyBkaXJlY3RseS5cbiAqXG4gKiBUaGUgYHNhbmRib3hgIGRhdGEgbWVtYmVyIGlzIGRlc2lnbmVkIHRvIGFsbG93IHlvdXIgY29kZSB0b1xuICogdHJhY2sgYW55IGRhdGEgaXQgbmVlZHMgdG8uIFRoZSBvbmx5IHByb3Zpc28gaXMgdGhhdCB0aGUgZGF0YVxuICogc3RydWN0dXJlIHNob3VsZCBiZSBzZXJpYWxpemFibGUgaW50byBKU09OICh0aGlzIG1lYW5zIGl0IG11c3RcbiAqIG9ubHkgY29uc2lzdCBvZiBwcmltaXRpdmUgdHlwZXMgW29iamVjdHMsIGFycmF5cywgbnVtYmVycyxcbiAqIGJvb2xlYW5zLCBzdHJpbmdzXSwgYW5kIGl0IG11c3Qgbm90IGNvbnRhaW4gY2lyY3VsYXIgc2VyaWVzIG9mXG4gKiByZWZlcmVuY2VzKS4gVGhlIGRhdGEgaW4gdGhlIHNhbmRib3ggaXMgbm90IGRpc3BsYXllZCBpbiB0aGVcbiAqIFVJLCBhbHRob3VnaCB5b3UgYXJlIGZyZWUgdG8gdXNlIGl0IHRvIGNyZWF0ZSBzdWl0YWJsZSBvdXRwdXRcbiAqIGZvciB0aGUgcGxheWVyLi5cbiAqL1xudmFyIENoYXJhY3RlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnF1YWxpdGllcyA9IHt9O1xuICB0aGlzLnNhbmRib3ggPSB7fTtcbn07XG5cbi8qIFRoZSBkYXRhIHN0cnVjdHVyZSBob2xkaW5nIHRoZSBjb250ZW50IGZvciB0aGUgZ2FtZS4gQnkgZGVmYXVsdFxuICogdGhpcyBob2xkcyBub3RoaW5nLiBJdCBpcyB0aGlzIGRhdGEgc3RydWN0dXJlIHRoYXQgaXMgcG9wdWxhdGVkXG4gKiBpbiB0aGUgYC5nYW1lLmpzYCBmaWxlLiBFYWNoIGVsZW1lbnQgaW4gdGhlIHN0cnVjdHVyZSBpc1xuICogY29tbWVudGVkLCBiZWxvdy5cbiAqXG4gKiBUaGlzIHNob3VsZCBiZSBzdGF0aWMgZGF0YSB0aGF0IG5ldmVyIGNoYW5nZXMgdGhyb3VnaCB0aGVcbiAqIGNvdXJzZSBvZiB0aGUgZ2FtZS4gSXQgaXMgbmV2ZXIgc2F2ZWQsIHNvIGFueXRoaW5nIHRoYXQgbWlnaHRcbiAqIGNoYW5nZSBzaG91bGQgYmUgc3RvcmVkIGluIHRoZSBjaGFyYWN0ZXIuXG4gKi9cbnZhciBnYW1lID0ge1xuXG4gIC8vIFNpdHVhdGlvbnNcblxuICAvKiBBbiBvYmplY3QgbWFwcGluZyBmcm9tIHRoZSB1bmlxdWUgaWQgb2YgZWFjaCBzaXR1YXRpb24sIHRvXG4gICAqIHRoZSBzaXR1YXRpb24gb2JqZWN0IGl0c2VsZi4gVGhpcyBpcyB0aGUgaGVhcnQgb2YgdGhlIGdhbWVcbiAgICogc3BlY2lmaWNhdGlvbi4gKi9cbiAgc2l0dWF0aW9uczoge30sXG5cbiAgLyogVGhlIHVuaXF1ZSBpZCBvZiB0aGUgc2l0dWF0aW9uIHRvIGVudGVyIGF0IHRoZSBzdGFydCBvZiBhXG4gICAqIG5ldyBnYW1lLiAqL1xuICBzdGFydDogXCJzdGFydFwiLFxuXG4gIC8vIFF1YWxpdHkgZGlzcGxheSBkZWZpbml0aW9uc1xuXG4gIC8qIEFuIG9iamVjdCBtYXBwaW5nIHRoZSB1bmlxdWUgaWQgb2YgZWFjaCBxdWFsaXR5IHRvIGl0c1xuICAgKiBRdWFsaXR5RGVmaW5pdGlvbi4gWW91IGRvbid0IG5lZWQgZGVmaW5pdGlvbnMgZm9yIGV2ZXJ5XG4gICAqIHF1YWxpdHksIGJ1dCBvbmx5IHF1YWxpdGllcyBpbiB0aGlzIG1hcHBpbmcgd2lsbCBiZVxuICAgKiBkaXNwbGF5ZWQgaW4gdGhlIGNoYXJhY3RlciBib3ggb2YgdGhlIFVJLiAqL1xuICBxdWFsaXRpZXM6IHt9LFxuXG4gIC8qIFF1YWxpdGllcyBjYW4gaGF2ZSBhbiBvcHRpb25hbCBncm91cCBJZC4gVGhpcyBtYXBzIHRob3NlXG4gICAqIElkcyB0byB0aGUgZ3JvdXAgZGVmaW5pdGlvbnMgdGhhdCBzYXlzIGhvdyB0byBmb3JtYXQgaXRzXG4gICAqIHF1YWxpdGllcy5cbiAgICovXG4gIHF1YWxpdHlHcm91cHM6IHt9LFxuXG4gIC8vIEhvb2tzXG5cbiAgLyogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYXQgdGhlIHN0YXJ0IG9mIHRoZSBnYW1lLiBJdCBpc1xuICAgKiBub3JtYWxseSBvdmVycmlkZGVuIHRvIHByb3ZpZGUgaW5pdGlhbCBjaGFyYWN0ZXIgY3JlYXRpb25cbiAgICogKHNldHRpbmcgaW5pdGlhbCBxdWFsaXR5IHZhbHVlcywgc2V0dGluZyB0aGVcbiAgICogY2hhcmFjdGVyLXRleHQuIFRoaXMgaXMgb3B0aW9uYWwsIGhvd2V2ZXIsIGFzIHNldC11cFxuICAgKiBwcm9jZXNzaW5nIGNvdWxkIGFsc28gYmUgZG9uZSBieSB0aGUgZmlyc3Qgc2l0dWF0aW9uJ3NcbiAgICogZW50ZXIgZnVuY3Rpb24uIElmIHRoaXMgZnVuY3Rpb24gaXMgZ2l2ZW4gaXQgc2hvdWxkIGhhdmVcbiAgICogdGhlIHNpZ25hdHVyZSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSkuXG4gICAqL1xuICBpbml0OiBudWxsLFxuXG4gIC8qIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGJlZm9yZSBlbnRlcmluZyBhbnkgbmV3XG4gICAqIHNpdHVhdGlvbi4gSXQgaXMgY2FsbGVkIGJlZm9yZSB0aGUgY29ycmVzcG9uZGluZyBzaXR1YXRpb25cbiAgICogaGFzIGl0cyBgZW50ZXJgIG1ldGhvZCBjYWxsZWQuIEl0IGNhbiBiZSB1c2VkIHRvIGltcGxlbWVudFxuICAgKiB0aW1lZCB0cmlnZ2VycywgYnV0IGlzIHRvdGFsbHkgb3B0aW9uYWwuIElmIHRoaXMgZnVuY3Rpb25cbiAgICogaXMgZ2l2ZW4gaXQgc2hvdWxkIGhhdmUgdGhlIHNpZ25hdHVyZTpcbiAgICpcbiAgICogZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIG9sZFNpdHVhdGlvbklkLCBuZXdTaXR1YXRpb25JZCk7XG4gICAqL1xuICBlbnRlcjogbnVsbCxcblxuICAvKiBIb29rIGZvciB3aGVuIHRoZSBzaXR1YXRpb24gaGFzIGFscmVhZHkgYmVlbiBjYXJyaWVkIG91dFxuICAgKiBhbmQgcHJpbnRlZC4gVGhlIHNpZ25hdHVyZSBpczpcbiAgICpcbiAgICogZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIG9sZFNpdHVhdGlvbklkLCBuZXdTaXR1YXRpb25JZCk7XG4gICAqL1xuICBhZnRlckVudGVyOiBudWxsLFxuXG4gIC8qIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGJlZm9yZSBjYXJyeWluZyBvdXQgYW55IGFjdGlvbiBpblxuICAgKiBhbnkgc2l0dWF0aW9uLiBJdCBpcyBjYWxsZWQgYmVmb3JlIHRoZSBjb3JyZXNwb25kaW5nXG4gICAqIHNpdHVhdGlvbiBoYXMgaXRzIGBhY3RgIG1ldGhvZCBjYWxsZWQuIElmIHRoaXMgb3B0aW9uYWxcbiAgICogZnVuY3Rpb24gaXMgZ2l2ZW4gaXQgc2hvdWxkIGhhdmUgdGhlIHNpZ25hdHVyZTpcbiAgICpcbiAgICogZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbklkLCBhY3Rpb25JZCk7XG4gICAqXG4gICAqIElmIHRoZSBmdW5jdGlvbiByZXR1cm5zIHRydWUsIHRoZW4gaXQgaXMgaW5kaWNhdGluZyB0aGF0IGl0XG4gICAqIGhhcyBjb25zdW1lZCB0aGUgYWN0aW9uLCBhbmQgdGhlIGFjdGlvbiB3aWxsIG5vdCBiZSBwYXNzZWRcbiAgICogb24gdG8gdGhlIHNpdHVhdGlvbi4gTm90ZSB0aGF0IHRoaXMgaXMgdGhlIG9ubHkgb25lIG9mXG4gICAqIHRoZXNlIGdsb2JhbCBoYW5kbGVycyB0aGF0IGNhbiBjb25zdW1lIHRoZSBldmVudC5cbiAgICovXG4gIGJlZm9yZUFjdGlvbjogbnVsbCxcblxuICAvKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBhZnRlciBjYXJyeWluZyBvdXQgYW55IGFjdGlvbiBpblxuICAgKiBhbnkgc2l0dWF0aW9uLiBJdCBpcyBjYWxsZWQgYWZ0ZXIgdGhlIGNvcnJlc3BvbmRpbmdcbiAgICogc2l0dWF0aW9uIGhhcyBpdHMgYGFjdGAgbWV0aG9kIGNhbGxlZC4gSWYgdGhpcyBvcHRpb25hbFxuICAgKiBmdW5jdGlvbiBpcyBnaXZlbiBpdCBzaG91bGQgaGF2ZSB0aGUgc2lnbmF0dXJlOlxuICAgKlxuICAgKiBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0dWF0aW9uSWQsIGFjdGlvbklkKTtcbiAgICovXG4gIGFmdGVyQWN0aW9uOiBudWxsLFxuXG4gIC8qIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGFmdGVyIGxlYXZpbmcgYW55IHNpdHVhdGlvbi4gSXQgaXNcbiAgICogY2FsbGVkIGFmdGVyIHRoZSBjb3JyZXNwb25kaW5nIHNpdHVhdGlvbiBoYXMgaXRzIGBleGl0YFxuICAgKiBtZXRob2QgY2FsbGVkLiBJZiB0aGlzIG9wdGlvbmFsIGZ1bmN0aW9uIGlzIGdpdmVuIGl0IHNob3VsZFxuICAgKiBoYXZlIHRoZSBzaWduYXR1cmU6XG4gICAqXG4gICAqIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICAgKi9cbiAgZXhpdDogbnVsbFxufTtcbiIsIi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIENvZGUgYmVsb3cgZG9lc24ndCBmb3JtIHBhcnQgb2YgdGhlIHB1YmxpYyBBUEkgZm9yIFVORFVNLCBzb1xuLy8geW91IHNob3VsZG4ndCBmaW5kIHlvdSBuZWVkIHRvIHVzZSBpdC5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEludGVybmFsIERhdGFcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qIFRoZSBnbG9iYWwgc3lzdGVtIG9iamVjdC4gKi9cbnZhciBzeXN0ZW0gPSBuZXcgU3lzdGVtKCk7XG5cbi8qIFRoaXMgaXMgdGhlIGRhdGEgb24gdGhlIHBsYXllcidzIHByb2dyZXNzIHRoYXQgZ2V0cyBzYXZlZC4gKi9cbnZhciBwcm9ncmVzcyA9IHtcbiAgLy8gQSByYW5kb20gc2VlZCBzdHJpbmcsIHVzZWQgaW50ZXJuYWxseSB0byBtYWtlIHJhbmRvbVxuICAvLyBzZXF1ZW5jZXMgcHJlZGljdGFibGUuXG5zZWVkOiBudWxsLFxuICAgICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGxpbmtzIGNsaWNrZWQsIGFuZCB3aGVuLlxuICAgICAgc2VxdWVuY2U6IFtdLFxuICAgICAgLy8gVGhlIHRpbWUgd2hlbiB0aGUgcHJvZ3Jlc3Mgd2FzIHNhdmVkLlxuICAgICAgc2F2ZVRpbWU6IG51bGxcbn07XG5cbi8qIFRoZSBJZCBvZiB0aGUgY3VycmVudCBzaXR1YXRpb24gdGhlIHBsYXllciBpcyBpbi4gKi9cbnZhciBjdXJyZW50ID0gbnVsbDtcblxuLyogVGhpcyBpcyB0aGUgY3VycmVudCBjaGFyYWN0ZXIuIEl0IHNob3VsZCBiZSByZWNvbnN0cnVjdGFibGVcbiAqIGZyb20gdGhlIGFib3ZlIHByb2dyZXNzIGRhdGEuICovXG52YXIgY2hhcmFjdGVyID0gbnVsbDtcblxuLyogVHJhY2tzIHdoZXRoZXIgd2UncmUgaW4gaW50ZXJhY3RpdmUgbW9kZSBvciBiYXRjaCBtb2RlLiAqL1xudmFyIGludGVyYWN0aXZlID0gdHJ1ZTtcblxuLyogVGhlIHN5c3RlbSB0aW1lIHdoZW4gdGhlIGdhbWUgd2FzIGluaXRpYWxpemVkLiAqL1xudmFyIHN0YXJ0VGltZTtcblxuLyogVGhlIHN0YWNrIG9mIGxpbmtzLCByZXN1bHRpbmcgZnJvbSB0aGUgbGFzdCBhY3Rpb24sIHN0aWxsIGJlIHRvXG4gKiByZXNvbHZlZC4gKi9cbnZhciBsaW5rU3RhY2sgPSBudWxsO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVXRpbGl0eSBGdW5jdGlvbnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBnZXRDdXJyZW50U2l0dWF0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmIChjdXJyZW50KSB7XG4gICAgcmV0dXJuIGdhbWUuc2l0dWF0aW9uc1tjdXJyZW50XTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxudmFyIHBhcnNlID0gZnVuY3Rpb24oc3RyKSB7XG4gIGlmIChzdHIgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBzdHI7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQoc3RyKTtcbiAgfVxufTtcblxudmFyIHBhcnNlTGlzdCA9IGZ1bmN0aW9uKHN0ciwgY2FuQmVVbmRlZmluZWQpIHtcbiAgaWYgKHN0ciA9PT0gdW5kZWZpbmVkIHx8IHN0ciA9PT0gbnVsbCkge1xuICAgIGlmIChjYW5CZVVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyLnNwbGl0KC9bICxcXHRdKy8pO1xuICB9XG59O1xuXG52YXIgcGFyc2VGbiA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAoc3RyID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9IGVsc2Uge1xuICAgIHZhciBmc3RyID0gXCIoZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikge1xcblwiICtcbiAgICAgIHN0ciArIFwiXFxufSlcIjtcbiAgICB2YXIgZm4gPSBldmFsKGZzdHIpO1xuICAgIHJldHVybiBmbjtcbiAgfVxufTtcblxudmFyIGxvYWRIVE1MU2l0dWF0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgJGh0bWxTaXR1YXRpb25zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImRpdi5zaXR1YXRpb25cIik7XG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoJGh0bWxTaXR1YXRpb25zLCBmdW5jdGlvbigkc2l0dWF0aW9uKXtcbiAgICB2YXIgaWQgPSAkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImlkXCIpO1xuICAgIGFzc2VydChnYW1lLnNpdHVhdGlvbnNbaWRdID09PSB1bmRlZmluZWQsIFwiZXhpc3Rpbmdfc2l0dWF0aW9uXCIubCh7aWQ6aWR9KSk7XG5cbiAgICB2YXIgY29udGVudCA9ICRzaXR1YXRpb24uaW5uZXJIVE1MO1xuICAgIHZhciBvcHRzID0ge1xuICAgICAgLy8gU2l0dWF0aW9uIGNvbnRlbnRcbiAgICAgIG9wdGlvblRleHQ6ICRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1vcHRpb24tdGV4dFwiKSxcbiAgICAgIGNhblZpZXc6IHBhcnNlRm4oJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNhbi12aWV3XCIpKSxcbiAgICAgIGNhbkNob29zZTogcGFyc2VGbigkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtY2FuLWNob29zZVwiKSksXG4gICAgICBwcmlvcml0eTogcGFyc2UoJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLXByaW9yaXR5XCIpKSxcbiAgICAgIGZyZXF1ZW5jeTogcGFyc2UoJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLWZyZXF1ZW5jeVwiKSksXG4gICAgICBkaXNwbGF5T3JkZXI6IHBhcnNlKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1kaXNwbGF5LW9yZGVyXCIpKSxcbiAgICAgIHRhZ3M6IHBhcnNlTGlzdCgkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtdGFnc1wiKSwgZmFsc2UpLFxuICAgICAgLy8gU2ltcGxlIFNpdHVhdGlvbiBjb250ZW50LlxuICAgICAgaGVhZGluZzogJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLWhlYWRpbmdcIiksXG4gICAgICBjaG9pY2VzOiBwYXJzZUxpc3QoJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNob2ljZXNcIiksIHRydWUpLFxuICAgICAgbWluQ2hvaWNlczogcGFyc2UoJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLW1pbi1jaG9pY2VzXCIpKSxcbiAgICAgIG1heENob2ljZXM6IHBhcnNlKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1tYXgtY2hvaWNlc1wiKSlcbiAgICB9O1xuXG4gICAgZ2FtZS5zaXR1YXRpb25zW2lkXSA9IG5ldyBTaW1wbGVTaXR1YXRpb24oY29udGVudCwgb3B0cyk7XG4gIH0pO1xufTtcblxuXG4vKiBPdXRwdXRzIHJlZ3VsYXIgY29udGVudCB0byB0aGUgcGFnZS4gVXNlZCBieSB3cml0ZSBhbmRcbiAqIHdyaXRlQmVmb3JlLCB0aGUgbGFzdCB0d28gYXJndW1lbnRzIGNvbnRyb2wgd2hhdCBqUXVlcnkgbWV0aG9kc1xuICogYXJlIHVzZWQgdG8gYWRkIHRoZSBjb250ZW50LlxuICovXG4vLyBUT0RPOiB0aGlzIGZ1bmN0aW9uIGNhbiBhcHBlbmQgdGV4dCwgcHJlcGVuZCB0ZXh0IG9yIHJlcGxhY2UgdGV4dCBpbiBzZWxlY3RvciB3aXRoIHRoZSBzdXBwbGllZCBvbmUuXG52YXIgZG9Xcml0ZSA9IGZ1bmN0aW9uKGNvbnRlbnQsIHNlbGVjdG9yKSB7XG4gIGNvbnRpbnVlT3V0cHV0VHJhbnNhY3Rpb24oKTtcbiAgdmFyIG91dHB1dCA9IGF1Z21lbnRMaW5rcyhjb250ZW50KTtcbiAgdmFyIGVsZW1lbnQ7XG4gIGlmIChzZWxlY3RvcikgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBpZiAoZWxlbWVudCkge1xuICAgIC8vIFRPRE86IHNjcm9sbCB0byB0aGUgbGFzdCBwb3NpdGlvblxuICAgIGRpbWVuc2lvbnMgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnNvbGUubG9nKGRpbWVuc2lvbnMpO1xuICAgIHdpbmRvdy5zY3JvbGwoMCwxNTApO1xuICAgIC8vIFRPRE86IHNjcm9sbFN0YWNrW3Njcm9sbFN0YWNrLmxlbmd0aC0xXSA9IHNjcm9sbFBvaW50OyovXG4gIH1cbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRlbnQnKS5pbm5lckhUTUwgPSBvdXRwdXQ7XG4gIH1cbiAgZWxzZSB7XG4gICAgZWxlbWVudC5hcHBlbmRDaGlsZChvdXRwdXQpO1xuICB9XG4gIC8qIFdlIHdhbnQgdG8gc2Nyb2xsIHRoaXMgbmV3IGVsZW1lbnQgdG8gdGhlIGJvdHRvbSBvZiB0aGUgc2NyZWVuLlxuICAgKiB3aGlsZSBzdGlsbCBiZWluZyB2aXNpYmxlLiBUaGUgZWFzaWVzdCB3YXkgaXMgdG8gZmluZCB0aGVcbiAgICogdG9wIGVkZ2Ugb2YgdGhlICpmb2xsb3dpbmcqIGVsZW1lbnQgYW5kIG1vdmUgdGhhdCBleGFjdGx5XG4gICAqIHRvIHRoZSBib3R0b20gKHdoaWxlIHN0aWxsIGVuc3VyaW5nIHRoYXQgdGhpcyBlbGVtZW50IGlzIGZ1bGx5XG4gICAqIHZpc2libGUuKSAqL1xuICAvKnZhciBuZXh0ZWwgPSBvdXRwdXQubGFzdCgpLm5leHQoKTtcbiAgICB2YXIgc2Nyb2xsUG9pbnQ7XG4gICAgaWYgKCFuZXh0ZWwubGVuZ3RoKSB7XG4gICAgc2Nyb2xsUG9pbnQgPSAkKFwiI2NvbnRlbnRcIikuaGVpZ2h0KCkgKyAkKFwiI3RpdGxlXCIpLmhlaWdodCgpICsgNjA7XG4gICAgfSBlbHNlIHtcbiAgICBzY3JvbGxQb2ludCA9IG5leHRlbC5vZmZzZXQoKS50b3AgLSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICAgfVxuICAgIGlmIChzY3JvbGxQb2ludCA+IG91dHB1dC5vZmZzZXQoKS50b3ApXG4gICAgc2Nyb2xsUG9pbnQgPSBvdXRwdXQub2Zmc2V0KCkudG9wO1xuICAgIHNjcm9sbFN0YWNrW3Njcm9sbFN0YWNrLmxlbmd0aC0xXSA9IHNjcm9sbFBvaW50OyovXG59O1xuXG4vKiBHZXRzIHRoZSB1bmlxdWUgaWQgdXNlZCB0byBpZGVudGlmeSBzYXZlZCBnYW1lcy4gKi9cbnZhciBnZXRTYXZlSWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICd1bmR1bV8nK2dhbWUuaWQrXCJfXCIrZ2FtZS52ZXJzaW9uO1xufTtcblxuLyogQWRkcyB0aGUgcXVhbGl0eSBibG9ja3MgdG8gdGhlIGNoYXJhY3RlciB0b29scy4gKi9cbnZhciBzaG93UXVhbGl0aWVzID0gZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicXVhbGl0aWVzXCIpLmlubmVySFRNTCA9ICcnO1xuICBmb3IgKHZhciBxdWFsaXR5SWQgaW4gY2hhcmFjdGVyLnF1YWxpdGllcykge1xuICAgIGFkZFF1YWxpdHlCbG9jayhxdWFsaXR5SWQpO1xuICB9XG59O1xuXG4vKiBGYWRlcyBpbiBhbmQgb3V0IGEgaGlnaGxpZ2h0IG9uIHRoZSBnaXZlbiBlbGVtZW50LiAqL1xudmFyIHNob3dIaWdobGlnaHQgPSBmdW5jdGlvbihkb21FbGVtZW50KSB7XG4gIHZhciBoaWdobGlnaHQgPSBkb21FbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuaGlnaGxpZ2h0XCIpO1xuICBpZiAoaGlnaGxpZ2h0Lmxlbmd0aCA8PSAwKSB7XG4gICAgaGlnaGxpZ2h0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIjxkaXY+PC9kaXY+XCIpLmNsYXNzTGlzdC5hZGQoJ2hpZ2hsaWdodCcpO1xuICAgIGRvbUVsZW1lbnQuYXBwZW5kQ2hpbGQoaGlnaGxpZ2h0KTtcbiAgfVxuICBzaG93QmxvY2soaGlnaGxpZ2h0KTtcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBoaWRlQmxvY2soaGlnaGxpZ2h0KTtcbiAgfSwgMjAwMCk7XG59O1xuXG4vKiBGaW5kcyB0aGUgY29ycmVjdCBsb2NhdGlvbiBhbmQgaW5zZXJ0cyBhIHBhcnRpY3VsYXIgRE9NIGVsZW1lbnRcbiAqIGZpdHMgaW50byBhbiBleGlzdGluZyBsaXN0IG9mIERPTSBlbGVtZW50cy4gVGhpcyBpcyBkb25lIGJ5XG4gKiBwcmlvcml0eSBvcmRlciwgc28gYWxsIGVsZW1lbnRzIChleGlzdGluZyBhbmQgbmV3KSBtdXN0IGhhdmVcbiAqIHRoZWlyIGRhdGEtcHJpb3JpdHkgYXR0cmlidXRlIHNldC4gKi9cbnZhciBpbnNlcnRBdENvcnJlY3RQb3NpdGlvbiA9IGZ1bmN0aW9uKHBhcmVudCwgbmV3SXRlbSkge1xuICB2YXIgbmV3UHJpb3JpdHkgPSBuZXdJdGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1wcmlvcml0eScpO1xuICB2YXIgX2NoaWxkcmVuID0gcGFyZW50LmNoaWxkcmVuO1xuICBpZiAoX2NoaWxkcmVuICE9IHVuZGVmaW5lZClcbiAge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgX2NoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY2hpbGQgPSBfY2hpbGRyZW5baV07XG4gICAgICBpZiAobmV3UHJpb3JpdHkgPCBjaGlsZC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcHJpb3JpdHknKSkge1xuICAgICAgICBjaGlsZC5iZWZvcmUobmV3SXRlbSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld0l0ZW0pO1xuICB9XG59O1xuXG4vKiBBZGRzIGEgbmV3IGdyb3VwIHRvIHRoZSBjb3JyZWN0IGxvY2F0aW9uIGluIHRoZSBxdWFsaXR5IGxpc3QuICovXG52YXIgYWRkR3JvdXBCbG9jayA9IGZ1bmN0aW9uKGdyb3VwSWQpIHtcbiAgdmFyIGdyb3VwRGVmaW5pdGlvbiA9IGdhbWUucXVhbGl0eUdyb3Vwc1tncm91cElkXTtcblxuICAvLyBCdWlsZCB0aGUgZ3JvdXAgZGl2IHdpdGggYXBwcm9wcmlhdGUgaGVhZGluZy5cbiAgdmFyIGdyb3VwQmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInF1YWxpdHlfZ3JvdXBcIikuY2xvbmVOb2RlKHRydWUpO1xuICBncm91cEJsb2NrLnNldEF0dHJpYnV0ZShcImlkXCIsIFwiZ19cIitncm91cElkKTtcbiAgZ3JvdXBCbG9jay5zZXRBdHRyaWJ1dGUoXCJkYXRhLXByaW9yaXR5XCIsIGdyb3VwRGVmaW5pdGlvbi5wcmlvcml0eSk7XG5cbiAgdmFyIHRpdGxlRWxlbWVudCA9IGdyb3VwQmxvY2sucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWF0dHI9J3RpdGxlJ11cIik7XG4gIGlmIChncm91cERlZmluaXRpb24udGl0bGUpIHtcbiAgICB0aXRsZUVsZW1lbnQuaW5uZXJIVE1MID0gZ3JvdXBEZWZpbml0aW9uLnRpdGxlO1xuICB9IGVsc2Uge1xuICAgIGlmICh0aXRsZUVsZW1lbnQucGFyZW50Tm9kZSAhPSB1bmRlZmluZWQpXG4gICAge1xuICAgICAgdGl0bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGl0bGVFbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBpZiAoZ3JvdXBEZWZpbml0aW9uLmV4dHJhQ2xhc3Nlcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JvdXBEZWZpbml0aW9uLmV4dHJhQ2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgZ3JvdXBCbG9jay5hZGRDbGFzcyhncm91cERlZmluaXRpb24uZXh0cmFDbGFzc2VzW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgdGhlIGJsb2NrIHRvIHRoZSBjb3JyZWN0IHBsYWNlLlxuICB2YXIgcXVhbGl0aWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJxdWFsaXRpZXNcIik7XG4gIGluc2VydEF0Q29ycmVjdFBvc2l0aW9uKHF1YWxpdGllcywgZ3JvdXBCbG9jayk7XG4gIHJldHVybiBncm91cEJsb2NrO1xufTtcblxuLyogQWRkcyBhIG5ldyBxdWFsaXR5IHRvIHRoZSBjb3JyZWN0IGxvY2F0aW9uIGluIHRoZSBxdWFsaXR5IGxpc3QuICovXG52YXIgYWRkUXVhbGl0eUJsb2NrID0gZnVuY3Rpb24ocXVhbGl0eUlkKSB7XG4gIC8vIE1ha2Ugc3VyZSB3ZSB3YW50IHRvIGRpc3BsYXkgdGhpcyBxdWFsaXR5LlxuICB2YXIgcXVhbGl0eURlZmluaXRpb24gPSBnYW1lLnF1YWxpdGllc1txdWFsaXR5SWRdO1xuICBpZiAoIXF1YWxpdHlEZWZpbml0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZGlzcGxheSBhIHF1YWxpdHkgdGhhdCBoYXNuJ3QgYmVlbiBkZWZpbmVkOiBcIitcbiAgICAgICAgcXVhbGl0eUlkKTtcbiAgfVxuXG4gIC8vIFdvcmsgb3V0IGhvdyB0aGUgdmFsdWUgc2hvdWxkIGJlIGRpc3BsYXllZC5cbiAgdmFyIG5hbWUgPSBxdWFsaXR5RGVmaW5pdGlvbi50aXRsZTtcbiAgdmFyIHZhbCA9IHF1YWxpdHlEZWZpbml0aW9uLmZvcm1hdChcbiAgICAgIGNoYXJhY3RlciwgY2hhcmFjdGVyLnF1YWxpdGllc1txdWFsaXR5SWRdXG4gICAgICApO1xuICBpZiAodmFsID09PSBudWxsKSByZXR1cm4gbnVsbDtcblxuICAvLyBDcmVhdGUgdGhlIHF1YWxpdHkgb3V0cHV0LlxuICB2YXIgcXVhbGl0eUJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJxdWFsaXR5XCIpLmNsb25lTm9kZSh0cnVlKTtcbiAgcXVhbGl0eUJsb2NrLnNldEF0dHJpYnV0ZShcImlkXCIsIFwicV9cIitxdWFsaXR5SWQpO1xuICBxdWFsaXR5QmxvY2suc2V0QXR0cmlidXRlKFwiZGF0YS1wcmlvcml0eVwiLCBxdWFsaXR5RGVmaW5pdGlvbi5wcmlvcml0eSk7XG4gIHF1YWxpdHlCbG9jay5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtYXR0cj0nbmFtZSddXCIpLmlubmVySFRNTCA9IG5hbWU7XG4gIHF1YWxpdHlCbG9jay5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtYXR0cj0ndmFsdWUnXVwiKS5pbm5lckhUTUwgPSB2YWw7XG4gIGlmIChxdWFsaXR5RGVmaW5pdGlvbi5leHRyYUNsYXNzZXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHF1YWxpdHlEZWZpbml0aW9uLmV4dHJhQ2xhc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgcXVhbGl0eUJsb2NrLmNsYXNzTmFtZS5hZGQocXVhbGl0eURlZmluaXRpb24uZXh0cmFDbGFzc2VzW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIG9yIGNyZWF0ZSB0aGUgZ3JvdXAgYmxvY2suXG4gIHZhciBncm91cEJsb2NrO1xuICB2YXIgZ3JvdXBJZCA9IHF1YWxpdHlEZWZpbml0aW9uLmdyb3VwO1xuICBpZiAoZ3JvdXBJZCkge1xuICAgIHZhciBncm91cCA9IGdhbWUucXVhbGl0eUdyb3Vwc1tncm91cElkXTtcbiAgICBhc3NlcnQoZ3JvdXAsIFwibm9fZ3JvdXBfZGVmaW5pdGlvblwiLmwoe2lkOiBncm91cElkfSkpO1xuICAgIGdyb3VwQmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdfXCIrZ3JvdXBJZCk7XG4gICAgaWYgKGdyb3VwQmxvY2sgPT0gbnVsbCB8fCBncm91cEJsb2NrLmxlbmd0aCA8PSAwKSB7XG4gICAgICBncm91cEJsb2NrID0gYWRkR3JvdXBCbG9jayhncm91cElkKTtcbiAgICB9XG4gIH1cblxuICAvLyBQb3NpdGlvbiBpdCBjb3JyZWN0bHkuXG4gIHZhciBncm91cFF1YWxpdHlMaXN0ID0gZ3JvdXBCbG9jay5xdWVyeVNlbGVjdG9yQWxsKFwiLnF1YWxpdGllc19pbl9ncm91cFwiKTtcbiAgaW5zZXJ0QXRDb3JyZWN0UG9zaXRpb24oZ3JvdXBRdWFsaXR5TGlzdCwgcXVhbGl0eUJsb2NrKTtcbiAgcmV0dXJuIHF1YWxpdHlCbG9jaztcbn07XG5cbi8qIE91dHB1dCBldmVudHMgYXJlIHRyYWNrZWQsIHNvIHdlIGNhbiBtYWtlIHN1cmUgd2Ugc2Nyb2xsXG4gKiBjb3JyZWN0bHkuIFdlIGRvIHRoaXMgaW4gYSBzdGFjayBiZWNhdXNlIG9uZSBjbGljayBtaWdodCBjYXVzZVxuICogYSBjaGFpbiByZWFjdGlvbi4gT2Ygb3V0cHV0IGV2ZW50cywgb25seSB3aGVuIHdlIHJldHVybiB0byB0aGVcbiAqIHRvcCBsZXZlbCB3aWxsIHdlIGRvIHRoZSBzY3JvbGwuXG4gKlxuICogSG93ZXZlciwgdGhhdCBsZWF2ZXMgdGhlIHF1ZXN0aW9uIG9mIHdoZXJlIHRvIHNjcm9sbCAqdG8qLlxuICogKFJlbWVtYmVyIHRoYXQgZWxlbWVudHMgY291bGQgYmUgaW5zZXJ0ZWQgYW55d2hlcmUgaW4gdGhlXG4gKiBkb2N1bWVudC4pIFdoZW5ldmVyIHdlIGRvIGEgd3JpdGUoKSwgd2UnbGwgaGF2ZSB0byB1cGRhdGUgdGhlXG4gKiB0b3AgKGxhc3QpIHN0YWNrIGVsZW1lbnQgdG8gdGhhdCBwb3NpdGlvbi5cbiAqL1xudmFyIHNjcm9sbFN0YWNrID0gW107XG52YXIgcGVuZGluZ0ZpcnN0V3JpdGUgPSBmYWxzZTtcbnZhciBzdGFydE91dHB1dFRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmIChzY3JvbGxTdGFjay5sZW5ndGggPT09IDApIHtcbiAgICBwZW5kaW5nRmlyc3RXcml0ZSA9IHRydWU7XG4gIH1cbiAgLy8gVGhlIGRlZmF1bHQgaXMgXCJhbGwgdGhlIHdheSBkb3duXCIuXG4gIHNjcm9sbFN0YWNrLnB1c2goXG4gICAgICAkKFwiI2NvbnRlbnRcIikuaGVpZ2h0KCkgKyAkKFwiI3RpdGxlXCIpLmhlaWdodCgpICsgNjBcbiAgICAgICk7XG59O1xudmFyIGNvbnRpbnVlT3V0cHV0VHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHBlbmRpbmdGaXJzdFdyaXRlKSB7XG4gICAgcGVuZGluZ0ZpcnN0V3JpdGUgPSBmYWxzZTtcbiAgICB2YXIgc2VwYXJhdG9yID0gJChcIiN1aV9saWJyYXJ5ICN0dXJuX3NlcGFyYXRvclwiKS5jbG9uZSgpO1xuICAgIHNlcGFyYXRvci5yZW1vdmVBdHRyKFwiaWRcIik7XG4gICAgJChcIiNjb250ZW50XCIpLmFwcGVuZChzZXBhcmF0b3IpO1xuICB9XG59O1xudmFyIGVuZE91dHB1dFRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzY3JvbGxQb2ludCA9IHNjcm9sbFN0YWNrLnBvcCgpO1xuICBpZiAoc2Nyb2xsU3RhY2subGVuZ3RoID09PSAwICYmIHNjcm9sbFBvaW50ICE9PSBudWxsKSB7XG4gICAgaWYgKGludGVyYWN0aXZlKSB7XG4gICAgICB3aW5kb3cuc2Nyb2xsKDAsc2Nyb2xsUG9pbnQpO1xuICAgIH1cbiAgICBzY3JvbGxQb2ludCA9IG51bGw7XG4gIH1cbn07XG5cbi8qIFRoaXMgZ2V0cyBjYWxsZWQgd2hlbiBhIGxpbmsgbmVlZHMgdG8gYmUgZm9sbG93ZWQsIHJlZ2FyZGxlc3NcbiAqIG9mIHdoZXRoZXIgaXQgd2FzIHVzZXIgYWN0aW9uIHRoYXQgaW5pdGlhdGVkIGl0LiAqL1xudmFyIGxpbmtSZSA9IC9eKFthLXowLTlfLV0rfFxcLikoXFwvKFswLTlhLXpfLV0rKSk/JC87XG52YXIgcHJvY2Vzc0xpbmsgPSBmdW5jdGlvbihjb2RlKSB7XG4gIC8vIENoZWNrIGlmIHdlIHNob3VsZCBkbyB0aGlzIG5vdywgb3IgaWYgcHJvY2Vzc2luZyBpcyBhbHJlYWR5XG4gIC8vIHVuZGVyd2F5LlxuICBpZiAobGlua1N0YWNrICE9PSBudWxsKSB7XG4gICAgbGlua1N0YWNrLnB1c2goY29kZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gVHJhY2sgd2hlcmUgd2UncmUgYWJvdXQgdG8gYWRkIG5ldyBjb250ZW50LlxuICBzdGFydE91dHB1dFRyYW5zYWN0aW9uKCk7XG5cbiAgLy8gV2UncmUgcHJvY2Vzc2luZywgc28gbWFrZSB0aGUgc3RhY2sgYXZhaWxhYmxlLlxuICBsaW5rU3RhY2sgPSBbXTtcblxuICAvLyBIYW5kbGUgZWFjaCBsaW5rIGluIHR1cm4uXG4gIHByb2Nlc3NPbmVMaW5rKGNvZGUpO1xuICB3aGlsZSAobGlua1N0YWNrLmxlbmd0aCA+IDApIHtcbiAgICBjb2RlID0gbGlua1N0YWNrLnNoaWZ0KCk7XG4gICAgcHJvY2Vzc09uZUxpbmsoY29kZSk7XG4gIH1cblxuICAvLyBXZSdyZSBkb25lLCBzbyByZW1vdmUgdGhlIHN0YWNrIHRvIHByZXZlbnQgZnV0dXJlIHB1c2hlcy5cbiAgbGlua1N0YWNrID0gbnVsbDtcblxuICAvLyBTY3JvbGwgdG8gdGhlIHRvcCBvZiB0aGUgbmV3IGNvbnRlbnQuXG4gIGVuZE91dHB1dFRyYW5zYWN0aW9uKCk7XG5cbiAgLy8gV2UncmUgYWJsZSB0byBzYXZlLCBpZiB3ZSB3ZXJlbid0IGFscmVhZHkuXG4gICQoXCIjc2F2ZVwiKS5hdHRyKCdkaXNhYmxlZCcsIGZhbHNlKTtcbn07XG5cbi8qIFRoaXMgZ2V0cyBjYWxsZWQgdG8gYWN0dWFsbHkgZG8gdGhlIHdvcmsgb2YgcHJvY2Vzc2luZyBhIGNvZGUuXG4gKiBXaGVuIG9uZSBkb0xpbmsgaXMgY2FsbGVkIChvciBhIGxpbmsgaXMgY2xpY2tlZCksIHRoaXMgbWF5IHNldCBjYWxsXG4gKiBjb2RlIHRoYXQgZnVydGhlciBjYWxscyBkb0xpbmssIGFuZCBzbyBvbi4gVGhpcyBtZXRob2QgcHJvY2Vzc2VzXG4gKiBlYWNoIG9uZSwgYW5kIHByb2Nlc3NMaW5rIG1hbmFnZXMgdGhpcy5cbiAqL1xudmFyIHByb2Nlc3NPbmVMaW5rID0gZnVuY3Rpb24oY29kZSkge1xuICB2YXIgbWF0Y2ggPSBjb2RlLm1hdGNoKGxpbmtSZSk7XG4gIGFzc2VydChtYXRjaCwgXCJsaW5rX25vdF92YWxpZFwiLmwoe2xpbms6Y29kZX0pKTtcblxuICB2YXIgc2l0dWF0aW9uID0gbWF0Y2hbMV07XG4gIHZhciBhY3Rpb24gPSBtYXRjaFszXTtcblxuICAvLyBDaGFuZ2UgdGhlIHNpdHVhdGlvblxuICBpZiAoc2l0dWF0aW9uICE9PSAnLicpIHtcbiAgICBpZiAoc2l0dWF0aW9uICE9PSBjdXJyZW50KSB7XG4gICAgICBkb1RyYW5zaXRpb25UbyhzaXR1YXRpb24pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBzaG91bGQgaGF2ZSBhbiBhY3Rpb24gaWYgd2UgaGF2ZSBubyBzaXR1YXRpb24gY2hhbmdlLlxuICAgIGFzc2VydChhY3Rpb24sIFwibGlua19ub19hY3Rpb25cIi5sKCkpO1xuICB9XG5cbiAgLy8gQ2Fycnkgb3V0IHRoZSBhY3Rpb25cbiAgaWYgKGFjdGlvbikge1xuICAgIHNpdHVhdGlvbiA9IGdldEN1cnJlbnRTaXR1YXRpb24oKTtcbiAgICBpZiAoc2l0dWF0aW9uKSB7XG4gICAgICBpZiAoZ2FtZS5iZWZvcmVBY3Rpb24pIHtcbiAgICAgICAgLy8gVHJ5IHRoZSBnbG9iYWwgYWN0IGhhbmRsZXIsIGFuZCBzZWUgaWYgd2UgbmVlZFxuICAgICAgICAvLyB0byBub3RpZnkgdGhlIHNpdHVhdGlvbi5cbiAgICAgICAgdmFyIGNvbnN1bWVkID0gZ2FtZS5iZWZvcmVBY3Rpb24oXG4gICAgICAgICAgICBjaGFyYWN0ZXIsIHN5c3RlbSwgY3VycmVudCwgYWN0aW9uXG4gICAgICAgICAgICApO1xuICAgICAgICBpZiAoY29uc3VtZWQgIT09IHRydWUpIHtcbiAgICAgICAgICBzaXR1YXRpb24uYWN0KGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBXZSBoYXZlIG5vIGdsb2JhbCBhY3QgaGFuZGxlciwgYWx3YXlzIG5vdGlmeVxuICAgICAgICAvLyB0aGUgc2l0dWF0aW9uLlxuICAgICAgICBzaXR1YXRpb24uYWN0KGNoYXJhY3Rlciwgc3lzdGVtLCBhY3Rpb24pO1xuICAgICAgfVxuICAgICAgaWYgKGdhbWUuYWZ0ZXJBY3Rpb24pIHtcbiAgICAgICAgZ2FtZS5hZnRlckFjdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgY3VycmVudCwgYWN0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qIFRoaXMgZ2V0cyBjYWxsZWQgd2hlbiB0aGUgdXNlciBjbGlja3MgYSBsaW5rIHRvIGNhcnJ5IG91dCBhblxuICogYWN0aW9uLiAqL1xudmFyIHByb2Nlc3NDbGljayA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKiAwLjAwMTtcbiAgc3lzdGVtLnRpbWUgPSBub3cgLSBzdGFydFRpbWU7XG4gIHByb2dyZXNzLnNlcXVlbmNlLnB1c2goe2xpbms6Y29kZSwgd2hlbjpzeXN0ZW0udGltZX0pO1xuICBwcm9jZXNzTGluayhjb2RlKTtcbn07XG5cbi8qIFRyYW5zaXRpb25zIGJldHdlZW4gc2l0dWF0aW9ucy4gKi9cbnZhciBkb1RyYW5zaXRpb25UbyA9IGZ1bmN0aW9uKG5ld1NpdHVhdGlvbklkKSB7XG4gIHZhciBvbGRTaXR1YXRpb25JZCA9IGN1cnJlbnQ7XG4gIHZhciBvbGRTaXR1YXRpb24gPSBnZXRDdXJyZW50U2l0dWF0aW9uKCk7XG4gIHZhciBuZXdTaXR1YXRpb24gPSBnYW1lLnNpdHVhdGlvbnNbbmV3U2l0dWF0aW9uSWRdO1xuXG4gIGFzc2VydChuZXdTaXR1YXRpb24sIFwidW5rbm93bl9zaXR1YXRpb25cIi5sKHtpZDpuZXdTaXR1YXRpb25JZH0pKTtcblxuICAvLyBXZSBtaWdodCBub3QgaGF2ZSBhbiBvbGQgc2l0dWF0aW9uIGlmIHRoaXMgaXMgdGhlIHN0YXJ0IG9mXG4gIC8vIHRoZSBnYW1lLlxuICBpZiAob2xkU2l0dWF0aW9uKSB7XG4gICAgLy8gTm90aWZ5IHRoZSBleGl0aW5nIHNpdHVhdGlvbi5cbiAgICBvbGRTaXR1YXRpb24uZXhpdChjaGFyYWN0ZXIsIHN5c3RlbSwgbmV3U2l0dWF0aW9uSWQpO1xuICAgIGlmIChnYW1lLmV4aXQpIHtcbiAgICAgIGdhbWUuZXhpdChjaGFyYWN0ZXIsIHN5c3RlbSwgb2xkU2l0dWF0aW9uSWQsIG5ld1NpdHVhdGlvbklkKTtcbiAgICB9XG4gIH1cblxuICAvLyAgUmVtb3ZlIGxpbmtzIGFuZCB0cmFuc2llbnQgc2VjdGlvbnMuXG4gIHZhciBjb250ZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZW50XCIpO1xuICBsaW5rcyA9IGNvbnRlbnQucXVlcnlTZWxlY3RvckFsbChcImFcIik7XG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwobGlua3MsIGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4KSB7XG4gICAgdmFyIGEgPSBlbGVtZW50O1xuICAgIGlmIChhLmNsYXNzTGlzdC5jb250YWlucygnc3RpY2t5JykgfHwgYS5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpLm1hdGNoKC9bPyZdc3RpY2t5Wz0mXT8vKSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAoYS5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpLm1hdGNoKC9bPyZddHJhbnNpZW50Wz0mXT8vKSkge1xuICAgICAgaGlkZUJsb2NrKGEpO1xuICAgIH1cbiAgICBhLmlubmVySFRNTCA9IFwiPHNwYW4gY2xhc3M9J2V4X2xpbmsnPlwiK2EuaW5uZXJIVE1MK1wiPC9zcGFuPlwiO1xuICB9KTtcbiAgaGlkZUJsb2NrKGNvbnRlbnQucXVlcnlTZWxlY3RvckFsbChcIi50cmFuc2llbnRcIikpO1xuICBoaWRlQmxvY2soY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKFwidWwub3B0aW9uc1wiKSk7XG5cbiAgLy8gTW92ZSB0aGUgY2hhcmFjdGVyLlxuICBjdXJyZW50ID0gbmV3U2l0dWF0aW9uSWQ7XG5cbiAgLy8gTm90aWZ5IHRoZSBpbmNvbWluZyBzaXR1YXRpb24uXG4gIGlmIChnYW1lLmVudGVyKSB7XG4gICAgZ2FtZS5lbnRlcihjaGFyYWN0ZXIsIHN5c3RlbSwgb2xkU2l0dWF0aW9uSWQsIG5ld1NpdHVhdGlvbklkKTtcbiAgfVxuICBuZXdTaXR1YXRpb24uZW50ZXIoY2hhcmFjdGVyLCBzeXN0ZW0sIG9sZFNpdHVhdGlvbklkKTtcblxuICAvLyBhZGRpdGlvbmFsIGhvb2sgZm9yIHdoZW4gdGhlIHNpdHVhdGlvbiB0ZXh0IGhhcyBhbHJlYWR5IGJlZW4gcHJpbnRlZFxuICBpZiAoZ2FtZS5hZnRlckVudGVyKSB7XG4gICAgZ2FtZS5hZnRlckVudGVyKGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICB9XG59O1xuXG4vKiBSZXR1cm5zIEhUTUwgZnJvbSB0aGUgZ2l2ZW4gY29udGVudCB3aXRoIHRoZSBub24tcmF3IGxpbmtzXG4gKiB3aXJlZCB1cC4gXG4gKiBAcGFyYW0gY29udGVudCBzdHJpbmcgSFRNTCBjb2RlIFxuICogQHJldHZhbCBzdHJpbmcgKi9cbnZhciBhdWdtZW50TGlua3MgPSBmdW5jdGlvbihjb250ZW50KSB7XG4gIC8vIFdpcmUgdXAgdGhlIGxpbmtzIGZvciByZWd1bGFyIDxhPiB0YWdzLlxuICBvdXRwdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgb3V0cHV0LmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gIHZhciBsaW5rcyA9IG91dHB1dC5xdWVyeVNlbGVjdG9yQWxsKFwiYVwiKTtcbiAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsaW5rcywgZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgpe1xuICAgIHZhciBocmVmID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICBpZiAoIWVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKFwicmF3XCIpfHwgaHJlZi5tYXRjaCgvWz8mXXJhd1s9Jl0/LykpIHtcbiAgICAgIGlmIChocmVmLm1hdGNoKGxpbmtSZSkpIHtcbiAgICAgICAgZWxlbWVudC5vbmNsaWNrID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgLy8gSWYgd2UncmUgYSBvbmNlLWNsaWNrLCByZW1vdmUgYWxsIG1hdGNoaW5nIGxpbmtzLlxuICAgICAgICAgIGlmIChlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhcIm9uY2VcIikgfHwgaHJlZi5tYXRjaCgvWz8mXW9uY2VbPSZdPy8pKSB7XG4gICAgICAgICAgICBzeXN0ZW0uY2xlYXJMaW5rcyhocmVmKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwcm9jZXNzQ2xpY2soaHJlZik7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwicmF3XCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG91dHB1dC5pbm5lckhUTUw7XG59O1xuXG4vKiBFcmFzZXMgdGhlIGNoYXJhY3RlciBpbiBsb2NhbCBzdG9yYWdlLiBUaGlzIGlzIHBlcm1hbmVudCEgKi9cbnZhciBkb0VyYXNlID0gZnVuY3Rpb24oZm9yY2UpIHtcbiAgdmFyIHNhdmVJZCA9IGdldFNhdmVJZCgpO1xuICBpZiAobG9jYWxTdG9yYWdlW3NhdmVJZF0pIHtcbiAgICBpZiAoZm9yY2UgfHwgY29uZmlybShcImVyYXNlX21lc3NhZ2VcIi5sKCkpKSB7XG4gICAgICBkZWxldGUgbG9jYWxTdG9yYWdlW3NhdmVJZF07XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVyYXNlXCIpLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgIHN0YXJ0R2FtZSgpO1xuICAgIH1cbiAgfVxufTtcblxuLyogRmluZCBhbmQgcmV0dXJuIGEgbGlzdCBvZiBpZHMgZm9yIGFsbCBzaXR1YXRpb25zIHdpdGggdGhlIGdpdmVuIHRhZy4gKi9cbnZhciBnZXRTaXR1YXRpb25JZHNXaXRoVGFnID0gZnVuY3Rpb24odGFnKSB7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIgc2l0dWF0aW9uSWQgaW4gZ2FtZS5zaXR1YXRpb25zKSB7XG4gICAgdmFyIHNpdHVhdGlvbiA9IGdhbWUuc2l0dWF0aW9uc1tzaXR1YXRpb25JZF07XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpdHVhdGlvbi50YWdzLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoc2l0dWF0aW9uLnRhZ3NbaV0gPT0gdGFnKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNpdHVhdGlvbklkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKiBTZXQgdXAgdGhlIHNjcmVlbiBmcm9tIHNjcmF0Y2ggdG8gcmVmbGVjdCB0aGUgY3VycmVudCBnYW1lXG4gKiBzdGF0ZS4gKi9cbnZhciBpbml0R2FtZURpc3BsYXkgPSBmdW5jdGlvbigpIHtcbiAgLy8gVHJhbnNpdGlvbiBpbnRvIHRoZSBmaXJzdCBzaXR1YXRpb24sXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udGVudFwiKS5pbm5lckhUTUwgPSBcIlwiO1xuXG4gIHZhciBzaXR1YXRpb24gPSBnZXRDdXJyZW50U2l0dWF0aW9uKCk7XG4gIGFzc2VydChzaXR1YXRpb24sIFwibm9fY3VycmVudF9zaXR1YXRpb25cIi5sKCkpO1xuXG4gIHNob3dRdWFsaXRpZXMoKTtcbn07XG5cbi8qIENsZWFyIHRoZSBjdXJyZW50IGdhbWUgb3V0cHV0IGFuZCBzdGFydCBhZ2Fpbi4gKi9cbnZhciBzdGFydEdhbWUgPSBmdW5jdGlvbigpIHtcbiAgcHJvZ3Jlc3Muc2VlZCA9IG5ldyBEYXRlKCkudG9TdHJpbmcoKTtcblxuICBjaGFyYWN0ZXIgPSBuZXcgQ2hhcmFjdGVyKCk7XG4gIHN5c3RlbS5ybmQgPSBuZXcgUmFuZG9tKHByb2dyZXNzLnNlZWQpO1xuICBwcm9ncmVzcy5zZXF1ZW5jZSA9IFt7bGluazpnYW1lLnN0YXJ0LCB3aGVuOjB9XTtcblxuICAvLyBFbXB0eSB0aGUgZGlzcGxheVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIikuaW5uZXJIVE1MID0gJyc7XG5cbiAgLy8gU3RhcnQgdGhlIGdhbWVcbiAgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgKiAwLjAwMTtcbiAgc3lzdGVtLnRpbWUgPSAwO1xuICBpZiAoZ2FtZS5pbml0KSBnYW1lLmluaXQoY2hhcmFjdGVyLCBzeXN0ZW0pO1xuICBzaG93UXVhbGl0aWVzKCk7XG5cbiAgLy8gRG8gdGhlIGZpcnN0IHN0YXRlLlxuICBkb1RyYW5zaXRpb25UbyhnYW1lLnN0YXJ0KTtcbn07XG5cbi8qIFNhdmVzIHRoZSBjaGFyYWN0ZXIgdG8gbG9jYWwgc3RvcmFnZS4gKi9cbnZhciBzYXZlR2FtZSA9IGZ1bmN0aW9uKCkge1xuICAvLyBTdG9yZSB3aGVuIHdlJ3JlIHNhdmluZyB0aGUgZ2FtZSwgdG8gYXZvaWQgZXhwbG9pdHMgd2hlcmUgYVxuICAvLyBwbGF5ZXIgbG9hZHMgdGhlaXIgZmlsZSB0byBnYWluIGV4dHJhIHRpbWUuXG4gIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICogMC4wMDE7XG4gIHByb2dyZXNzLnNhdmVUaW1lID0gbm93IC0gc3RhcnRUaW1lO1xuXG4gIC8vIFNhdmUgdGhlIGdhbWUuXG4gIGxvY2FsU3RvcmFnZVtnZXRTYXZlSWQoKV0gPSBKU09OLnN0cmluZ2lmeShwcm9ncmVzcyk7XG5cbiAgLy8gU3dpdGNoIHRoZSBidXR0b24gaGlnaGxpZ2h0cy5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlcmFzZVwiKS5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNhdmVcIikuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xufTtcblxuLyogTG9hZHMgdGhlIGdhbWUgZnJvbSB0aGUgZ2l2ZW4gZGF0YSAqL1xudmFyIGxvYWRHYW1lID0gZnVuY3Rpb24oY2hhcmFjdGVyRGF0YSkge1xuICBwcm9ncmVzcyA9IGNoYXJhY3RlckRhdGE7XG5cbiAgY2hhcmFjdGVyID0gbmV3IENoYXJhY3RlcigpO1xuICBzeXN0ZW0ucm5kID0gbmV3IFJhbmRvbShwcm9ncmVzcy5zZWVkKTtcblxuICAvLyBFbXB0eSB0aGUgZGlzcGxheVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgc2hvd1F1YWxpdGllcygpO1xuXG4gIC8vIE5vdyBwbGF5IHRocm91Z2ggdGhlIGFjdGlvbnMgc28gZmFyOlxuICBpZiAoZ2FtZS5pbml0KSBnYW1lLmluaXQoY2hhcmFjdGVyLCBzeXN0ZW0pO1xuXG4gIC8vIFJ1biB0aHJvdWdoIGFsbCB0aGUgcGxheWVyJ3MgaGlzdG9yeS5cbiAgaW50ZXJhY3RpdmUgPSBmYWxzZTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9ncmVzcy5zZXF1ZW5jZS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBzdGVwID0gcHJvZ3Jlc3Muc2VxdWVuY2VbaV07XG4gICAgLy8gVGhlIGFjdGlvbiBtdXN0IGJlIGRvbmUgYXQgdGhlIHJlY29yZGVkIHRpbWUuXG4gICAgc3lzdGVtLnRpbWUgPSBzdGVwLndoZW47XG4gICAgcHJvY2Vzc0xpbmsoc3RlcC5saW5rKTtcbiAgfVxuICBpbnRlcmFjdGl2ZSA9IHRydWU7XG5cbiAgLy8gUmV2ZXJzZSBlbmdpbmVlciB0aGUgc3RhcnQgdGltZS5cbiAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpICogMC4wMDE7XG4gIHN0YXJ0VGltZSA9IG5vdyAtIHByb2dyZXNzLnNhdmVUaW1lO1xuXG4gIC8vIEJlY2F1c2Ugd2UgZGlkIHRoZSBydW4gdGhyb3VnaCBub24taW50ZXJhY3RpdmVseSwgbm93IHdlXG4gIC8vIG5lZWQgdG8gdXBkYXRlIHRoZSBVSS5cbiAgc2hvd1F1YWxpdGllcygpO1xufTtcblxuLy8gSW50ZXJuYXRpb25hbGl6YXRpb24gc3VwcG9ydCBiYXNlZCBvbiB0aGUgY29kZSBwcm92aWRlZCBieSBPcmVvbGVrLlxuKGZ1bmN0aW9uKCkge1xuIHZhciBjb2Rlc1RvVHJ5ID0ge307XG4gLyogQ29tcGlsZXMgYSBsaXN0IG9mIGZhbGxiYWNrIGxhbmd1YWdlcyB0byB0cnkgaWYgdGhlIGdpdmVuIGNvZGVcbiAgKiBkb2Vzbid0IGhhdmUgdGhlIG1lc3NhZ2Ugd2UgbmVlZC4gQ2FjaGVzIGl0IGZvciBmdXR1cmUgdXNlLiAqL1xuIHZhciBnZXRDb2Rlc1RvVHJ5ID0gZnVuY3Rpb24obGFuZ3VhZ2VDb2RlKSB7XG4gdmFyIGNvZGVBcnJheSA9IGNvZGVzVG9UcnlbbGFuZ3VhZ2VDb2RlXTtcbiBpZiAoY29kZUFycmF5KSByZXR1cm4gY29kZUFycmF5O1xuXG4gY29kZUFycmF5ID0gW107XG4gaWYgKGxhbmd1YWdlQ29kZSBpbiB1bmR1bS5sYW5ndWFnZSkge1xuIGNvZGVBcnJheS5wdXNoKGxhbmd1YWdlQ29kZSk7XG4gfVxuIHZhciBlbGVtZW50cyA9IGxhbmd1YWdlQ29kZS5zcGxpdCgnLScpO1xuIGZvciAodmFyIGkgPSBlbGVtZW50cy5sZW5ndGgtMjsgaSA+IDA7IGktLSkge1xuIHZhciB0aGlzQ29kZSA9IGVsZW1lbnRzLnNsaWNlKDAsIGkpLmpvaW4oJy0nKTtcbiBpZiAodGhpc0NvZGUgaW4gdW5kdW0ubGFuZ3VhZ2UpIHtcbiBjb2RlQXJyYXkucHVzaCh0aGlzQ29kZSk7XG4gfVxuIH1cbiBjb2RlQXJyYXkucHVzaChcIlwiKTtcbiBjb2Rlc1RvVHJ5W2xhbmd1YWdlQ29kZV0gPSBjb2RlQXJyYXk7XG4gcmV0dXJuIGNvZGVBcnJheTtcbiB9O1xuIHZhciBsb29rdXAgPSBmdW5jdGlvbihsYW5ndWFnZUNvZGUsIG1lc3NhZ2UpIHtcbiAgIHZhciBsYW5ndWFnZURhdGEgPSB1bmR1bS5sYW5ndWFnZVtsYW5ndWFnZUNvZGVdO1xuICAgaWYgKCFsYW5ndWFnZURhdGEpIHJldHVybiBudWxsO1xuICAgcmV0dXJuIGxhbmd1YWdlRGF0YVttZXNzYWdlXTtcbiB9O1xuIHZhciBsb2NhbGl6ZSA9IGZ1bmN0aW9uKGxhbmd1YWdlQ29kZSwgbWVzc2FnZSkge1xuICAgdmFyIGxvY2FsaXplZCwgdGhpc0NvZGU7XG4gICB2YXIgbGFuZ3VhZ2VDb2RlcyA9IGdldENvZGVzVG9UcnkobGFuZ3VhZ2VDb2RlKTtcbiAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFuZ3VhZ2VDb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICB0aGlzQ29kZSA9IGxhbmd1YWdlQ29kZXNbaV07XG4gICAgIGxvY2FsaXplZCA9IGxvb2t1cCh0aGlzQ29kZSwgbWVzc2FnZSk7XG4gICAgIGlmIChsb2NhbGl6ZWQpIHJldHVybiBsb2NhbGl6ZWQ7XG4gICB9XG4gICByZXR1cm4gbWVzc2FnZTtcbiB9O1xuXG4gLy8gQVBJXG4gU3RyaW5nLnByb3RvdHlwZS5sID0gZnVuY3Rpb24oYXJncykge1xuICAgLy8gR2V0IGxhbmcgYXR0cmlidXRlIGZyb20gaHRtbCB0YWcuXG4gICB2YXIgbGFuZyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJodG1sXCIpLmdldEF0dHJpYnV0ZShcImxhbmdcIikgfHwgXCJcIjtcblxuICAgLy8gRmluZCB0aGUgbG9jYWxpemVkIGZvcm0uXG4gICB2YXIgbG9jYWxpemVkID0gbG9jYWxpemUobGFuZywgdGhpcyk7XG5cbiAgIC8vIE1lcmdlIGluIGFueSByZXBsYWNlbWVudCBjb250ZW50LlxuICAgaWYgKGFyZ3MpIHtcbiAgICAgZm9yICh2YXIgbmFtZSBpbiBhcmdzKSB7XG4gICAgICAgbG9jYWxpemVkID0gbG9jYWxpemVkLnJlcGxhY2UoXG4gICAgICAgICAgIG5ldyBSZWdFeHAoXCJcXFxce1wiK25hbWUrXCJcXFxcfVwiKSwgYXJnc1tuYW1lXVxuICAgICAgICAgICApO1xuICAgICB9XG4gICB9XG4gICByZXR1cm4gbG9jYWxpemVkO1xuIH07XG59KSgpO1xuXG4vLyBSYW5kb20gTnVtYmVyIGdlbmVyYXRpb24gYmFzZWQgb24gc2VlZHJhbmRvbS5qcyBjb2RlIGJ5IERhdmlkIEJhdS5cbi8vIENvcHlyaWdodCAyMDEwIERhdmlkIEJhdSwgYWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vXG4vLyBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yXG4vLyB3aXRob3V0IG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmdcbi8vIGNvbmRpdGlvbnMgYXJlIG1ldDpcbi8vXG4vLyAgIDEuIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmVcbi8vICAgICAgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZVxuLy8gICAgICBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbi8vXG4vLyAgIDIuIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmVcbi8vICAgICAgY29weXJpZ2h0IG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZVxuLy8gICAgICBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGUgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXJcbi8vICAgICAgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cbi8vXG4vLyAgIDMuIE5laXRoZXIgdGhlIG5hbWUgb2YgdGhpcyBtb2R1bGUgbm9yIHRoZSBuYW1lcyBvZiBpdHNcbi8vICAgICAgY29udHJpYnV0b3JzIG1heSBiZSB1c2VkIHRvIGVuZG9yc2Ugb3IgcHJvbW90ZSBwcm9kdWN0c1xuLy8gICAgICBkZXJpdmVkIGZyb20gdGhpcyBzb2Z0d2FyZSB3aXRob3V0IHNwZWNpZmljIHByaW9yIHdyaXR0ZW5cbi8vICAgICAgcGVybWlzc2lvbi5cbi8vXG4vLyBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkRcbi8vIENPTlRSSUJVVE9SUyBcIkFTIElTXCIgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUyxcbi8vIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEUgSU1QTElFRCBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFSRVxuLy8gRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIENPUFlSSUdIVCBPV05FUiBPUlxuLy8gQ09OVFJJQlVUT1JTIEJFIExJQUJMRSBGT1IgQU5ZIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsXG4vLyBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyAoSU5DTFVESU5HLCBCVVRcbi8vIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuLy8gTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTilcbi8vIEhPV0VWRVIgQ0FVU0VEIEFORCBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTlxuLy8gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlQgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SXG4vLyBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRiBUSElTIFNPRlRXQVJFLFxuLy8gRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbnZhciBSYW5kb20gPSAoZnVuY3Rpb24oKSB7XG4gIC8vIFdpdGhpbiB0aGlzIGNsb3N1cmUgZnVuY3Rpb24gdGhlIGNvZGUgaXMgYmFzaWNhbGx5XG4gIC8vIERhdmlkJ3MuIFVuZHVtJ3MgY3VzdG9tIGV4dGVuc2lvbnMgYXJlIGFkZGVkIHRvIHRoZVxuICAvLyBwcm90b3R5cGUgb3V0c2lkZSBvZiB0aGlzIGZ1bmN0aW9uLlxuICB2YXIgd2lkdGggPSAyNTY7XG4gIHZhciBjaHVua3MgPSA2O1xuICB2YXIgc2lnbmlmaWNhbmNlRXhwb25lbnQgPSA1MjtcbiAgdmFyIHN0YXJ0ZGVub20gPSBNYXRoLnBvdyh3aWR0aCwgY2h1bmtzKTtcbiAgdmFyIHNpZ25pZmljYW5jZSA9IE1hdGgucG93KDIsIHNpZ25pZmljYW5jZUV4cG9uZW50KTtcbiAgdmFyIG92ZXJmbG93ID0gc2lnbmlmaWNhbmNlICogMjtcblxuICB2YXIgUmFuZG9tID0gZnVuY3Rpb24oc2VlZCkge1xuICAgIHRoaXMucmFuZG9tID0gbnVsbDtcbiAgICBpZiAoIXNlZWQpIHRocm93IHtcbiAgICAgIG5hbWU6IFwiUmFuZG9tU2VlZEVycm9yXCIsXG4gICAgICBtZXNzYWdlOiBcInJhbmRvbV9zZWVkX2Vycm9yXCIubCgpXG4gICAgfTtcbiAgICB2YXIga2V5ID0gW107XG4gICAgbWl4a2V5KHNlZWQsIGtleSk7XG4gICAgdmFyIGFyYzQgPSBuZXcgQVJDNChrZXkpO1xuICAgIHRoaXMucmFuZG9tID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbiA9IGFyYzQuZyhjaHVua3MpO1xuICAgICAgdmFyIGQgPSBzdGFydGRlbm9tO1xuICAgICAgdmFyIHggPSAwO1xuICAgICAgd2hpbGUgKG4gPCBzaWduaWZpY2FuY2UpIHtcbiAgICAgICAgbiA9IChuICsgeCkgKiB3aWR0aDtcbiAgICAgICAgZCAqPSB3aWR0aDtcbiAgICAgICAgeCA9IGFyYzQuZygxKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChuID49IG92ZXJmbG93KSB7XG4gICAgICAgIG4gLz0gMjtcbiAgICAgICAgZCAvPSAyO1xuICAgICAgICB4ID4+Pj0gMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobiArIHgpIC8gZDtcbiAgICB9O1xuICB9O1xuICAvLyBIZWxwZXIgdHlwZS5cbiAgdmFyIEFSQzQgPSBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgdCwgdSwgbWUgPSB0aGlzLCBrZXlsZW4gPSBrZXkubGVuZ3RoO1xuICAgIHZhciBpID0gMCwgaiA9IG1lLmkgPSBtZS5qID0gbWUubSA9IDA7XG4gICAgbWUuUyA9IFtdO1xuICAgIG1lLmMgPSBbXTtcbiAgICBpZiAoIWtleWxlbikgeyBrZXkgPSBba2V5bGVuKytdOyB9XG4gICAgd2hpbGUgKGkgPCB3aWR0aCkgeyBtZS5TW2ldID0gaSsrOyB9XG4gICAgZm9yIChpID0gMDsgaSA8IHdpZHRoOyBpKyspIHtcbiAgICAgIHQgPSBtZS5TW2ldO1xuICAgICAgaiA9IGxvd2JpdHMoaiArIHQgKyBrZXlbaSAlIGtleWxlbl0pO1xuICAgICAgdSA9IG1lLlNbal07XG4gICAgICBtZS5TW2ldID0gdTtcbiAgICAgIG1lLlNbal0gPSB0O1xuICAgIH1cbiAgICBtZS5nID0gZnVuY3Rpb24gZ2V0bmV4dChjb3VudCkge1xuICAgICAgdmFyIHMgPSBtZS5TO1xuICAgICAgdmFyIGkgPSBsb3diaXRzKG1lLmkgKyAxKTsgdmFyIHQgPSBzW2ldO1xuICAgICAgdmFyIGogPSBsb3diaXRzKG1lLmogKyB0KTsgdmFyIHUgPSBzW2pdO1xuICAgICAgc1tpXSA9IHU7XG4gICAgICBzW2pdID0gdDtcbiAgICAgIHZhciByID0gc1tsb3diaXRzKHQgKyB1KV07XG4gICAgICB3aGlsZSAoLS1jb3VudCkge1xuICAgICAgICBpID0gbG93Yml0cyhpICsgMSk7IHQgPSBzW2ldO1xuICAgICAgICBqID0gbG93Yml0cyhqICsgdCk7IHUgPSBzW2pdO1xuICAgICAgICBzW2ldID0gdTtcbiAgICAgICAgc1tqXSA9IHQ7XG4gICAgICAgIHIgPSByICogd2lkdGggKyBzW2xvd2JpdHModCArIHUpXTtcbiAgICAgIH1cbiAgICAgIG1lLmkgPSBpO1xuICAgICAgbWUuaiA9IGo7XG4gICAgICByZXR1cm4gcjtcbiAgICB9O1xuICAgIG1lLmcod2lkdGgpO1xuICB9O1xuICAvLyBIZWxwZXIgZnVuY3Rpb25zLlxuICB2YXIgbWl4a2V5ID0gZnVuY3Rpb24oc2VlZCwga2V5KSB7XG4gICAgc2VlZCArPSAnJztcbiAgICB2YXIgc21lYXIgPSAwO1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc2VlZC5sZW5ndGg7IGorKykge1xuICAgICAgdmFyIGxiID0gbG93Yml0cyhqKTtcbiAgICAgIHNtZWFyIF49IGtleVtsYl07XG4gICAgICBrZXlbbGJdID0gbG93Yml0cyhzbWVhcioxOSArIHNlZWQuY2hhckNvZGVBdChqKSk7XG4gICAgfVxuICAgIHNlZWQgPSAnJztcbiAgICBmb3IgKGogaW4ga2V5KSB7XG4gICAgICBzZWVkICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5W2pdKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlZWQ7XG4gIH07XG4gIHZhciBsb3diaXRzID0gZnVuY3Rpb24obikge1xuICAgIHJldHVybiBuICYgKHdpZHRoIC0gMSk7XG4gIH07XG5cbiAgcmV0dXJuIFJhbmRvbTtcbn0pKCk7XG4vKiBSZXR1cm5zIGEgcmFuZG9tIGZsb2F0aW5nIHBvaW50IG51bWJlciBiZXR3ZWVuIHplcm8gYW5kXG4gKiBvbmUuIE5COiBUaGUgcHJvdG90eXBlIGltcGxlbWVudGF0aW9uIGJlbG93IGp1c3QgdGhyb3dzIGFuXG4gKiBlcnJvciwgaXQgd2lsbCBiZSBvdmVycmlkZGVuIGluIGVhY2ggUmFuZG9tIG9iamVjdCB3aGVuIHRoZVxuICogc2VlZCBoYXMgYmVlbiBjb3JyZWN0bHkgY29uZmlndXJlZC4gKi9cblJhbmRvbS5wcm90b3R5cGUucmFuZG9tID0gZnVuY3Rpb24oKSB7XG4gIHRocm93IHtcbiAgICBuYW1lOlwiUmFuZG9tRXJyb3JcIixcbiAgICBtZXNzYWdlOiBcInJhbmRvbV9lcnJvclwiLmwoKVxuICB9O1xufTtcbi8qIFJldHVybnMgYW4gaW50ZWdlciBiZXR3ZWVuIHRoZSBnaXZlbiBtaW4gYW5kIG1heCB2YWx1ZXMsXG4gKiBpbmNsdXNpdmUuICovXG5SYW5kb20ucHJvdG90eXBlLnJhbmRvbUludCA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKChtYXgtbWluKzEpKnRoaXMucmFuZG9tKCkpO1xufTtcbi8qIFJldHVybnMgdGhlIHJlc3VsdCBvZiByb2xsaW5nIG4gZGljZSB3aXRoIGR4IHNpZGVzLCBhbmQgYWRkaW5nXG4gKiBwbHVzLiAqL1xuUmFuZG9tLnByb3RvdHlwZS5kaWNlID0gZnVuY3Rpb24obiwgZHgsIHBsdXMpIHtcbiAgdmFyIHJlc3VsdCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgcmVzdWx0ICs9IHRoaXMucmFuZG9tSW50KDEsIGR4KTtcbiAgfVxuICBpZiAocGx1cykgcmVzdWx0ICs9IHBsdXM7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuLyogUmV0dXJucyB0aGUgcmVzdWx0IG9mIHJvbGxpbmcgbiBhdmVyYWdpbmcgZGljZSAoaS5lLiA2IHNpZGVkIGRpY2VcbiAqIHdpdGggc2lkZXMgMiwzLDMsNCw0LDUpLiBBbmQgYWRkaW5nIHBsdXMuICovXG5SYW5kb20ucHJvdG90eXBlLmF2ZURpY2UgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBtYXBwaW5nID0gWzIsMywzLDQsNCw1XTtcbiAgcmV0dXJuIGZ1bmN0aW9uKG4sIHBsdXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgcmVzdWx0ICs9IG1hcHBpbmdbdGhpcy5yYW5kb21JbnQoMCwgNSldO1xuICAgIH1cbiAgICBpZiAocGx1cykgcmVzdWx0ICs9IHBsdXM7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn0pKCk7XG4vKiBSZXR1cm5zIGEgZGljZS1yb2xsIHJlc3VsdCBmcm9tIHRoZSBnaXZlbiBzdHJpbmcgZGljZVxuICogc3BlY2lmaWNhdGlvbi4gVGhlIHNwZWNpZmljYXRpb24gc2hvdWxkIGJlIG9mIHRoZSBmb3JtIHhkeSt6LFxuICogd2hlcmUgdGhlIHggY29tcG9uZW50IGFuZCB6IGNvbXBvbmVudCBhcmUgb3B0aW9uYWwuIFRoaXMgcm9sbHNcbiAqIHggZGljZSBvZiB3aXRoIHkgc2lkZXMsIGFuZCBhZGRzIHogdG8gdGhlIHJlc3VsdCwgdGhlIHpcbiAqIGNvbXBvbmVudCBjYW4gYWxzbyBiZSBuZWdhdGl2ZTogeGR5LXouIFRoZSB5IGNvbXBvbmVudCBjYW4gYmVcbiAqIGVpdGhlciBhIG51bWJlciBvZiBzaWRlcywgb3IgY2FuIGJlIHRoZSBzcGVjaWFsIHZhbHVlcyAnRicsIGZvclxuICogYSBmdWRnZSBkaWUgKHdpdGggMyBzaWRlcywgKywwLC0pLCAnJScgZm9yIGEgMTAwIHNpZGVkIGRpZSwgb3JcbiAqICdBJyBmb3IgYW4gYXZlcmFnaW5nIGRpZSAod2l0aCBzaWRlcyAyLDMsMyw0LDQsNSkuXG4gKi9cblJhbmRvbS5wcm90b3R5cGUuZGljZVN0cmluZyA9IChmdW5jdGlvbigpIHtcbiAgdmFyIGRpY2VSZSA9IC9eKFsxLTldWzAtOV0qKT9kKFslRkFdfFsxLTldWzAtOV0qKShbLStdWzEtOV1bMC05XSopPyQvO1xuICByZXR1cm4gZnVuY3Rpb24oZGVmKSB7XG4gICAgdmFyIG1hdGNoID0gZGVmLm1hdGNoKGRpY2VSZSk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZGljZV9zdHJpbmdfZXJyb3JcIi5sKHtzdHJpbmc6ZGVmfSkpO1xuICAgIH1cblxuICAgIHZhciBudW0gPSBtYXRjaFsxXT9wYXJzZUludChtYXRjaFsxXSwgMTApOjE7XG4gICAgdmFyIHNpZGVzO1xuICAgIHZhciBib251cyA9IG1hdGNoWzNdP3BhcnNlSW50KG1hdGNoWzNdLCAxMCk6MDtcblxuICAgIHN3aXRjaCAobWF0Y2hbMl0pIHtcbiAgICAgIGNhc2UgJ0EnOlxuICAgICAgICByZXR1cm4gdGhpcy5hdmVEaWNlKG51bSwgYm9udXMpO1xuICAgICAgY2FzZSAnRic6XG4gICAgICAgIHNpZGVzID0gMztcbiAgICAgICAgYm9udXMgLT0gbnVtKjI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnJSc6XG4gICAgICAgIHNpZGVzID0gMTAwO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHNpZGVzID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kaWNlKG51bSwgc2lkZXMsIGJvbnVzKTtcbiAgfTtcbn0pKCk7XG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU2V0dXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qIEV4cG9ydCBvdXIgQVBJLiAqL1xud2luZG93LnVuZHVtID0ge1xuICBTaXR1YXRpb246IFNpdHVhdGlvbixcbiAgU2ltcGxlU2l0dWF0aW9uOiBTaW1wbGVTaXR1YXRpb24sXG5cbiAgUXVhbGl0eURlZmluaXRpb246IFF1YWxpdHlEZWZpbml0aW9uLFxuICBJbnRlZ2VyUXVhbGl0eTogSW50ZWdlclF1YWxpdHksXG4gIE5vblplcm9JbnRlZ2VyUXVhbGl0eTogTm9uWmVyb0ludGVnZXJRdWFsaXR5LFxuICBOdW1lcmljUXVhbGl0eTogTnVtZXJpY1F1YWxpdHksXG4gIFdvcmRTY2FsZVF1YWxpdHk6IFdvcmRTY2FsZVF1YWxpdHksXG4gIEZ1ZGdlQWRqZWN0aXZlc1F1YWxpdHk6IEZ1ZGdlQWRqZWN0aXZlc1F1YWxpdHksXG4gIE9uT2ZmUXVhbGl0eTogT25PZmZRdWFsaXR5LFxuICBZZXNOb1F1YWxpdHk6IFllc05vUXVhbGl0eSxcblxuICBRdWFsaXR5R3JvdXA6IFF1YWxpdHlHcm91cCxcblxuICBnYW1lOiBnYW1lLFxuXG4gIGlzSW50ZXJhY3RpdmU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW50ZXJhY3RpdmU7IH0sXG5cbiAgLy8gVGhlIHVuZHVtIHNldCBvZiB0cmFuc2xhdGVkIHN0cmluZ3MuXG4gIGxhbmd1YWdlOiB7fVxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIERlZmF1bHQgTWVzc2FnZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgZW4gPSB7XG4gIHRlcnJpYmxlOiBcInRlcnJpYmxlXCIsXG4gIHBvb3I6IFwicG9vclwiLFxuICBtZWRpb2NyZTogXCJtZWRpb2NyZVwiLFxuICBmYWlyOiBcImZhaXJcIixcbiAgZ29vZDogXCJnb29kXCIsXG4gIGdyZWF0OiBcImdyZWF0XCIsXG4gIHN1cGVyYjogXCJzdXBlcmJcIixcbiAgeWVzOiBcInllc1wiLFxuICBubzogXCJub1wiLFxuICBjaG9pY2U6IFwiQ2hvaWNlIHtudW1iZXJ9XCIsXG4gIG5vX2dyb3VwX2RlZmluaXRpb246IFwiQ291bGRuJ3QgZmluZCBhIGdyb3VwIGRlZmluaXRpb24gZm9yIHtpZH0uXCIsXG4gIGxpbmtfbm90X3ZhbGlkOiBcIlRoZSBsaW5rICd7bGlua30nIGRvZXNuJ3QgYXBwZWFyIHRvIGJlIHZhbGlkLlwiLFxuICBsaW5rX25vX2FjdGlvbjogXCJBIGxpbmsgd2l0aCBhIHNpdHVhdGlvbiBvZiAnLicsIG11c3QgaGF2ZSBhbiBhY3Rpb24uXCIsXG4gIHVua25vd25fc2l0dWF0aW9uOiBcIllvdSBjYW4ndCBtb3ZlIHRvIGFuIHVua25vd24gc2l0dWF0aW9uOiB7aWR9LlwiLFxuICBleGlzdGluZ19zaXR1YXRpb246IFwiWW91IGNhbid0IG92ZXJyaWRlIHNpdHVhdGlvbiB7aWR9IGluIEhUTUwuXCIsXG4gIGVyYXNlX21lc3NhZ2U6IFwiVGhpcyB3aWxsIHBlcm1hbmVudGx5IGRlbGV0ZSB0aGlzIGNoYXJhY3RlciBhbmQgaW1tZWRpYXRlbHkgcmV0dXJuIHlvdSB0byB0aGUgc3RhcnQgb2YgdGhlIGdhbWUuIEFyZSB5b3Ugc3VyZT9cIixcbiAgbm9fY3VycmVudF9zaXR1YXRpb246IFwiSSBjYW4ndCBkaXNwbGF5LCBiZWNhdXNlIHdlIGRvbid0IGhhdmUgYSBjdXJyZW50IHNpdHVhdGlvbi5cIixcbiAgbm9fbG9jYWxfc3RvcmFnZTogXCJObyBsb2NhbCBzdG9yYWdlIGF2YWlsYWJsZS5cIixcbiAgcmFuZG9tX3NlZWRfZXJyb3I6IFwiWW91IG11c3QgcHJvdmlkZSBhIHZhbGlkIHJhbmRvbSBzZWVkLlwiLFxuICByYW5kb21fZXJyb3I6IFwiSW5pdGlhbGl6ZSB0aGUgUmFuZG9tIHdpdGggYSBub24tZW1wdHkgc2VlZCBiZWZvcmUgdXNlLlwiLFxuICBkaWNlX3N0cmluZ19lcnJvcjogXCJDb3VsZG4ndCBpbnRlcnByZXQgeW91ciBkaWNlIHN0cmluZzogJ3tzdHJpbmd9Jy5cIlxufTtcblxuLy8gU2V0IHRoaXMgZGF0YSBhcyBib3RoIHRoZSBkZWZhdWx0IGZhbGxiYWNrIGxhbmd1YWdlLCBhbmQgdGhlIGVuZ2xpc2hcbi8vIHByZWZlcnJlZCBsYW5ndWFnZS5cbnVuZHVtLmxhbmd1YWdlW1wiXCJdID0gZW47XG51bmR1bS5sYW5ndWFnZVtcImVuXCJdID0gZW47XG5cbi8qIFNldCB1cCB0aGUgZ2FtZSB3aGVuIGV2ZXJ5dGhpbmcgaXMgbG9hZGVkLiAqL1xuZnVuY3Rpb24gcmVhZHkoZm4pIHtcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gJ2xvYWRpbmcnKXtcbiAgICBmbigpO1xuICB9IGVsc2Uge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmbik7XG4gIH1cbn1cblxucmVhZHkoZnVuY3Rpb24oKSB7XG4gIC8vIENvbXBpbGUgYWRkaXRpb25hbCBzaXR1YXRpb25zIGZyb20gSFRNTFxuICBsb2FkSFRNTFNpdHVhdGlvbnMoKTtcblxuICAvLyBIYW5kbGUgc3RvcmFnZS5cbiAgaWYgKGhhc0xvY2FsU3RvcmFnZSgpKSB7XG4gICAgdmFyIGVyYXNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlcmFzZVwiKTtcbiAgICBlcmFzZS5vbmNsaWNrID0gZG9FcmFzZTtcbiAgICBlcmFzZS5rZXlkb3duID0gZG9FcmFzZTtcbiAgICB2YXIgc2F2ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2F2ZVwiKTtcbiAgICBzYXZlLm9uY2xpY2sgPSBzYXZlR2FtZTtcbiAgICBzYXZlLmtleWRvd24gPSBzYXZlR2FtZTtcblxuICAgIHZhciBzdG9yZWRDaGFyYWN0ZXIgPSBsb2NhbFN0b3JhZ2VbZ2V0U2F2ZUlkKCldO1xuICAgIGlmIChzdG9yZWRDaGFyYWN0ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvYWRHYW1lKEpTT04ucGFyc2Uoc3RvcmVkQ2hhcmFjdGVyKSk7XG4gICAgICAgIHNhdmUuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICBlcmFzZS5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLCBmYWxzZSk7XG4gICAgICB9IGNhdGNoKGVycikge1xuICAgICAgICBkb0VyYXNlKHRydWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzYXZlLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgIGVyYXNlLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgc3RhcnRHYW1lKCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuYnV0dG9uc1wiKS5pbm5lckhUTUwgPSBcIjxwPlwiK1wibm9fbG9jYWxfc3RvcmFnZVwiLmwoKStcIjwvcD5cIjtcbiAgICBzdGFydEdhbWUoKTtcbiAgfVxuXG4gIC8vIERpc3BsYXkgdGhlIFwiY2xpY2sgdG8gYmVnaW5cIiBtZXNzYWdlLiAoV2UgZG8gdGhpcyBpbiBjb2RlXG4gIC8vIHNvIHRoYXQsIGlmIEphdmFzY3JpcHQgaXMgb2ZmLCBpdCBkb2Vzbid0IGhhcHBlbi4pXG4gIHNob3dCbG9jayhcImNsaWNrX21lc3NhZ2VcIik7XG5cbiAgLy8gU2hvdyB0aGUgZ2FtZSB3aGVuIHdlIGNsaWNrIG9uIHRoZSB0aXRsZS5cbiAgLy8gTm90ZTogaWYgeW91IGRvIGV2ZW50cyB3aXRoIG9uY2xpY2ssIHlvdSBoYXZlIHRvIGhhdmUgb25seSBvbmUgY2xpY2sgZXZlbnQgaGFuZGxlci5cbiAgLy8gWW91IGNhbiB1c2UgbW9yZSBjb21wbGV4IG1ldGhvZHMgaWYgeW91IGV4cGVjdCB0byBoYXZlIG1vcmUuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGl0bGVcIikub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgIHNob3dCbG9jayhcImNvbnRlbnRcIilcbiAgICBzaG93QmxvY2soXCJjb250ZW50X3dyYXBwZXJcIik7XG4gICAgc2hvd0Jsb2NrKFwibGVnYWxcIik7XG4gICAgc2hvd0Jsb2NrKFwidG9vbHNfd3JhcHBlclwiKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRpdGxlXCIpLnN0eWxlLmN1cnNvciA9IFwiZGVmYXVsdFwiO1xuICAgIGhpZGVCbG9jayhcImNsaWNrX21lc3NhZ2VcIik7XG4gIH07XG5cbi8qXG4gIC8vIEFueSBwb2ludCB0aGF0IGFuIG9wdGlvbiBsaXN0IGFwcGVhcnMsIGl0cyBvcHRpb25zIGFyZSBpdHNcbiAgLy8gZmlyc3QgbGlua3MuXG4gIHZhciBvcHRpb25MaW5rRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICAgIC8vIE1ha2Ugb3B0aW9uIGNsaWNrcyBwYXNzIHRocm91Z2ggdG8gdGhlaXIgZmlyc3QgbGluay5cbiAgICB2YXIgbGluayA9ICQoXCJhXCIsIHRoaXMpO1xuICAgIGlmIChsaW5rLmxlbmd0aCA+IDApIHtcbiAgICAgICQobGluay5nZXQoMCkpLmNsaWNrKCk7XG4gICAgfVxuICB9O1xuICBpdGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJ1bC5vcHRpb25zIGxpLCAjbWVudSBsaVwiKTtcbiAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChpdGVtcywgZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgpe1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBvcHRpb25MaW5rRXZlbnQpO1xuICB9KTtcbiovXG59KTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==