/** The Chronicle: the world explained in plain words. Entries unlock as the chapters are reached. */
export type LoreEntry = { ch: number; title: string; text: string };

export const CHAPTER_NAMES = ['', 'The Waking of Velmour', 'The Witchwood', 'The Drowned Choir', 'The Frostspine', 'The Heart of Osseran'];
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export const LORE: LoreEntry[] = [
  {
    ch: 1,
    title: 'The Founders',
    text: 'Long ago, five giants walked the world. When they grew tired, they lay down and slept, and their bodies became the land: mountains, forests and lakes. People call them the Founders, and every kingdom is built on one.',
  },
  {
    ch: 1,
    title: 'Velmour and Osseran',
    text: 'The kingdom of Velmour is built on a sleeping Founder named Osseran. The great mountain above the capital is his head. If Osseran wakes and stands up, Velmour falls off his back.',
  },
  {
    ch: 1,
    title: 'The Church of the Still Bell',
    text: 'The Church exists for one job: keep the Founders asleep. Its bells stay silent, except to ring the Hymn of Sleeping, a lullaby that keeps the giants dreaming.',
  },
  {
    ch: 1,
    title: 'Ser Calder',
    text: 'You. A low-ranking knight of the Bell Guard who spent years on the road, coming home to Velmour. Not a hero, not a lord. Just the one who happened to be there.',
  },
  {
    ch: 1,
    title: 'The Knell',
    text: 'The waking peal: the one thing the bells must never ring. On the night Calder came home, the bells of Velmour rang it by themselves. That was no accident.',
  },
  {
    ch: 1,
    title: 'Nightmares',
    text: 'When a Founder stirs, its bad dreams climb out and take shape: marrowmites, bell-golems, drakes. Killing them helps, but only putting the Founder back to sleep will stop them coming.',
  },
  {
    ch: 2,
    title: 'Archdeacon Morvane',
    text: 'The head of the Church. He came to believe the Founders are gods who should wake and remake the world. He leads a secret order called the Waking Choir, and he rang the Knell over Velmour.',
  },
  {
    ch: 2,
    title: 'The Thornwives',
    text: 'Witches of the Witchwood who kept the old lullabies. The smoke of a dream-drake drove most of them mad. Their eldest, Mother Sallow, survived and told Calder what must be done.',
  },
  {
    ch: 2,
    title: 'The Cradle Bell',
    text: 'The Hymn of Sleeping only works when rung on one bell: the Cradle Bell. Long ago the Church broke it in half and hid the halves so no one could misuse it. Find both halves, rejoin them, and ring the Hymn at Osseran’s heart.',
  },
  {
    ch: 3,
    title: 'Saint Merrow’s Mere',
    text: 'A marsh around a sunken cathedral, where the first half of the bell was kept. Twenty years ago Choirmaster Oswin flooded it himself to hide the bell from Morvane, drowning his own monks.',
  },
  {
    ch: 3,
    title: 'Ser Ivarr',
    text: 'Calder’s sworn brother and captain of the Bell Guard. He carried the second half of the bell north into the Frostspine mountains, and has not come back.',
  },
  {
    ch: 4,
    title: 'The Hollow',
    text: 'Knights that Morvane has emptied out. He takes their fear and their memories and leaves armour that obeys him. A hollow knight still fights the way it was trained, but no one is home.',
  },
  {
    ch: 4,
    title: 'The Frostspine',
    text: 'The mountains north of Velmour, where the Bell Guard made its last stand. Their camp is frozen as they left it. Their fort became Morvane’s.',
  },
  {
    ch: 5,
    title: 'The Heart of Osseran',
    text: 'Deep inside the mountain is the Founder’s heart, beating faster as he wakes. Morvane went there to finish the waking. It is also the one place the rejoined Cradle Bell can sing him back to sleep.',
  },
];
