# Chiang Mai Trip — техническое задание на PWA

Документ для загрузки в VS Code (модуль Claude / Claude Code). Проза — на русском, весь код, ключи данных и идентификаторы — на английском. Приложение — простое, статическое, офлайн-первое, устанавливается на телефон как PWA. Каждая активность имеет кнопку перехода в Google Maps.

---

## 0. Цель

Автономный (офлайн) справочник-план поездки в Чиангмай 8–19 августа 2026, который можно смотреть на телефоне **без открытия чата и без интернета**. По каждому дню — расписание с временем, заметками и **кнопкой «Проложить маршрут» → открывает Google Maps** (навигацию не встраиваем — полагаемся на нативный Google Maps).

## 1. Что строим (обзор)

Одностраничное приложение (SPA) на **чистом HTML/CSS/JavaScript без сборщика** (проще всего для PWA и хостинга). Никаких фреймворков не требуется. Данные — в отдельном файле `data.json`. Оффлайн обеспечивается `manifest.json` + service worker (`sw.js`) с кэшированием app-shell и данных.

## 2. Функциональные требования

1. **Просмотр по дням.** Верхняя навигация (горизонтальные вкладки-чипы «8», «9», … «19», прокручиваемые) или выпадающий список. Выбор дня показывает его карточку.
2. **Заголовок дня.** Дата + краткое описание (`title`) + **индикатор загруженности `busyness` в виде 5 звёзд** (★ заполненные / ☆ пустые).
3. **Список активностей дня.** Каждая активность — карточка: `time` слева, `name`, `note`, бейдж `category`, и если `optional: true` — пометка «опционально».
4. **Кнопка Google Maps на каждой активности** (где есть координаты): «Проложить маршрут» → открывает Google Maps directions к точке. Вторичная ссылка «На карте» → открывает точку на карте. Формат ссылок — раздел 6.
5. **Питание/заправка/флаги.** Если у активности есть `meal` (`breakfast`/`dinner`/`snack`/`main`) — визуально выделить (например, цветной бейдж). Заметки-предупреждения (`warn: true`) — выделить янтарным.
6. **Офлайн.** После первой загрузки приложение полностью работает без сети (кроме самих переходов в Google Maps, которым нужен интернет/офлайн-карты Google).
7. **Установка на домашний экран** (PWA / Add to Home Screen).
8. **Опционально (nice-to-have), НЕ обязательно:** кнопка «Обзорная карта» — открывает Google Maps со всеми точками дня, либо статичную картинку. Встроенную интерактивную карту с тайлами НЕ делаем (офлайн-тайлы усложняют проект без пользы — навигация всё равно в Google Maps).

## 3. UI/UX

- **Mobile-first**, ширина ~360–430px, крупные тап-цели (≥44px), читаемый шрифт (16px база).
- **Цвет по дню** (акцент карточки/чипа), палитра — глубокий зелёный `#14532D` как основной бренд-цвет, светлый фон.
- **Звёзды загруженности** — в шапке дня справа.
- **Sticky** верхняя панель выбора дня.
- Тёмная тема — опционально.
- Всё оформление — свой минимальный CSS (без внешних CDN, чтобы работало офлайн).

## 4. Модель данных (схема `data.json`)

```json
{
  "trip": {
    "titleRu": "Чиангмай — Мае Рим — город",
    "titleEn": "Chiang Mai — Mae Rim — City",
    "dates": "2026-08-08 … 2026-08-19",
    "brandColor": "#14532D"
  },
  "days": [
    {
      "day": 8,
      "date": "2026-08-08",
      "weekdayRu": "Сб",
      "title": "Прилёт (вечер)",
      "busyness": 1,
      "locations": [
        {
          "id": "d8-capitalo",
          "name": "Capital O Million Pillows",
          "time": "21:30",
          "category": "hotel",
          "lat": 18.7572878,
          "lng": 98.9711906,
          "placeId": "ChIJORjzX5k62jAR3xPuSHwKS9w",
          "note": "Ночь прилёта (3 км от аэропорта).",
          "optional": false,
          "meal": null,
          "warn": false
        }
      ]
    }
  ]
}
```

Поля `location`: `id` (уникальный), `name`, `time`, `category` (`hotel`/`rental`/`cafe`/`garden`/`nature`/`temple`/`activity`/`pool`/`market`/`food`), `lat`, `lng`, `placeId` (может быть `null`), `note`, `optional` (bool), `meal` (`breakfast`/`dinner`/`snack`/`main`/`null`), `warn` (bool, для предупреждений).

