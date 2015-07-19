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
      "terrible".l(), "poor".l(), "mediocre".l(),
      "fair".l(), "good".l(), "great".l(), "superb".l()
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
