// טאבים משני מקורות:
//   mad-in-israel.com  – סימון: מספר = נשיפה (blow), מינוס אחרי המספר (5-) = שאיפה (draw)
//   harmonica.com      – סימון: מינוס לפני המספר (-5) = שאיפה
// שני הסימונים נתמכים ב-parseToken (lib/tabs.ts). מפוחית דיאטונית ב-C.
// כל שורה: טאב + הברות (מופרדות ברווח, הברה לכל תו; "~" = תו מוחזק ללא הברה).

export interface SongSource {
  id: string;
  title: string;
  key: 'C';
  bpm: number;
  source?: string;
  lines: { tab: string; lyrics: string }[];
}

export const songs: SongSource[] = [
  {
    id: 'yonatan-hakatan',
    title: 'יונתן הקטן',
    key: 'C',
    bpm: 100,
    source: 'https://www.mad-in-israel.com/2000/01/01/יונתן-הקטן/',
    lines: [
      { tab: '6 5 5 5- 4- 4-', lyrics: 'יו- נ- תן ה- ק- טן' },
      { tab: '4 4- 5 5- 6 6 6', lyrics: 'רץ ב- בו- קר אל ה- גן' },
      { tab: '6 5 5 5- 4- 4-', lyrics: 'הוא טי- פס על ה- עץ' },
      { tab: '4 5 6 6 4', lyrics: 'אפ- רו- חים חי- פש' },
      { tab: '4- 4- 4- 4- 4- 5 5-', lyrics: 'אוי וא- בוי לו ל- שו- בב' },
      { tab: '5 5 5 5 5 5- 6', lyrics: 'חור ג- דול ב- מכ- נ- סיו' },
      { tab: '6 5 5 5- 4- 4-', lyrics: 'מן ה- עץ הת- גל- גל' },
      { tab: '4 5 6 6 4', lyrics: 'ו- עונ- שו קי- בל' },
    ],
  },
  {
    id: 'haoto-shelanu',
    title: 'האוטו שלנו',
    key: 'C',
    bpm: 110,
    source: 'https://www.mad-in-israel.com/2001/01/01/האוטו-שלנו/',
    lines: [
      { tab: '4 5- 6 4 5- 6- 6- 6- 6 6 6 6', lyrics: 'ה- או- טו ש- ל- נו ג- דול ו- י- רוק ~' },
      { tab: '6 6- 7 7 7 7- 7 6- 6 6- 6- 6- 6- 5- 6', lyrics: 'ה- או- טו ש- ל- נו נו- ס- ע ר- חו- ק ~ ~ ~' },
      { tab: '6- 7 7 7 8 7 7 6- 5- 6- 7-', lyrics: 'ב- בו- קר נו- ס- ע ב- ע- רב הוא שב' },
      { tab: '7- 4 5 6 7 6- 6 5- 5- 5- 5-', lyrics: 'מ- ביא הוא ל- תנו- בה בי- צים ו- ח- לב' },
    ],
  },
  {
    id: 'hayom-yom-huledet',
    title: 'היום יום הולדת',
    key: 'C',
    bpm: 100,
    source: 'https://www.mad-in-israel.com/2001/01/01/היום-יום-הולדת/',
    lines: [
      { tab: '3 5- 5- 5- 5- 5', lyrics: 'ה- יום יום הו- ל- דת' },
      { tab: '4- 6 6 6 6 5-', lyrics: 'ה- יום יום הו- ל- דת' },
      { tab: '5 6- 6- 7 6- 6 5- 5', lyrics: 'ה- יום יום הו- ל- דת ~ ~' },
      { tab: '5- 6 6-', lyrics: 'ל- י- נאי' },
    ],
  },
  {
    id: 'shnayim-sinim',
    title: 'שניים סינים',
    key: 'C',
    bpm: 110,
    source: 'https://www.mad-in-israel.com/2001/01/02/שניים-סינים-האחים-והאחיות/',
    lines: [
      { tab: '6- 6- 6- 6- 6 6- 7 7 7', lyrics: 'שנ- יים סי- נים עם כי- נור ג- דול' },
      { tab: '5 7 7 7 7 7', lyrics: 'יש- בו ב- צד הר- חוב' },
      { tab: '7 6- 7 7- 7- 7- 7- 7-', lyrics: 'ו- פט- פ- טו ב- קול ג- דול' },
      { tab: '8- 9 8- 8 7- 7 9 9 9 9 9', lyrics: 'בא שו- טר, ת- פס או- תם ו- זה ה- כל' },
    ],
  },
  {
    id: 'od-lo-achalnu',
    title: 'עוד לא אכלנו',
    key: 'C',
    bpm: 120,
    source: 'https://www.mad-in-israel.com/2001/01/02/עוד-לא-אכלנו/',
    lines: [
      { tab: '6- 8- 8 8- 7-', lyrics: 'עוד לא א- כל- נו' },
      { tab: '6- 8- 8 8- 7-', lyrics: 'עוד לא ש- תי- נו' },
      { tab: '8- 8- 9 8- 8 7- 8', lyrics: 'י- בש ל- נו ב- ג- רון' },
      { tab: '7 8 8 8 8 7', lyrics: 'ה- בו ל- נו מש- קה' },
      { tab: '7 8 8 8 8 7', lyrics: 'מיט א- בי- סל קש- קע' },
      { tab: '8 8 8- 8 7- 8 8- 8 7- 7', lyrics: 'אז נ- רי- עה ו- נ- רון ~ ~ ~' },
    ],
  },
  {
    id: 'simi-yadech',
    title: 'שימי ידך',
    key: 'C',
    bpm: 90,
    source: 'https://www.mad-in-israel.com/2001/01/02/שימי-ידך/',
    lines: [
      { tab: '6 6 5- 5 6 6 5- 5', lyrics: 'שי- מי י- דך ב- י- די ~' },
      { tab: '5 5- 5- 5 4- 4- 5 5 4- 4', lyrics: 'א- ני ש- לך ו- את ש- לי ~ ~' },
      { tab: '6 7- 6- 6- 6 5-', lyrics: 'הי, הי ג- לי- ה ~' },
      { tab: '4- 4- 6 5- 5 5- 6', lyrics: 'בת ה- רים י- פי- פי- ה' },
    ],
  },

  // ---------- harmonica.com (Traditional) ----------
  {
    id: 'twinkle-twinkle',
    title: 'Twinkle Twinkle Little Star',
    key: 'C',
    bpm: 100,
    source: 'https://www.harmonica.com/tabs/free-harmonica-tabs-for-twinkle-twinkle-little-star-by-unknown/',
    lines: [
      { tab: '4 4 6 6 -6 -6 6', lyrics: 'Twin- kle twin- kle lit- tle star' },
      { tab: '-5 -5 5 5 -4 -4 4', lyrics: 'How I won- der what you are' },
      { tab: '6 6 -5 -5 5 5 -4', lyrics: 'Up a- bove the world so high' },
      { tab: '6 6 -5 -5 5 5 -4', lyrics: 'Like a dia- mond in the sky' },
      { tab: '4 4 6 6 -6 -6 6', lyrics: 'Twin- kle twin- kle lit- tle star' },
      { tab: '-5 -5 5 5 -4 -4 4', lyrics: 'How I won- der what you are' },
    ],
  },
  {
    id: 'happy-birthday-en',
    title: 'Happy Birthday',
    key: 'C',
    bpm: 90,
    source: 'https://www.harmonica.com/tabs/happy-birthday-by-public-domain/',
    lines: [
      { tab: '6 6 -6 6 7 -7', lyrics: 'Hap- py birth- day to you' },
      { tab: '6 6 -6 6 -8 7', lyrics: 'Hap- py birth- day to you' },
      { tab: '6 6 9 8 7 -7 -6', lyrics: 'Hap- py birth- day dear some- one' },
      { tab: '-9 -9 8 7 -8 7', lyrics: 'Hap- py birth- day to you' },
    ],
  },
  {
    id: 'oh-susanna',
    title: 'Oh Susanna',
    key: 'C',
    bpm: 120,
    source: 'https://www.harmonica.com/tabs/oh-susana-by-folk-song/',
    lines: [
      { tab: '4-4 5 6 6-6 6 5', lyrics: 'Oh I came from A- la- ba- ma' },
      { tab: '4 -4 5 5 -4 4 -4', lyrics: 'with my ban- jo on my knee' },
      { tab: '4-4 5 6 6 -6 6 5', lyrics: "I'm go- in' to Lou- si- an- a" },
      { tab: '4-4 5 5 -4 -4 4', lyrics: 'oh my true love for to see' },
      { tab: '-5 -5 -6 -6 -6 6 6 5 4 -4', lyrics: "Oh Su- san- na, oh don't you cry for me" },
      { tab: '4-4 5 6 6-6 6 5', lyrics: 'For I come from A- la- ba- ma' },
      { tab: '4 -4 5 5 -4 -4 4', lyrics: 'with my ban- jo on my knee' },
    ],
  },
  {
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    key: 'C',
    bpm: 120,
    source: 'https://www.harmonica.com/tabs/when-the-saints-go-marching-in-by-luther-g-presley/',
    lines: [
      { tab: '4 5 -5 6 4 5 -5 6', lyrics: 'Oh when the Saints, oh when the Saints' },
      { tab: '4 5 -5 6 5 4 5 -4', lyrics: 'Oh when the Saints go march- ing in' },
      { tab: '5 -4 4 4 5 6 6 6 -5', lyrics: 'Lord, I want to be in that num- ber' },
      { tab: '5 -5 6 5 4 -4 4', lyrics: 'When the Saints go march- ing in' },
    ],
  },
  {
    id: 'on-top-of-old-smokey',
    title: 'On Top of Old Smokey',
    key: 'C',
    bpm: 100,
    source: 'https://www.harmonica.com/tabs/top-old-smokey-harmonica-tab/',
    lines: [
      { tab: '4 4 5 6 7 -6', lyrics: 'On top of old Smo- key' },
      { tab: '-6 -5 6 -6 6', lyrics: 'All co- vered with snow' },
      { tab: '4 4 5 6 6 -4', lyrics: 'I lost my true lo- ver' },
      { tab: '5 -5 5 -4 4', lyrics: 'From court- ing too slow' },
    ],
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    key: 'C',
    bpm: 90,
    source: 'https://www.harmonica.com/tabs/auld-lang-syne-by-unknown/',
    lines: [
      { tab: '6 7 7 7 8 -8 7 -8', lyrics: 'Should auld ac- quain- tance be for- got' },
      { tab: '8 7 7 8 9 -10', lyrics: 'And ne- ver brought to mind?' },
      { tab: '-10 9 8 8 7 -8 7 -8', lyrics: 'Should auld ac- quain- tance be for- got' },
      { tab: '8 7 -6 -6 6 7', lyrics: 'And days of auld lang syne?' },
      { tab: '-10 9 8 8 7 -8 7 -8', lyrics: 'For auld lang syne ~ my dear ~' },
      { tab: '-10 9 8 8 9 -10', lyrics: 'For auld lang syne ~ ~' },
      { tab: '-10 9 8 8 7 -8 7 -8', lyrics: "We'll take a cup o' kind- ness yet" },
      { tab: '8-8 7 -6 -6 6 7', lyrics: 'For auld lang syne ~ ~ ~' },
    ],
  },
  {
    // The harmonica intro riff, single-note version (Level 3 in the lesson, without bends).
    // Instrumental – no lyrics, so every note is marked "~".
    id: 'piano-man-intro',
    title: 'Piano Man – Intro (Billy Joel)',
    key: 'C',
    bpm: 120,
    source: 'https://www.harmonica.com/how-to-play-piano-man/',
    lines: [
      { tab: '6 -6 6 -5 5 -5 5', lyrics: '~ ~ ~ ~ ~ ~ ~' },
      { tab: '4 -4 5 -4 5 -5', lyrics: '~ ~ ~ ~ ~ ~' },
      { tab: '6 -6 6 -5 5 -5 5', lyrics: '~ ~ ~ ~ ~ ~ ~' },
      { tab: '4 -5 5 -4 4', lyrics: '~ ~ ~ ~ ~' },
    ],
  },
];
