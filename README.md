# ח.י. חיימוביץ - מערכת ניהול עסק

מערכת ניהול לקוחות, עבודות, תשלומים ותזכורות גביה לטכנאי תקשורת.

## תכונות

- 📋 ניהול לקוחות עם כרטסת עבודות מלאה
- 💰 רישום תשלומים עם קיזוז FIFO אוטומטי (ישן → חדש)
- 📅 יומן עם תאריכים עבריים
- 🔄 מנויים חודשיים קבועים
- 📞 תזכורות גביה אוטומטיות
- 🔗 קישורי צפיה עבור לקוחות (read-only)
- 💾 אחסון במסד נתונים (Supabase)

## התחלה

### דרישות מוקדמות
- Node.js 16+ 
- חשבון Supabase (חינמי)
- חשבון Vercel (חינמי)

### התקנה מקומית (לפני העלאה ל-Vercel)

1. שכפל את הפרויקט:
```bash
git clone https://github.com/a0527633350-afk/chaimovich-crm.git
cd chaimovich-crm
```

2. התקן את הדברים הדרושים:
```bash
npm install
```

3. צור קובץ `.env.local` (לא להעלות ל-GitHub):
```
VITE_SUPABASE_URL=your_url_from_supabase
VITE_SUPABASE_ANON_KEY=your_key_from_supabase
```

4. הריץ בפיתוח:
```bash
npm run dev
```

### העלאה ל-Vercel

1. חבר את ה-GitHub repository שלך ל-Vercel
2. הוסף משתנים סביבה ב-Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel יבנה וידלוק אוטומטית

## הגדרת Supabase

התוכן שלך צריך להיות קבוע ב-Supabase כדי שהמערכת תעבוד.
(תהליך זה יוסבר בהדרכה המלאה)

## רישיון

MIT
