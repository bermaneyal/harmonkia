// טאבים מהאתר mad-in-israel.com (שירי מפוחית קלים להתחלה).
// סימון: מספר = נשיפה (blow), מספר עם מינוס (5-) = שאיפה (draw). מפוחית דיאטונית ב-C.
// כל שורה: טאב + הברות. parseTab (ב-lib/tabs.ts) ממיר את זה למבנה נתונים.

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
      { tab: '4 5- 6 4 5- 6- 6- 6- 6 6 6 6', lyrics: 'ה- או- טו ש- ל- נו ג- דול ו- י- רוק' },
      { tab: '6 6- 7 7 7 7- 7 6- 6 6- 6- 6- 6- 5- 6', lyrics: 'ה- או- טו ש- ל- נו נו- ס- ע ר- חו- ק' },
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
      { tab: '5 6- 6- 7 6- 6 5- 5', lyrics: 'ה- יום יום הו- ל- דת' },
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
      { tab: '8 8 8- 8 7- 8 8- 8 7- 7', lyrics: 'אז נ- רי- עה ו- נ- רון' },
    ],
  },
  {
    id: 'simi-yadech',
    title: 'שימי ידך',
    key: 'C',
    bpm: 90,
    source: 'https://www.mad-in-israel.com/2001/01/02/שימי-ידך/',
    lines: [
      { tab: '6 6 5- 5 6 6 5- 5', lyrics: 'שי- מי י- דך ב- י- די' },
      { tab: '5 5- 5- 5 4- 4- 5 5 4- 4', lyrics: 'א- ני ש- לך ו- את ש- לי' },
      { tab: '6 7- 6- 6- 6 5-', lyrics: 'הי, הי ג- לי- ה' },
      { tab: '4- 4- 6 5- 5 5- 6', lyrics: 'בת ה- רים י- פי- פי- ה' },
    ],
  },
];
