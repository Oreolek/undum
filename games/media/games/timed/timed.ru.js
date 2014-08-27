undum.game.id = "1d3c722e-2d98-11e4-baf3-0fb371314bf0";

undum.game.version = "1.0";

undum.game.situations = {
  start: new undum.SimpleSituation(
    "<h1>Undum: выбор на время</h1>\
    <p>Эта игра покажет вам, как работает в Undum таймер для неявного выбора.</p>\
    <p class='transient'>В следующей сцене вам будет предложен выбор.\
    Но вы должны будете сделать его за десять секунд.</p>\
    <p class='transient'><a href='choice1'>Приготовьтесь и нажмите на эту ссылку.</a></p>"
  ),
  choice1: new undum.SimpleSituation(
    "<p>Какого поэта вы любите больше всего?</p>",
    {
      heading:     "Любимый поэт",
      choices:     "#choice1",
      choiceTimer: 10
    }
  ),
  // для английской версии: https://en.wikisource.org/wiki/Modern_Russian_Poetry/The_Curse_of_Love
  merezhkovsky: new undum.SimpleSituation(
    "<h1>Дмитрий Мережковский</h1>\
    <h2>Проклятие любви</h2>\
    <p>С усильем тяжким и бесплодным,<br>\
    Я цепь любви хочу разбить.<br>\
    О, если б вновь мне быть свободным.<br>\
    О, если б мог я не любить!</p>\
    <p>Душа полна стыда и страха,<br>\
    Влачится в прахе и крови.<br>\
    Очисти душу мне от праха,<br>\
    Избавь, о, Боже, от любви!</p>\
    <p>Ужель непобедима жалость?<br>\
    Напрасно Бога я молю:<br>\
    Все безнадежнее усталость,<br>\
    Все бесконечнее люблю.</p>\
    <p>И нет свободы, нет прощенья,<br>\
    Мы все рабами рождены,<br>\
    Мы все на смерть, и на мученья,<br>\
    И на любовь обречены.</p>",
    {
      optionText: "Дмитрий Мережковский",
      tags: "choice1",
      enter: function (character, system) {
        system.animateQuality(
          'reaction', character.qualities.reaction+1
        );
      }
    }
  ),
  // http://wikilivres.ca/wiki/Старая_песня,_пропетая_вновь_%28Йейтс/Маршак%29
  yeats: new undum.SimpleSituation(
    "<h1>Уильям Йейтс (пер. С. Маршака)</h1>\
    <h2>Старая песня, пропетая вновь</h2>\
    <p>Я ждал в саду под ивой, а дальше мы вместе пошли.<br>\
    Её белоснежные ножки едва касались земли.<br>\
    — Любите, — она говорила, — легко, как растет листва.<br>\
    Но я был глуп и молод и не знал, что она права.</p>\
    <p>А в поле, где у запруды стояли мы над рекой,<br>\
    Плеча моего коснулась она белоснежной рукой.<br>\
    — Живите легко, мой милый, как растет меж камней трава.<br>\
    Но я был молод, и горько мне вспомнить её слова.</p>",
    {
      optionText: "Уильям Йейтс",
      tags: "choice1",
      enter: function (character, system) {
        system.animateQuality(
          'reaction', character.qualities.reaction+1
        );
      }
    }
  ),
  no_writer: new undum.SimpleSituation(
    "Вам не нравится ни один из этих писателей? Жаль.",
    {
      optionText: "default",
      tags: "choice1"
    }
  ),
};

undum.game.start = "start";

undum.game.qualities = {
  reaction: new undum.FudgeAdjectivesQuality("Реакция", {priority:"0001", group:'stats'})
};

undum.game.qualityGroups = {
  stats: new undum.QualityGroup(null, {priority:"0001"}),
};

undum.game.init = function(character, system) {
  character.qualities.reaction = 0;
};
