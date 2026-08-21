# Wyspy — instrukcja dla agenta

Dwie chodzalne wyspy pod `gzowo.fun/wyspy/`. Jedna należy do Jurka, druga do Rysia.
Ten plik jest po to, żeby dało się dołożyć projekt na wyspę bez czytania całego kodu.

## Co gdzie leży

| Ścieżka | Do czego |
|---|---|
| `index.html` | ekran wyboru wyspy (podział na pół) |
| `island.html` | sama wyspa, wybierana parametrem `?w=jurek` albo `?w=rysio` |
| `islands/jurek.json` | lista projektów Jurka — **same slugi** |
| `islands/rysio.json` | projekty Rysia — **pełne wpisy** |
| `assets/islands.js` | dzielnice, kategorie, teksty postaci i punktów „about" |
| `assets/props.glb` | wszystkie bryły z Blendera (źródło: `Projects/Jurek/blender/`) |
| `island-images/` | zrzuty ekranu dla wpisów, które nie są na półce Gzowo Labs |

## Dodanie projektu na wyspę Rysia

Dopisz obiekt do `entries` w `islands/rysio.json`. Nic więcej nie trzeba —
kiosk, tabliczka, miejsce na mapie i wpis w liczniku powstają same.

```json
{
  "slug": "nazwa-w-myslnikach",
  "name": "Nazwa Projektu",
  "category": "Game",
  "status": "live",
  "year": "2026",
  "url": "https://gdzies.gzowo.fun/",
  "repo": "https://github.com/rysiosukiennik/nazwa",
  "image": "/wyspy/island-images/nazwa.webp",
  "blurb": "Jedno zdanie po angielsku. Trafia na kartę kiosku.",
  "body": [
    "Akapit pierwszy. Co to jest i jak w to grać.",
    "Akapit drugi. Co było w tym trudne albo ciekawe."
  ]
}
```

### Zasady, których trzeba się trzymać

- **`category` decyduje o miejscu na wyspie.** Dozwolone: `Game`, `Web app`,
  `Experiment`, `AI model`, `Hardware`. Każda kategoria to osobna dzielnica,
  a rozstawienie kiosków w niej liczy się samo. Zła kategoria = projekt ląduje
  w złej dzielnicy, nic się nie wywala.
- **Teksty po angielsku**, tak jak cała strona.
- **Bez myślników em (—) i en (–).** Kod i tak je zamienia na przecinki, ale
  lepiej ich nie pisać.
- **`image` jest opcjonalny.** Bez niego kiosk dostaje tabliczkę „no shot yet”,
  a nie szarą dziurę. Obrazek: webp, około 1200×900, do `island-images/`.
- **`url` i `repo` są opcjonalne.** Brakujący adres po prostu chowa przycisk.
- `slug` musi być unikalny w obrębie pliku — na nim stoi licznik odkryć.

## Wyspa Jurka

`islands/jurek.json` trzyma **wyłącznie slugi**. Cała treść (nazwa, opis, obrazek,
adresy) pochodzi z `/data/projects.json`, czyli z półki Gzowo Labs. To jest celowe:
jedno źródło prawdy, zero przepisywania tego samego dwa razy. Żeby dołożyć projekt
na wyspę Jurka, najpierw musi być na półce, potem dopisujesz `{"slug": "..."}`.

Możesz nadpisać kategorię (czyli dzielnicę) na samej wyspie:
`{"slug": "gsp", "category": "Hardware"}`.

## Teksty postaci i punktów „about”

Siedzą w `assets/islands.js` w `ISLANDS.<klucz>.lines` (monolog postaci stojącej
na polanie) oraz w liście `landmarks` (punkty o autorze: warsztat, pianino, i tak dalej).
Każdy element `lines` to jeden ekran dialogu. Nie wymyślaj faktów o człowieku —
jeśli czegoś nie wiesz, nie dopisuj.

## Rzeczy, których lepiej nie ruszać bez powodu

- `assets/props.glb` jest eksportowany z Blendera. Nie edytuj go w kodzie —
  zmiana bryły idzie przez `Projects/Jurek/blender/props.blend`.
- Bryły są autorskie, nie z paczek Kenneya. Zachowaj proporcje miniaturek,
  jeśli coś dokładasz.
- Kiosk jest klonowany z węzła GLB w całości. Nie odtwarzaj jego transformacji
  ręcznie — dwa razy się na tym przejechaliśmy.
- Tekstury zrzutów wymagają obrotu o 180° (`orient()` w `world.js`), bo tak
  wychodzą z konwersji Y-up.
