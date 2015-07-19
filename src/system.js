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

/* Changes a quality to a new value, but also shows a progress bar
 * animation of the change. This probably only makes sense for
 * qualities that are numeric, especially ones that the player is
 * grinding to increase. The quality and newValue parameters are
 * as for setQuality. The progress bar is controlled by the
 * following options in the opts parameter:
 *
 * from - The proportion along the progress bar where the
 *     animation starts. Defaults to 0, valid range is 0-1.
 *
 * to - The proportion along the progress bar where the
 *     animation ends. Defaults to 1, valid range is 0-1.
 *
 * showValue - If true (the default) then the new value of the
 *     quality is displayed above the progress bar.
 *
 * displayValue - If this is given, and showValue is true, then
 *     the displayValue is used above the progress bar. If this
 *     isn't given, and showValue is true, then the display value
 *     will be calculated from the QualityDefinition, as
 *     normal. This option is useful for qualities that don't have
 *     a definition, because they don't normally appear in the UI.
 *
 * title - The title of the progress bar. If this is not given,
 *     then the title of the quality is used. As for displayValue
 *     this is primarily used when the progress bar doesn't have a
 *     QualityDefinition, and therefore doesn't have a title.
 *
 * leftLabel, rightLabel - Underneath the progress bar you can
 *     place two labels at the left and right extent of the
 *     track. These can help to give scale to the bar. So if the
 *     bar signifies going from 10.2 to 10.5, you might label the
 *     left and right extents with "10" and "11" respectively. If
 *     these are not given, then the labels will be omitted.
 */
System.prototype.animateQuality = function(quality, newValue, opts) {
  var currentValue = character.qualities[quality];
  if (!currentValue) currentValue = 0;

  // Change the base UI.
  this.setQuality(quality, newValue);
  if (!interactive) return;

  // Overload default options.
  var myOpts = {
    from: 0,
    to: 1,
    title: null,
    showValue: true,
    displayValue: null,
    leftLabel: null,
    rightLabel: null
  };
  if (newValue < currentValue) {
    myOpts.from = 1;
    myOpts.to = 0;
  }
  extend(opts, myOpts);

  // Run through the quality definition.
  var qualityDefinition = game.qualities[quality];
  if (qualityDefinition) {
    // Work out how to display the value
    if (myOpts.displayValue === null) {
      myOpts.displayValue = qualityDefinition.format(character, newValue);
    }

    // Use the title.
    if (myOpts.title === null) {
      myOpts.title = qualityDefinition.title;
    }
  }

  // Create the animated bar.
  var totalWidth = 496;
  var bar = document.getElementById("progress_bar").cloneNode(true);
  bar.setAttribute("id", undefined);
  var widthElement = bar.find("[data-attr='width']"); // TODO
  widthElement.css('width', myOpts.from*totalWidth);

  // Configure its labels
  var titleLabel = bar.find("[data-attr='name']");
  var valueLabel = bar.find("[data-attr='value']");
  var leftLabel = bar.find("[data-attr='left_label']");
  var rightLabel = bar.find("[data-attr='right_label']");
  if (myOpts.title) {
    titleLabel.html(myOpts.title);
  } else {
    titleLabel.remove();
  }
  if (myOpts.showValue && myOpts.displayValue !== null) {
    valueLabel.html(myOpts.displayValue);
  } else {
    valueLabel.remove();
  }
  if (myOpts.leftLabel) {
    leftLabel.html(myOpts.leftLabel);
  } else {
    leftLabel.remove();
  }
  if (myOpts.rightLabel) {
    rightLabel.html(myOpts.rightLabel);
  } else {
    rightLabel.remove();
  }
  document.getElementById('content').appendChild(bar);

  // Start the animation
  setTimeout(function() {
    widthElement.animate(
      {'width': myOpts.to*totalWidth}, 1000,
      function() {
        // After a moment to allow the bar to be read, we can
        // remove it.
        setTimeout(function() {
          if (mobile) {
  bar.fadeOut(1500, function() {$(this).remove();});
          } else {
  bar.animate({opacity: 0}, 1500).
  slideUp(500, function() {
    $(this).remove();
  });
          }
        }, 2000);
      }
    );
  }, 500);
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