## 5. Данные (полный JSON) — сохранить как `data.json`

```json
{
  "trip": {
    "titleRu": "Чиангмай — Мае Рим — город",
    "titleEn": "Chiang Mai — Mae Rim — City",
    "dates": "2026-08-08 … 2026-08-19",
    "brandColor": "#14532D"
  },
  "days": [
    {
      "day": 8, "date": "2026-08-08", "weekdayRu": "Сб",
      "title": "Прилёт (вечер)", "busyness": 1,
      "locations": [
        { "id": "d8-capitalo", "name": "Capital O Million Pillows", "time": "21:30", "category": "hotel", "lat": 18.7572878, "lng": 98.9711906, "placeId": "ChIJORjzX5k62jAR3xPuSHwKS9w", "note": "Заселение, ночь прилёта. 3 км от аэропорта.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 9, "date": "2026-08-09", "weekdayRu": "Вс",
      "title": "Аренда байка + сад Сирикит (разгружен)", "busyness": 2,
      "locations": [
        { "id": "d9-maiphare", "name": "Mai Phare (прокат байка)", "time": "08:45", "category": "rental", "lat": 18.7933256, "lng": 98.9883969, "placeId": "ChIJA9_7OJg72jARNna-S4CnOdE", "note": "Аренда 150–160cc. Депозит 3000 THB / копия паспорта. Шлемы включены.", "optional": false, "meal": null, "warn": false },
        { "id": "d9-cafearte", "name": "Cafe Arte", "time": "09:45", "category": "cafe", "lat": 18.8104759, "lng": 98.9670261, "placeId": "ChIJsyN09PE72jARrFl9p-zWaWE", "note": "Завтрак. 09:00–17:00, закрыто по средам.", "optional": false, "meal": "breakfast", "warn": false },
        { "id": "d9-thesher", "name": "The Sher Homestay", "time": "11:40", "category": "hotel", "lat": 18.8672102, "lng": 98.8512489, "placeId": "ChIJux_L5s852jAR86I_oGIc2g4", "note": "БАЗА 9–11. Заселение, выгрузка багажа. Ужины при доме.", "optional": false, "meal": null, "warn": false },
        { "id": "d9-qsbg", "name": "Queen Sirikit Botanic Garden", "time": "13:00", "category": "garden", "lat": 18.8880345, "lng": 98.8618687, "placeId": "ChIJ09XFoDY_2jARLzwh9iOPI6U", "note": "Оранжереи, купол с водопадом, навесная тропа. 08:30–16:30, ~150 THB.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 10, "date": "2026-08-10", "weekdayRu": "Пн",
      "title": "Мае Таенг: липкий водопад + гранд-храм", "busyness": 5,
      "locations": [
        { "id": "d10-buatong", "name": "Bua Tong Sticky Waterfall", "time": "09:35", "category": "nature", "lat": 19.0694446, "lng": 99.079073, "placeId": "ChIJu1M68-cb2jARc3Tlb3ICDkw", "note": "Подъём ПО известняку, босиком, промокнете. Бесплатно, 08:30–16:30. Локеры/душ.", "optional": false, "meal": null, "warn": false },
        { "id": "d10-watbanden", "name": "Wat Ban Den", "time": "13:00", "category": "temple", "lat": 19.1577357, "lng": 98.9784843, "placeId": "ChIJkx6eIigQ2jARD03MmP6q3fQ", "note": "Огромный яркий храмовый комплекс. Бесплатно, 07:00–18:00. Дресс-код.", "optional": false, "meal": null, "warn": false },
        { "id": "d10-fuel", "name": "Заправка по пути (коридор 107)", "time": "—", "category": "rental", "lat": 18.9, "lng": 99.0, "placeId": null, "note": "ОБЯЗАТЕЛЬНО дозаправиться: ~150 км вдвоём, одного бака может не хватить.", "optional": false, "meal": null, "warn": true }
      ]
    },
    {
      "day": 11, "date": "2026-08-11", "weekdayRu": "Вт",
      "title": "Верхняя долина: ферма + зиплайн", "busyness": 3,
      "locations": [
        { "id": "d11-maekee", "name": "Maekee Sheep House", "time": "08:15", "category": "nature", "lat": 18.9553449, "lng": 98.8006194, "placeId": "ChIJFZYeTX9B2jAR72Z4R83S1Zo", "note": "Овцы и альпаки, горные виды. ~100 THB + 40 морковь. 07:30–18:00.", "optional": false, "meal": null, "warn": false },
        { "id": "d11-pongyang", "name": "Pong Yang Jungle Coaster & Zipline", "time": "10:00", "category": "activity", "lat": 18.9168336, "lng": 98.821529, "placeId": "ChIJo1lRuZFA2jARrCYUlaxw2ug", "note": "Якорь дня. Coaster ~220, FlyLine ~200, зиплайны пакетами. 08:30–17:00. Закрытая обувь обязательна.", "optional": false, "meal": null, "warn": false },
        { "id": "d11-ainara", "name": "Ai Nara Cafe", "time": "13:45", "category": "cafe", "lat": 18.8781372, "lng": 98.8226656, "placeId": "ChIJFXLiZQ9H2jARkqA8HwviWAo", "note": "Уютное горное кафе, собаки. 09:00–18:00.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 12, "date": "2026-08-12", "weekdayRu": "Ср",
      "title": "Переезд в город (День матери, разгружен)", "busyness": 2,
      "locations": [
        { "id": "d12-chedi", "name": "Wat Chedi Luang", "time": "17:00", "category": "temple", "lat": 18.7869693, "lng": 98.9865804, "placeId": "ChIJFRQRM5k62jARuqhLBJpw91w", "note": "Вечерняя прогулка: древняя чеди, хороша на закате. 05:00–22:30, ~50 THB.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 13, "date": "2026-08-13", "weekdayRu": "Чт",
      "title": "Старый город (храмы пешком) + Нимман", "busyness": 3,
      "locations": [
        { "id": "d13-phrasingh", "name": "Wat Phra Singh", "time": "09:30", "category": "temple", "lat": 18.7885265, "lng": 98.9819946, "placeId": "ChIJbyRKbps62jAR6VTNF-fZVpY", "note": "Самый почитаемый храм Старого города. 05:30–19:30, ~50 THB.", "optional": false, "meal": null, "warn": false },
        { "id": "d13-khaosoi", "name": "Khao Soi Maesai", "time": "12:00", "category": "food", "lat": 18.7995989, "lng": 98.9752135, "placeId": "ChIJqcysHow62jAR6ElsdYpG8EU", "note": "Мишленовский кхао сой. 08:00–16:00, закрыто по вс. Часто очередь.", "optional": false, "meal": "snack", "warn": false },
        { "id": "d13-onenimman", "name": "One Nimman", "time": "13:30", "category": "market", "lat": 18.8000644, "lng": 98.9676299, "placeId": "ChIJ8QdNKPU72jARtz_iHmA6_zk", "note": "Креативный квартал: кафе, бутики, дизайн. 11:00–22:00.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 14, "date": "2026-08-14", "weekdayRu": "Пт",
      "title": "Дой Сутеп + северный кластер Мае Рим + бильярд", "busyness": 4,
      "locations": [
        { "id": "d14-phalat", "name": "Wat Pha Lat", "time": "08:35", "category": "temple", "lat": 18.7993968, "lng": 98.9341468, "placeId": "ChIJ66D0IBo62jARiGi7NFub710", "note": "Лесной храм у ручья, тихий. 06:00–17:30, бесплатно.", "optional": false, "meal": null, "warn": false },
        { "id": "d14-doisuthep", "name": "Wat Phra That Doi Suthep", "time": "09:35", "category": "temple", "lat": 18.8049889, "lng": 98.9216337, "placeId": "ChIJtd3x37U52jARIX7FrlxMhp0", "note": "Икона города: золотая чеди, вид, лестница-нага (или фуникулёр). 05:00–21:00, ~50 THB.", "optional": false, "meal": null, "warn": false },
        { "id": "d14-huaytungtao", "name": "Huay Tung Tao Lake", "time": "11:55", "category": "nature", "lat": 18.8678564, "lng": 98.9404039, "placeId": "ChIJCVqAJvI72jARjRv4kk8BNDA", "note": "Озеро, бамбуковые хижины над водой, обед/релакс. Опционально — легко отменить.", "optional": true, "meal": "snack", "warn": false },
        { "id": "d14-daraphirom", "name": "Wat Pa Dara Phirom", "time": "13:40", "category": "temple", "lat": 18.9107217, "lng": 98.9412655, "placeId": "ChIJ_____0g82jARs6bXHupxVPY", "note": "Храм-жемчужина (перенесён сюда — едете налегке). 06:00–18:00, бесплатно. Дресс-код.", "optional": false, "meal": null, "warn": false },
        { "id": "d14-poopoopaper", "name": "Elephant POOPOOPAPER Park", "time": "14:35", "category": "activity", "lat": 18.9254422, "lng": 98.9316088, "placeId": "ChIJrV5fNtM92jARyz7dyA05JDs", "note": "DIY-бумага из слоновьего навоза (перенесён; опционально). 08:30–17:15.", "optional": true, "meal": null, "warn": false },
        { "id": "d14-gameon", "name": "Game On Pool Hall", "time": "18:00", "category": "pool", "lat": 18.7953973, "lng": 98.980351, "placeId": "ChIJfZPXEJg72jARZTxhVCuB7-Q", "note": "Пул на 9-фт Diamond-столах + спорт-бар. 13:00–01:00. Ужин + бильярд.", "optional": false, "meal": "dinner", "warn": false }
      ]
    },
    {
      "day": 15, "date": "2026-08-15", "weekdayRu": "Сб",
      "title": "Кулинарный класс + Saturday Walking Street", "busyness": 3,
      "locations": [
        { "id": "d15-zabbelee", "name": "Zabb E Lee Thai Cooking School", "time": "09:00", "category": "activity", "lat": 18.7916249, "lng": 98.9931172, "placeId": "ChIJ3x3B6ZA62jARvdzTBB6KPUg", "note": "Рынок + готовка + дегустация (плотный дневной приём). Пикап от отеля. ~5 ч.", "optional": false, "meal": "main", "warn": false },
        { "id": "d15-silvertemple", "name": "Wat Sri Suphan (Silver Temple)", "time": "17:00", "category": "temple", "lat": 18.7787227, "lng": 98.9836524, "placeId": "ChIJ81yeUHYw2jARY_cUFjY3Yxk", "note": "На ул. Wualai. Сб до 23:00, ~50 THB. В главный зал — только мужчины.", "optional": false, "meal": null, "warn": false },
        { "id": "d15-satwalkingst", "name": "Saturday Walking Street (Wualai Rd)", "time": "18:00", "category": "market", "lat": 18.7846, "lng": 98.9855, "placeId": null, "note": "Серебро, ремёсла, стрит-фуд. ~17:00–22:00. Ужин перекусами.", "optional": false, "meal": "dinner", "warn": false }
      ]
    },
    {
      "day": 16, "date": "2026-08-16", "weekdayRu": "Вс",
      "title": "Южный кластер (сад + храм) + Sunday Walking Street", "busyness": 3,
      "locations": [
        { "id": "d16-doikham", "name": "Wat Phra That Doi Kham", "time": "09:30", "category": "temple", "lat": 18.7595235, "lng": 98.9188375, "placeId": "ChIJ2ZcVCjY32jARe1S2KiDFHNc", "note": "Храм на холме: панорама, большой Будда. 07:00–19:00.", "optional": false, "meal": null, "warn": false },
        { "id": "d16-rajapruek", "name": "Royal Park Rajapruek", "time": "11:00", "category": "garden", "lat": 18.7445479, "lng": 98.9280108, "placeId": "ChIJkQi8v9Mw2jAR93jK7vlaxvg", "note": "Тематические сады, орхидейные оранжереи, ланна-павильон; «Сад роз». 08:00–18:00, ~200 THB. Розы — пик в прохладный сезон.", "optional": false, "meal": null, "warn": false },
        { "id": "d16-sunwalkingst", "name": "Sunday Walking Street (Ratchadamnoen Rd)", "time": "17:00", "category": "market", "lat": 18.7876, "lng": 98.9931, "placeId": null, "note": "Главная уок-стрит: ремёсла, стрит-фуд. ~16:00–22:00. Ужин перекусами.", "optional": false, "meal": "dinner", "warn": false }
      ]
    },
    {
      "day": 17, "date": "2026-08-17", "weekdayRu": "Пн",
      "title": "Горная деревня Mae Kampong (восток)", "busyness": 4,
      "locations": [
        { "id": "d17-maekampong", "name": "Mae Kampong (деревня/водопад)", "time": "10:00", "category": "nature", "lat": 18.8627143, "lng": 99.3559305, "placeId": "ChIJh6a3UOON2TAR9CjmcORB9lY", "note": "Хмонг-деревня: водопад (ступени), деревянный храм, кафе на склонах. ~1.5 ч езды на восток.", "optional": false, "meal": null, "warn": false },
        { "id": "d17-hotsprings", "name": "San Kamphaeng Hot Springs", "time": "14:30", "category": "nature", "lat": 18.8145004, "lng": 99.2294265, "placeId": "ChIJhc99mFSI2TARj6okSlMe5Ik", "note": "Минеральные источники: ноги в тёплой воде, варка яиц. 07:00–18:00, ~100 THB. Дозаправка по пути.", "optional": false, "meal": null, "warn": false },
        { "id": "d17-maiiam", "name": "MAIIAM Contemporary Art (альтернатива)", "time": "—", "category": "activity", "lat": 18.7572293, "lng": 99.0936812, "placeId": "ChIJVR_OJEkv2jARQbUhY1Jh7s8", "note": "Опция для любителей современного искусства. Открыт Пт–Пн, 10:00–18:00, ~200 THB.", "optional": true, "meal": null, "warn": false }
      ]
    },
    {
      "day": 18, "date": "2026-08-18", "weekdayRu": "Вт",
      "title": "Аквапарк / релакс (предпоследний день)", "busyness": 3,
      "locations": [
        { "id": "d18-grandcanyon", "name": "Grand Canyon Water Park", "time": "11:00", "category": "activity", "lat": 18.6959737, "lng": 98.8919586, "placeId": "ChIJ8ctJP4M22jARPV0etTHeozI", "note": "Надувные полосы, вейкборд, зиплайны над водой. Ханг Донг (юг). 10:00–19:00, ~400 THB.", "optional": false, "meal": null, "warn": false }
      ]
    },
    {
      "day": 19, "date": "2026-08-19", "weekdayRu": "Ср",
      "title": "Отъезд", "busyness": 1,
      "locations": [
        { "id": "d19-warorot", "name": "Warorot Market", "time": "утро", "category": "market", "lat": 18.7898494, "lng": 99.0009964, "placeId": "ChIJUXF8Lzo72jARQGy1_Bh_wCQ", "note": "Сувениры: чай, снеки, ткани. 06:00–17:00.", "optional": true, "meal": null, "warn": false },
        { "id": "d19-maipharereturn", "name": "Mai Phare (возврат байка)", "time": "—", "category": "rental", "lat": 18.7933256, "lng": 98.9883969, "placeId": "ChIJA9_7OJg72jARNna-S4CnOdE", "note": "Сдать байк до отъезда.", "optional": false, "meal": null, "warn": false }
      ]
    }
  ]
}
```

