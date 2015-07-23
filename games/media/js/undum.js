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
    document.getElementById("content").offsetHeight + document.getElementById("title").offsetHeight + 60
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
  document.getElementById("save").setAttribute('disabled', false);
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

/* This function listens on content block to filter out link clicks. */
var linkClickHandler = function(event) {
  if (event.target.tagName.toLowerCase() === 'a') {
    event.preventDefault();
    processClick(event.target.href);
  }
}

/* This gets called when the user clicks a link to carry out an
 * action. */
var processClick = function(code) {
  var now = (new Date()).getTime() * 0.001;
  system.time = now - startTime;
  progress.sequence.push({link:code, when:system.time});
  return processLink(code);
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

  // handle the link clicks
  document.getElementById("content").addEventListener("click", linkClickHandler, false);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImludGVybmFsLmpzIiwiYXV0aG9yLmpzIiwic3lzdGVtLmpzIiwicHJpdmF0ZS5qcyIsInNldHVwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbmVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaDJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InVuZHVtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEludGVybmFsIEluZnJhc3RydWN0dXJlIEltcGxlbWVudGF0aW9ucyBbTkI6IFRoZXNlIGhhdmUgdG8gYmVcbi8vIGF0IHRoZSB0b3AsIGJlY2F1c2Ugd2UgdXNlIHRoZW0gYmVsb3csIGJ1dCB5b3UgY2FuIHNhZmVseVxuLy8gaWdub3JlIHRoZW0gYW5kIHNraXAgZG93biB0byB0aGUgbmV4dCBzZWN0aW9uLl1cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qIENyb2NrZm9yZCdzIGluaGVyaXQgZnVuY3Rpb24gKi9cbkZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyA9IGZ1bmN0aW9uKFBhcmVudCkge1xuICB2YXIgZCA9IHt9LCBwID0gKHRoaXMucHJvdG90eXBlID0gbmV3IFBhcmVudCgpKTtcbiAgdGhpcy5wcm90b3R5cGUudWJlciA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBpZiAoIShuYW1lIGluIGQpKSBkW25hbWVdID0gMDtcbiAgICB2YXIgZiwgciwgdCA9IGRbbmFtZV0sIHYgPSBQYXJlbnQucHJvdG90eXBlO1xuICAgIGlmICh0KSB7XG4gICAgICB3aGlsZSAodCkge1xuICAgICAgICB2ID0gdi5jb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gICAgICAgIHQgLT0gMTtcbiAgICAgIH1cbiAgICAgIGYgPSB2W25hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBmID0gcFtuYW1lXTtcbiAgICAgIGlmIChmID09IHRoaXNbbmFtZV0pIHtcbiAgICAgICAgZiA9IHZbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIGRbbmFtZV0gKz0gMTtcbiAgICByID0gZi5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzLCBbMV0pKTtcbiAgICBkW25hbWVdIC09IDE7XG4gICAgcmV0dXJuIHI7XG4gIH07XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gRmVhdHVyZSBkZXRlY3Rpb25cblxudmFyIGhhc0xvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaGFzU3RvcmFnZSA9IGZhbHNlO1xuICB0cnkge1xuICAgIGhhc1N0b3JhZ2UgPSAoJ2xvY2FsU3RvcmFnZScgaW4gd2luZG93KSAmJlxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZSAhPT0gbnVsbCAmJlxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZSAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIGNhdGNoIChlcnIpIHtcbiAgICAvLyBGaXJlZm94IHdpdGggdGhlIFwiQWx3YXlzIEFza1wiIGNvb2tpZSBhY2NlcHQgc2V0dGluZ1xuICAgIC8vIHdpbGwgdGhyb3cgYW4gZXJyb3Igd2hlbiBhdHRlbXB0aW5nIHRvIGFjY2VzcyBsb2NhbFN0b3JhZ2VcbiAgICBoYXNTdG9yYWdlID0gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIGhhc1N0b3JhZ2U7XG59O1xuXG4vLy8gQW5pbWF0aW9ucyAtIHlvdSBjYW4gdG90YWxseSByZWRlZmluZSB0aGVzZSEgRmFkZSBpbiBhbmQgZmFkZSBvdXQgYnkgZGVmYXVsdC5cbi8vLyBAcGFyYW0gaWQgc3RyaW5nIG9yIG9iamVjdFxudmFyIHNob3dCbG9jayA9IGZ1bmN0aW9uKGlkKSB7XG4gIHZhciBibG9jayA9IGlkO1xuICBpZiAodHlwZW9mIGlkID09PSBcInN0cmluZ1wiKSB7XG4gICAgdmFyIGJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICB9XG4gIGJsb2NrLmNsYXNzTGlzdC5hZGQoJ3Nob3cnKTtcbiAgYmxvY2suY2xhc3NMaXN0LnJlbW92ZSgnaGlkZScpO1xuICBibG9jay5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cblxudmFyIGhpZGVCbG9jayA9IGZ1bmN0aW9uKGlkKSB7XG4gIHZhciBibG9jayA9IGlkOyAvLyB0eXBlb2YgYmxvY2sgPT09IFwiZWxlbWVudFwiXG4gIGlmICh0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIpIHtcbiAgICB2YXIgYmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gIH1cbiAgaWYgKHR5cGVvZiBpZCA9PT0gXCJvYmplY3RcIikgeyAvLyBwcm9iYWJseSBOb2RlTGlzdFxuICAgIGlmIChpZC5sZW5ndGggPT0gMClcbiAgICAgIHJldHVybjtcbiAgICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGlkLCBmdW5jdGlvbihlbGVtZW50LCBpbmRleCkge1xuICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7XG4gICAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKTtcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHR5cGVvZiBibG9jay5jbGFzc0xpc3QgPT09IFwidW5kZWZpbmVkXCIpXG4gIHtcbiAgICBjb25zb2xlLmxvZyhcIlRyaWVkIHRvIGhpZGUgYW4gdW5kZWZpbmVkIGJsb2NrLlwiKTtcbiAgICBjb25zb2xlLmxvZyhpZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGJsb2NrLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTtcbiAgYmxvY2suY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xufVxuXG4vLyBBc3NlcnRpb25cblxudmFyIEFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLm5hbWUgPSBBc3NlcnRpb25FcnJvcjtcbn07XG5Bc3NlcnRpb25FcnJvci5pbmhlcml0cyhFcnJvcik7XG5cbnZhciBhc3NlcnQgPSBmdW5jdGlvbihleHByZXNzaW9uLCBtZXNzYWdlKSB7XG4gIGlmICghZXhwcmVzc2lvbikge1xuICAgIHRocm93IG5ldyBBc3NlcnRpb25FcnJvcihtZXNzYWdlKTtcbiAgfVxufTtcblxuLy8gT2JqZWN0IGV4dGVudGlvblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uKG91dCkge1xuICBvdXQgPSBvdXQgfHwge307XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGlmICghb2JqKVxuICAgICAgY29udGludWU7XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmpba2V5XSA9PT0gJ29iamVjdCcpXG4gICAgICAgICAgZXh0ZW5kKG91dFtrZXldLCBvYmpba2V5XSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBvdXRba2V5XSA9IG9ialtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuIiwiLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFR5cGVzIGZvciBBdXRob3IgVXNlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiBUaGUgZ2FtZSBpcyBzcGxpdCBpbnRvIHNpdHVhdGlvbnMsIHdoaWNoIHJlc3BvbmQgdG8gdXNlclxuICogY2hvaWNlcy4gU2l0dWF0aW9uIGlzIHRoZSBiYXNlIHR5cGUuIEl0IGhhcyB0aHJlZSBtZXRob2RzOlxuICogZW50ZXIsIGFjdCBhbmQgZXhpdCwgd2hpY2ggeW91IGltcGxlbWVudCB0byBwZXJmb3JtIGFueVxuICogcHJvY2Vzc2luZyBhbmQgb3V0cHV0IGFueSBjb250ZW50LiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbnNcbiAqIGRvIG5vdGhpbmcuXG4gKlxuICogWW91IGNhbiBlaXRoZXIgY3JlYXRlIHlvdXIgb3duIHR5cGUgb2YgU2l0dWF0aW9uLCBhbmQgYWRkXG4gKiBlbnRlciwgYWN0IGFuZC9vciBleGl0IGZ1bmN0aW9ucyB0byB0aGUgcHJvdG90eXBlIChzZWVcbiAqIFNpbXBsZVNpdHVhdGlvbiBpbiB0aGlzIGZpbGUgZm9yIGFuIGV4YW1wbGUgb2YgdGhhdCksIG9yIHlvdVxuICogY2FuIGdpdmUgdGhvc2UgZnVuY3Rpb25zIGluIHRoZSBvcHRzIHBhcmFtZXRlci4gVGhlIG9wdHNcbiAqIHBhcmFtZXRlciBpcyBhbiBvYmplY3QuIFNvIHlvdSBjb3VsZCB3cml0ZTpcbiAqXG4gKiAgICB2YXIgc2l0dWF0aW9uID0gU2l0dWF0aW9uKHtcbiAqICAgICAgICBlbnRlcjogZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIGZyb20pIHtcbiAqICAgICAgICAgICAgLi4uIHlvdXIgaW1wbGVtZW50YXRpb24gLi4uXG4gKiAgICAgICAgfVxuICogICAgfSk7XG4gKlxuICogSWYgeW91IHBhc3MgaW4gZW50ZXIsIGFjdCBhbmQvb3IgZXhpdCB0aHJvdWdoIHRoZXNlIG9wdGlvbnMsXG4gKiB0aGVuIHRoZXkgc2hvdWxkIGhhdmUgdGhlIHNhbWUgZnVuY3Rpb24gc2lnbmF0dXJlIGFzIHRoZSBmdWxsXG4gKiBmdW5jdGlvbiBkZWZpbml0aW9ucywgYmVsb3cuXG4gKlxuICogTm90ZSB0aGF0IFNpbXBsZVNpdHVhdGlvbiwgYSBkZXJpdmVkIHR5cGUgb2YgU2l0dWF0aW9uLCBjYWxsc1xuICogcGFzc2VkIGluIGVudGVyLCBhY3QgYW5kIGV4aXQgZnVuY3Rpb25zIEFTIFdFTEwgQVMgdGhlaXIgbm9ybWFsXG4gKiBhY3Rpb24uIFRoaXMgaXMgbW9zdCBvZnRlbiB3aGF0IHlvdSB3YW50OiB0aGUgbm9ybWFsIGJlaGF2aW9yXG4gKiBwbHVzIGEgbGl0dGxlIGV4dHJhIGN1c3RvbSBiZWhhdmlvci4gSWYgeW91IHdhbnQgdG8gb3ZlcnJpZGVcbiAqIHRoZSBiZWhhdmlvciBvZiBhIFNpbXBsZVNpdHVhdGlvbiwgeW91J2xsIGhhdmUgdG8gY3JlYXRlIGFcbiAqIGRlcml2ZWQgdHlwZSBhbmQgc2V0IHRoZSBlbnRlciwgYWN0IGFuZC9vciBleGl0IGZ1bmN0aW9uIG9uXG4gKiB0aGVpciBwcm90b3R5cGVzLiBJbiBtb3N0IGNhc2VzLCBob3dldmVyLCBpZiB5b3Ugd2FudCB0byBkb1xuICogc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50LCBpdCBpcyBiZXR0ZXIgdG8gZGVyaXZlIHlvdXJcbiAqIHR5cGUgZnJvbSB0aGlzIHR5cGU6IFNpdHVhdGlvbiwgcmF0aGVyIHRoYW4gb25lIG9mIGl0c1xuICogY2hpbGRyZW4uXG4gKlxuICogSW4gYWRkaXRpb24gdG8gZW50ZXIsIGV4aXQgYW5kIGFjdCwgdGhlIGZvbGxvd2luZyBvcHRpb25zXG4gKiByZWxhdGVkIHRvIGltcGxpY2l0IHNpdHVhdGlvbiBzZWxlY3Rpb24gYXJlIGF2YWlsYWJsZTpcbiAqXG4gKiBvcHRpb25UZXh0OiBhIHN0cmluZyBvciBhIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLFxuICogICAgIHNpdHVhdGlvbikgd2hpY2ggc2hvdWxkIHJldHVybiB0aGUgbGFiZWwgdG8gcHV0IGluIGFuXG4gKiAgICAgb3B0aW9uIGJsb2NrIHdoZXJlIGEgbGluayB0byB0aGlzIHNpdHVhdGlvbiBjYW4gYmVcbiAqICAgICBjaG9zZW4uIFRoZSBzaXR1YXRpb24gcGFzc2VkIGluIGlzIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlXG4gKiAgICAgb3B0aW9uIGJsb2NrIGlzIGJlaW5nIGRpc3BsYXllZC5cbiAqXG4gKiBjYW5WaWV3OiBhIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pIHdoaWNoIHNob3VsZFxuICogICAgIHJldHVybiB0cnVlIGlmIHRoaXMgc2l0dWF0aW9uIHNob3VsZCBiZSB2aXNpYmxlIGluIGFuXG4gKiAgICAgb3B0aW9uIGJsb2NrIGluIHRoZSBnaXZlbiBzaXR1YXRpb24uXG4gKlxuICogY2FuQ2hvb3NlOiBhIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pIHdoaWNoIHNob3VsZFxuICogICAgIHJldHVybiB0cnVlIGlmIHRoaXMgc2l0dWF0aW9uIHNob3VsZCBhcHBlYXIgY2xpY2thYmxlIGluIGFuXG4gKiAgICAgb3B0aW9uIGJsb2NrLiBSZXR1cm5pbmcgZmFsc2UgYWxsb3dzIHlvdSB0byBwcmVzZW50IHRoZVxuICogICAgIG9wdGlvbiBidXQgcHJldmVudCBpdCBiZWluZyBzZWxlY3RlZC4gWW91IG1heSB3YW50IHRvXG4gKiAgICAgaW5kaWNhdGUgdG8gdGhlIHBsYXllciB0aGF0IHRoZXkgbmVlZCB0byBjb2xsZWN0IHNvbWVcbiAqICAgICBpbXBvcnRhbnQgb2JqZWN0IGJlZm9yZSB0aGUgb3B0aW9uIGlzIGF2YWlsYWJsZSwgZm9yXG4gKiAgICAgZXhhbXBsZS5cbiAqXG4gKiB0YWdzOiBhIGxpc3Qgb2YgdGFncyBmb3IgdGhpcyBzaXR1YXRpb24sIHdoaWNoIGNhbiBiZSB1c2VkIGZvclxuICogICAgIGltcGxpY2l0IHNpdHVhdGlvbiBzZWxlY3Rpb24uIFRoZSB0YWdzIGNhbiBhbHNvIGJlIGdpdmVuIGFzXG4gKiAgICAgc3BhY2UsIHRhYiBvciBjb21tYSBzZXBhcmF0ZWQgdGFncyBpbiBhIHN0cmluZy4gTm90ZSB0aGF0LFxuICogICAgIHdoZW4gY2FsbGluZyBgZ2V0U2l0dWF0aW9uSWRDaG9pY2VzYCwgdGFncyBhcmUgcHJlZml4ZWQgd2l0aFxuICogICAgIGEgaGFzaCwgYnV0IHRoYXQgc2hvdWxkIG5vdCBiZSB0aGUgY2FzZSBoZXJlLiBKdXN0IHVzZSB0aGVcbiAqICAgICBwbGFpbiB0YWcgbmFtZS5cbiAqXG4gKiBwcmlvcml0eTogYSBudW1lcmljIHByaW9yaXR5IHZhbHVlIChkZWZhdWx0ID0gMSkuIFdoZW5cbiAqICAgICBzZWxlY3Rpbmcgc2l0dWF0aW9ucyBpbXBsaWNpdGx5LCBoaWdoZXIgcHJpb3JpdHkgc2l0dWF0aW9uc1xuICogICAgIGFyZSBjb25zaWRlcmVkIGZpcnN0LlxuICpcbiAqIGZyZXF1ZW5jeTogYSBudW1lcmljIHJlbGF0aXZlIGZyZXF1ZW5jeSAoZGVmYXVsdCA9IDEpLCBzbyAxMDBcbiAqICAgICB3b3VsZCBiZSAxMDAgdGltZXMgbW9yZSBmcmVxdWVudC4gV2hlbiB0aGVyZSBhcmUgbW9yZVxuICogICAgIG9wdGlvbnMgdGhhdCBjYW4gYmUgZGlzcGxheWVkLCBzaXR1YXRpb25zIHdpbGwgYmUgc2VsZWN0ZWRcbiAqICAgICByYW5kb21seSBiYXNlZCBvbiB0aGVpciBmcmVxdWVuY3kuXG4gKlxuICogZGlzcGxheU9yZGVyOiBhIG51bWVyaWMgb3JkZXJpbmcgdmFsdWUgKGRlZmF1bHQgPSAxKS4gV2hlblxuKiAgICAgc2l0dWF0aW9ucyBhcmUgc2VsZWN0ZWQgaW1wbGljaXRseSwgdGhlIHJlc3VsdHMgYXJlIG9yZGVyZWRcbiogICAgIGJ5IGluY3JlYXNpbmcgZGlzcGxheU9yZGVyLlxuKi9cbnZhciBTaXR1YXRpb24gPSBmdW5jdGlvbihvcHRzKSB7XG4gIGlmIChvcHRzKSB7XG4gICAgaWYgKG9wdHMuZW50ZXIpIHRoaXMuX2VudGVyID0gb3B0cy5lbnRlcjtcbiAgICBpZiAob3B0cy5hY3QpIHRoaXMuX2FjdCA9IG9wdHMuYWN0O1xuICAgIGlmIChvcHRzLmV4aXQpIHRoaXMuX2V4aXQgPSBvcHRzLmV4aXQ7XG5cbiAgICAvLyBPcHRpb25zIHJlbGF0ZWQgdG8gdGhpcyBzaXR1YXRpb24gYmVpbmcgYXV0b21hdGljYWxseVxuICAgIC8vIHNlbGVjdGVkIGFuZCBkaXNwbGF5ZWQgaW4gYSBsaXN0IG9mIG9wdGlvbnMuXG4gICAgdGhpcy5fb3B0aW9uVGV4dCA9IG9wdHMub3B0aW9uVGV4dDtcbiAgICB0aGlzLl9jYW5WaWV3ID0gb3B0cy5jYW5WaWV3IHx8IHRydWU7XG4gICAgdGhpcy5fY2FuQ2hvb3NlID0gb3B0cy5jYW5DaG9vc2UgfHwgdHJ1ZTtcbiAgICB0aGlzLl9wcmlvcml0eSA9IChvcHRzLnByaW9yaXR5ICE9PSB1bmRlZmluZWQpID8gb3B0cy5wcmlvcml0eSA6IDE7XG4gICAgdGhpcy5fZnJlcXVlbmN5ID1cbiAgICAgIChvcHRzLmZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSA/IG9wdHMuZnJlcXVlbmN5IDogMTtcbiAgICB0aGlzLl9kaXNwbGF5T3JkZXIgPVxuICAgICAgKG9wdHMuZGlzcGxheU9yZGVyICE9PSB1bmRlZmluZWQpID8gb3B0cy5kaXNwbGF5T3JkZXIgOiAxO1xuXG4gICAgLy8gVGFnIGFyZSBub3Qgc3RvcmVkIHdpdGggYW4gdW5kZXJzY29yZSwgYmVjYXVzZSB0aGV5IGFyZVxuICAgIC8vIGFjY2Vzc2VkIGRpcmVjdHkuIFRoZXkgc2hvdWxkIG5vdCBiZSBjb250ZXh0IHNlbnNpdGl2ZVxuICAgIC8vICh1c2UgdGhlIGNhblZpZXcgZnVuY3Rpb24gdG8gZG8gY29udGV4dCBzZW5zaXRpdmVcbiAgICAvLyBtYW5pcHVsYXRpb24pLlxuICAgIGlmIChvcHRzLnRhZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3B0cy50YWdzKSkge1xuICAgICAgICB0aGlzLnRhZ3MgPSBvcHRzLnRhZ3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRhZ3MgPSBvcHRzLnRhZ3Muc3BsaXQoL1sgXFx0LF0rLyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFncyA9IFtdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9jYW5WaWV3ID0gdHJ1ZTtcbiAgICB0aGlzLl9jYW5DaG9vc2UgPSB0cnVlO1xuICAgIHRoaXMuX3ByaW9yaXR5ID0gMTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPSAxO1xuICAgIHRoaXMuX2Rpc3BsYXlPcmRlciA9IDE7XG4gICAgdGhpcy50YWdzID0gW107XG4gIH1cbn07XG4vKiBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYWN0aW9uIHdoZW4gd2UgZW50ZXIgYSBzaXR1YXRpb24uIFRoZVxuICogbGFzdCBwYXJhbWV0ZXIgaW5kaWNhdGVzIHRoZSBzaXR1YXRpb24gd2UgaGF2ZSBqdXN0IGxlZnQ6IGl0XG4gKiBtYXkgYmUgbnVsbCBpZiB0aGlzIGlzIHRoZSBzdGFydGluZyBzaXR1YXRpb24uIFVubGlrZSB0aGVcbiAqIGV4aXQoKSBtZXRob2QsIHRoaXMgbWV0aG9kIGNhbm5vdCBwcmV2ZW50IHRoZSB0cmFuc2l0aW9uXG4gKiBoYXBwZW5pbmc6IGl0cyByZXR1cm4gdmFsdWUgaXMgaWdub3JlZC4gKi9cblNpdHVhdGlvbi5wcm90b3R5cGUuZW50ZXIgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgZnJvbSkge1xuICBpZiAodGhpcy5fZW50ZXIpIHRoaXMuX2VudGVyKGNoYXJhY3Rlciwgc3lzdGVtLCBmcm9tKTtcbn07XG4vKiBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYWN0aW9uIHdoZW4gd2UgY2Fycnkgb3V0IHNvbWUgYWN0aW9uIGluIGFcbiAqIHNpdHVhdGlvbiB0aGF0IGlzbid0IGludGVuZGVkIHRvIGxlYWQgdG8gYSBuZXcgc2l0dWF0aW9uLiAqL1xuU2l0dWF0aW9uLnByb3RvdHlwZS5hY3QgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKSB7XG4gIGlmICh0aGlzLl9hY3QpIHRoaXMuX2FjdChjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKTtcbn07XG4vKiBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYWN0aW9uIHdoZW4gd2UgZXhpdCBhIHNpdHVhdGlvbi4gVGhlIGxhc3RcbiAqIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhlIHNpdHVhdGlvbiB3ZSBhcmUgZ29pbmcgdG8uICovXG5TaXR1YXRpb24ucHJvdG90eXBlLmV4aXQgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgdG8pIHtcbiAgaWYgKHRoaXMuX2V4aXQpIHRoaXMuX2V4aXQoY2hhcmFjdGVyLCBzeXN0ZW0sIHRvKTtcbn07XG4vKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyBzaXR1YXRpb24gc2hvdWxkIGJlIGNvbnRhaW5lZCB3aXRoaW4gYVxuICogbGlzdCBvZiBvcHRpb25zIGdlbmVyYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoZSBnaXZlblxuICogc2l0dWF0aW9uLiAqL1xuU2l0dWF0aW9uLnByb3RvdHlwZS5jYW5WaWV3ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikge1xuICBpZiAodHlwZW9mKHRoaXMuX2NhblZpZXcpID09PSBcImZ1bmN0aW9uXCIgKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhblZpZXcoY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRoaXMuX2NhblZpZXc7XG4gIH1cbn07XG4vKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhpcyBzaXR1YXRpb24gc2hvdWxkIGJlIGNsaWNrYWJsZSB3aXRoaW4gYVxuICogbGlzdCBvZiBvcHRpb25zIGdlbmVyYXRlZCBhdXRvbWF0aWNhbGx5IGJ5IHRoZSBnaXZlbiBzaXR1YXRpb24uICovXG5TaXR1YXRpb24ucHJvdG90eXBlLmNhbkNob29zZSA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pIHtcbiAgaWYgKHR5cGVvZih0aGlzLl9jYW5DaG9vc2UpID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gdGhpcy5fY2FuQ2hvb3NlKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLl9jYW5DaG9vc2U7XG4gIH1cbn07XG4vKiBSZXR1cm5zIHRoZSB0ZXh0IHRoYXQgc2hvdWxkIGJlIHVzZWQgdG8gZGlzcGxheSB0aGlzIHNpdHVhdGlvblxuICogaW4gYW4gYXV0b21hdGljYWxseSBnZW5lcmF0ZWQgbGlzdCBvZiBjaG9pY2VzLiAqL1xuU2l0dWF0aW9uLnByb3RvdHlwZS5vcHRpb25UZXh0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbikge1xuICBpZiAodHlwZW9mKHRoaXMuX29wdGlvblRleHQpID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gdGhpcy5fb3B0aW9uVGV4dChjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0dWF0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhpcy5fb3B0aW9uVGV4dDtcbiAgfVxufTtcbi8qIFJldHVybnMgdGhlIHByaW9yaXR5LCBmcmVxdWVuY3kgYW5kIGRpc3BsYXlPcmRlciBmb3IgdGhpcyBzaXR1YXRpb24sXG4gKiB3aGVuIGJlaW5nIHNlbGVjdGVkIHVzaW5nIGBzeXN0ZW0uZ2V0U2l0dWF0aW9uSWRDaG9pY2VzYC4gKi9cblNpdHVhdGlvbi5wcm90b3R5cGUuY2hvaWNlRGF0YSA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pIHtcbiAgcmV0dXJuIHtcbnByaW9yaXR5OiB0aGlzLl9wcmlvcml0eSxcbiAgICAgICAgICAgIGZyZXF1ZW5jeTogdGhpcy5fZnJlcXVlbmN5LFxuICAgICAgICAgICAgZGlzcGxheU9yZGVyOiB0aGlzLl9kaXNwbGF5T3JkZXJcbiAgfTtcbn07XG5cbi8qIEEgc2ltcGxlIHNpdHVhdGlvbiBoYXMgYSBibG9jayBvZiBjb250ZW50IHRoYXQgaXQgZGlzcGxheXMgd2hlblxuICogdGhlIHNpdHVhdGlvbiBpcyBlbnRlcmVkLiBUaGUgY29udGVudCBtdXN0IGJlIHZhbGlkIFwiRGlzcGxheVxuICogQ29udGVudFwiIChzZWUgYFN5c3RlbS5wcm90b3R5cGUud3JpdGVgIGZvciBhIGRlZmluaXRpb24pLiBUaGlzXG4gKiBjb25zdHJ1Y3RvciBoYXMgb3B0aW9ucyB0aGF0IGNvbnRyb2wgaXRzIGJlaGF2aW9yOlxuICpcbiAqIGhlYWRpbmc6IFRoZSBvcHRpb25hbCBgaGVhZGluZ2Agd2lsbCBiZSB1c2VkIGFzIGEgc2VjdGlvbiB0aXRsZVxuICogICAgIGJlZm9yZSB0aGUgY29udGVudCBpcyBkaXNwbGF5ZWQuIFRoZSBoZWFkaW5nIGNhbiBiZSBhbnlcbiAqICAgICBIVE1MIHN0cmluZywgaXQgZG9lc24ndCBuZWVkIHRvIGJlIFwiRGlzcGxheSBDb250ZW50XCIuIElmXG4gKiAgICAgdGhlIGhlYWRpbmcgaXMgbm90IGdpdmVuLCBubyBoZWFkaW5nIHdpbGwgYmUgZGlzcGxheWVkLiBJZlxuICogICAgIGEgaGVhZGluZyBpcyBnaXZlbiwgYW5kIG5vIG9wdGlvblRleHQgaXMgc3BlY2lmaWVkIChzZWVcbiAqICAgICBgU2l0dWF0aW9uYCBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBgb3B0aW9uVGV4dGApLCB0aGVuIHRoZVxuICogICAgIGhlYWRpbmcgd2lsbCBhbHNvIGJlIHVzZWQgZm9yIHRoZSBzaXR1YXRpb24ncyBvcHRpb24gdGV4dC5cbiAqXG4gKiBhY3Rpb25zOiBUaGlzIHNob3VsZCBiZSBhbiBvYmplY3QgbWFwcGluZyBhY3Rpb24gSWRzIHRvIGFcbiAqICAgICByZXNwb25zZS4gVGhlIHJlc3BvbnNlIHNob3VsZCBlaXRoZXIgYmUgXCJEaXNwbGF5IENvbnRlbnRcIlxuICogICAgIHRvIGRpc3BsYXkgaWYgdGhpcyBhY3Rpb24gaXMgY2FycmllZCBvdXQsIG9yIGl0IHNob3VsZCBiZSBhXG4gKiAgICAgZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIGFjdGlvbikgdGhhdCB3aWxsIHByb2Nlc3MgdGhlXG4gKiAgICAgYWN0aW9uLlxuICpcbiAqIGNob2ljZXM6IEEgbGlzdCBvZiBzaXR1YXRpb24gaWRzIGFuZCB0YWdzIHRoYXQsIGlmIGdpdmVuLCB3aWxsXG4gKiAgICAgYmUgdXNlZCB0byBjb21waWxlIGFuIGltcGxpY2l0IG9wdGlvbiBibG9jayB1c2luZ1xuICogICAgIGBnZXRTaXR1YXRpb25JZENob2ljZXNgIChzZWUgdGhhdCBmdW5jdGlvbiBmb3IgbW9yZSBkZXRhaWxzXG4gKiAgICAgb2YgaG93IHRoaXMgd29ya3MpLiBUYWdzIGluIHRoaXMgbGlzdCBzaG91bGQgYmUgcHJlZml4ZWRcbiAqICAgICB3aXRoIGEgaGFzaCAjIHN5bWJvbCwgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHNpdHVhdGlvblxuICogICAgIGlkcy4gSWYganVzdCBhIHNpbmdsZSB0YWcgb3IgaWQgaXMgbmVlZGVkLCBpdCBjYW4gYmUgcGFzc2VkXG4gKiAgICAgaW4gYXMgYSBzdHJpbmcgd2l0aG91dCB3cmFwcGluZyBpbnRvIGEgbGlzdC5cbiAqXG4gKiBtaW5DaG9pY2VzOiBJZiBgY2hvaWNlc2AgaXMgZ2l2ZW4sIGFuZCBhbiBpbXBsaWNpdCBjaG9pY2UgYmxvY2tcbiAqICAgICBzaG91bGQgYmUgY29tcGlsZWQsIHNldCB0aGlzIG9wdGlvbiB0byByZXF1aXJlIGF0IGxlYXN0XG4gKiAgICAgdGhpcyBudW1iZXIgb2Ygb3B0aW9ucyB0byBiZSBkaXNwbGF5ZWQuIFNlZVxuICogICAgIGBnZXRTaXR1YXRpb25JZENob2ljZXNgIGZvciBhIGRlc2NyaXB0aW9uIG9mIHRoZSBhbGdvcml0aG0gYnlcbiAqICAgICB3aGljaCB0aGlzIGhhcHBlbnMuIElmIHlvdSBkbyBub3Qgc3BlY2lmeSB0aGUgYGNob2ljZXNgXG4gKiAgICAgb3B0aW9uLCB0aGVuIHRoaXMgb3B0aW9uIHdpbGwgYmUgaWdub3JlZC5cbiAqXG4gKiBtYXhDaG9pY2VzOiBJZiBgY2hvaWNlc2AgaXMgZ2l2ZW4sIGFuZCBhbiBpbXBsaWNpdCBjaG9pY2UgYmxvY2tcbiAqICAgICBzaG91bGQgYmUgY29tcGlsZWQsIHNldCB0aGlzIG9wdGlvbiB0byByZXF1aXJlIG5vIG1vcmUgdGhhblxuICogICAgIHRoaXMgbnVtYmVyIG9mIG9wdGlvbnMgdG8gYmUgZGlzcGxheWVkLiBTZWVcbiAqICAgICBgZ2V0U2l0dWF0aW9uSWRDaG9pY2VzYCBmb3IgYSBkZXNjcmlwdGlvbiBvZiB0aGUgYWxnb3JpdGhtXG4gKiAgICAgYnkgd2hpY2ggdGhpcyBoYXBwZW5zLiBJZiB5b3UgZG8gbm90IHNwZWNpZnkgdGhlIGBjaG9pY2VzYFxuICogICAgIG9wdGlvbiwgdGhlbiB0aGlzIG9wdGlvbiB3aWxsIGJlIGlnbm9yZWQuXG4gKlxuICogVGhlIHJlbWFpbmluZyBvcHRpb25zIGluIHRoZSBgb3B0c2AgcGFyYW1ldGVyIGFyZSB0aGUgc2FtZSBhcyBmb3JcbiAqIHRoZSBiYXNlIFNpdHVhdGlvbi5cbiAqL1xudmFyIFNpbXBsZVNpdHVhdGlvbiA9IGZ1bmN0aW9uKGNvbnRlbnQsIG9wdHMpIHtcbiAgU2l0dWF0aW9uLmNhbGwodGhpcywgb3B0cyk7XG4gIHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG4gIHRoaXMuaGVhZGluZyA9IG9wdHMgJiYgb3B0cy5oZWFkaW5nO1xuICB0aGlzLmFjdGlvbnMgPSBvcHRzICYmIG9wdHMuYWN0aW9ucztcblxuICB0aGlzLmNob2ljZXMgPSBvcHRzICYmIG9wdHMuY2hvaWNlcztcbiAgdGhpcy5taW5DaG9pY2VzID0gb3B0cyAmJiBvcHRzLm1pbkNob2ljZXM7XG4gIHRoaXMubWF4Q2hvaWNlcyA9IG9wdHMgJiYgb3B0cy5tYXhDaG9pY2VzO1xufTtcblNpbXBsZVNpdHVhdGlvbi5pbmhlcml0cyhTaXR1YXRpb24pO1xuU2ltcGxlU2l0dWF0aW9uLnByb3RvdHlwZS5lbnRlciA9IGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBmcm9tKSB7XG4gIGlmICh0aGlzLmhlYWRpbmcpIHtcbiAgICBpZiAodHlwZW9mKHRoaXMuaGVhZGluZykgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgc3lzdGVtLndyaXRlSGVhZGluZyh0aGlzLmhlYWRpbmcoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN5c3RlbS53cml0ZUhlYWRpbmcodGhpcy5oZWFkaW5nKTtcbiAgICB9XG4gIH1cbiAgaWYgKHRoaXMuX2VudGVyKSB0aGlzLl9lbnRlcihjaGFyYWN0ZXIsIHN5c3RlbSwgZnJvbSk7XG4gIGlmICh0aGlzLmNvbnRlbnQpIHtcbiAgICBpZiAodHlwZW9mKHRoaXMuY29udGVudCkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgc3lzdGVtLndyaXRlKHRoaXMuY29udGVudCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3lzdGVtLndyaXRlKHRoaXMuY29udGVudCk7XG4gICAgfVxuICB9XG4gIGlmICh0aGlzLmNob2ljZXMpIHtcbiAgICB2YXIgY2hvaWNlcyA9IHN5c3RlbS5nZXRTaXR1YXRpb25JZENob2ljZXModGhpcy5jaG9pY2VzLFxuICAgICAgICB0aGlzLm1pbkNob2ljZXMsXG4gICAgICAgIHRoaXMubWF4Q2hvaWNlcyk7XG4gICAgc3lzdGVtLndyaXRlQ2hvaWNlcyhjaG9pY2VzKTtcbiAgfVxufTtcblNpbXBsZVNpdHVhdGlvbi5wcm90b3R5cGUuYWN0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIGFjdGlvbikge1xuICB2YXIgcmVzcG9uc2UgPSB0aGlzLmFjdGlvbnNbYWN0aW9uXTtcbiAgdHJ5IHtcbiAgICByZXNwb25zZShjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKHJlc3BvbnNlKSBzeXN0ZW0ud3JpdGUocmVzcG9uc2UpO1xuICB9XG4gIGlmICh0aGlzLl9hY3QpIHRoaXMuX2FjdChjaGFyYWN0ZXIsIHN5c3RlbSwgYWN0aW9uKTtcbn07XG5TaW1wbGVTaXR1YXRpb24ucHJvdG90eXBlLm9wdGlvblRleHQgPSBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgc2l0bikge1xuICB2YXIgcGFyZW50UmVzdWx0ID0gU2l0dWF0aW9uLnByb3RvdHlwZS5vcHRpb25UZXh0LmNhbGwodGhpcywgY2hhcmFjdGVyLFxuICAgICAgc3lzdGVtLCBzaXRuKTtcbiAgaWYgKHBhcmVudFJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHRoaXMuaGVhZGluZztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyZW50UmVzdWx0O1xuICB9XG59O1xuXG4vKiBJbnN0YW5jZXMgb2YgdGhpcyBjbGFzcyBkZWZpbmUgdGhlIHF1YWxpdGllcyB0aGF0IGNoYXJhY3RlcnNcbiAqIG1heSBwb3NzZXNzLiBUaGUgdGl0bGUgc2hvdWxkIGJlIGEgc3RyaW5nLCBhbmQgY2FuIGNvbnRhaW5cbiAqIEhUTUwuIE9wdGlvbnMgYXJlIHBhc3NlZCBpbiBpbiB0aGUgb3B0cyBwYXJhbWV0ZXIuIFRoZVxuICogZm9sbG93aW5nIG9wdGlvbnMgYXJlIGF2YWlsYWJsZS5cbiAqXG4gKiBwcmlvcml0eSAtIEEgc3RyaW5nIHVzZWQgdG8gc29ydCBxdWFsaXRpZXMgd2l0aGluIHRoZWlyXG4gKiAgICAgZ3JvdXBzLiBXaGVuIHRoZSBzeXN0ZW0gZGlzcGxheXMgYSBsaXN0IG9mIHF1YWxpdGllcyB0aGV5XG4gKiAgICAgd2lsbCBiZSBzb3J0ZWQgYnkgdGhpcyBzdHJpbmcuIElmIHlvdSBkb24ndCBnaXZlIGFcbiAqICAgICBwcmlvcml0eSwgdGhlbiB0aGUgdGl0bGUgd2lsbCBiZSB1c2VkLCBzbyB5b3UnbGwgZ2V0XG4gKiAgICAgYWxwaGFiZXRpYyBvcmRlci4gTm9ybWFsbHkgeW91IGVpdGhlciBkb24ndCBnaXZlIGFcbiAqICAgICBwcmlvcml0eSwgb3IgZWxzZSB1c2UgYSBwcmlvcml0eSBzdHJpbmcgY29udGFpbmluZyAwLXBhZGRlZFxuICogICAgIG51bWJlcnMgKGUuZy4gXCIwMDAwMVwiKS5cbiAqXG4gKiBncm91cCAtIFRoZSBJZCBvZiBhIGdyb3VwIGluIHdoaWNoIHRvIGRpc3BsYXkgdGhpc1xuICogICAgIHBhcmFtZXRlci4gVGhlIGNvcnJlc3BvbmRpbmcgZ3JvdXAgbXVzdCBiZSBkZWZpbmVkIGluXG4gKiAgICAgeW91ciBgdW5kdW0uZ2FtZS5xdWFsaXR5R3JvdXBzYCBwcm9wZXJ0eS5cbiAqXG4gKiBleHRyYUNsYXNzZXMgLSBUaGVzZSBjbGFzc2VzIHdpbGwgYmUgYXR0YWNoZWQgdG8gdGhlIDxkaXY+IHRhZ1xuICogICAgIHRoYXQgc3Vycm91bmRzIHRoZSBxdWFsaXR5IHdoZW4gaXQgaXMgZGlzcGxheWVkLiBBIGNvbW1vblxuICogICAgIHVzZSBmb3IgdGhpcyBpcyB0byBhZGQgaWNvbnMgcmVwcmVzZW50aW5nIHRoZSBxdWFsaXR5LiBJblxuICogICAgIHlvdXIgQ1NTIGRlZmluZSBhIGNsYXNzIGZvciBlYWNoIGljb24sIHRoZW4gcGFzcyB0aG9zZVxuICogICAgIGNsYXNzZXMgaW50byB0aGUgYXBwcm9wcmlhdGUgcXVhbGl0eSBkZWZpbml0aW9ucy5cbiAqXG4gKiBPbmUga2V5IHB1cnBvc2Ugb2YgUXVhbGl0eURlZmluaXRpb24gaXMgdG8gZm9ybWF0IHRoZSBxdWFsaXR5XG4gKiB2YWx1ZSBmb3IgZGlzcGxheS4gUXVhbGl0eSB2YWx1ZXMgYXJlIGFsd2F5cyBzdG9yZWQgYXMgbnVtZXJpY1xuICogdmFsdWVzLCBidXQgbWF5IGJlIGRpc3BsYXllZCBpbiB3b3JkcyBvciBzeW1ib2xzLiBBIG51bWJlciBvZlxuICogc3ViLXR5cGVzIG9mIFF1YWxpdHlEZWZpbml0aW9uIGFyZSBnaXZlbiB0aGF0IGZvcm1hdCB0aGVpclxuICogdmFsdWVzIGluIGRpZmZlcmVudCB3YXlzLlxuICovXG52YXIgUXVhbGl0eURlZmluaXRpb24gPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICB2YXIgbXlPcHRzID0gZXh0ZW5kKG9wdHMsIHtcbiAgICBwcmlvcml0eTogdGl0bGUsXG4gICAgZ3JvdXA6IG51bGwsXG4gICAgZXh0cmFDbGFzc2VzOiBudWxsXG4gIH0pO1xuICB0aGlzLnRpdGxlID0gdGl0bGU7XG4gIHRoaXMucHJpb3JpdHkgPSBteU9wdHMucHJpb3JpdHk7XG4gIHRoaXMuZ3JvdXAgPSBteU9wdHMuZ3JvdXA7XG4gIHRoaXMuZXh0cmFDbGFzc2VzID0gbXlPcHRzLmV4dHJhQ2xhc3Nlcztcbn07XG4vKiBGb3JtYXRzIHRoZSB2YWx1ZSAod2hpY2ggaXMgYWx3YXlzIG51bWVyaWMpIGludG8gdGhlIHZhbHVlIHRvXG4gKiBiZSBkaXNwbGF5ZWQuIFRoZSByZXN1bHQgc2hvdWxkIGJlIEhUTUwgKGJ1dCBubyB0YWdzIGFyZVxuICogbmVlZGVkKS4gSWYgbnVsbCBpcyByZXR1cm5lZCwgdGhlbiB0aGUgcXVhbGl0eSBkZWZpbml0aW9uIHdpbGxcbiAqIG5vdCBiZSBkaXNwbGF5ZWQsIHNvIGlmIHlvdSB3YW50IGFuIGVtcHR5IHZhbHVlIHJldHVybiBhbiBlbXB0eVxuICogc3RyaW5nLiAqL1xuUXVhbGl0eURlZmluaXRpb24ucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGNoYXJhY3RlciwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG59O1xuXG4vKiBBIHF1YWxpdHkgdGhhdCBpcyBhbHdheXMgZGlzcGxheWVkIGFzIHRoZSBuZWFyZXN0IGludGVnZXIgb2ZcbiAqIHRoZSBjdXJyZW50IHZhbHVlLCByb3VuZGVkIGRvd24uIE9wdGlvbnMgKGluIHRoZSBvcHRzXG4gKiBwYXJhbWV0ZXIpIGFyZSB0aGUgc2FtZSBhcyBmb3IgUXVhbGl0eURlZmluaXRpb24uICovXG52YXIgSW50ZWdlclF1YWxpdHkgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICBRdWFsaXR5RGVmaW5pdGlvbi5jYWxsKHRoaXMsIHRpdGxlLCBvcHRzKTtcbn07XG5JbnRlZ2VyUXVhbGl0eS5pbmhlcml0cyhRdWFsaXR5RGVmaW5pdGlvbik7XG5JbnRlZ2VyUXVhbGl0eS5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oY2hhcmFjdGVyLCB2YWx1ZSkge1xuICByZXR1cm4gTWF0aC5mbG9vcih2YWx1ZSkudG9TdHJpbmcoKTtcbn07XG5cbi8qIEEgcXVhbGl0eSB0aGF0IGRpc3BsYXlzIGFzIGFuIEludGVnZXJRdWFsaXR5LCB1bmxlc3MgaXQgaXNcbiAqIHplcm8sIHdoZW4gaXQgaXMgb21pdHRlZC4gT3B0aW9ucyAoaW4gdGhlIG9wdHMgKiBwYXJhbWV0ZXIpIGFyZVxuICogdGhlIHNhbWUgYXMgZm9yIFF1YWxpdHlEZWZpbml0aW9uLiAqL1xudmFyIE5vblplcm9JbnRlZ2VyUXVhbGl0eSA9IGZ1bmN0aW9uKHRpdGxlLCBvcHRzKSB7XG4gIEludGVnZXJRdWFsaXR5LmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xufTtcbk5vblplcm9JbnRlZ2VyUXVhbGl0eS5pbmhlcml0cyhJbnRlZ2VyUXVhbGl0eSk7XG5Ob25aZXJvSW50ZWdlclF1YWxpdHkucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGNoYXJhY3RlciwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIEludGVnZXJRdWFsaXR5LnByb3RvdHlwZS5mb3JtYXQuY2FsbChcbiAgICAgIHRoaXMsIGNoYXJhY3RlciwgdmFsdWVcbiAgICApO1xuICB9XG59O1xuXG4vKiBBIHF1YWxpdHkgdGhhdCBkaXNwbGF5cyBpdHMgZnVsbCBudW1lcmljIHZhbHVlLCBpbmNsdWRpbmdcbiAqIGRlY2ltYWwgY29tcG9uZW50LiBUaGlzIGlzIGFjdHVhbGx5IGEgdHJpdmlhbCB3cmFwcGVyIGFyb3VuZFxuICogdGhlIFF1YWxpdHlEZWZpbml0aW9uIGNsYXNzLCB3aGljaCBmb3JtYXRzIGluIHRoZSBzYW1lXG4gKiB3YXkuIE9wdGlvbnMgKGluIHRoZSBvcHRzIHBhcmFtZXRlcikgYXJlIHRoZSBzYW1lIGFzIGZvclxuICogUXVhbGl0eURlZmluaXRpb24uICovXG52YXIgTnVtZXJpY1F1YWxpdHkgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICBRdWFsaXR5RGVmaW5pdGlvbi5jYWxsKHRoaXMsIHRpdGxlLCBvcHRzKTtcbn07XG5OdW1lcmljUXVhbGl0eS5pbmhlcml0cyhRdWFsaXR5RGVmaW5pdGlvbik7XG5cbi8qIEEgcXVhbGl0eSB0aGF0IGRpc3BsYXlzIGl0cyB2YWx1ZXMgYXMgb25lIG9mIGEgc2V0IG9mXG4gKiB3b3Jkcy4gVGhlIHF1YWxpdHkgdmFsdWUgaXMgZmlyc3Qgcm91bmRlZCBkb3duIHRvIHRoZSBuZWFyZXN0XG4gKiBpbnRlZ2VyLCB0aGVuIHRoaXMgdmFsdWUgaXMgdXNlZCB0byBzZWxlY3QgYSB3b3JkIHRvXG4gKiBkaXNwbGF5LiBUaGUgb2Zmc2V0IHBhcmFtZXRlciAob3B0aW9uYWxseSBwYXNzZWQgaW4gYXMgcGFydCBvZlxuICogdGhlIG9wdHMgb2JqZWN0KSBjb250cm9scyB3aGF0IG51bWJlciBtYXBzIHRvIHdoYXQgd29yZC5cbiAqXG4gKiBUaGUgZm9sbG93aW5nIG9wdGlvbnMgKGluIHRoZSBvcHRzIHBhcmFtZXRlcikgYXJlIGF2YWlsYWJsZTpcbiAqXG4gKiBvZmZzZXQgLSBXaXRoIG9mZnNldD0wICh0aGUgZGVmYXVsdCksIHRoZSBxdWFudGl0eSB2YWx1ZSBvZiAwXG4gKiAgICAgd2lsbCBtYXAgdG8gdGhlIGZpcnN0IHdvcmQsIGFuZCBzbyBvbi4gSWYgb2Zmc2V0IGlzXG4gKiAgICAgbm9uLXplcm8gdGhlbiB0aGUgdmFsdWUgZ2l2ZW4gd2lsbCBjb3JyZXNwb25kIHRvIHRoZSBmaXJzdFxuICogICAgIHdvcmQgaW4gdGhlIGxpc3QuIFNvIGlmIG9mZnNldD00LCB0aGVuIHRoZSBmaXJzdCB3b3JkIGluXG4gKiAgICAgdGhlIGxpc3Qgd2lsbCBiZSB1c2VkIGZvciB2YWx1ZT00LlxuICpcbiAqIHVzZUJvbnVzZXMgLSBJZiB0aGlzIGlzIHRydWUgKHRoZSBkZWZhdWx0KSwgdGhlbiB2YWx1ZXMgb3V0c2lkZVxuICogICAgIHRoZSByYW5nZSBvZiB3b3JkcyB3aWxsIGJlIGNvbnN0cnVjZWQgZnJvbSB0aGUgd29yZCBhbmQgYVxuICogICAgIG51bWVyaWMgYm9udXMuIFNvIHdpdGggb2Zmc2V0PTAgYW5kIGZpdmUgd29yZHMsIHRoZSBsYXN0IG9mXG4gKiAgICAgd2hpY2ggaXMgJ2FtYXppbmcnLCBhIHNjb3JlIG9mIHNpeCB3b3VsZCBnaXZlICdhbWF6aW5nKzEnLlxuICogICAgIGlmIHRoaXMgaXMgZmFsc2UsIHRoZW4gdGhlIGJvbnVzIHdvdWxkIGJlIG9taXR0ZWQsIHNvXG4gKiAgICAgYW55dGhpbmcgYmV5b25kICdhbWF6aW5nJyBpcyBzdGlsbCAnYW1hemluZycuXG4gKlxuICogT3RoZXIgb3B0aW9ucyBhcmUgdGhlIHNhbWUgYXMgZm9yIFF1YWxpdHlEZWZpbml0aW9uLlxuICovXG52YXIgV29yZFNjYWxlUXVhbGl0eSA9IGZ1bmN0aW9uKHRpdGxlLCB2YWx1ZXMsIG9wdHMpIHtcbiAgdmFyIG15T3B0cyA9IGV4dGVuZChvcHRzLCB7XG4gICAgb2Zmc2V0OiBudWxsLFxuICAgIHVzZUJvbnVzZXM6IHRydWVcbiAgfSk7XG4gIFF1YWxpdHlEZWZpbml0aW9uLmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xuICB0aGlzLnZhbHVlcyA9IHZhbHVlcztcbiAgdGhpcy5vZmZzZXQgPSBteU9wdHMub2Zmc2V0O1xuICB0aGlzLnVzZUJvbnVzZXMgPSBteU9wdHMudXNlQm9udXNlcztcbn07XG5Xb3JkU2NhbGVRdWFsaXR5LmluaGVyaXRzKFF1YWxpdHlEZWZpbml0aW9uKTtcbldvcmRTY2FsZVF1YWxpdHkucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGNoYXJhY3RlciwgdmFsdWUpIHtcbiAgdmFyIHZhbCA9IE1hdGguZmxvb3IodmFsdWUgLSB0aGlzLm9mZnNldCk7XG4gIHZhciBtb2QgPSBcIlwiO1xuICBpZiAodmFsIDwgMCkge1xuICAgIG1vZCA9IHZhbC50b1N0cmluZygpO1xuICAgIHZhbCA9IDA7XG4gIH0gZWxzZSBpZiAodmFsID49IHRoaXMudmFsdWVzLmxlbmd0aCkge1xuICAgIG1vZCA9IFwiK1wiICsgKHZhbCAtIHRoaXMudmFsdWVzLmxlbmd0aCArIDEpLnRvU3RyaW5nKCk7XG4gICAgdmFsID0gdGhpcy52YWx1ZXMubGVuZ3RoIC0gMTtcbiAgfVxuICBpZiAoIXRoaXMudXNlQm9udXNlcykgbW9kID0gXCJcIjtcbiAgaWYgKHRoaXMudmFsdWVzW3ZhbF0gPT09IG51bGwpIHJldHVybiBudWxsO1xuICByZXR1cm4gdGhpcy52YWx1ZXNbdmFsXSArIG1vZDsgLy8gVHlwZSBjb2VyY2lvblxufTtcblxuLyogQSBzcGVjaWFsaXphdGlvbiBvZiBXb3JkU2NhbGVRdWFsaXR5IHRoYXQgdXNlcyB0aGUgRlVER0UgUlBHJ3NcbiAqIGFkamVjdGl2ZSBzY2FsZSAoZnJvbSAndGVycmlibGUnIGF0IC0zIHRvICdzdXBlcmInIGF0ICszKS4gVGhlXG4gKiBvcHRpb25zIGFyZSBhcyBmb3IgV29yZFNjYWxlUXVhbGl0eS4gSW4gcGFydGljdWxhciB5b3UgY2FuIHVzZVxuICogdGhlIG9mZnNldCBvcHRpb24gdG8gY29udHJvbCB3aGVyZSB0aGUgc2NhbGUgc3RhcnRzLiBTbyB5b3VcbiAqIGNvdWxkIG1vZGVsIGEgcXVhbGl0eSB0aGF0IGV2ZXJ5b25lIHN0YXJ0cyBvZmYgYXMgJ3RlcnJpYmxlJ1xuICogKHN1Y2ggYXMgTnVjbGVhciBQaHlzaWNzKSB3aXRoIGFuIG9mZnNldCBvZiAwLCB3aGlsZSBhbm90aGVyIHRoYXRcbiAqIGlzIG1vcmUgY29tbW9uIChzdWNoIGFzIEhlYWx0aCkgY291bGQgaGF2ZSBhbiBvZmZzZXQgb2YgLTUgc29cbiAqIGV2ZXJ5b25lIHN0YXJ0cyB3aXRoICdncmVhdCcuXG4gKi9cbnZhciBGdWRnZUFkamVjdGl2ZXNRdWFsaXR5ID0gZnVuY3Rpb24odGl0bGUsIG9wdHMpIHtcbiAgV29yZFNjYWxlUXVhbGl0eS5jYWxsKHRoaXMsIHRpdGxlLCBbXG4gICAgXCJ0ZXJyaWJsZVwiLmwoKSxcbiAgICBcInBvb3JcIi5sKCksXG4gICAgXCJtZWRpb2NyZVwiLmwoKSxcbiAgICBcImZhaXJcIi5sKCksXG4gICAgXCJnb29kXCIubCgpLFxuICAgIFwiZ3JlYXRcIi5sKCksXG4gICAgXCJzdXBlcmJcIi5sKClcbiAgXSwgb3B0cyk7XG4gIGlmICghKCdvZmZzZXQnIGluIG9wdHMpKSB0aGlzLm9mZnNldCA9IC0zO1xufTtcbkZ1ZGdlQWRqZWN0aXZlc1F1YWxpdHkuaW5oZXJpdHMoV29yZFNjYWxlUXVhbGl0eSk7XG5cbi8qIEFuIGJvb2xlYW4gcXVhbGl0eSB0aGF0IHJlbW92ZXMgaXRzZWxmIGZyb20gdGhlIHF1YWxpdHkgbGlzdCBpZlxuICogaXQgaGFzIGEgemVybyB2YWx1ZS4gSWYgaXQgaGFzIGEgbm9uLXplcm8gdmFsdWUsIGl0cyB2YWx1ZVxuICogZmllbGQgaXMgdXN1YWxseSBsZWZ0IGVtcHR5LCBidXQgeW91IGNhbiBzcGVjaWZ5IHlvdXIgb3duXG4gKiBzdHJpbmcgdG8gZGlzcGxheSBhcyB0aGUgYG9uRGlzcGxheWAgcGFyYW1ldGVyIG9mIHRoZSBvcHRzXG4gKiBvYmplY3QuIE90aGVyIG9wdGlvbnMgKGluIHRoZSBvcHRzIHBhcmFtZXRlcikgYXJlIHRoZSBzYW1lIGFzXG4gKiBmb3IgUXVhbGl0eURlZmluaXRpb24uICovXG52YXIgT25PZmZRdWFsaXR5ID0gZnVuY3Rpb24odGl0bGUsIG9wdHMpIHtcbiAgdmFyIG15T3B0cyA9IGV4dGVuZChvcHRzLCB7XG4gICAgb25EaXNwbGF5OiBcIlwiXG4gIH0pO1xuICBRdWFsaXR5RGVmaW5pdGlvbi5jYWxsKHRoaXMsIHRpdGxlLCBvcHRzKTtcbiAgdGhpcy5vbkRpc3BsYXkgPSBteU9wdHMub25EaXNwbGF5O1xufTtcbk9uT2ZmUXVhbGl0eS5pbmhlcml0cyhRdWFsaXR5RGVmaW5pdGlvbik7XG5Pbk9mZlF1YWxpdHkucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGNoYXJhY3RlciwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlKSByZXR1cm4gdGhpcy5vbkRpc3BsYXk7XG4gIGVsc2UgcmV0dXJuIG51bGw7XG59O1xuXG4vKiBBIGJvb2xlYW4gcXVhbGl0eSB0aGF0IGhhcyBkaWZmZXJlbnQgb3V0cHV0IHRleHQgZm9yIHplcm8gb3JcbiAqIG5vbi16ZXJvIHF1YWxpdHkgdmFsdWVzLiBVbmxpa2UgT25PZmZRdWFsaXR5LCB0aGlzIGRlZmluaXRpb25cbiAqIGRvZXNuJ3QgcmVtb3ZlIGl0c2VsZiBmcm9tIHRoZSBsaXN0IHdoZW4gaXQgaXMgMC4gVGhlIG9wdGlvbnNcbiAqIGFyZSBhcyBmb3IgUXVhbGl0eURlZmluaXRpb24sIHdpdGggdGhlIGFkZGl0aW9uIG9mIG9wdGlvbnNcbiAqICd5ZXNEaXNwbGF5JyBhbmQgJ25vRGlzcGxheScsIHdoaWNoIGNvbnRhaW4gdGhlIEhUTUwgZnJhZ21lbnRzXG4gKiB1c2VkIHRvIGRpc3BsYXkgdHJ1ZSBhbmQgZmFsc2UgdmFsdWVzLiBJZiBub3QgZ2l2ZW4sIHRoZXNlXG4gKiBkZWZhdWx0IHRvICd5ZXMnIGFuZCAnbm8nLlxuICovXG52YXIgWWVzTm9RdWFsaXR5ID0gZnVuY3Rpb24odGl0bGUsIG9wdHMpIHtcbiAgdmFyIG15T3B0cyA9IGV4dGVuZChvcHRzLHtcbiAgICB5ZXNEaXNwbGF5OiBcInllc1wiLmwoKSxcbiAgICBub0Rpc3BsYXk6IFwibm9cIi5sKClcbiAgfSk7XG4gIFF1YWxpdHlEZWZpbml0aW9uLmNhbGwodGhpcywgdGl0bGUsIG9wdHMpO1xuICB0aGlzLnllc0Rpc3BsYXkgPSBteU9wdHMueWVzRGlzcGxheTtcbiAgdGhpcy5ub0Rpc3BsYXkgPSBteU9wdHMubm9EaXNwbGF5O1xufTtcblllc05vUXVhbGl0eS5pbmhlcml0cyhRdWFsaXR5RGVmaW5pdGlvbik7XG5ZZXNOb1F1YWxpdHkucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKGNoYXJhY3RlciwgdmFsdWUpIHtcbiAgaWYgKHZhbHVlKSByZXR1cm4gdGhpcy55ZXNEaXNwbGF5O1xuICBlbHNlIHJldHVybiB0aGlzLm5vRGlzcGxheTtcbn07XG5cbi8qIERlZmluZXMgYSBncm91cCBvZiBxdWFsaXRpZXMgdGhhdCBzaG91bGQgYmUgZGlzcGxheWVkIHRvZ2V0aGVyLFxuICogdW5kZXIgdGhlIGdpdmVuIG9wdGlvbmFsIHRpdGxlLiBUaGVzZSBzaG91bGQgYmUgZGVmaW5lZCBpbiB0aGVcbiAqIGB1bmR1bS5nYW1lLnF1YWxpdHlHcm91cHNgIHBhcmFtZXRlci4gKi9cbnZhciBRdWFsaXR5R3JvdXAgPSBmdW5jdGlvbih0aXRsZSwgb3B0cykge1xuICB2YXIgbXlPcHRzID0gZXh0ZW5kKG9wdHMse1xuICAgIHByaW9yaXR5OiB0aXRsZSxcbiAgICBleHRyYUNsYXNzZXM6IG51bGxcbiAgfSk7XG4gIHRoaXMudGl0bGUgPSB0aXRsZTtcbiAgdGhpcy5wcmlvcml0eSA9IG15T3B0cy5wcmlvcml0eTtcbiAgdGhpcy5leHRyYUNsYXNzZXMgPSBteU9wdHMuZXh0cmFDbGFzc2VzO1xufTtcbiIsIi8qIEEgc3lzdGVtIG9iamVjdCBpcyBwYXNzZWQgaW50byB0aGUgZW50ZXIsIGFjdCBhbmQgZXhpdFxuICogZnVuY3Rpb25zIG9mIGVhY2ggc2l0dWF0aW9uLiBJdCBpcyB1c2VkIHRvIGludGVyYWN0IHdpdGggdGhlXG4gKiBVSS5cbiAqL1xudmFyIFN5c3RlbSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLnJuZCA9IG51bGw7XG4gIHRoaXMudGltZSA9IDA7XG59O1xuXG4vKiBSZW1vdmVzIGFsbCBjb250ZW50IGZyb20gdGhlIHBhZ2UsIGNsZWFyaW5nIHRoZSBtYWluIGNvbnRlbnQgYXJlYS5cbiAqXG4gKiBJZiBhbiBlbGVtZW50U2VsZWN0b3IgaXMgZ2l2ZW4sIHRoZW4gb25seSB0aGF0IHNlbGVjdG9yIHdpbGwgYmVcbiAqIGNsZWFyZWQuIE5vdGUgdGhhdCBhbGwgY29udGVudCBmcm9tIHRoZSBjbGVhcmVkIGVsZW1lbnQgaXMgcmVtb3ZlZCxcbiAqIGJ1dCB0aGUgZWxlbWVudCBpdHNlbGYgcmVtYWlucywgcmVhZHkgdG8gYmUgZmlsbGVkIGFnYWluIHVzaW5nXG4gKiBTeXN0ZW0ud3JpdGUuXG4gKi9cblN5c3RlbS5wcm90b3R5cGUuY2xlYXJDb250ZW50ID0gZnVuY3Rpb24oZWxlbWVudFNlbGVjdG9yKSB7XG4gIHZhciAkZWxlbWVudDtcbiAgaWYgKGVsZW1lbnRTZWxlY3RvcikgJGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGVsZW1lbnRTZWxlY3Rvcik7XG4gIGlmICghJGVsZW1lbnQpICRlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZW50XCIpO1xuICAkZWxlbWVudC5pbm5lckhUTUwgPSAnJztcbn07XG5cbi8qIE91dHB1dHMgcmVndWxhciBjb250ZW50IHRvIHRoZSBwYWdlLiBUaGUgY29udGVudCBzdXBwbGllZCBtdXN0XG4gKiBiZSB2YWxpZCBcIkRpc3BsYXkgQ29udGVudFwiLlxuICpcbiAqIFwiRGlzcGxheSBDb250ZW50XCIgaXMgYW55IEhUTUwgc3RyaW5nIHRoYXQgYmVnaW5zIHdpdGggYSBIVE1MXG4gKiBzdGFydCB0YWcsIGVuZHMgd2l0aCBlaXRoZXIgYW4gZW5kIG9yIGEgY2xvc2VkIHRhZywgYW5kIGlzIGFcbiAqIHZhbGlkIGFuZCBzZWxmLWNvbnRhaW5lZCBzbmlwcGV0IG9mIEhUTUwuIE5vdGUgdGhhdCB0aGUgc3RyaW5nXG4gKiBkb2Vzbid0IGhhdmUgdG8gY29uc2lzdCBvZiBvbmx5IG9uZSBIVE1MIHRhZy4gWW91IGNvdWxkIGhhdmVcbiAqIHNldmVyYWwgcGFyYWdyYXBocywgZm9yIGV4YW1wbGUsIGFzIGxvbmcgYXMgdGhlIGNvbnRlbnQgc3RhcnRzXG4gKiB3aXRoIHRoZSA8cD4gb2YgdGhlIGZpcnN0IHBhcmFncmFwaCwgYW5kIGVuZHMgd2l0aCB0aGUgPC9wPiBvZlxuICogdGhlIGxhc3QuIFNvIFwiPHA+Rm9vPC9wPjxpbWcgc3JjPSdiYXInPlwiIGlzIHZhbGlkLCBidXQgXCJmb288aW1nXG4gKiBzcmM9J2Jhcic+XCIgaXMgbm90LlxuICpcbiAqIFRoZSBjb250ZW50IGdvZXMgdG8gdGhlIGVuZCBvZiB0aGUgcGFnZSwgdW5sZXNzIHlvdSBzdXBwbHkgdGhlXG4gKiBvcHRpb25hbCBzZWxlY3RvciBhcmd1bWVudC4gSWYgeW91IGRvLCB0aGUgY29udGVudCBhcHBlYXJzXG4gKiBhZnRlciB0aGUgZWxlbWVudCB0aGF0IG1hdGNoZXMgdGhhdCBzZWxlY3Rvci5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcikge1xuICBkb1dyaXRlKGNvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcik7XG59O1xuXG4vKiBPdXRwdXRzIHRoZSBnaXZlbiBjb250ZW50IGluIGEgaGVhZGluZyBvbiB0aGUgcGFnZS4gVGhlIGNvbnRlbnRcbiAqIHN1cHBsaWVkIG11c3QgYmUgdmFsaWQgXCJEaXNwbGF5IENvbnRlbnRcIi5cbiAqXG4gKiBUaGUgY29udGVudCBnb2VzIHRvIHRoZSBlbmQgb2YgdGhlIHBhZ2UsIHVubGVzcyB5b3Ugc3VwcGx5IHRoZVxuICogb3B0aW9uYWwgc2VsZWN0b3IgYXJndW1lbnQuIElmIHlvdSBkbywgdGhlIGNvbnRlbnQgYXBwZWFyc1xuICogYWZ0ZXIgdGhlIGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gKi9cblN5c3RlbS5wcm90b3R5cGUud3JpdGVIZWFkaW5nID0gZnVuY3Rpb24oaGVhZGluZ0NvbnRlbnQsIGVsZW1lbnRTZWxlY3Rvcikge1xuICB2YXIgaGVhZGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCI8aDE+XCIpO1xuICBoZWFkaW5nLmlubmVySFRNTCA9IGhlYWRpbmdDb250ZW50O1xuICBkb1dyaXRlKGhlYWRpbmcsIGVsZW1lbnRTZWxlY3Rvcik7XG59O1xuXG4vKiBPdXRwdXRzIHJlZ3VsYXIgY29udGVudCB0byB0aGUgcGFnZS4gVGhlIGNvbnRlbnQgc3VwcGxpZWQgbXVzdFxuICogYmUgdmFsaWQgXCJEaXNwbGF5IENvbnRlbnRcIi5cbiAqXG4gKiBUaGUgY29udGVudCBnb2VzIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHBhZ2UsIHVubGVzcyB5b3VcbiAqIHN1cHBseSB0aGUgb3B0aW9uYWwgc2VsZWN0b3IgYXJndW1lbnQuIElmIHlvdSBkbywgdGhlIGNvbnRlbnRcbiAqIGFwcGVhcnMgYWZ0ZXIgdGhlIGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gKi9cblN5c3RlbS5wcm90b3R5cGUud3JpdGVCZWZvcmUgPSBmdW5jdGlvbihjb250ZW50LCBlbGVtZW50U2VsZWN0b3IpIHtcbiAgZG9Xcml0ZShjb250ZW50LCBlbGVtZW50U2VsZWN0b3IsICdwcmVwZW5kJywgJ2JlZm9yZScpO1xufTtcblxuLyogT3V0cHV0cyByZWd1bGFyIGNvbnRlbnQgdG8gdGhlIHBhZ2UuIFRoZSBjb250ZW50IHN1cHBsaWVkIG11c3RcbiAqIGJlIHZhbGlkIFwiRGlzcGxheSBDb250ZW50XCIuXG4gKlxuICogV2hlbiBhIHNlbGVjdG9yIGlzIG5vdCBzcGVjaWZpZWQsIHRoaXMgYmVoYXZlcyBpZGVudGljYWxseSB0b1xuICogU3lzdGVtLnByb3RvdHlwZS53cml0ZS4gSWYgeW91IHN1cHBseSBhIHNlbGVjdG9yLCB0aGUgY29udGVudFxuICogYXBwZWFycyBhcyBhIGNoaWxkIG5vZGUgYXQgdGhlIGVuZCBvZiB0aGUgY29udGVudCBvZiB0aGVcbiAqIGVsZW1lbnQgdGhhdCBtYXRjaGVzIHRoYXQgc2VsZWN0b3IuXG4gKi9cblxuU3lzdGVtLnByb3RvdHlwZS53cml0ZUludG8gPSBmdW5jdGlvbihjb250ZW50LCBlbGVtZW50U2VsZWN0b3IpIHtcbiAgZG9Xcml0ZShjb250ZW50LCBlbGVtZW50U2VsZWN0b3IsICdhcHBlbmQnLCAnYXBwZW5kJyk7XG59O1xuXG4vKiBSZXBsYWNlcyBjb250ZW50IHdpdGggdGhlIGNvbnRlbnQgc3VwcGxpZWQsIHdoaWNoIG11c3QgYmUgdmFsaWRcbiAqIFwiRGlzcGxheSBDb250ZW50XCIuXG4gKlxuICogV2hlbiBhIHNlbGVjdG9yIGlzIG5vdCBzcGVjaWZpZWQsIHRoaXMgcmVwbGFjZXMgdGhlIGVudGlyZVxuICogY29udGVudCBvZiB0aGUgcGFnZS4gT3RoZXJ3aXNlLCBpdCByZXBsYWNlcyB0aGUgZWxlbWVudCBtYXRjaGVkXG4gKiB3aXRoIHRoZSBzZWxlY3Rvci4gVGhpcyByZXBsYWNlcyB0aGUgZW50aXJlIGVsZW1lbnQsIGluY2x1ZGluZ1xuICogdGhlIG1hdGNoZWQgdGFncywgc28gaWRlYWxseSB0aGUgY29udGVudCBzdXBwbGllZCBzaG91bGQgZml0XG4gKiBpbiBpdHMgcGxhY2UgaW4gdGhlIERPTSB3aXRoIHRoZSBzYW1lIGtpbmQgb2YgZGlzcGxheSBlbGVtZW50LlxuICovXG5cblN5c3RlbS5wcm90b3R5cGUucmVwbGFjZVdpdGggPSBmdW5jdGlvbihjb250ZW50LCBlbGVtZW50U2VsZWN0b3IpIHtcbiAgZG9Xcml0ZShjb250ZW50LCBlbGVtZW50U2VsZWN0b3IsICdyZXBsYWNlV2l0aCcsICdyZXBsYWNlV2l0aCcpO1xufTtcblxuLyogQ2FycmllcyBvdXQgdGhlIGdpdmVuIHNpdHVhdGlvbiBjaGFuZ2Ugb3IgYWN0aW9uLCBhcyBpZiBpdCB3ZXJlXG4gKiBpbiBhIGxpbmsgdGhhdCBoYXMgYmVlbiBjbGlja2VkLiBUaGlzIGFsbG93cyB5b3UgdG8gZG9cbiAqIHByb2NlZHVyYWwgdHJhbnNpdGlvbnMuIFlvdSBtaWdodCBoYXZlIGFuIGFjdGlvbiB0aGF0IGJ1aWxkcyB1cFxuICogdGhlIGNoYXJhY3RlcidzIHN0cmVuZ3RoLCBhbmQgZGVwbGV0ZXMgdGhlaXIgbWFnaWMuIFdoZW4gdGhlXG4gKiBtYWdpYyBpcyBhbGwgZ29uZSwgeW91IGNhbiBmb3JjZSBhIHNpdHVhdGlvbiBjaGFuZ2UgYnkgY2FsbGluZ1xuICogdGhpcyBtZXRob2QuICovXG5TeXN0ZW0ucHJvdG90eXBlLmRvTGluayA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgcHJvY2Vzc0xpbmsoY29kZSk7XG59O1xuXG4vKiBUdXJucyBhbnkgbGlua3MgdGhhdCB0YXJnZXQgdGhlIGdpdmVuIGhyZWYgaW50byBwbGFpblxuICogdGV4dC4gVGhpcyBjYW4gYmUgdXNlZCB0byByZW1vdmUgYWN0aW9uIG9wdGlvbnMgd2hlbiBhbiBhY3Rpb25cbiAqIGlzIG5vIGxvbmdlciBhdmFpbGFibGUuIEl0IGlzIHVzZWQgYXV0b21hdGljYWxseSB3aGVuIHlvdSBnaXZlXG4gKiBhIGxpbmsgdGhlICdvbmNlJyBjbGFzcy4gKi9cblN5c3RlbS5wcm90b3R5cGUuY2xlYXJMaW5rcyA9IGZ1bmN0aW9uKGNvZGUpIHtcbiAgdmFyIGxpbmtzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImFbaHJlZj0nXCIgKyBjb2RlICsgXCInXVwiKTtcbiAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsaW5rcywgZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgpe1xuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChcInNwYW5cIikuY2xhc3NMaXN0LmFkZChcImV4X2xpbmtcIik7XG4gIH0pO1xufTtcblxuLyogR2l2ZW4gYSBsaXN0IG9mIHNpdHVhdGlvbiBpZHMsIHRoaXMgb3V0cHV0cyBhIHN0YW5kYXJkIG9wdGlvblxuICogYmxvY2sgd2l0aCB0aGUgc2l0dWF0aW9uIGNob2ljZXMgaW4gdGhlIGdpdmVuIG9yZGVyLlxuICpcbiAqIFRoZSBjb250ZW50cyBvZiBlYWNoIGNob2ljZSB3aWxsIGJlIGEgbGluayB0byB0aGUgc2l0dWF0aW9uLFxuICogdGhlIHRleHQgb2YgdGhlIGxpbmsgd2lsbCBiZSBnaXZlbiBieSB0aGUgc2l0dWF0aW9uJ3NcbiAqIG91dHB1dFRleHQgcHJvcGVydHkuIE5vdGUgdGhhdCB0aGUgY2FuQ2hvb3NlIGZ1bmN0aW9uIGlzXG4gKiBjYWxsZWQsIGFuZCBpZiBpdCByZXR1cm5zIGZhbHNlLCB0aGVuIHRoZSB0ZXh0IHdpbGwgYXBwZWFyLCBidXRcbiAqIHRoZSBsaW5rIHdpbGwgbm90IGJlIGNsaWNrYWJsZS5cbiAqXG4gKiBBbHRob3VnaCBjYW5DaG9vc2UgaXMgaG9ub3JlZCwgY2FuVmlldyBhbmQgZGlzcGxheU9yZGVyIGFyZVxuICogbm90LiBJZiB5b3UgbmVlZCB0byBob25vciB0aGVzZSwgeW91IHNob3VsZCBlaXRoZXIgZG8gc29cbiAqIG1hbnVhbGx5LCBvdCBlbHNlIHVzZSB0aGUgYGdldFNpdHVhdGlvbklkQ2hvaWNlc2AgbWV0aG9kIHRvXG4gKiByZXR1cm4gYW4gb3JkZXJlZCBsaXN0IG9mIHZhbGlkIHZpZXdhYmxlIHNpdHVhdGlvbiBpZHMuXG4gKi9cblN5c3RlbS5wcm90b3R5cGUud3JpdGVDaG9pY2VzID0gZnVuY3Rpb24obGlzdE9mSWRzLCBlbGVtZW50U2VsZWN0b3IpIHtcbiAgaWYgKGxpc3RPZklkcy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICB2YXIgY3VycmVudFNpdHVhdGlvbiA9IGdldEN1cnJlbnRTaXR1YXRpb24oKTtcbiAgdmFyICRvcHRpb25zID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZW50XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJ1bFwiKS5jbGFzc0xpc3QuYWRkKFwib3B0aW9uc1wiKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0T2ZJZHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgc2l0dWF0aW9uSWQgPSBsaXN0T2ZJZHNbaV07XG4gICAgdmFyIHNpdHVhdGlvbiA9IGdhbWUuc2l0dWF0aW9uc1tzaXR1YXRpb25JZF07XG4gICAgYXNzZXJ0KHNpdHVhdGlvbiwgXCJ1bmtub3duX3NpdHVhdGlvblwiLmwoe2lkOnNpdHVhdGlvbklkfSkpO1xuXG4gICAgdmFyIG9wdGlvblRleHQgPSBzaXR1YXRpb24ub3B0aW9uVGV4dChjaGFyYWN0ZXIsIHRoaXMsXG4gICAgICAgIGN1cnJlbnRTaXR1YXRpb24pO1xuICAgIGlmICghb3B0aW9uVGV4dCkgb3B0aW9uVGV4dCA9IFwiY2hvaWNlXCIubCh7bnVtYmVyOmkrMX0pO1xuICAgIHZhciAkb3B0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZW50XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJsaVwiKTtcbiAgICB2YXIgJGE7XG4gICAgaWYgKHNpdHVhdGlvbi5jYW5DaG9vc2UoY2hhcmFjdGVyLCB0aGlzLCBjdXJyZW50U2l0dWF0aW9uKSkge1xuICAgICAgJGEgPSBcIjxhIGhyZWY9J1wiK3NpdHVhdGlvbklkK1wiJz5cIitvcHRpb25UZXh0K1wiPC9hPlwiXG4gICAgfSBlbHNlIHtcbiAgICAgICRhID0gXCI8c3Bhbj5cIitvcHRpb25UZXh0K1wiPC9zcGFuPlwiO1xuICAgIH1cbiAgICAkb3B0aW9uLmlubmVySFRNTCA9ICRhO1xuICAgICRvcHRpb25zLmFwcGVuZENoaWxkKCRvcHRpb24pO1xuICB9XG4gIGRvV3JpdGUoJG9wdGlvbnMsIGVsZW1lbnRTZWxlY3RvciwgJ2FwcGVuZCcsICdhZnRlcicpO1xufTtcblxuLyogUmV0dXJucyBhIGxpc3Qgb2Ygc2l0dWF0aW9uIGlkcyB0byBjaG9vc2UgZnJvbSwgZ2l2ZW4gYSBzZXQgb2ZcbiAqIHNwZWNpZmljYXRpb25zLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYSBjb21wbGV4IGFuZCBwb3dlcmZ1bCB3YXkgb2YgY29tcGlsaW5nXG4gKiBpbXBsaWNpdCBzaXR1YXRpb24gY2hvaWNlcy4gWW91IGdpdmUgaXQgYSBsaXN0IG9mIHNpdHVhdGlvbiBpZHNcbiAqIGFuZCBzaXR1YXRpb24gdGFncyAoaWYgYSBzaW5nbGUgaWQgb3IgdGFnIGlzIG5lZWRlZCBqdXN0IHRoYXRcbiAqIHN0cmluZyBjYW4gYmUgZ2l2ZW4sIGl0IGRvZXNuJ3QgbmVlZCB0byBiZSB3cmFwcGVkIGluIGFcbiAqIGxpc3QpLiBUYWdzIHNob3VsZCBiZSBwcmVmaXhlZCB3aXRoIGEgaGFzaCAjIHRvIGRpZmZlcmVudGlhdGVcbiAqIHRoZW0gZnJvbSBzaXR1YXRpb24gaWRzLiBUaGUgZnVuY3Rpb24gdGhlbiBjb25zaWRlcnMgYWxsXG4gKiBtYXRjaGluZyBzaXR1YXRpb25zIGluIGRlc2NlbmRpbmcgcHJpb3JpdHkgb3JkZXIsIGNhbGxpbmcgdGhlaXJcbiAqIGNhblZpZXcgZnVuY3Rpb25zIGFuZCBmaWx0ZXJpbmcgb3V0IGFueSB0aGF0IHNob3VsZCBub3QgYmVcbiAqIHNob3duLCBnaXZlbiB0aGUgY3VycmVudCBzdGF0ZS4gV2l0aG91dCBhZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqIHRoZSBmdW5jdGlvbiByZXR1cm5zIGEgbGlzdCBvZiB0aGUgc2l0dWF0aW9uIGlkcyBhdCB0aGUgaGlnaGVzdFxuICogbGV2ZWwgb2YgcHJpb3JpdHkgdGhhdCBoYXMgYW55IHZhbGlkIHJlc3VsdHMuIFNvLCBmb3IgZXhhbXBsZSxcbiAqIGlmIGEgdGFnICNwbGFjZXMgbWF0Y2hlcyB0aHJlZSBzaXR1YXRpb25zLCBvbmUgd2l0aCBwcmlvcml0eSAyLFxuICogYW5kIHR3byB3aXRoIHByaW9yaXR5IDMsIGFuZCBhbGwgb2YgdGhlbSBjYW4gYmUgdmlld2VkIGluIHRoZVxuICogY3VycmVudCBjb250ZXh0LCB0aGVuIG9ubHkgdGhlIHR3byB3aXRoIHByaW9yaXR5IDMgd2lsbCBiZVxuICogcmV0dXJuZWQuIFRoaXMgYWxsb3dzIHlvdSB0byBoYXZlIGhpZ2gtcHJpb3JpdHkgc2l0dWF0aW9ucyB0aGF0XG4gKiB0cnVtcCBhbnkgbG93ZXIgc2l0dWF0aW9ucyB3aGVuIHRoZXkgYXJlIHZhbGlkLCBzdWNoIGFzXG4gKiBzaXR1YXRpb25zIHRoYXQgZm9yY2UgdGhlIHBsYXllciB0byBnbyB0byBvbmUgZGVzdGluYXRpb24gaWZcbiAqIHRoZSBwbGF5ZXIgaXMgb3V0IG9mIG1vbmV5LCBmb3IgZXhhbXBsZS5cbiAqXG4gKiBJZiBhIG1pbkNob2ljZXMgdmFsdWUgaXMgZ2l2ZW4sIHRoZW4gdGhlIGZ1bmN0aW9uIHdpbGwgYXR0ZW1wdFxuICogdG8gcmV0dXJuIGF0IGxlYXN0IHRoYXQgbWFueSByZXN1bHRzLiBJZiBub3QgZW5vdWdoIHJlc3VsdHMgYXJlXG4gKiBhdmFpbGFibGUgYXQgdGhlIGhpZ2hlc3QgcHJpb3JpdHksIHRoZW4gbG93ZXIgcHJpb3JpdGllcyB3aWxsXG4gKiBiZSBjb25zaWRlcmVkIGluIHR1cm4sIHVudGlsIGVub3VnaCBzaXR1YXRpb25zIGFyZSBmb3VuZC4gSW5cbiAqIHRoZSBleGFtcGxlIGFib3ZlLCBpZiB3ZSBoYWQgYSBtaW5DaG9pY2VzIG9mIHRocmVlLCB0aGVuIGFsbFxuICogdGhyZWUgc2l0dWF0aW9ucyB3b3VsZCBiZSByZXR1cm5lZCwgZXZlbiB0aG91Z2ggdGhleSBoYXZlXG4gKiBkaWZmZXJlbnQgcHJpb3JpdGllcy4gSWYgeW91IG5lZWQgdG8gcmV0dXJuIGFsbCB2YWxpZFxuICogc2l0dWF0aW9ucywgcmVnYXJkbGVzcyBvZiB0aGVpciBwcmlvcml0aWVzLCBzZXQgbWluQ2hvaWNlcyB0byBhXG4gKiBsYXJnZSBudW1iZXIsIHN1Y2ggYXMgYE51bWJlci5NQVhfVkFMVUVgLCBhbmQgbGVhdmUgbWF4Q2hvaWNlc1xuICogdW5kZWZpbmVkLlxuICpcbiAqIElmIGEgbWF4Q2hvaWNlcyB2YWx1ZSBpcyBnaXZlbiwgdGhlbiB0aGUgZnVuY3Rpb24gd2lsbCBub3RcbiAqIHJldHVybiBhbnkgbW9yZSB0aGFuIHRoZSBnaXZlbiBudW1iZXIgb2YgcmVzdWx0cy4gSWYgdGhlcmUgYXJlXG4gKiBtb3JlIHRoYW4gdGhpcyBudW1iZXIgb2YgcmVzdWx0cyBwb3NzaWJsZSwgdGhlbiB0aGUgaGlnaGVzdFxuICogcHJpb3JpdHkgcmVzdWxzIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBiZSByZXR1cm5lZCwgYnV0IHRoZVxuICogbG93ZXN0IHByaW9yaXR5IGdyb3VwIHdpbGwgaGF2ZSB0byBmaWdodCBpdCBvdXQgZm9yIHRoZVxuICogcmVtYWluaW5nIHBsYWNlcy4gSW4gdGhpcyBjYXNlLCBhIHJhbmRvbSBzYW1wbGUgaXMgY2hvc2VuLFxuICogdGFraW5nIGludG8gYWNjb3VudCB0aGUgZnJlcXVlbmN5IG9mIGVhY2ggc2l0dWF0aW9uLiBTbyBhXG4gKiBzaXR1YXRpb24gd2l0aCBhIGZyZXF1ZW5jeSBvZiAxMDAgd2lsbCBiZSBjaG9zZW4gMTAwIHRpbWVzIG1vcmVcbiAqIG9mdGVuIHRoYW4gYSBzaXR1YXRpb24gd2l0aCBhIGZyZXF1ZW5jeSBvZiAxLCBpZiB0aGVyZSBpcyBvbmVcbiAqIHNwYWNlIGF2YWlsYWJsZS4gT2Z0ZW4gdGhlc2UgZnJlcXVlbmNpZXMgaGF2ZSB0byBiZSB0YWtlbiBhcyBhXG4gKiBndWlkZWxpbmUsIGFuZCB0aGUgYWN0dWFsIHByb2JhYmlsaXRpZXMgd2lsbCBvbmx5IGJlXG4gKiBhcHByb3hpbWF0ZS4gQ29uc2lkZXIgdGhyZWUgc2l0dWF0aW9ucyB3aXRoIGZyZXF1ZW5jaWVzIG9mIDEsXG4gKiAxLCAxMDAsIGNvbXBldGluZyBmb3IgdHdvIHNwYWNlcy4gVGhlIDEwMC1mcmVxdWVuY3kgc2l0dWF0aW9uXG4gKiB3aWxsIGJlIGNob3NlbiBhbG1vc3QgZXZlcnkgdGltZSwgYnV0IGZvciB0aGUgb3RoZXIgc3BhY2UsIG9uZVxuICogb2YgdGhlIDEtZnJlcXVlbmN5IHNpdHVhdGlvbnMgbXVzdCBiZSBjaG9zZW4uIFNvIHRoZSBhY3R1YWxcbiAqIHByb2JhYmlsaXRpZXMgd2lsbCBiZSByb3VnaGx5IDUwJSwgNTAlLCAxMDAlLiBXaGVuIHNlbGVjdGluZ1xuICogbW9yZSB0aGFuIG9uZSByZXN1bHQsIGZyZXF1ZW5jaWVzIGNhbiBvbmx5IGJlIGEgZ3VpZGUuXG4gKlxuICogQmVmb3JlIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBpdHMgcmVzdWx0LCBpdCBzb3J0cyB0aGVcbiAqIHNpdHVhdGlvbnMgaW4gaW5jcmVhc2luZyBvcmRlciBvZiB0aGVpciBkaXNwbGF5T3JkZXIgdmFsdWVzLlxuICovXG5TeXN0ZW0ucHJvdG90eXBlLmdldFNpdHVhdGlvbklkQ2hvaWNlcyA9IGZ1bmN0aW9uKGxpc3RPZk9yT25lSWRzT3JUYWdzLFxuICAgIG1pbkNob2ljZXMsIG1heENob2ljZXMpXG57XG4gIHZhciBkYXR1bTtcbiAgdmFyIGk7XG5cbiAgLy8gRmlyc3QgY2hlY2sgaWYgd2UgaGF2ZSBhIHNpbmdsZSBzdHJpbmcgZm9yIHRoZSBpZCBvciB0YWcuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobGlzdE9mT3JPbmVJZHNPclRhZ3MpLnJlcGxhY2UoL15cXFtvYmplY3QgKC4rKVxcXSQvLCBcIiQxXCIpLnRvTG93ZXJDYXNlKCkgPT0gJ3N0cmluZycpIHtcbiAgICBsaXN0T2ZPck9uZUlkc09yVGFncyA9IFtsaXN0T2ZPck9uZUlkc09yVGFnc107XG4gIH1cblxuICAvLyBGaXJzdCB3ZSBidWlsZCBhIGxpc3Qgb2YgYWxsIGNhbmRpZGF0ZSBpZHMuXG4gIHZhciBhbGxJZHMgPSB7fTtcbiAgZm9yIChpID0gMDsgaSA8IGxpc3RPZk9yT25lSWRzT3JUYWdzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHRhZ09ySWQgPSBsaXN0T2ZPck9uZUlkc09yVGFnc1tpXTtcbiAgICBpZiAodGFnT3JJZC5zdWJzdHIoMCwgMSkgPT0gJyMnKSB7XG4gICAgICB2YXIgaWRzID0gZ2V0U2l0dWF0aW9uSWRzV2l0aFRhZyh0YWdPcklkLnN1YnN0cigxKSk7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGlkcy5sZW5ndGg7ICsraikge1xuICAgICAgICBhbGxJZHNbaWRzW2pdXSA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGFsbElkc1t0YWdPcklkXSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gRmlsdGVyIG91dCBhbnl0aGluZyB0aGF0IGNhbid0IGJlIHZpZXdlZCByaWdodCBub3cuXG4gIHZhciBjdXJyZW50U2l0dWF0aW9uID0gZ2V0Q3VycmVudFNpdHVhdGlvbigpO1xuICB2YXIgdmlld2FibGVTaXR1YXRpb25EYXRhID0gW107XG4gIGZvciAodmFyIHNpdHVhdGlvbklkIGluIGFsbElkcykge1xuICAgIHZhciBzaXR1YXRpb24gPSBnYW1lLnNpdHVhdGlvbnNbc2l0dWF0aW9uSWRdO1xuICAgIGFzc2VydChzaXR1YXRpb24sIFwidW5rbm93bl9zaXR1YXRpb25cIi5sKHtpZDpzaXR1YXRpb25JZH0pKTtcblxuICAgIGlmIChzaXR1YXRpb24uY2FuVmlldyhjaGFyYWN0ZXIsIHN5c3RlbSwgY3VycmVudFNpdHVhdGlvbikpIHtcbiAgICAgIC8vIFdoaWxlIHdlJ3JlIGhlcmUsIGdldCB0aGUgc2VsZWN0aW9uIGRhdGEuXG4gICAgICB2YXIgdmlld2FibGVTaXR1YXRpb25EYXR1bSA9XG4gICAgICAgIHNpdHVhdGlvbi5jaG9pY2VEYXRhKGNoYXJhY3Rlciwgc3lzdGVtLCBjdXJyZW50U2l0dWF0aW9uKTtcbiAgICAgIHZpZXdhYmxlU2l0dWF0aW9uRGF0dW0uaWQgPSBzaXR1YXRpb25JZDtcbiAgICAgIHZpZXdhYmxlU2l0dWF0aW9uRGF0YS5wdXNoKHZpZXdhYmxlU2l0dWF0aW9uRGF0dW0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRoZW4gd2Ugc29ydCBpbiBkZXNjZW5kaW5nIHByaW9yaXR5IG9yZGVyLlxuICB2aWV3YWJsZVNpdHVhdGlvbkRhdGEuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICByZXR1cm4gYi5wcmlvcml0eSAtIGEucHJpb3JpdHk7XG4gICAgICB9KTtcblxuICB2YXIgY29tbWl0dGVkID0gW107XG4gIHZhciBjYW5kaWRhdGVzQXRMYXN0UHJpb3JpdHkgPSBbXTtcbiAgdmFyIGxhc3RQcmlvcml0eTtcbiAgLy8gSW4gZGVzY2VuZGluZyBwcmlvcml0eSBvcmRlci5cbiAgZm9yIChpID0gMDsgaSA8IHZpZXdhYmxlU2l0dWF0aW9uRGF0YS5sZW5ndGg7ICsraSkge1xuICAgIGRhdHVtID0gdmlld2FibGVTaXR1YXRpb25EYXRhW2ldO1xuICAgIGlmIChkYXR1bS5wcmlvcml0eSAhPSBsYXN0UHJpb3JpdHkpIHtcbiAgICAgIGlmIChsYXN0UHJpb3JpdHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBXZSd2ZSBkcm9wcGVkIGEgcHJpb3JpdHkgZ3JvdXAsIHNlZSBpZiB3ZSBoYXZlIGVub3VnaFxuICAgICAgICAvLyBzaXR1YXRpb25zIHNvIGZhciwgYW5kIHN0b3AgaWYgd2UgZG8uXG4gICAgICAgIGlmIChtaW5DaG9pY2VzID09PSB1bmRlZmluZWQgfHwgaSA+PSBtaW5DaG9pY2VzKSBicmVhaztcbiAgICAgIH1cbiAgICAgIC8vIENvbnRpbnVlIHRvIGFjY2N1bXVsYXRlIG1vcmUgb3B0aW9ucy5cbiAgICAgIGNvbW1pdHRlZC5wdXNoLmFwcGx5KGNvbW1pdHRlZCwgY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5KTtcbiAgICAgIGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eSA9IFtdO1xuICAgICAgbGFzdFByaW9yaXR5ID0gZGF0dW0ucHJpb3JpdHk7XG4gICAgfVxuICAgIGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eS5wdXNoKGRhdHVtKTtcbiAgfVxuXG4gIC8vIFNvIHRoZSB2YWx1ZXMgaW4gY29tbWl0dGVkIHdlJ3JlIGNvbW1pdHRlZCB0bywgYmVjYXVzZSB3aXRob3V0XG4gIC8vIHRoZW0gd2Ugd291bGRuJ3QgaGl0IG91ciBtaW5pbXVtLiBCdXQgdGhvc2UgaW5cbiAgLy8gY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5IG1pZ2h0IHRha2UgdXMgb3ZlciBvdXIgbWF4aW11bSwgc29cbiAgLy8gZmlndXJlIG91dCBob3cgbWFueSB3ZSBzaG91bGQgY2hvb3NlLlxuICB2YXIgdG90YWxDaG9pY2VzID0gY29tbWl0dGVkLmxlbmd0aCArIGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eS5sZW5ndGg7XG4gIGlmIChtYXhDaG9pY2VzID09PSB1bmRlZmluZWQgfHwgbWF4Q2hvaWNlcyA+PSB0b3RhbENob2ljZXMpIHtcbiAgICAvLyBXZSBjYW4gdXNlIGFsbCB0aGUgY2hvaWNlcy5cbiAgICBjb21taXR0ZWQucHVzaC5hcHBseShjb21taXR0ZWQsIGNhbmRpZGF0ZXNBdExhc3RQcmlvcml0eSk7XG4gIH0gZWxzZSBpZiAobWF4Q2hvaWNlcyA+PSBjb21taXR0ZWQubGVuZ3RoKSB7XG4gICAgLy8gV2UgY2FuIG9ubHkgdXNlIHRoZSBjb21taXRlZCBvbmVzLlxuICAgIC8vIE5PLU9QXG4gIH0gZWxzZSB7XG4gICAgLy8gV2UgaGF2ZSB0byBzYW1wbGUgdGhlIGNhbmRpZGF0ZXMsIHVzaW5nIHRoZWlyIHJlbGF0aXZlIGZyZXF1ZW5jeS5cbiAgICB2YXIgY2FuZGlkYXRlc1RvSW5jbHVkZSA9IG1heENob2ljZXMgLSBjb21taXR0ZWQubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBjYW5kaWRhdGVzQXRMYXN0UHJpb3JpdHkubGVuZ3RoOyArK2kpIHtcbiAgICAgIGRhdHVtID0gY2FuZGlkYXRlc0F0TGFzdFByaW9yaXR5W2ldO1xuICAgICAgZGF0dW0uX2ZyZXF1ZW5jeVZhbHVlID0gdGhpcy5ybmQucmFuZG9tKCkgLyBkYXR1bS5mcmVxdWVuY3k7XG4gICAgfVxuICAgIGNhbmRpZGF0ZXNUb0luY2x1ZGUuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLl9mcmVxdWVuY3lWYWx1ZSAtIGIuX2ZyZXF1ZW5jeVZhbHVlO1xuICAgICAgICB9KTtcbiAgICB2YXIgY2hvc2VuID0gY2FuZGlkYXRlc1RvSW5jbHVkZS5zbGljZSgwLCBjYW5kaWRhdGVzVG9JbmNsdWRlKTtcbiAgICBjb21taXR0ZWQucHVzaC5hcHBseShjb21taXR0ZWQsIGNob3Nlbik7XG4gIH1cblxuICAvLyBOb3cgc29ydCBpbiBhc2NlbmRpbmcgZGlzcGxheSBvcmRlci5cbiAgY29tbWl0dGVkLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgcmV0dXJuIGEuZGlzcGxheU9yZGVyIC0gYi5kaXNwbGF5T3JkZXI7XG4gICAgICB9KTtcblxuICAvLyBBbmQgcmV0dXJuIGFzIGEgbGlzdCBvZiBpZHMgb25seS5cbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKGkgPSAwOyBpIDwgY29tbWl0dGVkLmxlbmd0aDsgKytpKSB7XG4gICAgcmVzdWx0LnB1c2goY29tbWl0dGVkW2ldLmlkKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyogQ2FsbCB0aGlzIHRvIGNoYW5nZSB0aGUgY2hhcmFjdGVyIHRleHQ6IHRoZSB0ZXh0IGluIHRoZSByaWdodFxuICogdG9vbGJhciBiZWZvcmUgdGhlIHF1YWxpdGllcyBsaXN0LiBUaGlzIHRleHQgaXMgZGVzaWduZWQgdG8gYmVcbiAqIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgdGhlIGN1cnJlbnQgc3RhdGUgb2YgeW91ciBjaGFyYWN0ZXIuIFRoZVxuICogY29udGVudCB5b3UgZ2l2ZSBzaG91bGQgYmUgXCJEaXNwbGF5IENvbnRlbnRcIiAoc2VlXG4gKiBgU3lzdGVtLnByb3RvdHlwZS53cml0ZWAgZm9yIHRoZSBkZWZpbml0aW9uKS5cbiAqL1xuU3lzdGVtLnByb3RvdHlwZS5zZXRDaGFyYWN0ZXJUZXh0ID0gZnVuY3Rpb24oY29udGVudCkge1xuICB2YXIgYmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYXJhY3Rlcl90ZXh0X2NvbnRlbnRcIik7XG4gIHZhciBvbGRDb250ZW50ID0gYmxvY2suaW5uZXJIVE1MO1xuICB2YXIgbmV3Q29udGVudCA9IGF1Z21lbnRMaW5rcyhjb250ZW50KTtcbiAgaWYgKGludGVyYWN0aXZlICYmIGJsb2NrLm9mZnNldFdpZHRoID4gMCAmJiBibG9jay5vZmZzZXRIZWlnaHQgPiAwKSB7XG4gICAgaGlkZUJsb2NrKGJsb2NrKTtcbiAgICBibG9jay5pbm5lckhUTUwgPSBuZXdDb250ZW50O1xuICAgIHNob3dCbG9jayhibG9jayk7XG4gICAgc2hvd0hpZ2hsaWdodChibG9jay5wYXJlbnQpO1xuICB9IGVsc2Uge1xuICAgIGJsb2NrLmlubmVySFRNTCA9IG5ld0NvbnRlbnQ7XG4gIH1cbn07XG5cbi8qIENhbGwgdGhpcyB0byBjaGFuZ2UgdGhlIHZhbHVlIG9mIGEgY2hhcmFjdGVyIHF1YWxpdHkuIERvbid0XG4gKiBkaXJlY3RseSBjaGFuZ2UgcXVhbGl0eSB2YWx1ZXMsIGJlY2F1c2UgdGhhdCB3aWxsIG5vdCB1cGRhdGVcbiAqIHRoZSBVSS4gKFlvdSBjYW4gY2hhbmdlIGFueSBkYXRhIGluIHRoZSBjaGFyYWN0ZXIncyBzYW5kYm94XG4gKiBkaXJlY3RseSwgaG93ZXZlciwgc2luY2UgdGhhdCBpc24ndCBkaXNwbGF5ZWQpLiAqL1xuU3lzdGVtLnByb3RvdHlwZS5zZXRRdWFsaXR5ID0gZnVuY3Rpb24ocXVhbGl0eSwgbmV3VmFsdWUpIHtcbiAgdmFyIG9sZFZhbHVlID0gY2hhcmFjdGVyLnF1YWxpdGllc1txdWFsaXR5XTtcbiAgY2hhcmFjdGVyLnF1YWxpdGllc1txdWFsaXR5XSA9IG5ld1ZhbHVlO1xuICBpZiAoIWludGVyYWN0aXZlKSByZXR1cm47XG5cbiAgLy8gV29yayBvdXQgaG93IHRvIGRpc3BsYXkgdGhlIHZhbHVlcy5cbiAgdmFyIG5ld0Rpc3BsYXk7XG4gIHZhciBxdWFsaXR5RGVmaW5pdGlvbiA9IGdhbWUucXVhbGl0aWVzW3F1YWxpdHldO1xuICBpZiAocXVhbGl0eURlZmluaXRpb24pIHtcbiAgICBuZXdEaXNwbGF5ID0gcXVhbGl0eURlZmluaXRpb24uZm9ybWF0KGNoYXJhY3RlciwgbmV3VmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIC8vIFdlIHNob3VsZG4ndCBkaXNwbGF5IHF1YWxpdGllcyB0aGF0IGhhdmUgbm8gZGVmaW5pdGlvbi5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBBZGQgdGhlIGRhdGEgYmxvY2ssIGlmIHdlIG5lZWQgaXQuXG4gIHZhciBxdWFsaXR5QmxvY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIiNxX1wiK3F1YWxpdHkpO1xuICBpZiAocXVhbGl0eUJsb2NrLmxlbmd0aCA8PSAwKSB7XG4gICAgaWYgKG5ld0Rpc3BsYXkgPT09IG51bGwpIHJldHVybjtcbiAgICBxdWFsaXR5QmxvY2sgPSBhZGRRdWFsaXR5QmxvY2socXVhbGl0eSkuaGlkZSgpLmZhZGVJbig1MDApO1xuICB9IGVsc2Uge1xuICAgIC8vIERvIG5vdGhpbmcgaWYgdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgIGlmIChvbGRWYWx1ZSA9PSBuZXdWYWx1ZSkgcmV0dXJuO1xuXG4gICAgLy8gQ2hhbmdlIHRoZSB2YWx1ZS5cbiAgICBpZiAobmV3RGlzcGxheSA9PT0gbnVsbCkge1xuICAgICAgLy8gUmVtb3ZlIHRoZSBibG9jaywgYW5kIHBvc3NpYmx5IHRoZSB3aG9sZSBncm91cCwgaWZcbiAgICAgIC8vIGl0IGlzIHRoZSBsYXN0IHF1YWxpdHkgaW4gdGhlIGdyb3VwLlxuICAgICAgdmFyIHRvUmVtb3ZlID0gbnVsbDtcbiAgICAgIHZhciBncm91cEJsb2NrID0gcXVhbGl0eUJsb2NrLnBhcmVudHMoJy5xdWFsaXR5X2dyb3VwJyk7XG4gICAgICBpZiAoZ3JvdXBCbG9jay5maW5kKCcucXVhbGl0eScpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgIHRvUmVtb3ZlID0gZ3JvdXBCbG9jaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvUmVtb3ZlID0gcXVhbGl0eUJsb2NrO1xuICAgICAgfVxuXG4gICAgICB0b1JlbW92ZS5mYWRlT3V0KDEwMDAsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRvUmVtb3ZlLnJlbW92ZSgpO1xuICAgICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdmFsQmxvY2sgPSBxdWFsaXR5QmxvY2suZmluZChcIltkYXRhLWF0dHI9J3ZhbHVlJ11cIik7XG4gICAgICB2YWxCbG9jay5mYWRlT3V0KDI1MCwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFsQmxvY2suaHRtbChuZXdEaXNwbGF5KTtcbiAgICAgICAgICB2YWxCbG9jay5mYWRlSW4oNzUwKTtcbiAgICAgICAgICB9KTtcbiAgICB9XG4gIH1cbiAgc2hvd0hpZ2hsaWdodChxdWFsaXR5QmxvY2spO1xufTtcblxuLyogQ2hhbmdlcyBhIHF1YWxpdHkgdG8gYSBuZXcgdmFsdWUsIGJ1dCBhbHNvIHNob3VsZCBzaG93IGEgcHJvZ3Jlc3MgYmFyXG4gKiBhbmltYXRpb24gb2YgdGhlIGNoYW5nZS4gUmVtb3ZlZCB3aXRoIHRoZSBwcm9ncmVzcyBiYXIgZnVuY3Rpb25hbGl0eS4gKi9cblN5c3RlbS5wcm90b3R5cGUuYW5pbWF0ZVF1YWxpdHkgPSBmdW5jdGlvbihxdWFsaXR5LCBuZXdWYWx1ZSwgb3B0cykge1xuICB0aGlzLnNldFF1YWxpdHkocXVhbGl0eSwgbmV3VmFsdWUpO1xufTtcblxuLyogVGhlIGNoYXJhY3RlciB0aGF0IGlzIHBhc3NlZCBpbnRvIGVhY2ggc2l0dWF0aW9uIGlzIG9mIHRoaXNcbiAqIGZvcm0uXG4gKlxuICogVGhlIGBxdWFsaXRpZXNgIGRhdGEgbWVtYmVyIG1hcHMgdGhlIElkcyBvZiBlYWNoIHF1YWxpdHkgdG8gaXRzXG4gKiBjdXJyZW50IHZhbHVlLiBXaGVuIGltcGxlbWVudGluZyBlbnRlciwgYWN0IG9yIGV4aXQgZnVuY3Rpb25zLFxuICogeW91IHNob3VsZCBjb25zaWRlciB0aGlzIHRvIGJlIHJlYWQtb25seS4gTWFrZSBhbGxcbiAqIG1vZGlmaWNhdGlvbnMgdGhyb3VnaCBgU3lzdGVtLnByb3RvdHlwZS5zZXRRdWFsaXR5YCwgb3JcbiAqIGBTeXN0ZW0ucHJvdG90eXBlLmFuaW1hdGVRdWFsaXR5YC4gSW4geW91ciBgaW5pdGAgZnVuY3Rpb24sIHlvdVxuICogY2FuIHNldCB0aGVzZSB2YWx1ZXMgZGlyZWN0bHkuXG4gKlxuICogVGhlIGBzYW5kYm94YCBkYXRhIG1lbWJlciBpcyBkZXNpZ25lZCB0byBhbGxvdyB5b3VyIGNvZGUgdG9cbiAqIHRyYWNrIGFueSBkYXRhIGl0IG5lZWRzIHRvLiBUaGUgb25seSBwcm92aXNvIGlzIHRoYXQgdGhlIGRhdGFcbiAqIHN0cnVjdHVyZSBzaG91bGQgYmUgc2VyaWFsaXphYmxlIGludG8gSlNPTiAodGhpcyBtZWFucyBpdCBtdXN0XG4gKiBvbmx5IGNvbnNpc3Qgb2YgcHJpbWl0aXZlIHR5cGVzIFtvYmplY3RzLCBhcnJheXMsIG51bWJlcnMsXG4gKiBib29sZWFucywgc3RyaW5nc10sIGFuZCBpdCBtdXN0IG5vdCBjb250YWluIGNpcmN1bGFyIHNlcmllcyBvZlxuICogcmVmZXJlbmNlcykuIFRoZSBkYXRhIGluIHRoZSBzYW5kYm94IGlzIG5vdCBkaXNwbGF5ZWQgaW4gdGhlXG4gKiBVSSwgYWx0aG91Z2ggeW91IGFyZSBmcmVlIHRvIHVzZSBpdCB0byBjcmVhdGUgc3VpdGFibGUgb3V0cHV0XG4gKiBmb3IgdGhlIHBsYXllci4uXG4gKi9cbnZhciBDaGFyYWN0ZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5xdWFsaXRpZXMgPSB7fTtcbiAgdGhpcy5zYW5kYm94ID0ge307XG59O1xuXG4vKiBUaGUgZGF0YSBzdHJ1Y3R1cmUgaG9sZGluZyB0aGUgY29udGVudCBmb3IgdGhlIGdhbWUuIEJ5IGRlZmF1bHRcbiAqIHRoaXMgaG9sZHMgbm90aGluZy4gSXQgaXMgdGhpcyBkYXRhIHN0cnVjdHVyZSB0aGF0IGlzIHBvcHVsYXRlZFxuICogaW4gdGhlIGAuZ2FtZS5qc2AgZmlsZS4gRWFjaCBlbGVtZW50IGluIHRoZSBzdHJ1Y3R1cmUgaXNcbiAqIGNvbW1lbnRlZCwgYmVsb3cuXG4gKlxuICogVGhpcyBzaG91bGQgYmUgc3RhdGljIGRhdGEgdGhhdCBuZXZlciBjaGFuZ2VzIHRocm91Z2ggdGhlXG4gKiBjb3Vyc2Ugb2YgdGhlIGdhbWUuIEl0IGlzIG5ldmVyIHNhdmVkLCBzbyBhbnl0aGluZyB0aGF0IG1pZ2h0XG4gKiBjaGFuZ2Ugc2hvdWxkIGJlIHN0b3JlZCBpbiB0aGUgY2hhcmFjdGVyLlxuICovXG52YXIgZ2FtZSA9IHtcblxuICAvLyBTaXR1YXRpb25zXG5cbiAgLyogQW4gb2JqZWN0IG1hcHBpbmcgZnJvbSB0aGUgdW5pcXVlIGlkIG9mIGVhY2ggc2l0dWF0aW9uLCB0b1xuICAgKiB0aGUgc2l0dWF0aW9uIG9iamVjdCBpdHNlbGYuIFRoaXMgaXMgdGhlIGhlYXJ0IG9mIHRoZSBnYW1lXG4gICAqIHNwZWNpZmljYXRpb24uICovXG4gIHNpdHVhdGlvbnM6IHt9LFxuXG4gIC8qIFRoZSB1bmlxdWUgaWQgb2YgdGhlIHNpdHVhdGlvbiB0byBlbnRlciBhdCB0aGUgc3RhcnQgb2YgYVxuICAgKiBuZXcgZ2FtZS4gKi9cbiAgc3RhcnQ6IFwic3RhcnRcIixcblxuICAvLyBRdWFsaXR5IGRpc3BsYXkgZGVmaW5pdGlvbnNcblxuICAvKiBBbiBvYmplY3QgbWFwcGluZyB0aGUgdW5pcXVlIGlkIG9mIGVhY2ggcXVhbGl0eSB0byBpdHNcbiAgICogUXVhbGl0eURlZmluaXRpb24uIFlvdSBkb24ndCBuZWVkIGRlZmluaXRpb25zIGZvciBldmVyeVxuICAgKiBxdWFsaXR5LCBidXQgb25seSBxdWFsaXRpZXMgaW4gdGhpcyBtYXBwaW5nIHdpbGwgYmVcbiAgICogZGlzcGxheWVkIGluIHRoZSBjaGFyYWN0ZXIgYm94IG9mIHRoZSBVSS4gKi9cbiAgcXVhbGl0aWVzOiB7fSxcblxuICAvKiBRdWFsaXRpZXMgY2FuIGhhdmUgYW4gb3B0aW9uYWwgZ3JvdXAgSWQuIFRoaXMgbWFwcyB0aG9zZVxuICAgKiBJZHMgdG8gdGhlIGdyb3VwIGRlZmluaXRpb25zIHRoYXQgc2F5cyBob3cgdG8gZm9ybWF0IGl0c1xuICAgKiBxdWFsaXRpZXMuXG4gICAqL1xuICBxdWFsaXR5R3JvdXBzOiB7fSxcblxuICAvLyBIb29rc1xuXG4gIC8qIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGF0IHRoZSBzdGFydCBvZiB0aGUgZ2FtZS4gSXQgaXNcbiAgICogbm9ybWFsbHkgb3ZlcnJpZGRlbiB0byBwcm92aWRlIGluaXRpYWwgY2hhcmFjdGVyIGNyZWF0aW9uXG4gICAqIChzZXR0aW5nIGluaXRpYWwgcXVhbGl0eSB2YWx1ZXMsIHNldHRpbmcgdGhlXG4gICAqIGNoYXJhY3Rlci10ZXh0LiBUaGlzIGlzIG9wdGlvbmFsLCBob3dldmVyLCBhcyBzZXQtdXBcbiAgICogcHJvY2Vzc2luZyBjb3VsZCBhbHNvIGJlIGRvbmUgYnkgdGhlIGZpcnN0IHNpdHVhdGlvbidzXG4gICAqIGVudGVyIGZ1bmN0aW9uLiBJZiB0aGlzIGZ1bmN0aW9uIGlzIGdpdmVuIGl0IHNob3VsZCBoYXZlXG4gICAqIHRoZSBzaWduYXR1cmUgZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0pLlxuICAgKi9cbiAgaW5pdDogbnVsbCxcblxuICAvKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBiZWZvcmUgZW50ZXJpbmcgYW55IG5ld1xuICAgKiBzaXR1YXRpb24uIEl0IGlzIGNhbGxlZCBiZWZvcmUgdGhlIGNvcnJlc3BvbmRpbmcgc2l0dWF0aW9uXG4gICAqIGhhcyBpdHMgYGVudGVyYCBtZXRob2QgY2FsbGVkLiBJdCBjYW4gYmUgdXNlZCB0byBpbXBsZW1lbnRcbiAgICogdGltZWQgdHJpZ2dlcnMsIGJ1dCBpcyB0b3RhbGx5IG9wdGlvbmFsLiBJZiB0aGlzIGZ1bmN0aW9uXG4gICAqIGlzIGdpdmVuIGl0IHNob3VsZCBoYXZlIHRoZSBzaWduYXR1cmU6XG4gICAqXG4gICAqIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICAgKi9cbiAgZW50ZXI6IG51bGwsXG5cbiAgLyogSG9vayBmb3Igd2hlbiB0aGUgc2l0dWF0aW9uIGhhcyBhbHJlYWR5IGJlZW4gY2FycmllZCBvdXRcbiAgICogYW5kIHByaW50ZWQuIFRoZSBzaWduYXR1cmUgaXM6XG4gICAqXG4gICAqIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICAgKi9cbiAgYWZ0ZXJFbnRlcjogbnVsbCxcblxuICAvKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBiZWZvcmUgY2Fycnlpbmcgb3V0IGFueSBhY3Rpb24gaW5cbiAgICogYW55IHNpdHVhdGlvbi4gSXQgaXMgY2FsbGVkIGJlZm9yZSB0aGUgY29ycmVzcG9uZGluZ1xuICAgKiBzaXR1YXRpb24gaGFzIGl0cyBgYWN0YCBtZXRob2QgY2FsbGVkLiBJZiB0aGlzIG9wdGlvbmFsXG4gICAqIGZ1bmN0aW9uIGlzIGdpdmVuIGl0IHNob3VsZCBoYXZlIHRoZSBzaWduYXR1cmU6XG4gICAqXG4gICAqIGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb25JZCwgYWN0aW9uSWQpO1xuICAgKlxuICAgKiBJZiB0aGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlLCB0aGVuIGl0IGlzIGluZGljYXRpbmcgdGhhdCBpdFxuICAgKiBoYXMgY29uc3VtZWQgdGhlIGFjdGlvbiwgYW5kIHRoZSBhY3Rpb24gd2lsbCBub3QgYmUgcGFzc2VkXG4gICAqIG9uIHRvIHRoZSBzaXR1YXRpb24uIE5vdGUgdGhhdCB0aGlzIGlzIHRoZSBvbmx5IG9uZSBvZlxuICAgKiB0aGVzZSBnbG9iYWwgaGFuZGxlcnMgdGhhdCBjYW4gY29uc3VtZSB0aGUgZXZlbnQuXG4gICAqL1xuICBiZWZvcmVBY3Rpb246IG51bGwsXG5cbiAgLyogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgYWZ0ZXIgY2Fycnlpbmcgb3V0IGFueSBhY3Rpb24gaW5cbiAgICogYW55IHNpdHVhdGlvbi4gSXQgaXMgY2FsbGVkIGFmdGVyIHRoZSBjb3JyZXNwb25kaW5nXG4gICAqIHNpdHVhdGlvbiBoYXMgaXRzIGBhY3RgIG1ldGhvZCBjYWxsZWQuIElmIHRoaXMgb3B0aW9uYWxcbiAgICogZnVuY3Rpb24gaXMgZ2l2ZW4gaXQgc2hvdWxkIGhhdmUgdGhlIHNpZ25hdHVyZTpcbiAgICpcbiAgICogZnVuY3Rpb24oY2hhcmFjdGVyLCBzeXN0ZW0sIHNpdHVhdGlvbklkLCBhY3Rpb25JZCk7XG4gICAqL1xuICBhZnRlckFjdGlvbjogbnVsbCxcblxuICAvKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBhZnRlciBsZWF2aW5nIGFueSBzaXR1YXRpb24uIEl0IGlzXG4gICAqIGNhbGxlZCBhZnRlciB0aGUgY29ycmVzcG9uZGluZyBzaXR1YXRpb24gaGFzIGl0cyBgZXhpdGBcbiAgICogbWV0aG9kIGNhbGxlZC4gSWYgdGhpcyBvcHRpb25hbCBmdW5jdGlvbiBpcyBnaXZlbiBpdCBzaG91bGRcbiAgICogaGF2ZSB0aGUgc2lnbmF0dXJlOlxuICAgKlxuICAgKiBmdW5jdGlvbihjaGFyYWN0ZXIsIHN5c3RlbSwgb2xkU2l0dWF0aW9uSWQsIG5ld1NpdHVhdGlvbklkKTtcbiAgICovXG4gIGV4aXQ6IG51bGxcbn07XG4iLCIvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vLyBDb2RlIGJlbG93IGRvZXNuJ3QgZm9ybSBwYXJ0IG9mIHRoZSBwdWJsaWMgQVBJIGZvciBVTkRVTSwgc29cbi8vIHlvdSBzaG91bGRuJ3QgZmluZCB5b3UgbmVlZCB0byB1c2UgaXQuXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBJbnRlcm5hbCBEYXRhXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiBUaGUgZ2xvYmFsIHN5c3RlbSBvYmplY3QuICovXG52YXIgc3lzdGVtID0gbmV3IFN5c3RlbSgpO1xuXG4vKiBUaGlzIGlzIHRoZSBkYXRhIG9uIHRoZSBwbGF5ZXIncyBwcm9ncmVzcyB0aGF0IGdldHMgc2F2ZWQuICovXG52YXIgcHJvZ3Jlc3MgPSB7XG4gIC8vIEEgcmFuZG9tIHNlZWQgc3RyaW5nLCB1c2VkIGludGVybmFsbHkgdG8gbWFrZSByYW5kb21cbiAgLy8gc2VxdWVuY2VzIHByZWRpY3RhYmxlLlxuc2VlZDogbnVsbCxcbiAgICAgIC8vIEtlZXBzIHRyYWNrIG9mIHRoZSBsaW5rcyBjbGlja2VkLCBhbmQgd2hlbi5cbiAgICAgIHNlcXVlbmNlOiBbXSxcbiAgICAgIC8vIFRoZSB0aW1lIHdoZW4gdGhlIHByb2dyZXNzIHdhcyBzYXZlZC5cbiAgICAgIHNhdmVUaW1lOiBudWxsXG59O1xuXG4vKiBUaGUgSWQgb2YgdGhlIGN1cnJlbnQgc2l0dWF0aW9uIHRoZSBwbGF5ZXIgaXMgaW4uICovXG52YXIgY3VycmVudCA9IG51bGw7XG5cbi8qIFRoaXMgaXMgdGhlIGN1cnJlbnQgY2hhcmFjdGVyLiBJdCBzaG91bGQgYmUgcmVjb25zdHJ1Y3RhYmxlXG4gKiBmcm9tIHRoZSBhYm92ZSBwcm9ncmVzcyBkYXRhLiAqL1xudmFyIGNoYXJhY3RlciA9IG51bGw7XG5cbi8qIFRyYWNrcyB3aGV0aGVyIHdlJ3JlIGluIGludGVyYWN0aXZlIG1vZGUgb3IgYmF0Y2ggbW9kZS4gKi9cbnZhciBpbnRlcmFjdGl2ZSA9IHRydWU7XG5cbi8qIFRoZSBzeXN0ZW0gdGltZSB3aGVuIHRoZSBnYW1lIHdhcyBpbml0aWFsaXplZC4gKi9cbnZhciBzdGFydFRpbWU7XG5cbi8qIFRoZSBzdGFjayBvZiBsaW5rcywgcmVzdWx0aW5nIGZyb20gdGhlIGxhc3QgYWN0aW9uLCBzdGlsbCBiZSB0b1xuICogcmVzb2x2ZWQuICovXG52YXIgbGlua1N0YWNrID0gbnVsbDtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFV0aWxpdHkgRnVuY3Rpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG52YXIgZ2V0Q3VycmVudFNpdHVhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoY3VycmVudCkge1xuICAgIHJldHVybiBnYW1lLnNpdHVhdGlvbnNbY3VycmVudF07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbnZhciBwYXJzZSA9IGZ1bmN0aW9uKHN0cikge1xuICBpZiAoc3RyID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XG4gIH1cbn07XG5cbnZhciBwYXJzZUxpc3QgPSBmdW5jdGlvbihzdHIsIGNhbkJlVW5kZWZpbmVkKSB7XG4gIGlmIChzdHIgPT09IHVuZGVmaW5lZCB8fCBzdHIgPT09IG51bGwpIHtcbiAgICBpZiAoY2FuQmVVbmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvWyAsXFx0XSsvKTtcbiAgfVxufTtcblxudmFyIHBhcnNlRm4gPSBmdW5jdGlvbihzdHIpIHtcbiAgaWYgKHN0ciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfSBlbHNlIHtcbiAgICB2YXIgZnN0ciA9IFwiKGZ1bmN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBzaXR1YXRpb24pIHtcXG5cIiArXG4gICAgICBzdHIgKyBcIlxcbn0pXCI7XG4gICAgdmFyIGZuID0gZXZhbChmc3RyKTtcbiAgICByZXR1cm4gZm47XG4gIH1cbn07XG5cbnZhciBsb2FkSFRNTFNpdHVhdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyICRodG1sU2l0dWF0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJkaXYuc2l0dWF0aW9uXCIpO1xuICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKCRodG1sU2l0dWF0aW9ucywgZnVuY3Rpb24oJHNpdHVhdGlvbil7XG4gICAgdmFyIGlkID0gJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJpZFwiKTtcbiAgICBhc3NlcnQoZ2FtZS5zaXR1YXRpb25zW2lkXSA9PT0gdW5kZWZpbmVkLCBcImV4aXN0aW5nX3NpdHVhdGlvblwiLmwoe2lkOmlkfSkpO1xuXG4gICAgdmFyIGNvbnRlbnQgPSAkc2l0dWF0aW9uLmlubmVySFRNTDtcbiAgICB2YXIgb3B0cyA9IHtcbiAgICAgIC8vIFNpdHVhdGlvbiBjb250ZW50XG4gICAgICBvcHRpb25UZXh0OiAkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtb3B0aW9uLXRleHRcIiksXG4gICAgICBjYW5WaWV3OiBwYXJzZUZuKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1jYW4tdmlld1wiKSksXG4gICAgICBjYW5DaG9vc2U6IHBhcnNlRm4oJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNhbi1jaG9vc2VcIikpLFxuICAgICAgcHJpb3JpdHk6IHBhcnNlKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1wcmlvcml0eVwiKSksXG4gICAgICBmcmVxdWVuY3k6IHBhcnNlKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1mcmVxdWVuY3lcIikpLFxuICAgICAgZGlzcGxheU9yZGVyOiBwYXJzZSgkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtZGlzcGxheS1vcmRlclwiKSksXG4gICAgICB0YWdzOiBwYXJzZUxpc3QoJHNpdHVhdGlvbi5nZXRBdHRyaWJ1dGUoXCJkYXRhLXRhZ3NcIiksIGZhbHNlKSxcbiAgICAgIC8vIFNpbXBsZSBTaXR1YXRpb24gY29udGVudC5cbiAgICAgIGhlYWRpbmc6ICRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1oZWFkaW5nXCIpLFxuICAgICAgY2hvaWNlczogcGFyc2VMaXN0KCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1jaG9pY2VzXCIpLCB0cnVlKSxcbiAgICAgIG1pbkNob2ljZXM6IHBhcnNlKCRzaXR1YXRpb24uZ2V0QXR0cmlidXRlKFwiZGF0YS1taW4tY2hvaWNlc1wiKSksXG4gICAgICBtYXhDaG9pY2VzOiBwYXJzZSgkc2l0dWF0aW9uLmdldEF0dHJpYnV0ZShcImRhdGEtbWF4LWNob2ljZXNcIikpXG4gICAgfTtcblxuICAgIGdhbWUuc2l0dWF0aW9uc1tpZF0gPSBuZXcgU2ltcGxlU2l0dWF0aW9uKGNvbnRlbnQsIG9wdHMpO1xuICB9KTtcbn07XG5cblxuLyogT3V0cHV0cyByZWd1bGFyIGNvbnRlbnQgdG8gdGhlIHBhZ2UuIFVzZWQgYnkgd3JpdGUgYW5kXG4gKiB3cml0ZUJlZm9yZSwgdGhlIGxhc3QgdHdvIGFyZ3VtZW50cyBjb250cm9sIHdoYXQgalF1ZXJ5IG1ldGhvZHNcbiAqIGFyZSB1c2VkIHRvIGFkZCB0aGUgY29udGVudC5cbiAqL1xuLy8gVE9ETzogdGhpcyBmdW5jdGlvbiBjYW4gYXBwZW5kIHRleHQsIHByZXBlbmQgdGV4dCBvciByZXBsYWNlIHRleHQgaW4gc2VsZWN0b3Igd2l0aCB0aGUgc3VwcGxpZWQgb25lLlxudmFyIGRvV3JpdGUgPSBmdW5jdGlvbihjb250ZW50LCBzZWxlY3Rvcikge1xuICBjb250aW51ZU91dHB1dFRyYW5zYWN0aW9uKCk7XG4gIHZhciBvdXRwdXQgPSBhdWdtZW50TGlua3MoY29udGVudCk7XG4gIHZhciBlbGVtZW50O1xuICBpZiAoc2VsZWN0b3IpIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKGVsZW1lbnQpIHtcbiAgICAvLyBUT0RPOiBzY3JvbGwgdG8gdGhlIGxhc3QgcG9zaXRpb25cbiAgICBkaW1lbnNpb25zID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zb2xlLmxvZyhkaW1lbnNpb25zKTtcbiAgICB3aW5kb3cuc2Nyb2xsKDAsMTUwKTtcbiAgICAvLyBUT0RPOiBzY3JvbGxTdGFja1tzY3JvbGxTdGFjay5sZW5ndGgtMV0gPSBzY3JvbGxQb2ludDsqL1xuICB9XG4gIGlmICghZWxlbWVudCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb250ZW50JykuaW5uZXJIVE1MID0gb3V0cHV0O1xuICB9XG4gIGVsc2Uge1xuICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQob3V0cHV0KTtcbiAgfVxuICAvKiBXZSB3YW50IHRvIHNjcm9sbCB0aGlzIG5ldyBlbGVtZW50IHRvIHRoZSBib3R0b20gb2YgdGhlIHNjcmVlbi5cbiAgICogd2hpbGUgc3RpbGwgYmVpbmcgdmlzaWJsZS4gVGhlIGVhc2llc3Qgd2F5IGlzIHRvIGZpbmQgdGhlXG4gICAqIHRvcCBlZGdlIG9mIHRoZSAqZm9sbG93aW5nKiBlbGVtZW50IGFuZCBtb3ZlIHRoYXQgZXhhY3RseVxuICAgKiB0byB0aGUgYm90dG9tICh3aGlsZSBzdGlsbCBlbnN1cmluZyB0aGF0IHRoaXMgZWxlbWVudCBpcyBmdWxseVxuICAgKiB2aXNpYmxlLikgKi9cbiAgLyp2YXIgbmV4dGVsID0gb3V0cHV0Lmxhc3QoKS5uZXh0KCk7XG4gICAgdmFyIHNjcm9sbFBvaW50O1xuICAgIGlmICghbmV4dGVsLmxlbmd0aCkge1xuICAgIHNjcm9sbFBvaW50ID0gJChcIiNjb250ZW50XCIpLmhlaWdodCgpICsgJChcIiN0aXRsZVwiKS5oZWlnaHQoKSArIDYwO1xuICAgIH0gZWxzZSB7XG4gICAgc2Nyb2xsUG9pbnQgPSBuZXh0ZWwub2Zmc2V0KCkudG9wIC0gJCh3aW5kb3cpLmhlaWdodCgpO1xuICAgIH1cbiAgICBpZiAoc2Nyb2xsUG9pbnQgPiBvdXRwdXQub2Zmc2V0KCkudG9wKVxuICAgIHNjcm9sbFBvaW50ID0gb3V0cHV0Lm9mZnNldCgpLnRvcDtcbiAgICBzY3JvbGxTdGFja1tzY3JvbGxTdGFjay5sZW5ndGgtMV0gPSBzY3JvbGxQb2ludDsqL1xufTtcblxuLyogR2V0cyB0aGUgdW5pcXVlIGlkIHVzZWQgdG8gaWRlbnRpZnkgc2F2ZWQgZ2FtZXMuICovXG52YXIgZ2V0U2F2ZUlkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAndW5kdW1fJytnYW1lLmlkK1wiX1wiK2dhbWUudmVyc2lvbjtcbn07XG5cbi8qIEFkZHMgdGhlIHF1YWxpdHkgYmxvY2tzIHRvIHRoZSBjaGFyYWN0ZXIgdG9vbHMuICovXG52YXIgc2hvd1F1YWxpdGllcyA9IGZ1bmN0aW9uKCkge1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInF1YWxpdGllc1wiKS5pbm5lckhUTUwgPSAnJztcbiAgZm9yICh2YXIgcXVhbGl0eUlkIGluIGNoYXJhY3Rlci5xdWFsaXRpZXMpIHtcbiAgICBhZGRRdWFsaXR5QmxvY2socXVhbGl0eUlkKTtcbiAgfVxufTtcblxuLyogRmFkZXMgaW4gYW5kIG91dCBhIGhpZ2hsaWdodCBvbiB0aGUgZ2l2ZW4gZWxlbWVudC4gKi9cbnZhciBzaG93SGlnaGxpZ2h0ID0gZnVuY3Rpb24oZG9tRWxlbWVudCkge1xuICB2YXIgaGlnaGxpZ2h0ID0gZG9tRWxlbWVudC5xdWVyeVNlbGVjdG9yKFwiLmhpZ2hsaWdodFwiKTtcbiAgaWYgKGhpZ2hsaWdodC5sZW5ndGggPD0gMCkge1xuICAgIGhpZ2hsaWdodCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCI8ZGl2PjwvZGl2PlwiKS5jbGFzc0xpc3QuYWRkKCdoaWdobGlnaHQnKTtcbiAgICBkb21FbGVtZW50LmFwcGVuZENoaWxkKGhpZ2hsaWdodCk7XG4gIH1cbiAgc2hvd0Jsb2NrKGhpZ2hsaWdodCk7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgaGlkZUJsb2NrKGhpZ2hsaWdodCk7XG4gIH0sIDIwMDApO1xufTtcblxuLyogRmluZHMgdGhlIGNvcnJlY3QgbG9jYXRpb24gYW5kIGluc2VydHMgYSBwYXJ0aWN1bGFyIERPTSBlbGVtZW50XG4gKiBmaXRzIGludG8gYW4gZXhpc3RpbmcgbGlzdCBvZiBET00gZWxlbWVudHMuIFRoaXMgaXMgZG9uZSBieVxuICogcHJpb3JpdHkgb3JkZXIsIHNvIGFsbCBlbGVtZW50cyAoZXhpc3RpbmcgYW5kIG5ldykgbXVzdCBoYXZlXG4gKiB0aGVpciBkYXRhLXByaW9yaXR5IGF0dHJpYnV0ZSBzZXQuICovXG52YXIgaW5zZXJ0QXRDb3JyZWN0UG9zaXRpb24gPSBmdW5jdGlvbihwYXJlbnQsIG5ld0l0ZW0pIHtcbiAgdmFyIG5ld1ByaW9yaXR5ID0gbmV3SXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcHJpb3JpdHknKTtcbiAgdmFyIF9jaGlsZHJlbiA9IHBhcmVudC5jaGlsZHJlbjtcbiAgaWYgKF9jaGlsZHJlbiAhPSB1bmRlZmluZWQpXG4gIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IF9jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGNoaWxkID0gX2NoaWxkcmVuW2ldO1xuICAgICAgaWYgKG5ld1ByaW9yaXR5IDwgY2hpbGQuZ2V0QXR0cmlidXRlKCdkYXRhLXByaW9yaXR5JykpIHtcbiAgICAgICAgY2hpbGQuYmVmb3JlKG5ld0l0ZW0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChuZXdJdGVtKTtcbiAgfVxufTtcblxuLyogQWRkcyBhIG5ldyBncm91cCB0byB0aGUgY29ycmVjdCBsb2NhdGlvbiBpbiB0aGUgcXVhbGl0eSBsaXN0LiAqL1xudmFyIGFkZEdyb3VwQmxvY2sgPSBmdW5jdGlvbihncm91cElkKSB7XG4gIHZhciBncm91cERlZmluaXRpb24gPSBnYW1lLnF1YWxpdHlHcm91cHNbZ3JvdXBJZF07XG5cbiAgLy8gQnVpbGQgdGhlIGdyb3VwIGRpdiB3aXRoIGFwcHJvcHJpYXRlIGhlYWRpbmcuXG4gIHZhciBncm91cEJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJxdWFsaXR5X2dyb3VwXCIpLmNsb25lTm9kZSh0cnVlKTtcbiAgZ3JvdXBCbG9jay5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBcImdfXCIrZ3JvdXBJZCk7XG4gIGdyb3VwQmxvY2suc2V0QXR0cmlidXRlKFwiZGF0YS1wcmlvcml0eVwiLCBncm91cERlZmluaXRpb24ucHJpb3JpdHkpO1xuXG4gIHZhciB0aXRsZUVsZW1lbnQgPSBncm91cEJsb2NrLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbZGF0YS1hdHRyPSd0aXRsZSddXCIpO1xuICBpZiAoZ3JvdXBEZWZpbml0aW9uLnRpdGxlKSB7XG4gICAgdGl0bGVFbGVtZW50LmlubmVySFRNTCA9IGdyb3VwRGVmaW5pdGlvbi50aXRsZTtcbiAgfSBlbHNlIHtcbiAgICBpZiAodGl0bGVFbGVtZW50LnBhcmVudE5vZGUgIT0gdW5kZWZpbmVkKVxuICAgIHtcbiAgICAgIHRpdGxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRpdGxlRWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGdyb3VwRGVmaW5pdGlvbi5leHRyYUNsYXNzZXMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdyb3VwRGVmaW5pdGlvbi5leHRyYUNsYXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGdyb3VwQmxvY2suYWRkQ2xhc3MoZ3JvdXBEZWZpbml0aW9uLmV4dHJhQ2xhc3Nlc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIHRoZSBibG9jayB0byB0aGUgY29ycmVjdCBwbGFjZS5cbiAgdmFyIHF1YWxpdGllcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicXVhbGl0aWVzXCIpO1xuICBpbnNlcnRBdENvcnJlY3RQb3NpdGlvbihxdWFsaXRpZXMsIGdyb3VwQmxvY2spO1xuICByZXR1cm4gZ3JvdXBCbG9jaztcbn07XG5cbi8qIEFkZHMgYSBuZXcgcXVhbGl0eSB0byB0aGUgY29ycmVjdCBsb2NhdGlvbiBpbiB0aGUgcXVhbGl0eSBsaXN0LiAqL1xudmFyIGFkZFF1YWxpdHlCbG9jayA9IGZ1bmN0aW9uKHF1YWxpdHlJZCkge1xuICAvLyBNYWtlIHN1cmUgd2Ugd2FudCB0byBkaXNwbGF5IHRoaXMgcXVhbGl0eS5cbiAgdmFyIHF1YWxpdHlEZWZpbml0aW9uID0gZ2FtZS5xdWFsaXRpZXNbcXVhbGl0eUlkXTtcbiAgaWYgKCFxdWFsaXR5RGVmaW5pdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGRpc3BsYXkgYSBxdWFsaXR5IHRoYXQgaGFzbid0IGJlZW4gZGVmaW5lZDogXCIrXG4gICAgICAgIHF1YWxpdHlJZCk7XG4gIH1cblxuICAvLyBXb3JrIG91dCBob3cgdGhlIHZhbHVlIHNob3VsZCBiZSBkaXNwbGF5ZWQuXG4gIHZhciBuYW1lID0gcXVhbGl0eURlZmluaXRpb24udGl0bGU7XG4gIHZhciB2YWwgPSBxdWFsaXR5RGVmaW5pdGlvbi5mb3JtYXQoXG4gICAgICBjaGFyYWN0ZXIsIGNoYXJhY3Rlci5xdWFsaXRpZXNbcXVhbGl0eUlkXVxuICAgICAgKTtcbiAgaWYgKHZhbCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cbiAgLy8gQ3JlYXRlIHRoZSBxdWFsaXR5IG91dHB1dC5cbiAgdmFyIHF1YWxpdHlCbG9jayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicXVhbGl0eVwiKS5jbG9uZU5vZGUodHJ1ZSk7XG4gIHF1YWxpdHlCbG9jay5zZXRBdHRyaWJ1dGUoXCJpZFwiLCBcInFfXCIrcXVhbGl0eUlkKTtcbiAgcXVhbGl0eUJsb2NrLnNldEF0dHJpYnV0ZShcImRhdGEtcHJpb3JpdHlcIiwgcXVhbGl0eURlZmluaXRpb24ucHJpb3JpdHkpO1xuICBxdWFsaXR5QmxvY2sucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWF0dHI9J25hbWUnXVwiKS5pbm5lckhUTUwgPSBuYW1lO1xuICBxdWFsaXR5QmxvY2sucXVlcnlTZWxlY3RvckFsbChcIltkYXRhLWF0dHI9J3ZhbHVlJ11cIikuaW5uZXJIVE1MID0gdmFsO1xuICBpZiAocXVhbGl0eURlZmluaXRpb24uZXh0cmFDbGFzc2VzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBxdWFsaXR5RGVmaW5pdGlvbi5leHRyYUNsYXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHF1YWxpdHlCbG9jay5jbGFzc05hbWUuYWRkKHF1YWxpdHlEZWZpbml0aW9uLmV4dHJhQ2xhc3Nlc1tpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCBvciBjcmVhdGUgdGhlIGdyb3VwIGJsb2NrLlxuICB2YXIgZ3JvdXBCbG9jaztcbiAgdmFyIGdyb3VwSWQgPSBxdWFsaXR5RGVmaW5pdGlvbi5ncm91cDtcbiAgaWYgKGdyb3VwSWQpIHtcbiAgICB2YXIgZ3JvdXAgPSBnYW1lLnF1YWxpdHlHcm91cHNbZ3JvdXBJZF07XG4gICAgYXNzZXJ0KGdyb3VwLCBcIm5vX2dyb3VwX2RlZmluaXRpb25cIi5sKHtpZDogZ3JvdXBJZH0pKTtcbiAgICBncm91cEJsb2NrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnX1wiK2dyb3VwSWQpO1xuICAgIGlmIChncm91cEJsb2NrID09IG51bGwgfHwgZ3JvdXBCbG9jay5sZW5ndGggPD0gMCkge1xuICAgICAgZ3JvdXBCbG9jayA9IGFkZEdyb3VwQmxvY2soZ3JvdXBJZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gUG9zaXRpb24gaXQgY29ycmVjdGx5LlxuICB2YXIgZ3JvdXBRdWFsaXR5TGlzdCA9IGdyb3VwQmxvY2sucXVlcnlTZWxlY3RvckFsbChcIi5xdWFsaXRpZXNfaW5fZ3JvdXBcIik7XG4gIGluc2VydEF0Q29ycmVjdFBvc2l0aW9uKGdyb3VwUXVhbGl0eUxpc3QsIHF1YWxpdHlCbG9jayk7XG4gIHJldHVybiBxdWFsaXR5QmxvY2s7XG59O1xuXG4vKiBPdXRwdXQgZXZlbnRzIGFyZSB0cmFja2VkLCBzbyB3ZSBjYW4gbWFrZSBzdXJlIHdlIHNjcm9sbFxuICogY29ycmVjdGx5LiBXZSBkbyB0aGlzIGluIGEgc3RhY2sgYmVjYXVzZSBvbmUgY2xpY2sgbWlnaHQgY2F1c2VcbiAqIGEgY2hhaW4gcmVhY3Rpb24uIE9mIG91dHB1dCBldmVudHMsIG9ubHkgd2hlbiB3ZSByZXR1cm4gdG8gdGhlXG4gKiB0b3AgbGV2ZWwgd2lsbCB3ZSBkbyB0aGUgc2Nyb2xsLlxuICpcbiAqIEhvd2V2ZXIsIHRoYXQgbGVhdmVzIHRoZSBxdWVzdGlvbiBvZiB3aGVyZSB0byBzY3JvbGwgKnRvKi5cbiAqIChSZW1lbWJlciB0aGF0IGVsZW1lbnRzIGNvdWxkIGJlIGluc2VydGVkIGFueXdoZXJlIGluIHRoZVxuICogZG9jdW1lbnQuKSBXaGVuZXZlciB3ZSBkbyBhIHdyaXRlKCksIHdlJ2xsIGhhdmUgdG8gdXBkYXRlIHRoZVxuICogdG9wIChsYXN0KSBzdGFjayBlbGVtZW50IHRvIHRoYXQgcG9zaXRpb24uXG4gKi9cbnZhciBzY3JvbGxTdGFjayA9IFtdO1xudmFyIHBlbmRpbmdGaXJzdFdyaXRlID0gZmFsc2U7XG52YXIgc3RhcnRPdXRwdXRUcmFuc2FjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAoc2Nyb2xsU3RhY2subGVuZ3RoID09PSAwKSB7XG4gICAgcGVuZGluZ0ZpcnN0V3JpdGUgPSB0cnVlO1xuICB9XG4gIC8vIFRoZSBkZWZhdWx0IGlzIFwiYWxsIHRoZSB3YXkgZG93blwiLlxuICBzY3JvbGxTdGFjay5wdXNoKFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udGVudFwiKS5vZmZzZXRIZWlnaHQgKyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRpdGxlXCIpLm9mZnNldEhlaWdodCArIDYwXG4gICk7XG59O1xudmFyIGNvbnRpbnVlT3V0cHV0VHJhbnNhY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHBlbmRpbmdGaXJzdFdyaXRlKSB7XG4gICAgcGVuZGluZ0ZpcnN0V3JpdGUgPSBmYWxzZTtcbiAgICB2YXIgc2VwYXJhdG9yID0gJChcIiN1aV9saWJyYXJ5ICN0dXJuX3NlcGFyYXRvclwiKS5jbG9uZSgpO1xuICAgIHNlcGFyYXRvci5yZW1vdmVBdHRyKFwiaWRcIik7XG4gICAgJChcIiNjb250ZW50XCIpLmFwcGVuZChzZXBhcmF0b3IpO1xuICB9XG59O1xudmFyIGVuZE91dHB1dFRyYW5zYWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzY3JvbGxQb2ludCA9IHNjcm9sbFN0YWNrLnBvcCgpO1xuICBpZiAoc2Nyb2xsU3RhY2subGVuZ3RoID09PSAwICYmIHNjcm9sbFBvaW50ICE9PSBudWxsKSB7XG4gICAgaWYgKGludGVyYWN0aXZlKSB7XG4gICAgICB3aW5kb3cuc2Nyb2xsKDAsc2Nyb2xsUG9pbnQpO1xuICAgIH1cbiAgICBzY3JvbGxQb2ludCA9IG51bGw7XG4gIH1cbn07XG5cbi8qIFRoaXMgZ2V0cyBjYWxsZWQgd2hlbiBhIGxpbmsgbmVlZHMgdG8gYmUgZm9sbG93ZWQsIHJlZ2FyZGxlc3NcbiAqIG9mIHdoZXRoZXIgaXQgd2FzIHVzZXIgYWN0aW9uIHRoYXQgaW5pdGlhdGVkIGl0LiAqL1xudmFyIGxpbmtSZSA9IC9eKFthLXowLTlfLV0rfFxcLikoXFwvKFswLTlhLXpfLV0rKSk/JC87XG52YXIgcHJvY2Vzc0xpbmsgPSBmdW5jdGlvbihjb2RlKSB7XG4gIC8vIENoZWNrIGlmIHdlIHNob3VsZCBkbyB0aGlzIG5vdywgb3IgaWYgcHJvY2Vzc2luZyBpcyBhbHJlYWR5XG4gIC8vIHVuZGVyd2F5LlxuICBpZiAobGlua1N0YWNrICE9PSBudWxsKSB7XG4gICAgbGlua1N0YWNrLnB1c2goY29kZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gVHJhY2sgd2hlcmUgd2UncmUgYWJvdXQgdG8gYWRkIG5ldyBjb250ZW50LlxuICBzdGFydE91dHB1dFRyYW5zYWN0aW9uKCk7XG5cbiAgLy8gV2UncmUgcHJvY2Vzc2luZywgc28gbWFrZSB0aGUgc3RhY2sgYXZhaWxhYmxlLlxuICBsaW5rU3RhY2sgPSBbXTtcblxuICAvLyBIYW5kbGUgZWFjaCBsaW5rIGluIHR1cm4uXG4gIHByb2Nlc3NPbmVMaW5rKGNvZGUpO1xuICB3aGlsZSAobGlua1N0YWNrLmxlbmd0aCA+IDApIHtcbiAgICBjb2RlID0gbGlua1N0YWNrLnNoaWZ0KCk7XG4gICAgcHJvY2Vzc09uZUxpbmsoY29kZSk7XG4gIH1cblxuICAvLyBXZSdyZSBkb25lLCBzbyByZW1vdmUgdGhlIHN0YWNrIHRvIHByZXZlbnQgZnV0dXJlIHB1c2hlcy5cbiAgbGlua1N0YWNrID0gbnVsbDtcblxuICAvLyBTY3JvbGwgdG8gdGhlIHRvcCBvZiB0aGUgbmV3IGNvbnRlbnQuXG4gIGVuZE91dHB1dFRyYW5zYWN0aW9uKCk7XG5cbiAgLy8gV2UncmUgYWJsZSB0byBzYXZlLCBpZiB3ZSB3ZXJlbid0IGFscmVhZHkuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2F2ZVwiKS5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgZmFsc2UpO1xufTtcblxuLyogVGhpcyBnZXRzIGNhbGxlZCB0byBhY3R1YWxseSBkbyB0aGUgd29yayBvZiBwcm9jZXNzaW5nIGEgY29kZS5cbiAqIFdoZW4gb25lIGRvTGluayBpcyBjYWxsZWQgKG9yIGEgbGluayBpcyBjbGlja2VkKSwgdGhpcyBtYXkgc2V0IGNhbGxcbiAqIGNvZGUgdGhhdCBmdXJ0aGVyIGNhbGxzIGRvTGluaywgYW5kIHNvIG9uLiBUaGlzIG1ldGhvZCBwcm9jZXNzZXNcbiAqIGVhY2ggb25lLCBhbmQgcHJvY2Vzc0xpbmsgbWFuYWdlcyB0aGlzLlxuICovXG52YXIgcHJvY2Vzc09uZUxpbmsgPSBmdW5jdGlvbihjb2RlKSB7XG4gIHZhciBtYXRjaCA9IGNvZGUubWF0Y2gobGlua1JlKTtcbiAgYXNzZXJ0KG1hdGNoLCBcImxpbmtfbm90X3ZhbGlkXCIubCh7bGluazpjb2RlfSkpO1xuXG4gIHZhciBzaXR1YXRpb24gPSBtYXRjaFsxXTtcbiAgdmFyIGFjdGlvbiA9IG1hdGNoWzNdO1xuXG4gIC8vIENoYW5nZSB0aGUgc2l0dWF0aW9uXG4gIGlmIChzaXR1YXRpb24gIT09ICcuJykge1xuICAgIGlmIChzaXR1YXRpb24gIT09IGN1cnJlbnQpIHtcbiAgICAgIGRvVHJhbnNpdGlvblRvKHNpdHVhdGlvbik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIFdlIHNob3VsZCBoYXZlIGFuIGFjdGlvbiBpZiB3ZSBoYXZlIG5vIHNpdHVhdGlvbiBjaGFuZ2UuXG4gICAgYXNzZXJ0KGFjdGlvbiwgXCJsaW5rX25vX2FjdGlvblwiLmwoKSk7XG4gIH1cblxuICAvLyBDYXJyeSBvdXQgdGhlIGFjdGlvblxuICBpZiAoYWN0aW9uKSB7XG4gICAgc2l0dWF0aW9uID0gZ2V0Q3VycmVudFNpdHVhdGlvbigpO1xuICAgIGlmIChzaXR1YXRpb24pIHtcbiAgICAgIGlmIChnYW1lLmJlZm9yZUFjdGlvbikge1xuICAgICAgICAvLyBUcnkgdGhlIGdsb2JhbCBhY3QgaGFuZGxlciwgYW5kIHNlZSBpZiB3ZSBuZWVkXG4gICAgICAgIC8vIHRvIG5vdGlmeSB0aGUgc2l0dWF0aW9uLlxuICAgICAgICB2YXIgY29uc3VtZWQgPSBnYW1lLmJlZm9yZUFjdGlvbihcbiAgICAgICAgICAgIGNoYXJhY3Rlciwgc3lzdGVtLCBjdXJyZW50LCBhY3Rpb25cbiAgICAgICAgICAgICk7XG4gICAgICAgIGlmIChjb25zdW1lZCAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHNpdHVhdGlvbi5hY3QoY2hhcmFjdGVyLCBzeXN0ZW0sIGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIGhhdmUgbm8gZ2xvYmFsIGFjdCBoYW5kbGVyLCBhbHdheXMgbm90aWZ5XG4gICAgICAgIC8vIHRoZSBzaXR1YXRpb24uXG4gICAgICAgIHNpdHVhdGlvbi5hY3QoY2hhcmFjdGVyLCBzeXN0ZW0sIGFjdGlvbik7XG4gICAgICB9XG4gICAgICBpZiAoZ2FtZS5hZnRlckFjdGlvbikge1xuICAgICAgICBnYW1lLmFmdGVyQWN0aW9uKGNoYXJhY3Rlciwgc3lzdGVtLCBjdXJyZW50LCBhY3Rpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyogVGhpcyBmdW5jdGlvbiBsaXN0ZW5zIG9uIGNvbnRlbnQgYmxvY2sgdG8gZmlsdGVyIG91dCBsaW5rIGNsaWNrcy4gKi9cbnZhciBsaW5rQ2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKGV2ZW50LnRhcmdldC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdhJykge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgcHJvY2Vzc0NsaWNrKGV2ZW50LnRhcmdldC5ocmVmKTtcbiAgfVxufVxuXG4vKiBUaGlzIGdldHMgY2FsbGVkIHdoZW4gdGhlIHVzZXIgY2xpY2tzIGEgbGluayB0byBjYXJyeSBvdXQgYW5cbiAqIGFjdGlvbi4gKi9cbnZhciBwcm9jZXNzQ2xpY2sgPSBmdW5jdGlvbihjb2RlKSB7XG4gIHZhciBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICogMC4wMDE7XG4gIHN5c3RlbS50aW1lID0gbm93IC0gc3RhcnRUaW1lO1xuICBwcm9ncmVzcy5zZXF1ZW5jZS5wdXNoKHtsaW5rOmNvZGUsIHdoZW46c3lzdGVtLnRpbWV9KTtcbiAgcmV0dXJuIHByb2Nlc3NMaW5rKGNvZGUpO1xufTtcblxuLyogVHJhbnNpdGlvbnMgYmV0d2VlbiBzaXR1YXRpb25zLiAqL1xudmFyIGRvVHJhbnNpdGlvblRvID0gZnVuY3Rpb24obmV3U2l0dWF0aW9uSWQpIHtcbiAgdmFyIG9sZFNpdHVhdGlvbklkID0gY3VycmVudDtcbiAgdmFyIG9sZFNpdHVhdGlvbiA9IGdldEN1cnJlbnRTaXR1YXRpb24oKTtcbiAgdmFyIG5ld1NpdHVhdGlvbiA9IGdhbWUuc2l0dWF0aW9uc1tuZXdTaXR1YXRpb25JZF07XG5cbiAgYXNzZXJ0KG5ld1NpdHVhdGlvbiwgXCJ1bmtub3duX3NpdHVhdGlvblwiLmwoe2lkOm5ld1NpdHVhdGlvbklkfSkpO1xuXG4gIC8vIFdlIG1pZ2h0IG5vdCBoYXZlIGFuIG9sZCBzaXR1YXRpb24gaWYgdGhpcyBpcyB0aGUgc3RhcnQgb2ZcbiAgLy8gdGhlIGdhbWUuXG4gIGlmIChvbGRTaXR1YXRpb24pIHtcbiAgICAvLyBOb3RpZnkgdGhlIGV4aXRpbmcgc2l0dWF0aW9uLlxuICAgIG9sZFNpdHVhdGlvbi5leGl0KGNoYXJhY3Rlciwgc3lzdGVtLCBuZXdTaXR1YXRpb25JZCk7XG4gICAgaWYgKGdhbWUuZXhpdCkge1xuICAgICAgZ2FtZS5leGl0KGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICAgIH1cbiAgfVxuXG4gIC8vICBSZW1vdmUgbGlua3MgYW5kIHRyYW5zaWVudCBzZWN0aW9ucy5cbiAgdmFyIGNvbnRlbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIik7XG4gIGxpbmtzID0gY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYVwiKTtcbiAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChsaW5rcywgZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgpIHtcbiAgICB2YXIgYSA9IGVsZW1lbnQ7XG4gICAgaWYgKGEuY2xhc3NMaXN0LmNvbnRhaW5zKCdzdGlja3knKSB8fCBhLmdldEF0dHJpYnV0ZShcImhyZWZcIikubWF0Y2goL1s/Jl1zdGlja3lbPSZdPy8pKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChhLmdldEF0dHJpYnV0ZShcImhyZWZcIikubWF0Y2goL1s/Jl10cmFuc2llbnRbPSZdPy8pKSB7XG4gICAgICBoaWRlQmxvY2soYSk7XG4gICAgfVxuICAgIGEuaW5uZXJIVE1MID0gXCI8c3BhbiBjbGFzcz0nZXhfbGluayc+XCIrYS5pbm5lckhUTUwrXCI8L3NwYW4+XCI7XG4gIH0pO1xuICBoaWRlQmxvY2soY29udGVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnRyYW5zaWVudFwiKSk7XG4gIGhpZGVCbG9jayhjb250ZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJ1bC5vcHRpb25zXCIpKTtcblxuICAvLyBNb3ZlIHRoZSBjaGFyYWN0ZXIuXG4gIGN1cnJlbnQgPSBuZXdTaXR1YXRpb25JZDtcblxuICAvLyBOb3RpZnkgdGhlIGluY29taW5nIHNpdHVhdGlvbi5cbiAgaWYgKGdhbWUuZW50ZXIpIHtcbiAgICBnYW1lLmVudGVyKGNoYXJhY3Rlciwgc3lzdGVtLCBvbGRTaXR1YXRpb25JZCwgbmV3U2l0dWF0aW9uSWQpO1xuICB9XG4gIG5ld1NpdHVhdGlvbi5lbnRlcihjaGFyYWN0ZXIsIHN5c3RlbSwgb2xkU2l0dWF0aW9uSWQpO1xuXG4gIC8vIGFkZGl0aW9uYWwgaG9vayBmb3Igd2hlbiB0aGUgc2l0dWF0aW9uIHRleHQgaGFzIGFscmVhZHkgYmVlbiBwcmludGVkXG4gIGlmIChnYW1lLmFmdGVyRW50ZXIpIHtcbiAgICBnYW1lLmFmdGVyRW50ZXIoY2hhcmFjdGVyLCBzeXN0ZW0sIG9sZFNpdHVhdGlvbklkLCBuZXdTaXR1YXRpb25JZCk7XG4gIH1cbn07XG5cbi8qIFJldHVybnMgSFRNTCBmcm9tIHRoZSBnaXZlbiBjb250ZW50IHdpdGggdGhlIG5vbi1yYXcgbGlua3NcbiAqIHdpcmVkIHVwLiBcbiAqIEBwYXJhbSBjb250ZW50IHN0cmluZyBIVE1MIGNvZGUgXG4gKiBAcmV0dmFsIHN0cmluZyAqL1xudmFyIGF1Z21lbnRMaW5rcyA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgLy8gV2lyZSB1cCB0aGUgbGlua3MgZm9yIHJlZ3VsYXIgPGE+IHRhZ3MuXG4gIG91dHB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBvdXRwdXQuaW5uZXJIVE1MID0gY29udGVudDtcbiAgdmFyIGxpbmtzID0gb3V0cHV0LnF1ZXJ5U2VsZWN0b3JBbGwoXCJhXCIpO1xuICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKGxpbmtzLCBmdW5jdGlvbihlbGVtZW50LCBpbmRleCl7XG4gICAgdmFyIGhyZWYgPSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgIGlmICghZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoXCJyYXdcIil8fCBocmVmLm1hdGNoKC9bPyZdcmF3Wz0mXT8vKSkge1xuICAgICAgaWYgKGhyZWYubWF0Y2gobGlua1JlKSkge1xuICAgICAgICBlbGVtZW50Lm9uY2xpY2sgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAvLyBJZiB3ZSdyZSBhIG9uY2UtY2xpY2ssIHJlbW92ZSBhbGwgbWF0Y2hpbmcgbGlua3MuXG4gICAgICAgICAgaWYgKGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKFwib25jZVwiKSB8fCBocmVmLm1hdGNoKC9bPyZdb25jZVs9Jl0/LykpIHtcbiAgICAgICAgICAgIHN5c3RlbS5jbGVhckxpbmtzKGhyZWYpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHByb2Nlc3NDbGljayhocmVmKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJyYXdcIik7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gb3V0cHV0LmlubmVySFRNTDtcbn07XG5cbi8qIEVyYXNlcyB0aGUgY2hhcmFjdGVyIGluIGxvY2FsIHN0b3JhZ2UuIFRoaXMgaXMgcGVybWFuZW50ISAqL1xudmFyIGRvRXJhc2UgPSBmdW5jdGlvbihmb3JjZSkge1xuICB2YXIgc2F2ZUlkID0gZ2V0U2F2ZUlkKCk7XG4gIGlmIChsb2NhbFN0b3JhZ2Vbc2F2ZUlkXSkge1xuICAgIGlmIChmb3JjZSB8fCBjb25maXJtKFwiZXJhc2VfbWVzc2FnZVwiLmwoKSkpIHtcbiAgICAgIGRlbGV0ZSBsb2NhbFN0b3JhZ2Vbc2F2ZUlkXTtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXJhc2VcIikuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgc3RhcnRHYW1lKCk7XG4gICAgfVxuICB9XG59O1xuXG4vKiBGaW5kIGFuZCByZXR1cm4gYSBsaXN0IG9mIGlkcyBmb3IgYWxsIHNpdHVhdGlvbnMgd2l0aCB0aGUgZ2l2ZW4gdGFnLiAqL1xudmFyIGdldFNpdHVhdGlvbklkc1dpdGhUYWcgPSBmdW5jdGlvbih0YWcpIHtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuICBmb3IgKHZhciBzaXR1YXRpb25JZCBpbiBnYW1lLnNpdHVhdGlvbnMpIHtcbiAgICB2YXIgc2l0dWF0aW9uID0gZ2FtZS5zaXR1YXRpb25zW3NpdHVhdGlvbklkXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l0dWF0aW9uLnRhZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChzaXR1YXRpb24udGFnc1tpXSA9PSB0YWcpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goc2l0dWF0aW9uSWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qIFNldCB1cCB0aGUgc2NyZWVuIGZyb20gc2NyYXRjaCB0byByZWZsZWN0IHRoZSBjdXJyZW50IGdhbWVcbiAqIHN0YXRlLiAqL1xudmFyIGluaXRHYW1lRGlzcGxheSA9IGZ1bmN0aW9uKCkge1xuICAvLyBUcmFuc2l0aW9uIGludG8gdGhlIGZpcnN0IHNpdHVhdGlvbixcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250ZW50XCIpLmlubmVySFRNTCA9IFwiXCI7XG5cbiAgdmFyIHNpdHVhdGlvbiA9IGdldEN1cnJlbnRTaXR1YXRpb24oKTtcbiAgYXNzZXJ0KHNpdHVhdGlvbiwgXCJub19jdXJyZW50X3NpdHVhdGlvblwiLmwoKSk7XG5cbiAgc2hvd1F1YWxpdGllcygpO1xufTtcblxuLyogQ2xlYXIgdGhlIGN1cnJlbnQgZ2FtZSBvdXRwdXQgYW5kIHN0YXJ0IGFnYWluLiAqL1xudmFyIHN0YXJ0R2FtZSA9IGZ1bmN0aW9uKCkge1xuICBwcm9ncmVzcy5zZWVkID0gbmV3IERhdGUoKS50b1N0cmluZygpO1xuXG4gIGNoYXJhY3RlciA9IG5ldyBDaGFyYWN0ZXIoKTtcbiAgc3lzdGVtLnJuZCA9IG5ldyBSYW5kb20ocHJvZ3Jlc3Muc2VlZCk7XG4gIHByb2dyZXNzLnNlcXVlbmNlID0gW3tsaW5rOmdhbWUuc3RhcnQsIHdoZW46MH1dO1xuXG4gIC8vIEVtcHR5IHRoZSBkaXNwbGF5XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udGVudFwiKS5pbm5lckhUTUwgPSAnJztcblxuICAvLyBTdGFydCB0aGUgZ2FtZVxuICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSAqIDAuMDAxO1xuICBzeXN0ZW0udGltZSA9IDA7XG4gIGlmIChnYW1lLmluaXQpIGdhbWUuaW5pdChjaGFyYWN0ZXIsIHN5c3RlbSk7XG4gIHNob3dRdWFsaXRpZXMoKTtcblxuICAvLyBEbyB0aGUgZmlyc3Qgc3RhdGUuXG4gIGRvVHJhbnNpdGlvblRvKGdhbWUuc3RhcnQpO1xufTtcblxuLyogU2F2ZXMgdGhlIGNoYXJhY3RlciB0byBsb2NhbCBzdG9yYWdlLiAqL1xudmFyIHNhdmVHYW1lID0gZnVuY3Rpb24oKSB7XG4gIC8vIFN0b3JlIHdoZW4gd2UncmUgc2F2aW5nIHRoZSBnYW1lLCB0byBhdm9pZCBleHBsb2l0cyB3aGVyZSBhXG4gIC8vIHBsYXllciBsb2FkcyB0aGVpciBmaWxlIHRvIGdhaW4gZXh0cmEgdGltZS5cbiAgdmFyIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgKiAwLjAwMTtcbiAgcHJvZ3Jlc3Muc2F2ZVRpbWUgPSBub3cgLSBzdGFydFRpbWU7XG5cbiAgLy8gU2F2ZSB0aGUgZ2FtZS5cbiAgbG9jYWxTdG9yYWdlW2dldFNhdmVJZCgpXSA9IEpTT04uc3RyaW5naWZ5KHByb2dyZXNzKTtcblxuICAvLyBTd2l0Y2ggdGhlIGJ1dHRvbiBoaWdobGlnaHRzLlxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVyYXNlXCIpLnNldEF0dHJpYnV0ZSgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2F2ZVwiKS5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgdHJ1ZSk7XG59O1xuXG4vKiBMb2FkcyB0aGUgZ2FtZSBmcm9tIHRoZSBnaXZlbiBkYXRhICovXG52YXIgbG9hZEdhbWUgPSBmdW5jdGlvbihjaGFyYWN0ZXJEYXRhKSB7XG4gIHByb2dyZXNzID0gY2hhcmFjdGVyRGF0YTtcblxuICBjaGFyYWN0ZXIgPSBuZXcgQ2hhcmFjdGVyKCk7XG4gIHN5c3RlbS5ybmQgPSBuZXcgUmFuZG9tKHByb2dyZXNzLnNlZWQpO1xuXG4gIC8vIEVtcHR5IHRoZSBkaXNwbGF5XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udGVudFwiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBzaG93UXVhbGl0aWVzKCk7XG5cbiAgLy8gTm93IHBsYXkgdGhyb3VnaCB0aGUgYWN0aW9ucyBzbyBmYXI6XG4gIGlmIChnYW1lLmluaXQpIGdhbWUuaW5pdChjaGFyYWN0ZXIsIHN5c3RlbSk7XG5cbiAgLy8gUnVuIHRocm91Z2ggYWxsIHRoZSBwbGF5ZXIncyBoaXN0b3J5LlxuICBpbnRlcmFjdGl2ZSA9IGZhbHNlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHByb2dyZXNzLnNlcXVlbmNlLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHN0ZXAgPSBwcm9ncmVzcy5zZXF1ZW5jZVtpXTtcbiAgICAvLyBUaGUgYWN0aW9uIG11c3QgYmUgZG9uZSBhdCB0aGUgcmVjb3JkZWQgdGltZS5cbiAgICBzeXN0ZW0udGltZSA9IHN0ZXAud2hlbjtcbiAgICBwcm9jZXNzTGluayhzdGVwLmxpbmspO1xuICB9XG4gIGludGVyYWN0aXZlID0gdHJ1ZTtcblxuICAvLyBSZXZlcnNlIGVuZ2luZWVyIHRoZSBzdGFydCB0aW1lLlxuICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgKiAwLjAwMTtcbiAgc3RhcnRUaW1lID0gbm93IC0gcHJvZ3Jlc3Muc2F2ZVRpbWU7XG5cbiAgLy8gQmVjYXVzZSB3ZSBkaWQgdGhlIHJ1biB0aHJvdWdoIG5vbi1pbnRlcmFjdGl2ZWx5LCBub3cgd2VcbiAgLy8gbmVlZCB0byB1cGRhdGUgdGhlIFVJLlxuICBzaG93UXVhbGl0aWVzKCk7XG59O1xuXG4vLyBJbnRlcm5hdGlvbmFsaXphdGlvbiBzdXBwb3J0IGJhc2VkIG9uIHRoZSBjb2RlIHByb3ZpZGVkIGJ5IE9yZW9sZWsuXG4oZnVuY3Rpb24oKSB7XG4gdmFyIGNvZGVzVG9UcnkgPSB7fTtcbiAvKiBDb21waWxlcyBhIGxpc3Qgb2YgZmFsbGJhY2sgbGFuZ3VhZ2VzIHRvIHRyeSBpZiB0aGUgZ2l2ZW4gY29kZVxuICAqIGRvZXNuJ3QgaGF2ZSB0aGUgbWVzc2FnZSB3ZSBuZWVkLiBDYWNoZXMgaXQgZm9yIGZ1dHVyZSB1c2UuICovXG4gdmFyIGdldENvZGVzVG9UcnkgPSBmdW5jdGlvbihsYW5ndWFnZUNvZGUpIHtcbiB2YXIgY29kZUFycmF5ID0gY29kZXNUb1RyeVtsYW5ndWFnZUNvZGVdO1xuIGlmIChjb2RlQXJyYXkpIHJldHVybiBjb2RlQXJyYXk7XG5cbiBjb2RlQXJyYXkgPSBbXTtcbiBpZiAobGFuZ3VhZ2VDb2RlIGluIHVuZHVtLmxhbmd1YWdlKSB7XG4gY29kZUFycmF5LnB1c2gobGFuZ3VhZ2VDb2RlKTtcbiB9XG4gdmFyIGVsZW1lbnRzID0gbGFuZ3VhZ2VDb2RlLnNwbGl0KCctJyk7XG4gZm9yICh2YXIgaSA9IGVsZW1lbnRzLmxlbmd0aC0yOyBpID4gMDsgaS0tKSB7XG4gdmFyIHRoaXNDb2RlID0gZWxlbWVudHMuc2xpY2UoMCwgaSkuam9pbignLScpO1xuIGlmICh0aGlzQ29kZSBpbiB1bmR1bS5sYW5ndWFnZSkge1xuIGNvZGVBcnJheS5wdXNoKHRoaXNDb2RlKTtcbiB9XG4gfVxuIGNvZGVBcnJheS5wdXNoKFwiXCIpO1xuIGNvZGVzVG9UcnlbbGFuZ3VhZ2VDb2RlXSA9IGNvZGVBcnJheTtcbiByZXR1cm4gY29kZUFycmF5O1xuIH07XG4gdmFyIGxvb2t1cCA9IGZ1bmN0aW9uKGxhbmd1YWdlQ29kZSwgbWVzc2FnZSkge1xuICAgdmFyIGxhbmd1YWdlRGF0YSA9IHVuZHVtLmxhbmd1YWdlW2xhbmd1YWdlQ29kZV07XG4gICBpZiAoIWxhbmd1YWdlRGF0YSkgcmV0dXJuIG51bGw7XG4gICByZXR1cm4gbGFuZ3VhZ2VEYXRhW21lc3NhZ2VdO1xuIH07XG4gdmFyIGxvY2FsaXplID0gZnVuY3Rpb24obGFuZ3VhZ2VDb2RlLCBtZXNzYWdlKSB7XG4gICB2YXIgbG9jYWxpemVkLCB0aGlzQ29kZTtcbiAgIHZhciBsYW5ndWFnZUNvZGVzID0gZ2V0Q29kZXNUb1RyeShsYW5ndWFnZUNvZGUpO1xuICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYW5ndWFnZUNvZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgIHRoaXNDb2RlID0gbGFuZ3VhZ2VDb2Rlc1tpXTtcbiAgICAgbG9jYWxpemVkID0gbG9va3VwKHRoaXNDb2RlLCBtZXNzYWdlKTtcbiAgICAgaWYgKGxvY2FsaXplZCkgcmV0dXJuIGxvY2FsaXplZDtcbiAgIH1cbiAgIHJldHVybiBtZXNzYWdlO1xuIH07XG5cbiAvLyBBUElcbiBTdHJpbmcucHJvdG90eXBlLmwgPSBmdW5jdGlvbihhcmdzKSB7XG4gICAvLyBHZXQgbGFuZyBhdHRyaWJ1dGUgZnJvbSBodG1sIHRhZy5cbiAgIHZhciBsYW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImh0bWxcIikuZ2V0QXR0cmlidXRlKFwibGFuZ1wiKSB8fCBcIlwiO1xuXG4gICAvLyBGaW5kIHRoZSBsb2NhbGl6ZWQgZm9ybS5cbiAgIHZhciBsb2NhbGl6ZWQgPSBsb2NhbGl6ZShsYW5nLCB0aGlzKTtcblxuICAgLy8gTWVyZ2UgaW4gYW55IHJlcGxhY2VtZW50IGNvbnRlbnQuXG4gICBpZiAoYXJncykge1xuICAgICBmb3IgKHZhciBuYW1lIGluIGFyZ3MpIHtcbiAgICAgICBsb2NhbGl6ZWQgPSBsb2NhbGl6ZWQucmVwbGFjZShcbiAgICAgICAgICAgbmV3IFJlZ0V4cChcIlxcXFx7XCIrbmFtZStcIlxcXFx9XCIpLCBhcmdzW25hbWVdXG4gICAgICAgICAgICk7XG4gICAgIH1cbiAgIH1cbiAgIHJldHVybiBsb2NhbGl6ZWQ7XG4gfTtcbn0pKCk7XG5cbi8vIFJhbmRvbSBOdW1iZXIgZ2VuZXJhdGlvbiBiYXNlZCBvbiBzZWVkcmFuZG9tLmpzIGNvZGUgYnkgRGF2aWQgQmF1LlxuLy8gQ29weXJpZ2h0IDIwMTAgRGF2aWQgQmF1LCBhbGwgcmlnaHRzIHJlc2VydmVkLlxuLy9cbi8vIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Jcbi8vIHdpdGhvdXQgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZ1xuLy8gY29uZGl0aW9ucyBhcmUgbWV0OlxuLy9cbi8vICAgMS4gUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZVxuLy8gICAgICBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlXG4vLyAgICAgIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuLy9cbi8vICAgMi4gUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZVxuLy8gICAgICBjb3B5cmlnaHQgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlXG4vLyAgICAgIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZSBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlclxuLy8gICAgICBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuLy9cbi8vICAgMy4gTmVpdGhlciB0aGUgbmFtZSBvZiB0aGlzIG1vZHVsZSBub3IgdGhlIG5hbWVzIG9mIGl0c1xuLy8gICAgICBjb250cmlidXRvcnMgbWF5IGJlIHVzZWQgdG8gZW5kb3JzZSBvciBwcm9tb3RlIHByb2R1Y3RzXG4vLyAgICAgIGRlcml2ZWQgZnJvbSB0aGlzIHNvZnR3YXJlIHdpdGhvdXQgc3BlY2lmaWMgcHJpb3Igd3JpdHRlblxuLy8gICAgICBwZXJtaXNzaW9uLlxuLy9cbi8vIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORFxuLy8gQ09OVFJJQlVUT1JTIFwiQVMgSVNcIiBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLFxuLy8gSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRSBJTVBMSUVEIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQVJFXG4vLyBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQ09QWVJJR0hUIE9XTkVSIE9SXG4vLyBDT05UUklCVVRPUlMgQkUgTElBQkxFIEZPUiBBTlkgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCxcbi8vIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIChJTkNMVURJTkcsIEJVVFxuLy8gTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4vLyBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKVxuLy8gSE9XRVZFUiBDQVVTRUQgQU5EIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOXG4vLyBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVCAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1Jcbi8vIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GIFRISVMgU09GVFdBUkUsXG4vLyBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxudmFyIFJhbmRvbSA9IChmdW5jdGlvbigpIHtcbiAgLy8gV2l0aGluIHRoaXMgY2xvc3VyZSBmdW5jdGlvbiB0aGUgY29kZSBpcyBiYXNpY2FsbHlcbiAgLy8gRGF2aWQncy4gVW5kdW0ncyBjdXN0b20gZXh0ZW5zaW9ucyBhcmUgYWRkZWQgdG8gdGhlXG4gIC8vIHByb3RvdHlwZSBvdXRzaWRlIG9mIHRoaXMgZnVuY3Rpb24uXG4gIHZhciB3aWR0aCA9IDI1NjtcbiAgdmFyIGNodW5rcyA9IDY7XG4gIHZhciBzaWduaWZpY2FuY2VFeHBvbmVudCA9IDUyO1xuICB2YXIgc3RhcnRkZW5vbSA9IE1hdGgucG93KHdpZHRoLCBjaHVua3MpO1xuICB2YXIgc2lnbmlmaWNhbmNlID0gTWF0aC5wb3coMiwgc2lnbmlmaWNhbmNlRXhwb25lbnQpO1xuICB2YXIgb3ZlcmZsb3cgPSBzaWduaWZpY2FuY2UgKiAyO1xuXG4gIHZhciBSYW5kb20gPSBmdW5jdGlvbihzZWVkKSB7XG4gICAgdGhpcy5yYW5kb20gPSBudWxsO1xuICAgIGlmICghc2VlZCkgdGhyb3cge1xuICAgICAgbmFtZTogXCJSYW5kb21TZWVkRXJyb3JcIixcbiAgICAgIG1lc3NhZ2U6IFwicmFuZG9tX3NlZWRfZXJyb3JcIi5sKClcbiAgICB9O1xuICAgIHZhciBrZXkgPSBbXTtcbiAgICBtaXhrZXkoc2VlZCwga2V5KTtcbiAgICB2YXIgYXJjNCA9IG5ldyBBUkM0KGtleSk7XG4gICAgdGhpcy5yYW5kb20gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBuID0gYXJjNC5nKGNodW5rcyk7XG4gICAgICB2YXIgZCA9IHN0YXJ0ZGVub207XG4gICAgICB2YXIgeCA9IDA7XG4gICAgICB3aGlsZSAobiA8IHNpZ25pZmljYW5jZSkge1xuICAgICAgICBuID0gKG4gKyB4KSAqIHdpZHRoO1xuICAgICAgICBkICo9IHdpZHRoO1xuICAgICAgICB4ID0gYXJjNC5nKDEpO1xuICAgICAgfVxuICAgICAgd2hpbGUgKG4gPj0gb3ZlcmZsb3cpIHtcbiAgICAgICAgbiAvPSAyO1xuICAgICAgICBkIC89IDI7XG4gICAgICAgIHggPj4+PSAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChuICsgeCkgLyBkO1xuICAgIH07XG4gIH07XG4gIC8vIEhlbHBlciB0eXBlLlxuICB2YXIgQVJDNCA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciB0LCB1LCBtZSA9IHRoaXMsIGtleWxlbiA9IGtleS5sZW5ndGg7XG4gICAgdmFyIGkgPSAwLCBqID0gbWUuaSA9IG1lLmogPSBtZS5tID0gMDtcbiAgICBtZS5TID0gW107XG4gICAgbWUuYyA9IFtdO1xuICAgIGlmICgha2V5bGVuKSB7IGtleSA9IFtrZXlsZW4rK107IH1cbiAgICB3aGlsZSAoaSA8IHdpZHRoKSB7IG1lLlNbaV0gPSBpKys7IH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgd2lkdGg7IGkrKykge1xuICAgICAgdCA9IG1lLlNbaV07XG4gICAgICBqID0gbG93Yml0cyhqICsgdCArIGtleVtpICUga2V5bGVuXSk7XG4gICAgICB1ID0gbWUuU1tqXTtcbiAgICAgIG1lLlNbaV0gPSB1O1xuICAgICAgbWUuU1tqXSA9IHQ7XG4gICAgfVxuICAgIG1lLmcgPSBmdW5jdGlvbiBnZXRuZXh0KGNvdW50KSB7XG4gICAgICB2YXIgcyA9IG1lLlM7XG4gICAgICB2YXIgaSA9IGxvd2JpdHMobWUuaSArIDEpOyB2YXIgdCA9IHNbaV07XG4gICAgICB2YXIgaiA9IGxvd2JpdHMobWUuaiArIHQpOyB2YXIgdSA9IHNbal07XG4gICAgICBzW2ldID0gdTtcbiAgICAgIHNbal0gPSB0O1xuICAgICAgdmFyIHIgPSBzW2xvd2JpdHModCArIHUpXTtcbiAgICAgIHdoaWxlICgtLWNvdW50KSB7XG4gICAgICAgIGkgPSBsb3diaXRzKGkgKyAxKTsgdCA9IHNbaV07XG4gICAgICAgIGogPSBsb3diaXRzKGogKyB0KTsgdSA9IHNbal07XG4gICAgICAgIHNbaV0gPSB1O1xuICAgICAgICBzW2pdID0gdDtcbiAgICAgICAgciA9IHIgKiB3aWR0aCArIHNbbG93Yml0cyh0ICsgdSldO1xuICAgICAgfVxuICAgICAgbWUuaSA9IGk7XG4gICAgICBtZS5qID0gajtcbiAgICAgIHJldHVybiByO1xuICAgIH07XG4gICAgbWUuZyh3aWR0aCk7XG4gIH07XG4gIC8vIEhlbHBlciBmdW5jdGlvbnMuXG4gIHZhciBtaXhrZXkgPSBmdW5jdGlvbihzZWVkLCBrZXkpIHtcbiAgICBzZWVkICs9ICcnO1xuICAgIHZhciBzbWVhciA9IDA7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzZWVkLmxlbmd0aDsgaisrKSB7XG4gICAgICB2YXIgbGIgPSBsb3diaXRzKGopO1xuICAgICAgc21lYXIgXj0ga2V5W2xiXTtcbiAgICAgIGtleVtsYl0gPSBsb3diaXRzKHNtZWFyKjE5ICsgc2VlZC5jaGFyQ29kZUF0KGopKTtcbiAgICB9XG4gICAgc2VlZCA9ICcnO1xuICAgIGZvciAoaiBpbiBrZXkpIHtcbiAgICAgIHNlZWQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShrZXlbal0pO1xuICAgIH1cbiAgICByZXR1cm4gc2VlZDtcbiAgfTtcbiAgdmFyIGxvd2JpdHMgPSBmdW5jdGlvbihuKSB7XG4gICAgcmV0dXJuIG4gJiAod2lkdGggLSAxKTtcbiAgfTtcblxuICByZXR1cm4gUmFuZG9tO1xufSkoKTtcbi8qIFJldHVybnMgYSByYW5kb20gZmxvYXRpbmcgcG9pbnQgbnVtYmVyIGJldHdlZW4gemVybyBhbmRcbiAqIG9uZS4gTkI6IFRoZSBwcm90b3R5cGUgaW1wbGVtZW50YXRpb24gYmVsb3cganVzdCB0aHJvd3MgYW5cbiAqIGVycm9yLCBpdCB3aWxsIGJlIG92ZXJyaWRkZW4gaW4gZWFjaCBSYW5kb20gb2JqZWN0IHdoZW4gdGhlXG4gKiBzZWVkIGhhcyBiZWVuIGNvcnJlY3RseSBjb25maWd1cmVkLiAqL1xuUmFuZG9tLnByb3RvdHlwZS5yYW5kb20gPSBmdW5jdGlvbigpIHtcbiAgdGhyb3cge1xuICAgIG5hbWU6XCJSYW5kb21FcnJvclwiLFxuICAgIG1lc3NhZ2U6IFwicmFuZG9tX2Vycm9yXCIubCgpXG4gIH07XG59O1xuLyogUmV0dXJucyBhbiBpbnRlZ2VyIGJldHdlZW4gdGhlIGdpdmVuIG1pbiBhbmQgbWF4IHZhbHVlcyxcbiAqIGluY2x1c2l2ZS4gKi9cblJhbmRvbS5wcm90b3R5cGUucmFuZG9tSW50ID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoKG1heC1taW4rMSkqdGhpcy5yYW5kb20oKSk7XG59O1xuLyogUmV0dXJucyB0aGUgcmVzdWx0IG9mIHJvbGxpbmcgbiBkaWNlIHdpdGggZHggc2lkZXMsIGFuZCBhZGRpbmdcbiAqIHBsdXMuICovXG5SYW5kb20ucHJvdG90eXBlLmRpY2UgPSBmdW5jdGlvbihuLCBkeCwgcGx1cykge1xuICB2YXIgcmVzdWx0ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICByZXN1bHQgKz0gdGhpcy5yYW5kb21JbnQoMSwgZHgpO1xuICB9XG4gIGlmIChwbHVzKSByZXN1bHQgKz0gcGx1cztcbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4vKiBSZXR1cm5zIHRoZSByZXN1bHQgb2Ygcm9sbGluZyBuIGF2ZXJhZ2luZyBkaWNlIChpLmUuIDYgc2lkZWQgZGljZVxuICogd2l0aCBzaWRlcyAyLDMsMyw0LDQsNSkuIEFuZCBhZGRpbmcgcGx1cy4gKi9cblJhbmRvbS5wcm90b3R5cGUuYXZlRGljZSA9IChmdW5jdGlvbigpIHtcbiAgdmFyIG1hcHBpbmcgPSBbMiwzLDMsNCw0LDVdO1xuICByZXR1cm4gZnVuY3Rpb24obiwgcGx1cykge1xuICAgIHZhciByZXN1bHQgPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICByZXN1bHQgKz0gbWFwcGluZ1t0aGlzLnJhbmRvbUludCgwLCA1KV07XG4gICAgfVxuICAgIGlmIChwbHVzKSByZXN1bHQgKz0gcGx1cztcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufSkoKTtcbi8qIFJldHVybnMgYSBkaWNlLXJvbGwgcmVzdWx0IGZyb20gdGhlIGdpdmVuIHN0cmluZyBkaWNlXG4gKiBzcGVjaWZpY2F0aW9uLiBUaGUgc3BlY2lmaWNhdGlvbiBzaG91bGQgYmUgb2YgdGhlIGZvcm0geGR5K3osXG4gKiB3aGVyZSB0aGUgeCBjb21wb25lbnQgYW5kIHogY29tcG9uZW50IGFyZSBvcHRpb25hbC4gVGhpcyByb2xsc1xuICogeCBkaWNlIG9mIHdpdGggeSBzaWRlcywgYW5kIGFkZHMgeiB0byB0aGUgcmVzdWx0LCB0aGUgelxuICogY29tcG9uZW50IGNhbiBhbHNvIGJlIG5lZ2F0aXZlOiB4ZHktei4gVGhlIHkgY29tcG9uZW50IGNhbiBiZVxuICogZWl0aGVyIGEgbnVtYmVyIG9mIHNpZGVzLCBvciBjYW4gYmUgdGhlIHNwZWNpYWwgdmFsdWVzICdGJywgZm9yXG4gKiBhIGZ1ZGdlIGRpZSAod2l0aCAzIHNpZGVzLCArLDAsLSksICclJyBmb3IgYSAxMDAgc2lkZWQgZGllLCBvclxuICogJ0EnIGZvciBhbiBhdmVyYWdpbmcgZGllICh3aXRoIHNpZGVzIDIsMywzLDQsNCw1KS5cbiAqL1xuUmFuZG9tLnByb3RvdHlwZS5kaWNlU3RyaW5nID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgZGljZVJlID0gL14oWzEtOV1bMC05XSopP2QoWyVGQV18WzEtOV1bMC05XSopKFstK11bMS05XVswLTldKik/JC87XG4gIHJldHVybiBmdW5jdGlvbihkZWYpIHtcbiAgICB2YXIgbWF0Y2ggPSBkZWYubWF0Y2goZGljZVJlKTtcbiAgICBpZiAoIW1hdGNoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkaWNlX3N0cmluZ19lcnJvclwiLmwoe3N0cmluZzpkZWZ9KSk7XG4gICAgfVxuXG4gICAgdmFyIG51bSA9IG1hdGNoWzFdP3BhcnNlSW50KG1hdGNoWzFdLCAxMCk6MTtcbiAgICB2YXIgc2lkZXM7XG4gICAgdmFyIGJvbnVzID0gbWF0Y2hbM10/cGFyc2VJbnQobWF0Y2hbM10sIDEwKTowO1xuXG4gICAgc3dpdGNoIChtYXRjaFsyXSkge1xuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIHJldHVybiB0aGlzLmF2ZURpY2UobnVtLCBib251cyk7XG4gICAgICBjYXNlICdGJzpcbiAgICAgICAgc2lkZXMgPSAzO1xuICAgICAgICBib251cyAtPSBudW0qMjtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICclJzpcbiAgICAgICAgc2lkZXMgPSAxMDA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgc2lkZXMgPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRpY2UobnVtLCBzaWRlcywgYm9udXMpO1xuICB9O1xufSkoKTtcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTZXR1cFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyogRXhwb3J0IG91ciBBUEkuICovXG53aW5kb3cudW5kdW0gPSB7XG4gIFNpdHVhdGlvbjogU2l0dWF0aW9uLFxuICBTaW1wbGVTaXR1YXRpb246IFNpbXBsZVNpdHVhdGlvbixcblxuICBRdWFsaXR5RGVmaW5pdGlvbjogUXVhbGl0eURlZmluaXRpb24sXG4gIEludGVnZXJRdWFsaXR5OiBJbnRlZ2VyUXVhbGl0eSxcbiAgTm9uWmVyb0ludGVnZXJRdWFsaXR5OiBOb25aZXJvSW50ZWdlclF1YWxpdHksXG4gIE51bWVyaWNRdWFsaXR5OiBOdW1lcmljUXVhbGl0eSxcbiAgV29yZFNjYWxlUXVhbGl0eTogV29yZFNjYWxlUXVhbGl0eSxcbiAgRnVkZ2VBZGplY3RpdmVzUXVhbGl0eTogRnVkZ2VBZGplY3RpdmVzUXVhbGl0eSxcbiAgT25PZmZRdWFsaXR5OiBPbk9mZlF1YWxpdHksXG4gIFllc05vUXVhbGl0eTogWWVzTm9RdWFsaXR5LFxuXG4gIFF1YWxpdHlHcm91cDogUXVhbGl0eUdyb3VwLFxuXG4gIGdhbWU6IGdhbWUsXG5cbiAgaXNJbnRlcmFjdGl2ZTogZnVuY3Rpb24oKSB7IHJldHVybiBpbnRlcmFjdGl2ZTsgfSxcblxuICAvLyBUaGUgdW5kdW0gc2V0IG9mIHRyYW5zbGF0ZWQgc3RyaW5ncy5cbiAgbGFuZ3VhZ2U6IHt9XG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRGVmYXVsdCBNZXNzYWdlc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBlbiA9IHtcbiAgdGVycmlibGU6IFwidGVycmlibGVcIixcbiAgcG9vcjogXCJwb29yXCIsXG4gIG1lZGlvY3JlOiBcIm1lZGlvY3JlXCIsXG4gIGZhaXI6IFwiZmFpclwiLFxuICBnb29kOiBcImdvb2RcIixcbiAgZ3JlYXQ6IFwiZ3JlYXRcIixcbiAgc3VwZXJiOiBcInN1cGVyYlwiLFxuICB5ZXM6IFwieWVzXCIsXG4gIG5vOiBcIm5vXCIsXG4gIGNob2ljZTogXCJDaG9pY2Uge251bWJlcn1cIixcbiAgbm9fZ3JvdXBfZGVmaW5pdGlvbjogXCJDb3VsZG4ndCBmaW5kIGEgZ3JvdXAgZGVmaW5pdGlvbiBmb3Ige2lkfS5cIixcbiAgbGlua19ub3RfdmFsaWQ6IFwiVGhlIGxpbmsgJ3tsaW5rfScgZG9lc24ndCBhcHBlYXIgdG8gYmUgdmFsaWQuXCIsXG4gIGxpbmtfbm9fYWN0aW9uOiBcIkEgbGluayB3aXRoIGEgc2l0dWF0aW9uIG9mICcuJywgbXVzdCBoYXZlIGFuIGFjdGlvbi5cIixcbiAgdW5rbm93bl9zaXR1YXRpb246IFwiWW91IGNhbid0IG1vdmUgdG8gYW4gdW5rbm93biBzaXR1YXRpb246IHtpZH0uXCIsXG4gIGV4aXN0aW5nX3NpdHVhdGlvbjogXCJZb3UgY2FuJ3Qgb3ZlcnJpZGUgc2l0dWF0aW9uIHtpZH0gaW4gSFRNTC5cIixcbiAgZXJhc2VfbWVzc2FnZTogXCJUaGlzIHdpbGwgcGVybWFuZW50bHkgZGVsZXRlIHRoaXMgY2hhcmFjdGVyIGFuZCBpbW1lZGlhdGVseSByZXR1cm4geW91IHRvIHRoZSBzdGFydCBvZiB0aGUgZ2FtZS4gQXJlIHlvdSBzdXJlP1wiLFxuICBub19jdXJyZW50X3NpdHVhdGlvbjogXCJJIGNhbid0IGRpc3BsYXksIGJlY2F1c2Ugd2UgZG9uJ3QgaGF2ZSBhIGN1cnJlbnQgc2l0dWF0aW9uLlwiLFxuICBub19sb2NhbF9zdG9yYWdlOiBcIk5vIGxvY2FsIHN0b3JhZ2UgYXZhaWxhYmxlLlwiLFxuICByYW5kb21fc2VlZF9lcnJvcjogXCJZb3UgbXVzdCBwcm92aWRlIGEgdmFsaWQgcmFuZG9tIHNlZWQuXCIsXG4gIHJhbmRvbV9lcnJvcjogXCJJbml0aWFsaXplIHRoZSBSYW5kb20gd2l0aCBhIG5vbi1lbXB0eSBzZWVkIGJlZm9yZSB1c2UuXCIsXG4gIGRpY2Vfc3RyaW5nX2Vycm9yOiBcIkNvdWxkbid0IGludGVycHJldCB5b3VyIGRpY2Ugc3RyaW5nOiAne3N0cmluZ30nLlwiXG59O1xuXG4vLyBTZXQgdGhpcyBkYXRhIGFzIGJvdGggdGhlIGRlZmF1bHQgZmFsbGJhY2sgbGFuZ3VhZ2UsIGFuZCB0aGUgZW5nbGlzaFxuLy8gcHJlZmVycmVkIGxhbmd1YWdlLlxudW5kdW0ubGFuZ3VhZ2VbXCJcIl0gPSBlbjtcbnVuZHVtLmxhbmd1YWdlW1wiZW5cIl0gPSBlbjtcblxuLyogU2V0IHVwIHRoZSBnYW1lIHdoZW4gZXZlcnl0aGluZyBpcyBsb2FkZWQuICovXG5mdW5jdGlvbiByZWFkeShmbikge1xuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPSAnbG9hZGluZycpe1xuICAgIGZuKCk7XG4gIH0gZWxzZSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZuKTtcbiAgfVxufVxuXG5yZWFkeShmdW5jdGlvbigpIHtcbiAgLy8gQ29tcGlsZSBhZGRpdGlvbmFsIHNpdHVhdGlvbnMgZnJvbSBIVE1MXG4gIGxvYWRIVE1MU2l0dWF0aW9ucygpO1xuXG4gIC8vIEhhbmRsZSBzdG9yYWdlLlxuICBpZiAoaGFzTG9jYWxTdG9yYWdlKCkpIHtcbiAgICB2YXIgZXJhc2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVyYXNlXCIpO1xuICAgIGVyYXNlLm9uY2xpY2sgPSBkb0VyYXNlO1xuICAgIGVyYXNlLmtleWRvd24gPSBkb0VyYXNlO1xuICAgIHZhciBzYXZlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYXZlXCIpO1xuICAgIHNhdmUub25jbGljayA9IHNhdmVHYW1lO1xuICAgIHNhdmUua2V5ZG93biA9IHNhdmVHYW1lO1xuXG4gICAgdmFyIHN0b3JlZENoYXJhY3RlciA9IGxvY2FsU3RvcmFnZVtnZXRTYXZlSWQoKV07XG4gICAgaWYgKHN0b3JlZENoYXJhY3Rlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9hZEdhbWUoSlNPTi5wYXJzZShzdG9yZWRDaGFyYWN0ZXIpKTtcbiAgICAgICAgc2F2ZS5zZXRBdHRyaWJ1dGUoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgIGVyYXNlLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIGRvRXJhc2UodHJ1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNhdmUuc2V0QXR0cmlidXRlKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgZXJhc2Uuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICBzdGFydEdhbWUoKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5idXR0b25zXCIpLmlubmVySFRNTCA9IFwiPHA+XCIrXCJub19sb2NhbF9zdG9yYWdlXCIubCgpK1wiPC9wPlwiO1xuICAgIHN0YXJ0R2FtZSgpO1xuICB9XG5cbiAgLy8gaGFuZGxlIHRoZSBsaW5rIGNsaWNrc1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGxpbmtDbGlja0hhbmRsZXIsIGZhbHNlKTtcblxuICAvLyBEaXNwbGF5IHRoZSBcImNsaWNrIHRvIGJlZ2luXCIgbWVzc2FnZS4gKFdlIGRvIHRoaXMgaW4gY29kZVxuICAvLyBzbyB0aGF0LCBpZiBKYXZhc2NyaXB0IGlzIG9mZiwgaXQgZG9lc24ndCBoYXBwZW4uKVxuICBzaG93QmxvY2soXCJjbGlja19tZXNzYWdlXCIpO1xuXG4gIC8vIFNob3cgdGhlIGdhbWUgd2hlbiB3ZSBjbGljayBvbiB0aGUgdGl0bGUuXG4gIC8vIE5vdGU6IGlmIHlvdSBkbyBldmVudHMgd2l0aCBvbmNsaWNrLCB5b3UgaGF2ZSB0byBoYXZlIG9ubHkgb25lIGNsaWNrIGV2ZW50IGhhbmRsZXIuXG4gIC8vIFlvdSBjYW4gdXNlIG1vcmUgY29tcGxleCBtZXRob2RzIGlmIHlvdSBleHBlY3QgdG8gaGF2ZSBtb3JlLlxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRpdGxlXCIpLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICBzaG93QmxvY2soXCJjb250ZW50XCIpXG4gICAgc2hvd0Jsb2NrKFwiY29udGVudF93cmFwcGVyXCIpO1xuICAgIHNob3dCbG9jayhcImxlZ2FsXCIpO1xuICAgIHNob3dCbG9jayhcInRvb2xzX3dyYXBwZXJcIik7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0aXRsZVwiKS5zdHlsZS5jdXJzb3IgPSBcImRlZmF1bHRcIjtcbiAgICBoaWRlQmxvY2soXCJjbGlja19tZXNzYWdlXCIpO1xuICB9O1xuXG4vKlxuICAvLyBBbnkgcG9pbnQgdGhhdCBhbiBvcHRpb24gbGlzdCBhcHBlYXJzLCBpdHMgb3B0aW9ucyBhcmUgaXRzXG4gIC8vIGZpcnN0IGxpbmtzLlxuICB2YXIgb3B0aW9uTGlua0V2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAvLyBNYWtlIG9wdGlvbiBjbGlja3MgcGFzcyB0aHJvdWdoIHRvIHRoZWlyIGZpcnN0IGxpbmsuXG4gICAgdmFyIGxpbmsgPSAkKFwiYVwiLCB0aGlzKTtcbiAgICBpZiAobGluay5sZW5ndGggPiAwKSB7XG4gICAgICAkKGxpbmsuZ2V0KDApKS5jbGljaygpO1xuICAgIH1cbiAgfTtcbiAgaXRlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwidWwub3B0aW9ucyBsaSwgI21lbnUgbGlcIik7XG4gIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwoaXRlbXMsIGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4KXtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgb3B0aW9uTGlua0V2ZW50KTtcbiAgfSk7XG4qL1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=