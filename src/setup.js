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