## 6. Google Maps deep links

Ссылки строить в рантайме из полей точки. URL-энкодить `name`.

**Кнопка «Проложить маршрут» (directions от текущего местоположения):**
```
https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&destination_place_id={placeId}
```
Если `placeId === null`, параметр `&destination_place_id=...` не добавлять; вместо координат допустимо `destination={encodeURIComponent(name)}`.

**Вторичная ссылка «На карте» (показать точку):**
```
https://www.google.com/maps/search/?api=1&query={encodeURIComponent(name)}&query_place_id={placeId}
```
Если `placeId === null` — опустить `&query_place_id=...`.

**Опционально «Все точки дня на карте»** (обзор): открыть первую точку через directions либо сгенерировать search-ссылку по названию дня. Полноценный маршрут по нескольким точкам в universal URL ограничен — достаточно directions к выбранной точке.

Пример функции:
```js
function directionsUrl(loc) {
  const base = "https://www.google.com/maps/dir/?api=1";
  let url = `${base}&destination=${loc.lat},${loc.lng}`;
  if (loc.placeId) url += `&destination_place_id=${loc.placeId}`;
  return url;
}
```
Открывать в новой вкладке: `window.open(url, "_blank")`.

## 7. PWA-специфика

**`manifest.json`:**
```json
{
  "name": "Chiang Mai Trip 2026",
  "short_name": "CM Trip",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#14532D",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service worker (`sw.js`)** — стратегия **cache-first** для app-shell и данных:
- На `install`: закэшировать `./`, `index.html`, `styles.css`, `app.js`, `data.json`, `manifest.json`, обе иконки.
- На `fetch`: сначала отдавать из кэша, при отсутствии — сеть; для навигационных запросов — фолбэк на `index.html`.
- Инкрементировать имя кэша (`cm-trip-v1`) при изменениях и чистить старые в `activate`.
- Регистрировать SW из `app.js`: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');`

