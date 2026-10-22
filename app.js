/* Chiang Mai Trip — загрузка мультиязычных данных, рендер дней, ссылки Google Maps, регистрация SW */

(function () {
  "use strict";

  var DATA_URL = "./east-china-trip-data.i18n.json";
  var LANG_STORAGE_KEY = "ec-trip-lang";
  var FALLBACK_LANG = "en";

  /* Строки интерфейса, которых нет в ui[lang] датасета (маршрут дня, предупреждения,
     служебные тексты, форматы дат). Ключи датасета всегда имеют приоритет. */
  var EXTRA_UI = {
    en: {
      language: "Language",
      dayRoute: "Route through the day",
      dayDetails: "Day details",
      legendTitle: "Legend",
      warn: "Warning",
      loading: "Loading…",
      dataError: "Could not load the trip data",
      dataHint: "Open the app over a local server (npx serve) or HTTPS — file:// is not supported.",
      noDays: "No days in the dataset.",
      footer: "Offline trip plan. Navigation opens in Google Maps.",
      amap: "Amap",
      photoAlt: "Photo: ",
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    },
    ru: {
      language: "Язык",
      dayRoute: "Маршрут по точкам дня",
      dayDetails: "Детали дня",
      legendTitle: "Обозначения",
      warn: "Внимание",
      loading: "Загрузка…",
      dataError: "Не удалось загрузить данные поездки",
      dataHint: "Откройте приложение через локальный сервер (npx serve) или по HTTPS — file:// не поддерживается.",
      noDays: "В данных нет дней.",
      footer: "Офлайн-план поездки. Навигация — в Google Maps.",
      amap: "Amap",
      photoAlt: "Фото: ",
      months: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
    },
    zh: {
      language: "语言",
      dayRoute: "当天全程路线",
      dayDetails: "当天详情",
      legendTitle: "图例",
      warn: "注意",
      loading: "加载中…",
      dataError: "无法加载行程数据",
      dataHint: "请通过本地服务器（npx serve）或 HTTPS 打开应用——不支持 file://。",
      noDays: "数据中没有日程。",
      footer: "离线行程计划。导航将在 Google Maps 中打开。",
      amap: "高德地图",
      photoAlt: "照片：",
      months: null /* zh использует числовой формат: 2026年8月8日 */
    }
  };

  /* Разделы верхних вкладок; подписи — из ui[lang] датасета */
  var SECTIONS = [
    { id: "itinerary", labelKey: "tabItinerary" },
    { id: "info", labelKey: "tabInfo" },
    { id: "dining", labelKey: "tabDining" },
    { id: "guide", labelKey: "tabGuide" }
  ];

  var tabsEl = document.getElementById("day-tabs");
  var sectionTabsEl = document.getElementById("section-tabs");
  var viewEl = document.getElementById("view-itinerary");
  var infoEl = document.getElementById("view-info");
  var diningEl = document.getElementById("view-dining");
  var guideEl = document.getElementById("view-guide");
  var titleEl = document.getElementById("trip-title");
  var footerEl = document.getElementById("footer-note");

  var data = null;
  var trip = {};
  var days = [];
  var lang = FALLBACK_LANG;
  var dayIndex = 0;
  var section = SECTIONS[0].id;

  /* Раскрытые «Детали дня» — по номеру дня, только на время сессии (без localStorage) */
  var expandedDays = {};

  /* Раскрытые описания активностей — по id точки, так же на время сессии */
  var expandedLocations = {};

  /* ---------- Язык ---------- */

  function availableLangs() {
    if (trip.languages && trip.languages.length) return trip.languages;
    return Object.keys(EXTRA_UI);
  }

  function storedLang() {
    try {
      return window.localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
      return null; /* приватный режим / отключённое хранилище */
    }
  }

  function storeLang(code) {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch (e) {
      /* не критично: язык просто не запомнится между запусками */
    }
  }

  /* Порядок: сохранённый выбор → язык браузера → FALLBACK_LANG (английский) */
  function resolveLang() {
    var supported = availableLangs();

    var saved = storedLang();
    if (saved && supported.indexOf(saved) >= 0) return saved;

    var candidates = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ""];

    for (var i = 0; i < candidates.length; i++) {
      var base = String(candidates[i]).toLowerCase().split("-")[0];
      if (supported.indexOf(base) >= 0) return base;
    }

    return supported.indexOf(FALLBACK_LANG) >= 0 ? FALLBACK_LANG : supported[0];
  }

  /* Строка интерфейса: сначала ui[lang] из датасета, затем EXTRA_UI, затем английский */
  function t(key) {
    var fromData = data && data.ui && data.ui[lang];
    if (fromData && fromData[key] != null) return fromData[key];

    var extra = EXTRA_UI[lang] || EXTRA_UI[FALLBACK_LANG];
    if (extra && extra[key] != null) return extra[key];

    var fallback = EXTRA_UI[FALLBACK_LANG];
    return (fallback && fallback[key] != null) ? fallback[key] : key;
  }

  /* Подписи из словарей ui[lang].categories / ui[lang].meals по языконезависимому коду */
  function label(group, code) {
    if (!code) return null;
    var ui = data && data.ui && data.ui[lang];
    if (ui && ui[group] && ui[group][code]) return ui[group][code];

    var en = data && data.ui && data.ui[FALLBACK_LANG];
    if (en && en[group] && en[group][code]) return en[group][code];

    return code;
  }

  /* Текстовое поле {en,ru,zh} → строка активного языка */
  function localized(field) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (field[lang] != null) return field[lang];
    if (field[FALLBACK_LANG] != null) return field[FALLBACK_LANG];
    var keys = Object.keys(field);
    return keys.length ? field[keys[0]] : "";
  }

  /* ---------- Google Maps deep links (раздел 6 ТЗ) ---------- */

  function hasCoords(loc) {
    return typeof loc.lat === "number" && typeof loc.lng === "number";
  }

  /* Точка кликабельна, только если её можно однозначно найти на карте.
     Записи без координат и placeId (например, «заправиться по пути») — просто напоминания. */
  function isMappable(loc) {
    return hasCoords(loc) || !!loc.placeId;
  }

  function directionsUrl(loc) {
    var base = "https://www.google.com/maps/dir/?api=1";
    var url = hasCoords(loc)
      ? base + "&destination=" + loc.lat + "," + loc.lng
      : base + "&destination=" + encodeURIComponent(localized(loc.name));
    if (loc.placeId) url += "&destination_place_id=" + loc.placeId;
    return url;
  }

  function searchUrl(loc) {
    var url = "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(localized(loc.name));
    if (loc.placeId) url += "&query_place_id=" + loc.placeId;
    return url;
  }

  /* Amap (高德): координаты датасета уже в GCJ-02, как у Google в Китае, поэтому
     coordinate=gaode — без пересчёта. Имя всегда китайское: так Amap находит POI. */
  function amapUrl(loc) {
    var name = (loc.name && loc.name.zh) || localized(loc.name);
    if (!hasCoords(loc)) {
      return "https://uri.amap.com/search?keyword=" + encodeURIComponent(name) +
        "&callnative=1&src=east-china-trip";
    }
    return "https://uri.amap.com/marker?position=" + loc.lng + "," + loc.lat +
      "&name=" + encodeURIComponent(name) +
      "&coordinate=gaode&callnative=1&src=east-china-trip";
  }

  /* Точка как параметр маршрута: координаты, иначе название */
  function waypointOf(loc) {
    return hasCoords(loc) ? loc.lat + "," + loc.lng : localized(loc.name);
  }

  /* Цепочка по всем точкам дня: старт — первая точка (не текущее положение),
     финиш — последняя, промежуточные уходят в waypoints (universal URL держит до 9). */
  function dayRouteUrl(points) {
    var destination = points[points.length - 1];
    var stops = points.slice(0, -1); /* все точки, кроме финальной */

    /* origin не указываем: без него Google строит маршрут от текущего положения */
    var url = "https://www.google.com/maps/dir/?api=1" +
      "&destination=" + encodeURIComponent(waypointOf(destination));

    if (destination.placeId) url += "&destination_place_id=" + destination.placeId;

    if (stops.length) {
      url += "&waypoints=" + encodeURIComponent(stops.map(waypointOf).join("|"));

      /* waypoint_place_ids принимается только когда id есть у КАЖДОЙ промежуточной точки —
         иначе списки разной длины и Google отбрасывает маршрут целиком */
      var allHaveId = stops.every(function (loc) { return !!loc.placeId; });
      if (allHaveId) {
        url += "&waypoint_place_ids=" +
          encodeURIComponent(stops.map(function (loc) { return loc.placeId; }).join("|"));
      }
    }

    return url;
  }

  /* ---------- Хелперы ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function mapsLink(className, text, href) {
    var a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function stars(n) {
    var value = Math.max(0, Math.min(5, n || 0));
    return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
  }

  function formatDate(day) {
    var parts = String(day.date).split("-");
    var weekday = localized(day.weekday);
    if (parts.length !== 3) return day.date;

    var year = parts[0];
    var month = parseInt(parts[1], 10);
    var date = parseInt(parts[2], 10);

    if (lang === "zh") {
      var zh = year + "年" + month + "月" + date + "日";
      return weekday ? weekday + "，" + zh : zh;
    }

    var months = (EXTRA_UI[lang] && EXTRA_UI[lang].months) || EXTRA_UI[FALLBACK_LANG].months;
    var text = date + " " + (months[month - 1] || parts[1]) + " " + year;
    return weekday ? weekday + ", " + text : text;
  }

  /* «День 14» / «Day 14» / «第14天» — ui[lang].dayWord */
  function dayWord(day) {
    var word = t("dayWord");
    return lang === "zh" ? word + day.day + "天" : word + " " + day.day;
  }

  /* ---------- Переключатель языка ---------- */

  /* Живёт в разделе «Как пользоваться», поэтому создаётся заново при каждом
     рендере этого раздела — статического элемента в разметке нет. */
  function buildLangControl() {
    var select = document.createElement("select");
    select.className = "lang__select";
    select.setAttribute("aria-label", t("language"));

    availableLangs().forEach(function (code) {
      var option = document.createElement("option");
      option.value = code;
      var ui = data && data.ui && data.ui[code];
      option.textContent = (ui && ui.langName) || code.toUpperCase();
      if (code === lang) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener("change", function () {
      setLang(select.value);
    });

    return select;
  }

  function setLang(code) {
    if (code === lang) return;
    lang = code;
    storeLang(code);
    renderAll();
  }

  /* ---------- Рендер ---------- */

  function renderBadges(loc) {
    var box = el("div", "badges");

    if (loc.category) box.appendChild(el("span", "badge", label("categories", loc.category)));
    if (loc.meal) box.appendChild(el("span", "badge badge--meal", label("meals", loc.meal)));
    if (loc.optional) box.appendChild(el("span", "badge badge--optional", t("optional")));
    if (loc.warn) box.appendChild(el("span", "badge badge--warn", t("warn")));

    return box;
  }

  /* Фото достопримечательности грузится прямо с Wikimedia и нигде не сохраняется
     (SW чужие домены не кэширует). Не загрузилось — карточка просто без фото.
     Тап открывает точку в Amap, подпись — автор и лицензия. */
  function renderPhoto(loc) {
    var fig = el("figure", "loc__photo");
    var img = document.createElement("img");
    img.src = loc.photo.src;
    img.alt = t("photoAlt") + localized(loc.name);
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", function () { fig.remove(); });

    if (isMappable(loc)) {
      var link = mapsLink("loc__photo-link", null, amapUrl(loc));
      link.appendChild(img);
      fig.appendChild(link);
    } else {
      fig.appendChild(img);
    }

    if (loc.photo.credit) {
      var cap = el("figcaption", "loc__photo-credit");
      cap.appendChild(loc.photo.source
        ? mapsLink(null, loc.photo.credit, loc.photo.source)
        : document.createTextNode(loc.photo.credit));
      fig.appendChild(cap);
    }
    return fig;
  }

  function renderLocation(loc) {
    var item = el("li", "loc");
    if (loc.optional) item.classList.add("loc--optional");
    if (loc.warn) item.classList.add("loc--warn");
    if (loc.photo && loc.photo.src) item.appendChild(renderPhoto(loc));

    var head = el("div", "loc__head");
    /* Места из «Ужина» не привязаны ко времени — чип просто не рисуем.
       У точек дня со временем «—» строка непустая, так что чип остаётся. */
    if (loc.time) head.appendChild(el("span", "loc__time", loc.time));
    head.appendChild(el("h3", "loc__name", localized(loc.name)));

    var note = localized(loc.note);
    var badges = renderBadges(loc);
    var about = localized(loc.details);

    if (about) {
      /* Тап по карточке раскрывает описание места. Кнопки карт намеренно
         остаются снаружи <details> — иначе тап по ним переключал бы карточку. */
      var box = document.createElement("details");
      box.className = "loc__about";
      box.open = !!expandedLocations[loc.id];

      var summary = document.createElement("summary");
      summary.className = "loc__summary";
      head.appendChild(el("span", "loc__chevron"));
      summary.appendChild(head);
      if (note) summary.appendChild(el("p", "loc__note", note));
      summary.appendChild(badges);
      box.appendChild(summary);

      box.appendChild(el("p", "loc__about-text", about));

      box.addEventListener("toggle", function () {
        expandedLocations[loc.id] = box.open;
      });

      item.appendChild(box);
    } else {
      /* Датасет без details — карточка как раньше, ничего не раскрывается */
      item.appendChild(head);
      if (note) item.appendChild(el("p", "loc__note", note));
      item.appendChild(badges);
    }

    if (isMappable(loc)) {
      var actions = el("div", "loc__actions");
      actions.appendChild(mapsLink("btn btn--primary", t("directions"), directionsUrl(loc)));
      actions.appendChild(mapsLink("btn btn--ghost", t("viewOnMap"), searchUrl(loc)));
      actions.appendChild(mapsLink("btn btn--ghost btn--amap", t("amap"), amapUrl(loc)));
      item.appendChild(actions);
    }

    return item;
  }

  /* Сворачиваемые заметки дня. Состояние — своё на каждый день, живёт до перезагрузки. */
  function renderDayDetails(day) {
    var rows = [
      { label: t("roadsLabel"), value: localized(day.roads) },
      { label: t("clothingLabel"), value: localized(day.clothing) }
    ];

    /* extra есть не у всех дней и часто равно null — тогда строки просто нет */
    if (day.extra) rows.push({ label: t("noteLabel"), value: localized(day.extra) });

    rows = rows.filter(function (row) { return row.value; });
    if (!rows.length) return null;

    var box = document.createElement("details");
    box.className = "details";
    box.open = !!expandedDays[day.day];

    var summary = document.createElement("summary");
    summary.className = "details__summary";
    summary.textContent = t("dayDetails");
    box.appendChild(summary);

    var body = el("div", "details__body");
    rows.forEach(function (row) {
      var item = el("div", "detail");
      item.appendChild(el("span", "detail__label", row.label));
      item.appendChild(el("p", "detail__text", row.value));
      body.appendChild(item);
    });
    box.appendChild(body);

    box.addEventListener("toggle", function () {
      expandedDays[day.day] = box.open;
    });

    return box;
  }

  function renderDay(index) {
    var day = days[index];

    viewEl.textContent = "";

    var head = el("section", "day-head");

    var left = el("div", "day-head__text");
    left.appendChild(el("p", "day-head__date", formatDate(day)));
    left.appendChild(el("h2", "day-head__title", localized(day.title)));

    var focus = localized(day.focus);
    if (focus) left.appendChild(el("p", "day-head__focus", focus));

    head.appendChild(left);

    var busy = el("div", "busyness");
    busy.appendChild(el("div", "busyness__stars", stars(day.busyness)));
    busy.appendChild(el("span", "busyness__label", t("load")));
    busy.title = t("load") + ": " + (day.busyness || 0) + " / 5";
    head.appendChild(busy);

    viewEl.appendChild(head);

    var locations = day.locations || [];

    /* Маршрут показываем только когда есть что связывать: одна точка — это просто её карточка */
    var routePoints = locations.filter(isMappable);
    if (routePoints.length > 1) {
      var route = el("div", "day-route");
      var text = t("dayRoute") + " · " + routePoints.length;
      route.appendChild(mapsLink("btn btn--ghost btn--wide", text, dayRouteUrl(routePoints)));
      viewEl.appendChild(route);
    }

    var list = el("ul", "locations");
    locations.forEach(function (loc) {
      list.appendChild(renderLocation(loc));
    });
    viewEl.appendChild(list);

    var details = renderDayDetails(day);
    if (details) viewEl.appendChild(details);
  }

  /* ---------- Раздел «О поездке» ---------- */

  function renderInfo() {
    infoEl.textContent = "";

    var overview = localized(trip.overview);
    if (overview) {
      var intro = el("section", "card");
      intro.appendChild(el("p", "card__text", overview));
      infoEl.appendChild(intro);
    }

    var general = data.general;
    if (general && general.items && general.items.length) {
      var facts = el("section", "card");

      var generalTitle = localized(general.title);
      if (generalTitle) facts.appendChild(el("h2", "card__title", generalTitle));

      var dl = el("dl", "facts");
      general.items.forEach(function (item) {
        dl.appendChild(el("dt", "facts__label", localized(item.label)));
        dl.appendChild(el("dd", "facts__text", localized(item.text)));
      });
      facts.appendChild(dl);
      infoEl.appendChild(facts);
    }

    var legend = data.legend;
    if (legend && legend.length) {
      var box = el("section", "card");
      box.appendChild(el("h2", "card__title", t("legendTitle")));

      var list = el("ul", "legend");
      legend.forEach(function (entry) {
        var row = el("li", "legend__row");
        row.appendChild(el("span", "legend__symbol", entry.symbol));
        row.appendChild(el("span", "legend__text", localized(entry.text)));
        list.appendChild(row);
      });
      box.appendChild(list);
      infoEl.appendChild(box);
    }
  }

  /* ---------- Раздел «Ужин» ----------
     Места не привязаны к дню, поэтому карточки те же, что у активностей,
     но без времени, звёзд и прочих полей дня — их у этих записей нет. */

  function renderDining() {
    diningEl.textContent = "";

    var dining = data.dining;
    if (!dining) return;

    var card = el("section", "card");

    var title = localized(dining.title);
    if (title) card.appendChild(el("h2", "card__title", title));

    var intro = localized(dining.intro);
    if (intro) card.appendChild(el("p", "card__text", intro));

    if (title || intro) diningEl.appendChild(card);

    var places = dining.places || [];
    if (!places.length) return;

    var list = el("ul", "locations");
    places.forEach(function (place) {
      list.appendChild(renderLocation(place));
    });
    diningEl.appendChild(list);
  }

  /* ---------- Раздел «Как пользоваться» ---------- */

  function renderGuide() {
    guideEl.textContent = "";

    /* Выбор языка живёт здесь, а не в шапке */
    var langCard = el("section", "card");
    langCard.appendChild(el("h2", "card__title", t("language")));
    langCard.appendChild(buildLangControl());
    guideEl.appendChild(langCard);

    var guide = data.appGuide;
    if (!guide) return;

    var card = el("section", "card");

    var title = localized(guide.title);
    if (title) card.appendChild(el("h2", "card__title", title));

    var steps = el("ol", "steps");
    (guide.steps || []).forEach(function (step) {
      steps.appendChild(el("li", "steps__item", localized(step)));
    });
    card.appendChild(steps);

    guideEl.appendChild(card);
  }

  function buildSectionTabs() {
    sectionTabsEl.textContent = "";

    SECTIONS.forEach(function (item) {
      var btn = el("button", "section-tab", t(item.labelKey));
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", item.id === section ? "true" : "false");
      btn.addEventListener("click", function () {
        setSection(item.id);
      });
      sectionTabsEl.appendChild(btn);
    });
  }

  /* Показывает активный раздел и рисует его содержимое на текущем языке */
  function renderSection() {
    var itinerary = section === "itinerary";

    tabsEl.hidden = !itinerary; /* чипы дней нужны только в «Маршруте» */
    viewEl.hidden = !itinerary;
    infoEl.hidden = section !== "info";
    diningEl.hidden = section !== "dining";
    guideEl.hidden = section !== "guide";

    if (itinerary) selectDay(dayIndex, false);
    else if (section === "info") renderInfo();
    else if (section === "dining") renderDining();
    else renderGuide();
  }

  function setSection(id) {
    if (id === section) return;
    section = id;
    buildSectionTabs();
    renderSection();
    window.scrollTo(0, 0);
  }

  function buildTabs() {
    tabsEl.textContent = "";
    tabsEl.setAttribute("aria-label", t("dayWord"));

    days.forEach(function (day, index) {
      var btn = el("button", "tab");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", index === dayIndex ? "true" : "false");
      btn.setAttribute("aria-label", dayWord(day) + " — " + formatDate(day));
      btn.appendChild(el("span", "tab__weekday", localized(day.weekday)));
      btn.appendChild(el("span", "tab__day", String(day.day)));
      btn.addEventListener("click", function () {
        selectDay(index, true);
      });
      tabsEl.appendChild(btn);
    });
  }

  function selectDay(index, scrollTop) {
    if (index < 0 || index >= days.length) index = 0;
    dayIndex = index;

    Array.prototype.forEach.call(tabsEl.children, function (btn, i) {
      btn.setAttribute("aria-selected", i === index ? "true" : "false");
    });

    renderDay(index);

    var active = tabsEl.children[index];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: "nearest", inline: "center" });
    }

    var hash = "#day-" + days[index].day;
    if (location.hash !== hash) history.replaceState(null, "", hash);

    if (scrollTop) window.scrollTo(0, 0);
  }

  /* Полная перерисовка на активном языке. Активный раздел, выбранный день и
     раскрытые «Детали» переживают смену языка — это состояние живёт отдельно. */
  function renderAll() {
    document.documentElement.lang = lang;

    var tripTitle = localized(trip.title);
    if (tripTitle) {
      titleEl.textContent = tripTitle;
      document.title = tripTitle;
    }
    if (footerEl) footerEl.textContent = t("footer");

    buildSectionTabs();
    buildTabs();
    renderSection();
  }

  /* ---------- Загрузка данных ---------- */

  function showError(message) {
    viewEl.textContent = "";
    viewEl.appendChild(el("p", "error", message));
  }

  /* Стартовый день: из хэша, иначе сегодняшний (если поездка идёт), иначе первый */
  function initialIndex() {
    var match = /^#day-(\d+)$/.exec(location.hash || "");
    if (match) {
      var wanted = parseInt(match[1], 10);
      for (var i = 0; i < days.length; i++) {
        if (days[i].day === wanted) return i;
      }
    }

    var now = new Date();
    var today = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    for (var j = 0; j < days.length; j++) {
      if (days[j].date === today) return j;
    }
    return 0;
  }

  /* ---------- Нормализация датасета ----------
     Генератор данных раз за разом возвращает две вещи, от которых мы отказались.
     Правили их руками в JSON, и каждая перегенерация откатывала правку обратно,
     поэтому теперь они применяются здесь — к любому файлу, что бы в нём ни лежало. */

  /* «Chiang Mai — Mae Rim — City» → «Chiang Mai — Mae Rim»: третий сегмент лишний.
     Режем по тире с пробелами, поэтому тире внутри самого названия не заденет. */
  function trimTitle(value) {
    if (typeof value !== "string") return value;
    var parts = value.split(/\s+[—–-]\s+/);
    return parts.length > 2 ? parts.slice(0, 2).join(" — ") : value;
  }

  function normalize(loaded) {
    var title = loaded.trip && loaded.trip.title;
    if (title) {
      Object.keys(title).forEach(function (code) {
        title[code] = trimTitle(title[code]);
      });
    }

    (loaded.days || []).forEach(function (day) {
      (day.locations || []).forEach(function (loc) {
        /* Точка «дозаправиться по пути» — напоминание, а не место: координаты у неё
           всегда условные (18.9, 99.0 — просто середина трассы). Убираем их, чтобы
           кнопки карты не вели в случайную точку. Условие на placeId оставляет
           возможность подставить настоящую заправку — такую запись мы не тронем. */
        if (/-fuel$/.test(loc.id || "") && !loc.placeId) {
          loc.lat = null;
          loc.lng = null;
        }
      });
    });

    return loaded;
  }

  function start(loaded) {
    data = normalize(loaded);
    trip = data.trip || {};
    days = data.days || [];

    lang = resolveLang(); /* повторно — теперь известен trip.languages */

    if (trip.brandColor) {
      document.documentElement.style.setProperty("--brand", trip.brandColor);
    }

    if (!days.length) {
      showError(t("noDays"));
      return;
    }

    dayIndex = initialIndex();
    renderAll();
  }

  /* Предварительный язык — до загрузки данных, чтобы «Загрузка…» была на нужном языке */
  lang = resolveLang();
  document.documentElement.lang = lang;
  var loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.textContent = t("loading");
  if (footerEl) footerEl.textContent = t("footer");

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(start)
    .catch(function (err) {
      showError(t("dataError") + " (" + err.message + "). " + t("dataHint"));
    });

  /* ---------- Service worker ---------- */

  if ("serviceWorker" in navigator) {
    /* Была ли страница уже под управлением воркера на момент загрузки.
       Если нет — это первая установка, и перезагружать нечего. */
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;

    /* Новый воркер перехватил управление (skipWaiting + clients.claim в sw.js).
       Страница при этом всё ещё показывает файлы, отданные старым воркером,
       поэтому перезагружаемся один раз — иначе обновление было бы видно
       только со следующего запуска приложения. */
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js")
        .then(function (registration) {
          registration.update(); /* проверяем обновление сразу, не дожидаясь навигации */
        })
        .catch(function (err) {
          console.warn("SW registration failed:", err);
        });
    });
  }
})();
