// Palette, district layout, landmark copy and the definition of both islands.

export const PAL = {
  water:      0x1e4a48,
  shore:      0x8a8352,
  path:       0xc7bfa2,
  clearing:   0x8fae6e,
  lab:        0x6f9f7a,
  arcade:     0x5b8f42,
  terminal:   0x74a274,
  workshop:   0x6e8f4e,
  yard:       0x86ae5e,
  grassA:     0x74a55b
};

export const CATEGORIES = ["Game", "Web app", "Experiment", "AI model", "Hardware"];

export const DISTRICTS = [
  { id: "clearing", name: "The Clearing", category: null,         color: PAL.clearing, rect: [-11, -11, 11, 11] },
  { id: "lab",      name: "The Lab",      category: "AI model",   color: PAL.lab,      rect: [-44, -34, -20, -14] },
  { id: "yard",     name: "The Yard",     category: "Hardware",   color: PAL.yard,     rect: [ 18, -34,  43, -13] },
  { id: "terminal", name: "The Terminal", category: "Web app",    color: PAL.terminal, rect: [ 22,  -7,  44,  11] },
  { id: "arcade",   name: "Arcade Meadow",category: "Game",       color: PAL.arcade,   rect: [-16,  16,  24,  38] },
  { id: "workshop", name: "The Workshop", category: "Experiment", color: PAL.workshop, rect: [-44,  10, -22,  27] }
];

export const CORRIDORS = [
  [-9, -6, -31, -6, 4], [-31, -6, -31, -13, 4],
  [9, -6, 30, -6, 4],   [30, -6, 30, -13, 4],
  [9, 1, 23, 1, 4],
  [4, 9, 4, 18, 4],
  [-9, 4, -32, 4, 4],   [-32, 4, -32, 11, 4],
  [-9, 0, -24, 0, 4]
];

const JUREK_LANDMARKS = [
  {
    id: "sign", label: "Gzowo", model: "LM_sign", pos: [6, 6],
    lines: [
      "Gzowo is the family plot by the Narew river.",
      "It is where the rockets actually leave the ground, and where almost everything here got its name.",
      "Gzowo Space Program, Gzowo Labs, Gzowo Bowling. The place has a monopoly on my naming."
    ]
  },
  {
    id: "pad", label: "The launch pad", model: "LM_pad", pos: [30, -24],
    lines: [
      "Model rocketry is the oldest thing on this island.",
      "OpenRocket for the simulation, OpenSCAD for the parts, an X1C to print them, a field in Gzowo to lose them in.",
      "GSP, the Gzowo Space Program, is the name I put on all of it.",
      "It is a passion, not the career plan. The career plan is on the other side of the island."
    ]
  },
  {
    id: "printer", label: "The printer", model: "LM_printer", pos: [-32, 18],
    lines: [
      "A Bambu Lab X1C. It runs more than it rests.",
      "Fins, nose cones, servo brackets, a robot dog's face.",
      "If a project needs a physical part, it starts as OpenSCAD code and ends here."
    ]
  },
  {
    id: "piano", label: "The piano", model: "LM_piano", pos: [-30, 2],
    lines: [
      "I play piano, and it is the one thing here with no screen in it.",
      "It leaks into the code anyway. Half the experiments on this island are instruments.",
      "Airwave is played with your hands in the air. MJJ Archives is a concert you can walk around inside."
    ]
  },
  {
    id: "ladder", label: "The G ladder", model: "LM_monolith", pos: [-31, -23],
    lines: [
      "This is the long game: a full ladder of language models trained from zero.",
      "G-Micro at 117M parameters exists and works. G-Mini is 178M. Then G-Core at 500M, then G-Mega past a billion.",
      "No local hardware can do it, so everything trains on Kaggle's free 30 hours a week.",
      "Software and AI is where I am actually heading."
    ]
  },
  {
    id: "desk", label: "How this is built", model: "LM_desk", pos: [-6, 7],
    lines: [
      "I do not type the code. I am a vibecoder. I design the thing, argue about the architecture, and Claude writes it.",
      "HTML, CSS and JavaScript for almost everything, with a little C++ when a rocket needs an ESP32.",
      "It works in bursts. Nothing for two weeks, then a whole game in a weekend."
    ]
  }
];

const RYSIO_LANDMARKS = [
  {
    id: "sign", label: "Gzowo", model: "LM_sign", pos: [6, 6],
    lines: [
      "Gzowo is the family plot by the Narew river.",
      "Same river, same field, different builder."
    ]
  },
  {
    id: "desk", label: "This island is filling up", model: "LM_desk", pos: [-6, 7],
    lines: [
      "Most of the ground here is still empty on purpose.",
      "Every project Rysio finishes gets its own plot, sorted by what kind of thing it is.",
      "Come back and there will be more of it."
    ]
  }
];

export const ISLANDS = {
  jurek: {
    key: "jurek",
    name: "Jurek",
    fullName: "Jerzy Sukiennik",
    motto: "I build things that fly. And a few that don't crash.",
    avatar: "JK",
    source: "labs",
    file: "islands/jurek.json",
    landmarks: JUREK_LANDMARKS,
    lines: [
      "Hey. I am Jurek, and this is my island.",
      "I am 14 and I build things. Rockets that fly, games that run in a browser, and language models trained from nothing.",
      "Every plot out there is a real project, and most of them you can open and play right now.",
      "The plots are sorted by what they are. Games to the south, AI models to the north west, hardware to the north east.",
      "I like minimalism. In design, in code, in cars. Fewer things, done properly.",
      "Find everything on this island and you have basically read my CV.",
      "Go on. Nothing here bites."
    ],
    links: [
      { label: "Gzowo Labs", href: "/" },
      { label: "GitHub", href: "https://github.com/JerzySukiennik" }
    ]
  },
  rysio: {
    key: "rysio",
    name: "Rysio",
    fullName: "Ryszard Sukiennik",
    motto: "I build things that stay on the ground. On purpose.",
    avatar: "PL",
    avatarColor: 0x2f6fa8,
    source: "own",
    file: "islands/rysio.json",
    landmarks: RYSIO_LANDMARKS,
    lines: [
      "Hi. I am Rysio, and this island is mine.",
      "It is younger than the one next door, so there is a lot of grass and not much on it yet.",
      "What is here is real. What is missing is just not built yet.",
      "Have a walk around."
    ],
    links: [
      { label: "Gzowo Labs", href: "/" }
    ]
  }
};

export const DEFAULT_ISLAND = "jurek";

export function islandFromLocation() {
  const q = new URLSearchParams(location.search).get("w");
  return ISLANDS[q] ? q : DEFAULT_ISLAND;
}