**Иконки:** создать `icons/icon-192.png` и `icons/icon-512.png` (простой квадрат бренд-цвета `#14532D` с буквами «CM» или иконкой храма — подойдёт любая, сгенерируйте программно или нарисуйте).

**Важно:** service worker и установка PWA требуют **HTTPS** (или `localhost` при разработке). Обычный `file://` не даёт офлайн-режим — публиковать на хостинге с HTTPS (раздел «Инструкция», шаг 7).

## 8. Структура файлов

```
chiang-mai-trip/
├── index.html          # разметка + контейнер приложения
├── styles.css          # весь CSS (без внешних CDN)
├── app.js              # логика: загрузка data.json, рендер дней, ссылки, регистрация SW
├── data.json           # данные из раздела 5
├── manifest.json       # манифест PWA
├── sw.js               # service worker (cache-first)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 9. Критерии приёмки

1. Открывается на телефоне, читаемо на ~390px, тап-цели крупные.
2. Переключение всех 12 дней (8–19) работает; шапка показывает дату, описание и звёзды загруженности.
3. У каждой активности с координатами есть работающая кнопка «Проложить маршрут», открывающая Google Maps directions к нужной точке (проверить на 2–3 точках).
4. Опциональные точки (озеро, POOPOOPAPER, MAIIAM, Warorot) визуально помечены.
5. После первой загрузки приложение открывается и работает **в авиарежиме** (офлайн), запущенное с домашнего экрана.
6. Устанавливается как PWA (Add to Home Screen), иконка и название корректны.
7. Никаких внешних CDN/скриптов, требующих сети для работы оболочки.

## 10. Вне задачи (non-goals)

- НЕ встраивать навигацию/маршрутизацию внутрь приложения — полагаемся на Google Maps.
- НЕ встраивать интерактивную карту с онлайн-тайлами (не нужна офлайн и усложняет проект).
- НЕ использовать localStorage/куки для критичных данных — данные статичны в `data.json`.
- НЕ добавлять бэкенд/базу данных — приложение полностью статическое.

---

# ЧАСТЬ 2 — Инструкция по разработке и публикации (по шагам)

Короткое напоминание последовательности. Node.js для этого проекта **необязателен** (чистая статика), но удобен для локального сервера.

1. **Установить инструменты.** VS Code; Git; (опционально) Node.js LTS — для `npx serve`. Установить расширение Claude в VS Code.
2. **Создать проект.** Создать папку `chiang-mai-trip`, открыть её в VS Code (`File → Open Folder`). В терминале: `git init`.
3. **Положить это ТЗ в проект** (`SPEC.md`) и попросить Claude сгенерировать файлы из раздела 8 по данному заданию (в т.ч. сохранить `data.json` из раздела 5 дословно).
4. **Собрать приложение с Claude.** Проверить, что созданы все 7 файлов + иконки, `data.json` валиден, ссылки Google Maps формируются по разделу 6.
5. **Локальный тест.** Запустить локальный сервер (нужен для service worker): `npx serve` (или расширение «Live Server» в VS Code). Открыть по `http://localhost:...`, проверить переключение дней и кнопки Maps. `file://` для SW не подойдёт.
6. **Репозиторий на GitHub.** Создать пустой репозиторий на github.com. Затем локально: `git add .` → `git commit -m "init"` → привязать remote (`git remote add origin <URL>`) → `git branch -M main` → `git push -u origin main`.
7. **Хостинг с HTTPS** (обязателен для PWA). Любой из двух:
   - **GitHub Pages:** в репозитории `Settings → Pages → Build and deployment → Deploy from a branch → main / root → Save`. Через минуту сайт доступен по `https://<username>.github.io/<repo>/`. (Т.к. это подпапка, `start_url`/пути в манифесте оставить относительными — `./`.)
   - **Netlify:** зарегистрироваться → `Add new site → Import from Git` (или перетащить папку в Netlify Drop). HTTPS выдаётся автоматически.
8. **Установка на телефон.** Открыть HTTPS-URL в Chrome (Android) или Safari (iOS) → меню → **«Добавить на экран „Домой“»**. Приложение появится как иконка и будет запускаться в полноэкранном режиме.
9. **Проверка офлайна.** Один раз открыть установленное приложение с сетью (чтобы SW закэшировал), затем включить **авиарежим** и открыть снова — расписание и кнопки должны работать (переход в Google Maps требует сети/офлайн-карт Google).
10. **Обновления.** При изменении данных — правите `data.json`, поднимаете версию кэша в `sw.js` (`cm-trip-v2`), `git push`. На телефоне приложение подтянет новую версию при следующем онлайн-открытии.
