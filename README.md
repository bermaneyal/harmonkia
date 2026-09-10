# Harmonkia – אפליקציה ללימוד ותרגול מפוחית

שלד ראשוני (proof of concept): בחירת שיר, הצגת טאבים, זיהוי הצליל מהמיקרופון וסימון ויזואלי של הצלחה.

## הרצה

```bash
npm install
npm run dev
```

ואז לפתוח את הכתובת שמודפסת (בד"כ http://localhost:5173). הדפדפן יבקש הרשאה למיקרופון.
כדי לבדוק מהטלפון ברשת הביתית צריך HTTPS (המיקרופון עובד רק ב-secure context) – אפשר להשתמש ב-`@vitejs/plugin-basic-ssl` או ב-tunnel כמו ngrok.

## טכנולוגיות

- **Vite + React + TypeScript** – ממשק.
- **Supabase** (אופציונלי) – אימות Google וסנכרון היסטוריה בין מכשירים.
- **Web Audio API** (`getUserMedia`, `AnalyserNode`) – קריאת האות מהמיקרופון.
- **pitchy** – זיהוי גובה צליל (McLeod Pitch Method). מתאים מאוד לכלי מונופוני כמו מפוחית.
- ללא שרת משלנו – הכול רץ בדפדפן, והדפדפן מדבר ישירות עם Supabase.

## מבנה

| קובץ | תפקיד |
|---|---|
| `src/data/songs.ts` | הטאבים של השירים, בפורמט של האתר (`5` = נשיפה, `5-` = שאיפה) + הברות |
| `src/lib/tabs.ts` | פרסור הטאבים למבנה `Song` / `TabNote` |
| `src/lib/harmonica.ts` | מיפוי חורים ↔ תווים (MIDI) ↔ תדרים למפוחית דיאטונית ב-C |
| `src/lib/usePitch.ts` | React hook שמקשיב למיקרופון ומחזיר את החור/הכיוון שזוהו |
| `src/lib/tone.ts` | השמעת תו ייחוס ומטרונום |
| `src/components/TabView.tsx` | תצוגת הטאבים (נוכחי / הצלחה / החמצה) |
| `src/components/Tuner.tsx` | "מה צריך לנגן" מול "מה המיקרופון שומע" |
| `src/lib/practice.ts` | טיפוסי ניסיון/שגיאה, ניתוח חורים חלשים, שמירה ב-localStorage, קבועי התרגול המדורג |
| `src/components/Summary.tsx` | סיכום הניסיון, גרף התקדמות, חורים חלשים |
| `src/lib/supabase.ts` | לקוח Supabase (null כשאין משתני סביבה) |
| `src/lib/useAuth.ts` | משתמש נוכחי, כניסה עם Google, יציאה |
| `src/lib/sync.ts` | סנכרון offline-first, ייצוא/ייבוא JSON, מחיקת נתונים |
| `src/components/AccountBar.tsx` | כפתור כניסה, מצב סנכרון, תפריט הגדרות |
| `supabase/schema.sql` | טבלת `attempts` והרשאות RLS – להרצה חד-פעמית ב-Supabase |
| `src/App.tsx` | לוגיקת התרגול: מצבים, קטע, לופ, מהירות, סיום סיבוב |

## מצבי תרגול

- **חופשי** – הסמן מתקדם לתו הבא רק כשמנגנים את התו הנכון (ומחזיקים אותו ~100ms). בין תווים זהים צריך להפסיק לנגן רגע. תו שגוי שמוחזק נרשם כשגיאה (אבל אפשר לתקן ולהמשיך).
- **קצב** – מטרונום מתקדם תו כל פעימה; תו שנוגן נכון בזמנו מסומן ירוק, אחרת אדום.

## תרגול מדורג

- **קטע** – בוחרים שורות לתרגול (מהתפריטים, או בלחיצה על מספר שורה; Shift+לחיצה מרחיבה). שורות מחוץ לקטע מוצגות מעומעמות.
- **לופ** – הקטע חוזר על עצמו אוטומטית (הפסקה של 1.5 שניות בין סיבובים).
- **מהירות** (מצב קצב) – אחוז מה-BPM של השיר, מתחיל ב-60%. אחרי 3 סיבובים נקיים ברצף המהירות עולה ב-10% אוטומטית (אפשר לכבות). העיגולים בשורת המצב מציגים את הרצף.
- הקבועים (`SPEED_START`, `STREAK_TO_LEVEL_UP` וכו') ב-`src/lib/practice.ts`.

## סיכום והיסטוריה

בסוף כל סיבוב מוצג סיכום: דיוק, מספר שגיאות, זמן, ורשימת "איפה זה נפל" – החורים שהוחמצו ומה נוגן במקומם (למשל ↓4 במקום ↑4). כל ניסיון נשמר ב-`localStorage` (לכל שיר בנפרד), ומוצגים גרף התקדמות של הניסיונות האחרונים והחורים החלשים לאורך זמן. הלוגיקה ב-`src/lib/practice.ts`, התצוגה ב-`src/components/Summary.tsx`.

## סנכרון בין מכשירים (Supabase + Google)

האפליקציה עובדת בלי חשבון: ההיסטוריה נשמרת מקומית בדפדפן. מי שמתחבר עם Google מקבל סנכרון של ההיסטוריה בין כל המכשירים שלו.

**איך זה עובד** (`src/lib/sync.ts`): ה-`localStorage` הוא מקור האמת במכשיר וגם "תור יציאה". כל ניסיון הוא אירוע בלתי-משתנה עם מזהה שנוצר בלקוח, ולכן סנכרון הוא איחוד קבוצות: דוחפים כל ניסיון עם `synced !== true` (כפילויות נדחות בשקט), ומושכים כל מה שחדש בשרת. אין קונפליקטים. הסנכרון רץ בכניסה, אחרי כל ניסיון, כשהרשת חוזרת, ובלחיצה על "סנכרן עכשיו". ביציאה מהחשבון ההיסטוריה המקומית נמחקת (למקרה של מכשיר משותף).

בתפריט ⋯ יש גם ייצוא/ייבוא של ההיסטוריה כקובץ JSON (גיבוי, או העברה ידנית בלי חשבון), ומחיקת כל הנתונים מהענן.

בלי משתני הסביבה (ראה למטה) כפתור ההתחברות מוסתר וקוד Supabase לא נכלל כלל ב-bundle.

### הגדרה חד-פעמית

**1. Supabase**

1. היכנס ל-https://supabase.com, צור פרויקט (השם והסיסמה למסד לא משנים; בחר region קרוב, למשל Frankfurt).
2. SQL Editor → New query → הדבק את התוכן של `supabase/schema.sql` → Run. זה יוצר את טבלת `attempts` עם הרשאות ברמת שורה (כל משתמש רואה רק את שלו).
3. Project Settings → API: העתק את **Project URL** ואת **anon public key**.

**2. Google OAuth**

1. ב-Supabase: Authentication → Providers → Google → Enable. העתק את ה-**Callback URL** שמוצג שם (בצורה `https://<project>.supabase.co/auth/v1/callback`).
2. היכנס ל-https://console.cloud.google.com, צור פרויקט (או השתמש בקיים).
3. APIs & Services → OAuth consent screen: בחר External, מלא שם אפליקציה ומייל תמיכה, שמור. (בשלב Testing רק משתמשים שתוסיף ידנית יוכלו להתחבר; לחץ **Publish app** כדי לפתוח לכולם.)
4. APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application:
   - Authorized JavaScript origins: `http://localhost:5173` וכתובת ה-Vercel שלך (`https://harmonkia.vercel.app`).
   - Authorized redirect URIs: ה-Callback URL מ-Supabase (שלב 1).
5. העתק את Client ID ו-Client Secret והדבק אותם ב-Supabase בהגדרות ספק Google → Save.
6. ב-Supabase: Authentication → URL Configuration → הוסף ל-**Redirect URLs** את `http://localhost:5173/**` ואת `https://harmonkia.vercel.app/**` (וכתובות preview של Vercel אם תרצה, למשל `https://harmonkia-*.vercel.app/**`). ב-**Site URL** שים את כתובת ה-Vercel.

**3. משתני סביבה**

- מקומית: העתק את `.env.example` ל-`.env.local` ומלא את שני הערכים. הקובץ ב-`.gitignore` ולא יעלה ל-GitHub.
- ב-Vercel: Project → Settings → Environment Variables → הוסף `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY`, ואז Deployments → Redeploy (משתני `VITE_*` נאפים לתוך ה-bundle בזמן build, אז חובה לבנות מחדש).

מפתח ה-anon מיועד להיות ציבורי; ההגנה על הנתונים היא ה-RLS מ-`schema.sql`, לא סודיות המפתח.

### בדיקה

1. `npm run dev`, לחץ "התחבר עם Google", התחבר. הנקודה ליד השם צריכה להיות ירוקה (מסונכרן).
2. תרגל סיבוב אחד. ב-Supabase → Table Editor → attempts אמורה להופיע שורה.
3. פתח את האתר בטלפון, התחבר עם אותו חשבון: ההיסטוריה מופיעה, וההודעה "נמשכו N ניסיונות ממכשירים אחרים" קופצת.

## הוספת שיר

מוסיפים אובייקט ל-`songs` ב-`src/data/songs.ts`:

```ts
{
  id: 'my-song',
  title: 'שם השיר',
  key: 'C',
  bpm: 100,
  lines: [
    { tab: '4 5- 6', lyrics: 'הב- רה הב- רה' },
  ],
}
```

## רעיונות להמשך

- משכי תווים (חצי/רבע) בטאבים במקום פעימה אחת לכל תו.
- תמיכה במפוחיות במפתחות אחרים (transpose של הטבלה ב-`harmonica.ts`).
- ייבוא MIDI → טאבים אוטומטי.
- PWA / עטיפה ב-Capacitor לאפליקציה במובייל.
- העברת זיהוי הצליל ל-`AudioWorklet` לזמן תגובה קצר יותר.
