import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home, Users, Briefcase, Calendar as CalendarIcon, Bell, ListTodo,
  Plus, X, Check, Phone, Mail, MapPin, FileText, ChevronLeft,
  ChevronRight, Search, Link2, CreditCard, Wallet, AlertCircle,
  TrendingUp, ArrowDownRight, Repeat, Trash2, Edit2,
  Copy, ExternalLink, CheckCircle2, Circle
} from 'lucide-react';

/* ============================================================
   HEBREW DATE CONVERSION (self-contained, no external deps)
   ============================================================ */
function hebrewLeapYear(y) {
  return ((7 * y + 1) % 19) < 7;
}
function hebrewYearElapsedDays(y) {
  const monthsElapsed = Math.floor((235 * y - 234) / 19);
  const partsElapsed = 12084 + 13753 * monthsElapsed;
  let day = monthsElapsed * 29 + Math.floor(partsElapsed / 25920);
  if ((3 * (day + 1)) % 7 < 3) day += 1;
  return day;
}
function hebrewYearDays(y) {
  return hebrewYearElapsedDays(y + 1) - hebrewYearElapsedDays(y);
}

// Days from Hebrew epoch to Gregorian epoch (RD 1 = Jan 1, year 1 Gregorian, proleptic)
const HEBREW_EPOCH = -1373427; // RD of 1 Tishrei AM 1, using standard formulas (Calendrical Calculations)

function gregorianToRD(year, month, day) {
  // Rata Die for Gregorian calendar
  const y = year - 1;
  let rd = 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  const monthDays = [0,31,59,90,120,151,181,212,243,273,304,334];
  rd += monthDays[month - 1];
  if (month > 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) rd += 1;
  rd += day;
  return rd;
}
function hebrewMonthDaysTishreiOrder(y, m) {
  // m=1 Tishrei,2 Cheshvan,3 Kislev,4 Tevet,5 Shevat,6 Adar(I),7 Adar II(only leap),8 Nisan,9 Iyar,10 Sivan,11 Tammuz,12 Av,13 Elul
  const leap = hebrewLeapYear(y);
  if (m === 2) { // Cheshvan
    const yd = hebrewYearDays(y);
    return [353, 383].includes(yd) ? 29 : 30;
  }
  if (m === 3) { // Kislev
    const yd = hebrewYearDays(y);
    return [352, 382].includes(yd) ? 29 : 30;
  }
  if (m === 6) return leap ? 30 : 29; // Adar / Adar I
  if (m === 7) return leap ? 29 : 0; // Adar II only if leap
  if ([1,8,10,12].includes(m)) return 30; // Tishrei, Nisan, Sivan, Av
  if ([4,5,9,11,13].includes(m)) return 29; // Tevet, Shevat, Iyar, Tammuz, Elul
  return 30;
}
function rdToHebrew(rd) {
  let year = Math.floor((rd - HEBREW_EPOCH) / 366);
  while (hebrewYearElapsedDays(year + 1) + HEBREW_EPOCH <= rd) year++;
  let month = 1;
  let rdStart = HEBREW_EPOCH + hebrewYearElapsedDays(year);
  while (true) {
    const md = hebrewMonthDaysTishreiOrder(year, month);
    if (md === 0) { month++; continue; }
    if (rdStart + md > rd) break;
    rdStart += md;
    month++;
  }
  const day = rd - rdStart + 1;
  return { year, month, day };
}
// Convert Tishrei-order month number to display name (Tishrei-first array maps directly)
const HEBREW_MONTHS_TISHREI_ORDER = ['תשרי','חשוון','כסלו','טבת','שבט','אדר א׳','אדר ב׳','ניסן','אייר','סיוון','תמוז','אב','אלול'];
const HEBREW_MONTHS_TISHREI_ORDER_NONLEAP = ['תשרי','חשוון','כסלו','טבת','שבט','אדר','','ניסן','אייר','סיוון','תמוז','אב','אלול'];

const HEBREW_NUM_LETTERS = [
  '', 'א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ',
  'כא','כב','כג','כד','כה','כו','כז','כח','כט','ל'
];
function hebrewDayLetters(day) {
  if (day <= 30) return HEBREW_NUM_LETTERS[day];
  return String(day);
}
function hebrewYearLetters(year) {
  // year like 5786 -> ה'תשפ"ו  (we'll show the last 3 digits part)
  const thousands = Math.floor(year / 1000);
  let rem = year % 1000;
  const hundredsExtra = { 5: 'תק', 6: 'תר', 7: 'תש', 8: 'תת', 9: 'תתק' };
  let str = '';
  let h = Math.floor(rem / 100);
  rem = rem % 100;
  if (h > 0) {
    str += hundredsExtra[h] || '';
  }
  if (rem === 15) str += 'טו';
  else if (rem === 16) str += 'טז';
  else {
    const tens = Math.floor(rem / 10);
    const ones = rem % 10;
    const tensLetters = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
    const onesLetters = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    str += tensLetters[tens] + onesLetters[ones];
  }
  // insert gershayim before last letter
  if (str.length > 1) {
    str = str.slice(0, -1) + '"' + str.slice(-1);
  }
  return thousands + "'" + str;
}

function gregorianToHebrewStr(dateObj) {
  const rd = gregorianToRD(dateObj.getFullYear(), dateObj.getMonth() + 1, dateObj.getDate());
  const heb = rdToHebrew(rd);
  const leap = hebrewLeapYear(heb.year);
  const names = leap ? HEBREW_MONTHS_TISHREI_ORDER : HEBREW_MONTHS_TISHREI_ORDER_NONLEAP;
  const monthName = names[heb.month - 1];
  return `${hebrewDayLetters(heb.day)} ${monthName} ${hebrewYearLetters(heb.year)}`;
}

/* ============================================================
   GENERAL UTILS
   ============================================================ */
function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function makeViewToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
function fmtCurrency(n) {
  const num = Number(n) || 0;
  return '₪' + num.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'מזומן' },
  { value: 'check', label: "צ'ק" },
  { value: 'transfer', label: 'העברה בנקאית' },
];

const BILLING_FREQUENCY_OPTIONS = [
  { value: 0, label: 'ללא תזכורת קבועה' },
  { value: 7, label: 'שבועי' },
  { value: 14, label: 'דו-שבועי' },
  { value: 30, label: 'חודשי' },
  { value: 60, label: 'דו-חודשי' },
  { value: 90, label: 'רבעוני' },
];

/* ============================================================
   STORAGE LAYER
   ============================================================ */
const STORAGE_KEY = 'crm-data-v1';

const EMPTY_DATA = {
  clients: [],
  jobs: [],
  payments: [],
  calendarEvents: [],
  followUps: [],
  notifications: [],
  meta: { businessName: 'ח.י. חיימוביץ פתרונות תקשורת' },
};

function useAppData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setData({ ...EMPTY_DATA, ...parsed });
        } else {
          setData(EMPTY_DATA);
        }
      } catch (e) {
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (newData) => {
    setData(newData);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      setError('שגיאה בשמירת הנתונים');
    }
  }, []);

  return { data, setData: save, loading, error };
}

/* ============================================================
   BUSINESS LOGIC
   ============================================================ */

// Returns jobs for a client sorted oldest -> newest
function clientJobsSorted(jobs, clientId) {
  return jobs
    .filter(j => j.clientId === clientId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0)));
}

// Compute, for a given client, the total paid-allocations per job, current balance, and credit
function computeClientLedger(data, clientId) {
  const jobs = clientJobsSorted(data.jobs, clientId);
  const payments = data.payments.filter(p => p.clientId === clientId);

  // total allocated to each job
  const allocatedByJob = {};
  let totalCreditUsedOrAdded = 0;
  let totalUnallocatedFromPayments = 0;

  for (const p of payments) {
    let remaining = p.amount;
    const allocs = p.allocations || [];
    for (const a of allocs) {
      allocatedByJob[a.jobId] = (allocatedByJob[a.jobId] || 0) + a.amount;
      remaining -= a.amount;
    }
    // leftover from this payment goes to credit
    totalUnallocatedFromPayments += remaining;
  }

  const jobsWithStatus = jobs.map(j => {
    const allocated = allocatedByJob[j.id] || 0;
    const remaining = Math.max(0, (j.price || 0) - allocated);
    let status = 'unpaid';
    if (allocated >= (j.price || 0) && (j.price || 0) > 0) status = 'paid';
    else if (allocated > 0) status = 'partial';
    return { ...j, allocated, remaining, status };
  });

  const totalOwed = jobsWithStatus.reduce((sum, j) => sum + j.remaining, 0);
  // credit balance = unallocated payment money - amount owed that's still open (already netted via remaining)
  const creditBalance = Math.max(0, totalUnallocatedFromPayments);
  const netBalance = totalOwed - creditBalance; // positive = client owes us, negative = we owe client (credit)

  return { jobsWithStatus, totalOwed, creditBalance, netBalance, payments };
}

// Allocate a payment amount across a client's unpaid jobs, oldest first (FIFO)
function allocatePayment(data, clientId, amount) {
  const { jobsWithStatus } = computeClientLedger(data, clientId);
  let remaining = amount;
  const allocations = [];
  for (const job of jobsWithStatus) {
    if (remaining <= 0) break;
    if (job.remaining <= 0) continue;
    const alloc = Math.min(job.remaining, remaining);
    if (alloc > 0) {
      allocations.push({ jobId: job.id, amount: alloc });
      remaining -= alloc;
    }
  }
  return { allocations, leftover: remaining };
}

// Generate monthly subscription jobs for all clients up to today
function generateSubscriptionJobs(data) {
  const newJobs = [];
  const today = todayStr();
  for (const client of data.clients) {
    const sub = client.subscription;
    if (!sub || !sub.enabled) continue;
    const dayOfMonth = sub.dayOfMonth || 1;
    const startDate = sub.startDate || today;
    const endDate = sub.endDate || null;

    // find the latest generated subscription job for this client
    const existingSubJobs = data.jobs.filter(j => j.clientId === client.id && j.subscriptionGenerated);
    const lastDate = existingSubJobs.length
      ? existingSubJobs.map(j => j.date).sort().slice(-1)[0]
      : null;

    // start from the first occurrence on/after startDate
    let cursor = new Date(startDate);
    cursor.setDate(dayOfMonth);
    if (cursor < new Date(startDate)) cursor.setMonth(cursor.getMonth() + 1);

    if (lastDate) {
      cursor = new Date(lastDate);
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(dayOfMonth);
    }

    let guard = 0;
    while (cursor.toISOString().slice(0, 10) <= today && guard < 36) {
      guard++;
      if (endDate && cursor.toISOString().slice(0, 10) > endDate) break;
      const dateStr = cursor.toISOString().slice(0, 10);
      const monthLabel = cursor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      newJobs.push({
        id: uid('job'),
        clientId: client.id,
        date: dateStr,
        description: `תחזוקה חודשית - ${monthLabel}`,
        price: sub.amount,
        paymentMethod: null,
        receiptRef: '',
        notes: '',
        subscriptionGenerated: true,
        createdAt: Date.now() + newJobs.length,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(dayOfMonth);
    }
  }
  return newJobs;
}

// Compute notifications: billing reminders 14 days before due date, based on last job/payment + frequency
function computeNotifications(data) {
  const notifications = [];
  const today = todayStr();
  const REMINDER_DAYS = 14;

  for (const client of data.clients) {
    const freq = client.billingFrequencyDays;
    if (!freq || freq <= 0) continue;

    const ledger = computeClientLedger(data, client.id);
    if (ledger.jobsWithStatus.length === 0) continue;

    // anchor date: most recent job date for this client
    const lastJobDate = ledger.jobsWithStatus.map(j => j.date).sort().slice(-1)[0];
    const dueDate = addDays(lastJobDate, freq);
    const reminderDate = addDays(dueDate, -REMINDER_DAYS);

    if (today >= reminderDate && ledger.netBalance > 0) {
      notifications.push({
        id: `notif_billing_${client.id}_${dueDate}`,
        type: 'billing',
        clientId: client.id,
        clientName: client.name,
        dueDate,
        amount: ledger.netBalance,
        message: `תזכורת גביה ל${client.name} - מועד גביה ${fmtDate(dueDate)}, סכום לתשלום: ${fmtCurrency(ledger.netBalance)}`,
      });
    }
  }

  // calendar event reminders for today/tomorrow
  for (const ev of data.calendarEvents) {
    if (ev.completed) continue;
    if (ev.date === today) {
      notifications.push({
        id: `notif_cal_${ev.id}`,
        type: 'calendar',
        eventId: ev.id,
        message: `תזכורת: היום יש לך פגישה - ${ev.title}${ev.location ? ' ב' + ev.location : ''}`,
      });
    }
  }

  return notifications;
}

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const COLORS = {
  ink: '#1B2A3A',       // deep navy - sidebar, headers
  inkLight: '#2A3F54',
  paper: '#F7F4EE',     // warm paper background
  copper: '#C9763A',    // primary accent
  copperLight: '#E0A876',
  copperDark: '#A85F2A',
  slate: '#5C7080',
  slateLight: '#8FA3B0',
  success: '#5B8C5A',
  successBg: '#E7F0E6',
  alert: '#C75D4A',
  alertBg: '#F8E8E4',
  warn: '#D4A03C',
  warnBg: '#FAF1DD',
  border: '#E2DDD2',
  cardBg: '#FFFFFF',
  textMuted: '#7A8896',
};

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  .app-root {
    font-family: 'Heebo', sans-serif;
    direction: rtl;
    background: ${COLORS.paper};
    color: ${COLORS.ink};
    min-height: 100vh;
    width: 100%;
  }
  .app-root h1, .app-root h2, .app-root h3, .app-root .display {
    font-family: 'Frank Ruhl Libre', serif;
  }
  .app-root *::-webkit-scrollbar { width: 8px; height: 8px; }
  .app-root *::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }

  .signal-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, ${COLORS.border} 15%, ${COLORS.border} 85%, transparent);
    border: none;
    margin: 0;
  }

  .btn {
    font-family: 'Heebo', sans-serif;
    border: none;
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }
  .btn:focus-visible { outline: 2px solid ${COLORS.copper}; outline-offset: 2px; }
  .btn-primary { background: ${COLORS.copper}; color: #fff; }
  .btn-primary:hover { background: ${COLORS.copperDark}; }
  .btn-secondary { background: #fff; color: ${COLORS.ink}; border: 1px solid ${COLORS.border}; }
  .btn-secondary:hover { background: ${COLORS.paper}; }
  .btn-ghost { background: transparent; color: ${COLORS.slate}; }
  .btn-ghost:hover { background: rgba(0,0,0,0.04); }
  .btn-danger { background: ${COLORS.alertBg}; color: ${COLORS.alert}; }
  .btn-danger:hover { background: ${COLORS.alert}; color: #fff; }
  .btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 8px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .card {
    background: ${COLORS.cardBg};
    border: 1px solid ${COLORS.border};
    border-radius: 14px;
    padding: 20px;
  }

  .input, .select, .textarea {
    font-family: 'Heebo', sans-serif;
    width: 100%;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 14px;
    background: #fff;
    color: ${COLORS.ink};
  }
  .input:focus, .select:focus, .textarea:focus {
    outline: 2px solid ${COLORS.copper};
    outline-offset: 1px;
    border-color: ${COLORS.copper};
  }
  .label {
    font-size: 13px;
    font-weight: 600;
    color: ${COLORS.slate};
    margin-bottom: 5px;
    display: block;
  }
  .field { margin-bottom: 14px; }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
  }
  .badge-success { background: ${COLORS.successBg}; color: ${COLORS.success}; }
  .badge-alert { background: ${COLORS.alertBg}; color: ${COLORS.alert}; }
  .badge-warn { background: ${COLORS.warnBg}; color: ${COLORS.warn}; }
  .badge-neutral { background: ${COLORS.paper}; color: ${COLORS.slate}; }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(27,42,58,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px; backdrop-filter: blur(2px);
  }
  .modal-box {
    background: #fff; border-radius: 16px; padding: 24px;
    max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(27,42,58,0.25);
  }

  .nav-link {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 10px;
    color: rgba(247,244,238,0.7); text-decoration: none;
    font-size: 14px; font-weight: 500; cursor: pointer;
    transition: all 0.15s ease; position: relative;
  }
  .nav-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .nav-link.active { background: rgba(201,118,58,0.18); color: #fff; }
  .nav-link.active::before {
    content: ''; position: absolute; right: 0; top: 8px; bottom: 8px; width: 3px;
    background: ${COLORS.copper}; border-radius: 3px 0 0 3px;
  }
  .nav-badge {
    background: ${COLORS.alert}; color: #fff; border-radius: 100px;
    font-size: 11px; font-weight: 700; padding: 1px 7px; margin-right: auto;
  }

  @media (max-width: 860px) {
    .desktop-only { display: none !important; }
  }
  @media (min-width: 861px) {
    .mobile-only { display: none !important; }
  }
`;

/* ============================================================
   SHARED UI COMPONENTS
   ============================================================ */
function Modal({ title, onClose, children, width }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={width ? { maxWidth: width } : {}} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, margin: 0, fontWeight: 700 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="סגור">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  if (status === 'paid') return <span className="badge badge-success"><CheckCircle2 size={13} /> שולם</span>;
  if (status === 'partial') return <span className="badge badge-warn"><Circle size={13} /> שולם חלקית</span>;
  return <span className="badge badge-alert"><AlertCircle size={13} /> לא שולם</span>;
}

function MethodLabel({ method }) {
  const m = PAYMENT_METHODS.find(x => x.value === method);
  return m ? m.label : '—';
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: COLORS.textMuted }}>
      {Icon && <Icon size={36} style={{ marginBottom: 12, opacity: 0.5 }} />}
      <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink, marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14 }}>{subtitle}</div>}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'ראשי', icon: Home },
  { key: 'clients', label: 'לקוחות', icon: Users },
  { key: 'jobs', label: 'עבודות', icon: Briefcase },
  { key: 'calendar', label: 'יומן', icon: CalendarIcon },
  { key: 'followups', label: 'לטיפול', icon: ListTodo },
  { key: 'notifications', label: 'התראות', icon: Bell },
];

export default function App() {
  const { data, setData, loading } = useAppData();
  const [page, setPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientViewToken, setClientViewToken] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Check URL for client view token (read-only client portal)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('view');
      if (token) setClientViewToken(token);
    } catch (e) {}
  }, []);

  // Auto-generate subscription jobs and notifications whenever data changes (debounced via effect)
  useEffect(() => {
    if (!data || loading) return;
    const newSubJobs = generateSubscriptionJobs(data);
    const newNotifs = computeNotifications({ ...data, jobs: [...data.jobs, ...newSubJobs] });

    const notifsChanged = JSON.stringify(newNotifs.map(n => n.id).sort()) !== JSON.stringify((data.notifications || []).map(n => n.id).sort());

    if (newSubJobs.length > 0 || notifsChanged) {
      setData({ ...data, jobs: [...data.jobs, ...newSubJobs], notifications: newNotifs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.clients, data?.jobs?.length, loading]);

  if (loading || !data) {
    return (
      <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <style>{GLOBAL_STYLES}</style>
        <div style={{ color: COLORS.slate }}>טוען נתונים...</div>
      </div>
    );
  }

  // CLIENT PORTAL VIEW (read-only)
  if (clientViewToken) {
    const client = data.clients.find(c => c.viewToken === clientViewToken);
    if (!client) {
      return (
        <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
          <style>{GLOBAL_STYLES}</style>
          <EmptyState icon={AlertCircle} title="קישור לא נמצא" subtitle="הקישור שגוי או שפג תוקפו" />
        </div>
      );
    }
    return <ClientPortal data={data} client={client} />;
  }

  const notifications = data.notifications || [];

  return (
    <div className="app-root">
      <style>{GLOBAL_STYLES}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar - desktop */}
        <aside className="desktop-only" style={{
          width: 230, background: COLORS.ink, padding: '24px 16px',
          display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
        }}>
          <BrandHeader />
          <div style={{ height: 24 }} />
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const badgeCount = item.key === 'notifications' ? notifications.length : 0;
            return (
              <div
                key={item.key}
                className={`nav-link ${page === item.key ? 'active' : ''}`}
                onClick={() => { setPage(item.key); setSelectedClientId(null); }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}
              </div>
            );
          })}
        </aside>

        {/* Mobile top bar */}
        <div className="mobile-only" style={{
          position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100,
          background: COLORS.ink, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <BrandHeader compact />
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff' }} onClick={() => setMobileNavOpen(true)}>
            <ListTodo size={20} />
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="modal-overlay mobile-only" onClick={() => setMobileNavOpen(false)}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: 230,
              background: COLORS.ink, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 4,
            }} onClick={e => e.stopPropagation()}>
              <BrandHeader />
              <div style={{ height: 24 }} />
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const badgeCount = item.key === 'notifications' ? notifications.length : 0;
                return (
                  <div
                    key={item.key}
                    className={`nav-link ${page === item.key ? 'active' : ''}`}
                    onClick={() => { setPage(item.key); setSelectedClientId(null); setMobileNavOpen(false); }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {badgeCount > 0 && <span className="nav-badge">{badgeCount}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px', maxWidth: '100%', overflow: 'hidden' }} className="main-content">
          <div className="mobile-only" style={{ height: 56 }} />
          {page === 'dashboard' && <DashboardPage data={data} setData={setData} setPage={setPage} setSelectedClientId={setSelectedClientId} />}
          {page === 'clients' && !selectedClientId && <ClientsPage data={data} setData={setData} onSelectClient={setSelectedClientId} />}
          {page === 'clients' && selectedClientId && (
            <ClientDetailPage data={data} setData={setData} clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />
          )}
          {page === 'jobs' && <JobsPage data={data} setData={setData} onSelectClient={(id) => { setSelectedClientId(id); setPage('clients'); }} />}
          {page === 'calendar' && <CalendarPage data={data} setData={setData} onSelectClient={(id) => { setSelectedClientId(id); setPage('clients'); }} />}
          {page === 'followups' && <FollowUpsPage data={data} setData={setData} />}
          {page === 'notifications' && <NotificationsPage data={data} setData={setData} onSelectClient={(id) => { setSelectedClientId(id); setPage('clients'); }} />}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
function DashboardPage({ data, setData, setPage, setSelectedClientId }) {
  const summary = useMemo(() => {
    let totalOwed = 0;
    let totalCredit = 0;
    let monthlyRecurring = 0;
    let activeClients = 0;
    const today = todayStr();
    const thisMonthIncome = { total: 0 };

    for (const client of data.clients) {
      const ledger = computeClientLedger(data, client.id);
      if (ledger.netBalance > 0) totalOwed += ledger.netBalance;
      if (ledger.netBalance < 0) totalCredit += -ledger.netBalance;
      if (client.subscription && client.subscription.enabled) {
        monthlyRecurring += Number(client.subscription.amount) || 0;
      }
      if (ledger.jobsWithStatus.length > 0) activeClients++;
    }

    for (const p of data.payments) {
      if (p.date && p.date.slice(0, 7) === today.slice(0, 7)) {
        thisMonthIncome.total += p.amount;
      }
    }

    return { totalOwed, totalCredit, monthlyRecurring, activeClients, monthIncome: thisMonthIncome.total };
  }, [data]);

  const upcomingEvents = useMemo(() => {
    const today = todayStr();
    return data.calendarEvents
      .filter(e => !e.completed && e.date >= today)
      .sort((a, b) => a.date < b.date ? -1 : 1)
      .slice(0, 5);
  }, [data]);

  const notifications = data.notifications || [];

  return (
    <div>
      <PageHeader title="לוח ראשי" subtitle={`היום ${fmtDate(todayStr())} · ${gregorianToHebrewStr(new Date())}`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard
          icon={ArrowDownRight}
          label="חובות פתוחים"
          value={fmtCurrency(summary.totalOwed)}
          color={COLORS.alert}
          bg={COLORS.alertBg}
        />
        <StatCard
          icon={Wallet}
          label="יתרות זכות ללקוחות"
          value={fmtCurrency(summary.totalCredit)}
          color={COLORS.success}
          bg={COLORS.successBg}
        />
        <StatCard
          icon={TrendingUp}
          label="הכנסות החודש"
          value={fmtCurrency(summary.monthIncome)}
          color={COLORS.copper}
          bg="#FBEEE3"
        />
        <StatCard
          icon={Repeat}
          label="הכנסה חודשית קבועה (מנויים)"
          value={fmtCurrency(summary.monthlyRecurring)}
          color={COLORS.slate}
          bg={COLORS.paper}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }} className="dash-grid">
        <style>{`@media (max-width: 860px) { .dash-grid { grid-template-columns: 1fr !important; } }`}</style>

        <div className="card">
          <SectionTitle icon={Bell} title="התראות אחרונות" />
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="אין התראות כרגע" subtitle="התראות גביה ופגישות יוצגו כאן" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.slice(0, 6).map(n => (
                <div key={n.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  background: COLORS.paper, borderRadius: 10, fontSize: 13.5, cursor: n.clientId ? 'pointer' : 'default',
                }}
                  onClick={() => { if (n.clientId) { setSelectedClientId(n.clientId); setPage('clients'); } }}
                >
                  <Bell size={15} style={{ color: COLORS.copper, marginTop: 2, flexShrink: 0 }} />
                  <span>{n.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <SectionTitle icon={CalendarIcon} title="פגישות קרובות" />
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="אין פגישות מתוזמנות" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingEvents.map(ev => (
                <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: COLORS.paper, borderRadius: 10, fontSize: 13.5 }}>
                  <div style={{ flexShrink: 0, fontWeight: 700, color: COLORS.copper, minWidth: 70 }}>{fmtDate(ev.date)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                    {ev.location && <div style={{ color: COLORS.textMuted, fontSize: 12.5 }}>{ev.location}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>{title}</h1>
        {subtitle && <div style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 15, fontWeight: 700 }}>
      {Icon && <Icon size={17} style={{ color: COLORS.copper }} />}
      {title}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function BrandHeader({ compact }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: 10,
        background: `linear-gradient(135deg, ${COLORS.copperLight}, ${COLORS.copperDark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#fff', fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 900, fontSize: compact ? 16 : 18,
      }}>
        ח.י
      </div>
      {!compact && (
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3, fontFamily: "'Frank Ruhl Libre', serif" }}>
            ח.י. חיימוביץ
          </div>
          <div style={{ color: COLORS.copperLight, fontSize: 11.5, fontWeight: 500 }}>
            פתרונות תקשורת
          </div>
        </div>
      )}
      {compact && (
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "'Frank Ruhl Libre', serif" }}>
          ח.י. חיימוביץ
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CLIENTS PAGE (LIST)
   ============================================================ */
function ClientsPage({ data, setData, onSelectClient }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.clients
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
      .map(c => ({ ...c, ledger: computeClientLedger(data, c.id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [data, search]);

  function handleSaveClient(clientData) {
    if (editingClient) {
      setData({
        ...data,
        clients: data.clients.map(c => c.id === editingClient.id ? { ...c, ...clientData } : c),
      });
    } else {
      const newClient = {
        id: uid('client'),
        viewToken: makeViewToken(),
        creditNote: '',
        ...clientData,
      };
      setData({ ...data, clients: [...data.clients, newClient] });
    }
    setShowForm(false);
    setEditingClient(null);
  }

  function handleDeleteClient(client) {
    if (!window.confirm(`למחוק את הלקוח "${client.name}"? כל העבודות והתשלומים שלו יימחקו גם כן.`)) return;
    setData({
      ...data,
      clients: data.clients.filter(c => c.id !== client.id),
      jobs: data.jobs.filter(j => j.clientId !== client.id),
      payments: data.payments.filter(p => p.clientId !== client.id),
    });
  }

  return (
    <div>
      <PageHeader
        title="לקוחות"
        subtitle={`${data.clients.length} לקוחות במאגר`}
        action={
          <button className="btn btn-primary" onClick={() => { setEditingClient(null); setShowForm(true); }}>
            <Plus size={16} /> לקוח חדש
          </button>
        }
      />

      <div style={{ marginBottom: 18, maxWidth: 360, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', right: 12, top: 11, color: COLORS.textMuted }} />
        <input
          className="input"
          style={{ paddingRight: 36 }}
          placeholder="חיפוש לקוח לפי שם או טלפון..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filteredClients.length === 0 ? (
        <EmptyState icon={Users} title="אין לקוחות עדיין" subtitle="לחץ על 'לקוח חדש' כדי להתחיל" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filteredClients.map(client => (
            <div
              key={client.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => onSelectClient(client.id)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,42,58,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{client.name}</div>
                  {client.phone && (
                    <div style={{ fontSize: 13, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Phone size={12} /> {client.phone}
                    </div>
                  )}
                </div>
                {client.subscription && client.subscription.enabled && (
                  <span className="badge badge-neutral"><Repeat size={12} /> מנוי</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {client.ledger.netBalance > 0 && (
                  <span className="badge badge-alert">חוב: {fmtCurrency(client.ledger.netBalance)}</span>
                )}
                {client.ledger.netBalance < 0 && (
                  <span className="badge badge-success">זכות: {fmtCurrency(-client.ledger.netBalance)}</span>
                )}
                {client.ledger.netBalance === 0 && client.ledger.jobsWithStatus.length > 0 && (
                  <span className="badge badge-neutral">מאוזן</span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingClient(client); setShowForm(true); }}>
                  <Edit2 size={14} /> ערוך
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => { setShowForm(false); setEditingClient(null); }}
          onSave={handleSaveClient}
        />
      )}
    </div>
  );
}

/* ============================================================
   CLIENT FORM MODAL
   ============================================================ */
function ClientFormModal({ client, onClose, onSave }) {
  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [email, setEmail] = useState(client?.email || '');
  const [address, setAddress] = useState(client?.address || '');
  const [billingFrequencyDays, setBillingFrequencyDays] = useState(client?.billingFrequencyDays ?? 0);
  const [notes, setNotes] = useState(client?.notes || '');

  const [subEnabled, setSubEnabled] = useState(client?.subscription?.enabled || false);
  const [subAmount, setSubAmount] = useState(client?.subscription?.amount || '');
  const [subDay, setSubDay] = useState(client?.subscription?.dayOfMonth || 1);
  const [subStart, setSubStart] = useState(client?.subscription?.startDate || todayStr());
  const [subEnd, setSubEnd] = useState(client?.subscription?.endDate || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      billingFrequencyDays: Number(billingFrequencyDays) || 0,
      notes: notes.trim(),
      subscription: subEnabled ? {
        enabled: true,
        amount: Number(subAmount) || 0,
        dayOfMonth: Number(subDay) || 1,
        startDate: subStart,
        endDate: subEnd || null,
      } : { enabled: false },
    });
  }

  return (
    <Modal title={client ? 'עריכת לקוח' : 'לקוח חדש'} onClose={onClose} width={520}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">שם הלקוח / מוסד *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">טלפון</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" />
          </div>
          <div className="field">
            <label className="label">אימייל</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.com" />
          </div>
        </div>
        <div className="field">
          <label className="label">כתובת</label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">תדירות גביה - תזכורת אוטומטית</label>
          <select className="select" value={billingFrequencyDays} onChange={e => setBillingFrequencyDays(e.target.value)}>
            {BILLING_FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
            תזכורת תישלח 14 יום לפני מועד הגביה (אם יש חוב פתוח), גם ללקוח וגם אליך
          </div>
        </div>

        <div className="signal-divider" style={{ margin: '16px 0' }} />

        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subEnabled ? 12 : 0 }}>
          <input type="checkbox" id="sub-enabled" checked={subEnabled} onChange={e => setSubEnabled(e.target.checked)} style={{ width: 18, height: 18 }} />
          <label htmlFor="sub-enabled" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            לקוח במסלול מנוי חודשי קבוע
          </label>
        </div>

        {subEnabled && (
          <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ marginBottom: 8 }}>
                <label className="label">סכום חודשי (₪)</label>
                <input className="input" type="number" min="0" step="0.01" value={subAmount} onChange={e => setSubAmount(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label className="label">יום בחודש לחיוב</label>
                <input className="input" type="number" min="1" max="28" value={subDay} onChange={e => setSubDay(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">תאריך התחלה</label>
                <input className="input" type="date" value={subStart} onChange={e => setSubStart(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label">תאריך סיום (אופציונלי)</label>
                <input className="input" type="date" value={subEnd} onChange={e => setSubEnd(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="field" style={{ marginTop: 14 }}>
          <label className="label">הערות</label>
          <textarea className="textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   CLIENT DETAIL PAGE (LEDGER / כרטסת)
   ============================================================ */
function ClientDetailPage({ data, setData, clientId, onBack }) {
  const client = data.clients.find(c => c.id === clientId);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);

  if (!client) {
    return <EmptyState icon={AlertCircle} title="לקוח לא נמצא" />;
  }

  const ledger = computeClientLedger(data, clientId);

  function handleSaveJob(jobData) {
    if (editingJob) {
      setData({ ...data, jobs: data.jobs.map(j => j.id === editingJob.id ? { ...j, ...jobData } : j) });
    } else {
      const newJob = { id: uid('job'), clientId, createdAt: Date.now(), ...jobData };
      setData({ ...data, jobs: [...data.jobs, newJob] });
    }
    setShowJobForm(false);
    setEditingJob(null);
  }

  function handleDeleteJob(job) {
    if (!window.confirm('למחוק את העבודה הזו?')) return;
    // also remove allocations referencing this job from payments
    setData({
      ...data,
      jobs: data.jobs.filter(j => j.id !== job.id),
      payments: data.payments.map(p => ({
        ...p,
        allocations: (p.allocations || []).filter(a => a.jobId !== job.id),
      })),
    });
  }

  function handleRecordPayment(paymentData) {
    const { allocations, leftover } = allocatePayment(data, clientId, paymentData.amount);
    const newPayment = {
      id: uid('pay'),
      clientId,
      date: paymentData.date,
      amount: paymentData.amount,
      method: paymentData.method,
      receiptRef: paymentData.receiptRef,
      notes: paymentData.notes,
      allocations,
      createdAt: Date.now(),
    };
    setData({ ...data, payments: [...data.payments, newPayment] });
  }

  function handleDeletePayment(payment) {
    if (!window.confirm('למחוק את התשלום הזה? הקיזוז על העבודות יבוטל.')) return;
    setData({ ...data, payments: data.payments.filter(p => p.id !== payment.id) });
  }

  const viewLink = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?view=${client.viewToken}`;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
        <ChevronRight size={16} /> חזרה לרשימת לקוחות
      </button>

      <PageHeader
        title={client.name}
        subtitle={[client.phone, client.email, client.address].filter(Boolean).join(' · ') || 'אין פרטי קשר'}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowShareLink(true)}>
              <Link2 size={16} /> קישור לצפיה
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEditClient(true)}>
              <Edit2 size={16} /> ערוך לקוח
            </button>
          </div>
        }
      />

      {/* Balance summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard
          icon={ledger.netBalance >= 0 ? ArrowDownRight : Wallet}
          label={ledger.netBalance >= 0 ? 'חוב פתוח' : 'יתרת זכות'}
          value={fmtCurrency(Math.abs(ledger.netBalance))}
          color={ledger.netBalance > 0 ? COLORS.alert : ledger.netBalance < 0 ? COLORS.success : COLORS.slate}
          bg={ledger.netBalance > 0 ? COLORS.alertBg : ledger.netBalance < 0 ? COLORS.successBg : COLORS.paper}
        />
        <StatCard icon={Briefcase} label="מספר עבודות" value={ledger.jobsWithStatus.length} color={COLORS.copper} bg="#FBEEE3" />
        {client.billingFrequencyDays > 0 && (
          <StatCard
            icon={Repeat}
            label="תדירות גביה"
            value={BILLING_FREQUENCY_OPTIONS.find(o => o.value === client.billingFrequencyDays)?.label || '—'}
            color={COLORS.slate}
            bg={COLORS.paper}
          />
        )}
        {client.subscription?.enabled && (
          <StatCard icon={Repeat} label="מנוי חודשי" value={fmtCurrency(client.subscription.amount)} color={COLORS.success} bg={COLORS.successBg} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => { setEditingJob(null); setShowJobForm(true); }}>
          <Plus size={16} /> עבודה חדשה
        </button>
        <button className="btn btn-secondary" onClick={() => setShowPaymentForm(true)}>
          <CreditCard size={16} /> רישום תשלום
        </button>
      </div>

      {/* Jobs ledger table */}
      <div className="card" style={{ marginBottom: 18, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', fontWeight: 700, fontSize: 15, borderBottom: `1px solid ${COLORS.border}` }}>
          כרטסת עבודות
        </div>
        {ledger.jobsWithStatus.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState icon={Briefcase} title="אין עבודות עדיין" subtitle="לחץ על 'עבודה חדשה' להוספה" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 640 }}>
              <thead>
                <tr style={{ background: COLORS.paper, textAlign: 'right' }}>
                  <th style={thStyle}>תאריך</th>
                  <th style={thStyle}>תיאור</th>
                  <th style={thStyle}>מחיר</th>
                  <th style={thStyle}>שולם</th>
                  <th style={thStyle}>נותר</th>
                  <th style={thStyle}>סטטוס</th>
                  <th style={thStyle}>תשלום</th>
                  <th style={thStyle}>אסמכתא</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {ledger.jobsWithStatus.slice().reverse().map(job => (
                  <tr key={job.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={tdStyle}>{fmtDate(job.date)}</td>
                    <td style={tdStyle}>
                      {job.description}
                      {job.subscriptionGenerated && <span className="badge badge-neutral" style={{ marginRight: 6 }}><Repeat size={11} /> מנוי</span>}
                      {job.notes && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{job.notes}</div>}
                    </td>
                    <td style={tdStyle}>{fmtCurrency(job.price)}</td>
                    <td style={tdStyle}>{fmtCurrency(job.allocated)}</td>
                    <td style={tdStyle}>{fmtCurrency(job.remaining)}</td>
                    <td style={tdStyle}><PaymentStatusBadge status={job.status} /></td>
                    <td style={tdStyle}>{job.paymentMethod ? <MethodLabel method={job.paymentMethod} /> : '—'}</td>
                    <td style={tdStyle}>{job.receiptRef || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditingJob(job); setShowJobForm(true); }}><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={() => handleDeleteJob(job)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments history */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '16px 20px', fontWeight: 700, fontSize: 15, borderBottom: `1px solid ${COLORS.border}` }}>
          היסטוריית תשלומים
        </div>
        {ledger.payments.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState icon={CreditCard} title="אין תשלומים עדיין" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 500 }}>
              <thead>
                <tr style={{ background: COLORS.paper, textAlign: 'right' }}>
                  <th style={thStyle}>תאריך</th>
                  <th style={thStyle}>סכום</th>
                  <th style={thStyle}>אופן תשלום</th>
                  <th style={thStyle}>אסמכתא</th>
                  <th style={thStyle}>הערות</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {ledger.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={tdStyle}>{fmtDate(p.date)}</td>
                    <td style={tdStyle}>{fmtCurrency(p.amount)}</td>
                    <td style={tdStyle}><MethodLabel method={p.method} /></td>
                    <td style={tdStyle}>{p.receiptRef || '—'}</td>
                    <td style={tdStyle}>{p.notes || '—'}</td>
                    <td style={tdStyle}>
                      <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={() => handleDeletePayment(p)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {client.notes && (
        <div className="card">
          <SectionTitle icon={FileText} title="הערות כלליות" />
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{client.notes}</div>
        </div>
      )}

      {showJobForm && (
        <JobFormModal
          job={editingJob}
          onClose={() => { setShowJobForm(false); setEditingJob(null); }}
          onSave={handleSaveJob}
        />
      )}
      {showPaymentForm && (
        <PaymentFormModal
          ledger={ledger}
          onClose={() => setShowPaymentForm(false)}
          onSave={(p) => { handleRecordPayment(p); setShowPaymentForm(false); }}
        />
      )}
      {showEditClient && (
        <ClientFormModal
          client={client}
          onClose={() => setShowEditClient(false)}
          onSave={(updated) => {
            setData({ ...data, clients: data.clients.map(c => c.id === clientId ? { ...c, ...updated } : c) });
            setShowEditClient(false);
          }}
        />
      )}
      {showShareLink && (
        <ShareLinkModal client={client} viewLink={viewLink} onClose={() => setShowShareLink(false)} />
      )}
    </div>
  );
}

const thStyle = { padding: '10px 14px', fontWeight: 600, color: COLORS.slate, fontSize: 12.5, whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'top' };

function ShareLinkModal({ client, viewLink, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      navigator.clipboard.writeText(viewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  }
  return (
    <Modal title={`קישור צפיה - ${client.name}`} onClose={onClose} width={480}>
      <p style={{ fontSize: 14, color: COLORS.slate, marginBottom: 14 }}>
        שלח את הקישור הזה ל{client.name}. הלקוח יוכל לצפות בעבודות, סטטוס תשלום ואופן תשלום - בצפיה בלבד, ללא אפשרות עריכה.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" readOnly value={viewLink} style={{ fontSize: 12.5, fontFamily: 'monospace' }} />
        <button className="btn btn-primary" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'הועתק' : 'העתק'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   JOB FORM MODAL
   ============================================================ */
function JobFormModal({ job, onClose, onSave }) {
  const [date, setDate] = useState(job?.date || todayStr());
  const [description, setDescription] = useState(job?.description || '');
  const [price, setPrice] = useState(job?.price ?? '');
  const [paymentMethod, setPaymentMethod] = useState(job?.paymentMethod || '');
  const [receiptRef, setReceiptRef] = useState(job?.receiptRef || '');
  const [notes, setNotes] = useState(job?.notes || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim() || price === '') return;
    onSave({
      date,
      description: description.trim(),
      price: Number(price) || 0,
      paymentMethod: paymentMethod || null,
      receiptRef: receiptRef.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <Modal title={job ? 'עריכת עבודה' : 'עבודה חדשה'} onClose={onClose} width={460}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">תאריך *</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>{gregorianToHebrewStr(new Date(date))}</div>
          </div>
          <div className="field">
            <label className="label">מחיר (₪) *</label>
            <input className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label className="label">תיאור העבודה *</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} required autoFocus placeholder="לדוגמה: התקנת נקודת רשת + הגדרת ראוטר" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">אופן תשלום</label>
            <select className="select" value={paymentMethod || ''} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="">— ללא / טרם שולם —</option>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">אסמכתא</label>
            <input className="input" value={receiptRef} onChange={e => setReceiptRef(e.target.value)} placeholder="מספר קבלה / צ'ק וכו'" />
          </div>
        </div>
        <div className="field">
          <label className="label">הערות</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   PAYMENT FORM MODAL (with FIFO allocation preview)
   ============================================================ */
function PaymentFormModal({ ledger, onClose, onSave }) {
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');

  const unpaidJobs = ledger.jobsWithStatus.filter(j => j.remaining > 0);
  const numAmount = Number(amount) || 0;

  const preview = useMemo(() => {
    let remaining = numAmount;
    const allocs = [];
    for (const job of unpaidJobs) {
      if (remaining <= 0) break;
      const alloc = Math.min(job.remaining, remaining);
      if (alloc > 0) {
        allocs.push({ job, amount: alloc });
        remaining -= alloc;
      }
    }
    return { allocs, leftover: remaining };
  }, [numAmount, unpaidJobs]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) return;
    onSave({ date, amount: numAmount, method, receiptRef: receiptRef.trim(), notes: notes.trim() });
  }

  return (
    <Modal title="רישום תשלום" onClose={onClose} width={480}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">תאריך *</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">סכום (₪) *</label>
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">אופן תשלום *</label>
            <select className="select" value={method} onChange={e => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">אסמכתא</label>
            <input className="input" value={receiptRef} onChange={e => setReceiptRef(e.target.value)} placeholder="מספר צ'ק / קבלה" />
          </div>
        </div>
        <div className="field">
          <label className="label">הערות</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {numAmount > 0 && (
          <div style={{ background: COLORS.paper, borderRadius: 10, padding: 12, fontSize: 13.5, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>קיזוז אוטומטי (מהעבודה הישנה לחדשה):</div>
            {preview.allocs.length === 0 && preview.leftover === numAmount && (
              <div style={{ color: COLORS.textMuted }}>אין עבודות פתוחות - כל הסכום יירשם כיתרת זכות</div>
            )}
            {preview.allocs.map(a => (
              <div key={a.job.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{fmtDate(a.job.date)} - {a.job.description}</span>
                <span style={{ fontWeight: 600 }}>{fmtCurrency(a.amount)}</span>
              </div>
            ))}
            {preview.leftover > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: `1px dashed ${COLORS.border}`, marginTop: 4, paddingTop: 6, color: COLORS.success, fontWeight: 700 }}>
                <span><Wallet size={13} style={{ verticalAlign: 'middle' }} /> יתרת זכות חדשה</span>
                <span>{fmtCurrency(preview.leftover)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> רישום תשלום</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   JOBS PAGE (all jobs across clients)
   ============================================================ */
function JobsPage({ data, setData, onSelectClient }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const allJobsWithLedger = useMemo(() => {
    const clientLedgers = {};
    for (const c of data.clients) {
      clientLedgers[c.id] = computeClientLedger(data, c.id);
    }
    const rows = [];
    for (const c of data.clients) {
      for (const j of clientLedgers[c.id].jobsWithStatus) {
        rows.push({ ...j, clientName: c.name, clientId: c.id });
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allJobsWithLedger.filter(j => {
      if (filterStatus !== 'all' && j.status !== filterStatus) return false;
      if (q && !(j.description.toLowerCase().includes(q) || j.clientName.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allJobsWithLedger, search, filterStatus]);

  return (
    <div>
      <PageHeader title="כל העבודות" subtitle={`${allJobsWithLedger.length} עבודות במאגר`} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', right: 12, top: 11, color: COLORS.textMuted }} />
          <input className="input" style={{ paddingRight: 36 }} placeholder="חיפוש לפי תיאור או לקוח..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ maxWidth: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">כל הסטטוסים</option>
          <option value="paid">שולם</option>
          <option value="partial">שולם חלקית</option>
          <option value="unpaid">לא שולם</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="לא נמצאו עבודות" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 640 }}>
              <thead>
                <tr style={{ background: COLORS.paper, textAlign: 'right' }}>
                  <th style={thStyle}>תאריך</th>
                  <th style={thStyle}>לקוח</th>
                  <th style={thStyle}>תיאור</th>
                  <th style={thStyle}>מחיר</th>
                  <th style={thStyle}>נותר לתשלום</th>
                  <th style={thStyle}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(job => (
                  <tr key={job.id} style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: 'pointer' }} onClick={() => onSelectClient(job.clientId)}>
                    <td style={tdStyle}>{fmtDate(job.date)}</td>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{job.clientName}</span></td>
                    <td style={tdStyle}>{job.description}</td>
                    <td style={tdStyle}>{fmtCurrency(job.price)}</td>
                    <td style={tdStyle}>{fmtCurrency(job.remaining)}</td>
                    <td style={tdStyle}><PaymentStatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CALENDAR PAGE
   ============================================================ */
const WEEKDAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

function CalendarPage({ data, setData, onSelectClient }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [completingEvent, setCompletingEvent] = useState(null);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of data.calendarEvents) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [data.calendarEvents]);

  function dateKey(day) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  }

  function handleSaveEvent(eventData) {
    if (editingEvent) {
      setData({ ...data, calendarEvents: data.calendarEvents.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e) });
    } else {
      setData({ ...data, calendarEvents: [...data.calendarEvents, { id: uid('ev'), completed: false, ...eventData }] });
    }
    setShowEventForm(false);
    setEditingEvent(null);
  }

  function handleDeleteEvent(ev) {
    if (!window.confirm('למחוק את הפגישה?')) return;
    setData({ ...data, calendarEvents: data.calendarEvents.filter(e => e.id !== ev.id) });
  }

  function toggleComplete(ev) {
    if (!ev.completed) {
      // mark completed and offer to link to a job
      setData({ ...data, calendarEvents: data.calendarEvents.map(e => e.id === ev.id ? { ...e, completed: true } : e) });
      setCompletingEvent(ev);
    } else {
      setData({ ...data, calendarEvents: data.calendarEvents.map(e => e.id === ev.id ? { ...e, completed: false } : e) });
    }
  }

  const todayKey = todayStr();
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div>
      <PageHeader
        title="יומן"
        subtitle="לוח שנה לועזי עם תאריכים עבריים"
        action={
          <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setShowEventForm(true); }}>
            <Plus size={16} /> פגישה חדשה
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }} className="cal-grid">
        <style>{`@media (max-width: 860px) { .cal-grid { grid-template-columns: 1fr !important; } }`}</style>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)}><ChevronRight size={18} /></button>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{MONTH_NAMES_HE[viewMonth]} {viewYear}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}><ChevronLeft size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {WEEKDAY_NAMES.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: COLORS.textMuted, padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const key = dateKey(day);
              const evs = eventsByDate[key] || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const hebStr = gregorianToHebrewStr(new Date(viewYear, viewMonth, day));
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(key)}
                  style={{
                    minHeight: 58, borderRadius: 8, padding: '5px 6px', cursor: 'pointer',
                    border: isSelected ? `2px solid ${COLORS.copper}` : `1px solid ${COLORS.border}`,
                    background: isToday ? '#FBEEE3' : '#fff',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontWeight: isToday ? 800 : 600, fontSize: 13.5 }}>{day}</div>
                  <div style={{ fontSize: 9.5, color: COLORS.textMuted, lineHeight: 1.2 }}>{hebStr.split(' ')[0]} {hebStr.split(' ')[1]}</div>
                  {evs.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap' }}>
                      {evs.slice(0, 3).map(ev => (
                        <div key={ev.id} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: ev.completed ? COLORS.success : COLORS.copper,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <SectionTitle icon={CalendarIcon} title={selectedDate ? `${fmtDate(selectedDate)} · ${gregorianToHebrewStr(new Date(selectedDate))}` : 'בחר תאריך'} />
          {!selectedDate ? (
            <EmptyState icon={CalendarIcon} title="בחר תאריך בלוח" subtitle="לראות ולהוסיף פגישות" />
          ) : selectedEvents.length === 0 ? (
            <div>
              <EmptyState icon={CalendarIcon} title="אין פגישות בתאריך זה" />
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setEditingEvent({ date: selectedDate }); setShowEventForm(true); }}>
                <Plus size={16} /> הוסף פגישה לתאריך זה
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEvents.map(ev => (
                <div key={ev.id} style={{ background: COLORS.paper, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, textDecoration: ev.completed ? 'line-through' : 'none', color: ev.completed ? COLORS.textMuted : COLORS.ink }}>
                      {ev.title}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: ev.completed ? COLORS.success : COLORS.slate }}
                      onClick={() => toggleComplete(ev)}
                      title={ev.completed ? 'בוצע' : 'סמן כבוצע'}
                    >
                      {ev.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </div>
                  {ev.location && <div style={{ fontSize: 13, color: COLORS.slate, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}><MapPin size={13} /> {ev.location}</div>}
                  {ev.contactPhone && <div style={{ fontSize: 13, color: COLORS.slate, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}><Phone size={13} /> {ev.contactPhone}</div>}
                  {ev.contactEmail && <div style={{ fontSize: 13, color: COLORS.slate, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}><Mail size={13} /> {ev.contactEmail}</div>}
                  {ev.notes && <div style={{ fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{ev.notes}</div>}
                  {ev.clientId && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '2px 8px' }} onClick={() => onSelectClient(ev.clientId)}>
                      <ExternalLink size={12} /> מעבר לכרטסת הלקוח
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingEvent(ev); setShowEventForm(true); }}><Edit2 size={13} /> ערוך</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={() => handleDeleteEvent(ev)}><Trash2 size={13} /> מחק</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setEditingEvent({ date: selectedDate }); setShowEventForm(true); }}>
                <Plus size={16} /> הוסף פגישה נוספת
              </button>
            </div>
          )}
        </div>
      </div>

      {showEventForm && (
        <EventFormModal
          event={editingEvent}
          clients={data.clients}
          onClose={() => { setShowEventForm(false); setEditingEvent(null); }}
          onSave={handleSaveEvent}
        />
      )}

      {completingEvent && (
        <CompleteEventModal
          event={completingEvent}
          data={data}
          setData={setData}
          onClose={() => setCompletingEvent(null)}
          onGoToClient={(clientId) => { setCompletingEvent(null); onSelectClient(clientId); }}
        />
      )}
    </div>
  );
}

function EventFormModal({ event, clients, onClose, onSave }) {
  const [date, setDate] = useState(event?.date || todayStr());
  const [title, setTitle] = useState(event?.title || '');
  const [location, setLocation] = useState(event?.location || '');
  const [clientId, setClientId] = useState(event?.clientId || '');
  const [contactPhone, setContactPhone] = useState(event?.contactPhone || '');
  const [contactEmail, setContactEmail] = useState(event?.contactEmail || '');
  const [notes, setNotes] = useState(event?.notes || '');

  // Auto-fill contact info when selecting a client
  function handleClientChange(id) {
    setClientId(id);
    const c = clients.find(x => x.id === id);
    if (c) {
      if (!contactPhone) setContactPhone(c.phone || '');
      if (!contactEmail) setContactEmail(c.email || '');
      if (!location) setLocation(c.address || '');
      if (!title) setTitle(`ביקור - ${c.name}`);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      date, title: title.trim(), location: location.trim(),
      clientId: clientId || null, contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(), notes: notes.trim(),
    });
  }

  return (
    <Modal title={event?.id ? 'עריכת פגישה' : 'פגישה חדשה'} onClose={onClose} width={460}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">תאריך *</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>{gregorianToHebrewStr(new Date(date))}</div>
        </div>
        <div className="field">
          <label className="label">שיוך ללקוח קיים (אופציונלי)</label>
          <select className="select" value={clientId} onChange={e => handleClientChange(e.target.value)}>
            <option value="">— לקוח חדש / לא משויך —</option>
            {clients.slice().sort((a,b) => a.name.localeCompare(b.name,'he')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">כותרת *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="לדוגמה: ביקור בבני ברק - תיקון רשת" />
        </div>
        <div className="field">
          <label className="label">מיקום</label>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="כתובת / עיר" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">טלפון איש קשר</label>
            <input className="input" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">מייל איש קשר</label>
            <input className="input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label">הערות</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

// Shown after marking an event as completed - lets the technician immediately log the job
function CompleteEventModal({ event, data, setData, onClose, onGoToClient }) {
  const [clientId, setClientId] = useState(event.clientId || '');
  const [createNewClient, setCreateNewClient] = useState(!event.clientId);
  const [newClientName, setNewClientName] = useState(event.title.replace(/^ביקור\s*-\s*/, '') || '');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState(event.title || '');
  const [paymentMethod, setPaymentMethod] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    let targetClientId = clientId;
    let updatedData = { ...data };

    if (createNewClient) {
      if (!newClientName.trim()) return;
      const newClient = {
        id: uid('client'),
        name: newClientName.trim(),
        phone: event.contactPhone || '',
        email: event.contactEmail || '',
        address: event.location || '',
        billingFrequencyDays: 0,
        notes: '',
        subscription: { enabled: false },
        viewToken: makeViewToken(),
      };
      updatedData.clients = [...updatedData.clients, newClient];
      targetClientId = newClient.id;
    }

    if (!targetClientId) return;

    const newJob = {
      id: uid('job'),
      clientId: targetClientId,
      date: event.date,
      description: description.trim() || 'עבודה',
      price: Number(price) || 0,
      paymentMethod: paymentMethod || null,
      receiptRef: '',
      notes: '',
      createdAt: Date.now(),
    };
    updatedData.jobs = [...updatedData.jobs, newJob];
    updatedData.calendarEvents = updatedData.calendarEvents.map(ev => ev.id === event.id ? { ...ev, clientId: targetClientId } : ev);

    setData(updatedData);
    onGoToClient(targetClientId);
  }

  return (
    <Modal title="הפגישה בוצעה - הוספת עבודה" onClose={onClose} width={460}>
      <p style={{ fontSize: 13.5, color: COLORS.slate, marginBottom: 14 }}>
        סימנת שהפגישה "{event.title}" בוצעה. אפשר להוסיף כאן את העבודה שביצעת ולקשר אותה ללקוח.
      </p>
      <form onSubmit={handleSubmit}>
        {!event.clientId && (
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="new-client" checked={createNewClient} onChange={e => setCreateNewClient(e.target.checked)} style={{ width: 18, height: 18 }} />
            <label htmlFor="new-client" style={{ fontSize: 14, cursor: 'pointer' }}>צור לקוח חדש מפרטי הפגישה</label>
          </div>
        )}
        {createNewClient ? (
          <div className="field">
            <label className="label">שם הלקוח *</label>
            <input className="input" value={newClientName} onChange={e => setNewClientName(e.target.value)} required />
          </div>
        ) : (
          <div className="field">
            <label className="label">בחר לקוח *</label>
            <select className="select" value={clientId} onChange={e => setClientId(e.target.value)} required>
              <option value="">— בחר —</option>
              {data.clients.slice().sort((a,b) => a.name.localeCompare(b.name,'he')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label className="label">תיאור העבודה</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">מחיר (₪)</label>
            <input className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">אופן תשלום</label>
            <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="">— טרם שולם —</option>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>דלג</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שמור עבודה</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   FOLLOW-UPS PAGE ("לטיפול")
   ============================================================ */
function FollowUpsPage({ data, setData }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [schedulingItem, setSchedulingItem] = useState(null);

  const items = (data.followUps || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const openItems = items.filter(i => i.status !== 'closed');
  const closedItems = items.filter(i => i.status === 'closed');

  function handleSave(itemData) {
    if (editing) {
      setData({ ...data, followUps: data.followUps.map(i => i.id === editing.id ? { ...i, ...itemData } : i) });
    } else {
      setData({ ...data, followUps: [...(data.followUps || []), { id: uid('fu'), status: 'open', createdAt: Date.now(), ...itemData }] });
    }
    setShowForm(false);
    setEditing(null);
  }

  function handleClose(item) {
    setData({ ...data, followUps: data.followUps.map(i => i.id === item.id ? { ...i, status: 'closed' } : i) });
  }

  function handleReopen(item) {
    setData({ ...data, followUps: data.followUps.map(i => i.id === item.id ? { ...i, status: 'open' } : i) });
  }

  function handleDelete(item) {
    if (!window.confirm('למחוק את הפריט?')) return;
    setData({ ...data, followUps: data.followUps.filter(i => i.id !== item.id) });
  }

  function handleSchedule(item, eventData) {
    setData({
      ...data,
      calendarEvents: [...data.calendarEvents, { id: uid('ev'), completed: false, ...eventData }],
      followUps: data.followUps.map(i => i.id === item.id ? { ...i, status: 'scheduled' } : i),
    });
    setSchedulingItem(null);
  }

  return (
    <div>
      <PageHeader
        title="לטיפול"
        subtitle="לקוחות ופניות שעדיין לא שובצו ביומן"
        action={
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} /> הוסף לטיפול
          </button>
        }
      />

      {openItems.length === 0 ? (
        <EmptyState icon={ListTodo} title="אין פריטים לטיפול" subtitle="פניות שעדיין לא שובצו ביומן יוצגו כאן" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {openItems.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.clientName}
                  {item.status === 'scheduled' && <span className="badge badge-success"><CalendarIcon size={12} /> שובץ ביומן</span>}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{item.description}</div>
                {(item.phone || item.email) && (
                  <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4, display: 'flex', gap: 12 }}>
                    {item.phone && <span><Phone size={11} style={{ verticalAlign: 'middle' }} /> {item.phone}</span>}
                    {item.email && <span><Mail size={11} style={{ verticalAlign: 'middle' }} /> {item.email}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {item.status !== 'scheduled' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setSchedulingItem(item)}>
                    <CalendarIcon size={14} /> שבץ ביומן
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(item); setShowForm(true); }}><Edit2 size={14} /></button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleClose(item)}><CheckCircle2 size={14} /> סגור</button>
                <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={() => handleDelete(item)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {closedItems.length > 0 && (
        <div>
          <SectionTitle icon={CheckCircle2} title="פריטים סגורים" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {closedItems.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 13.5, opacity: 0.7 }}>
                <div>
                  <span style={{ fontWeight: 600, textDecoration: 'line-through' }}>{item.clientName}</span> - {item.description}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleReopen(item)}>פתח מחדש</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: COLORS.alert }} onClick={() => handleDelete(item)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <FollowUpFormModal item={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} />
      )}
      {schedulingItem && (
        <ScheduleFollowUpModal item={schedulingItem} clients={data.clients} onClose={() => setSchedulingItem(null)} onSave={handleSchedule} />
      )}
    </div>
  );
}

function FollowUpFormModal({ item, onClose, onSave }) {
  const [clientName, setClientName] = useState(item?.clientName || '');
  const [description, setDescription] = useState(item?.description || '');
  const [phone, setPhone] = useState(item?.phone || '');
  const [email, setEmail] = useState(item?.email || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!clientName.trim() || !description.trim()) return;
    onSave({ clientName: clientName.trim(), description: description.trim(), phone: phone.trim(), email: email.trim() });
  }

  return (
    <Modal title={item ? 'עריכת פריט' : 'הוספה לטיפול'} onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">שם הלקוח / מתקשר *</label>
          <input className="input" value={clientName} onChange={e => setClientName(e.target.value)} required autoFocus placeholder="לדוגמה: אברהם" />
        </div>
        <div className="field">
          <label className="label">תיאור הבעיה / הפנייה *</label>
          <textarea className="textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} required placeholder="לדוגמה: דיווח על תקלה בטלפון" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="label">טלפון</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">אימייל</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שמירה</button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleFollowUpModal({ item, clients, onClose, onSave }) {
  const [date, setDate] = useState(todayStr());
  const [title, setTitle] = useState(`ביקור - ${item.clientName}`);
  const [location, setLocation] = useState('');
  const [clientId, setClientId] = useState('');

  // try to find matching client by name
  useEffect(() => {
    const match = clients.find(c => c.name.trim() === item.clientName.trim());
    if (match) setClientId(match.id);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(item, {
      date, title: title.trim(), location: location.trim(),
      clientId: clientId || null, contactPhone: item.phone || '', contactEmail: item.email || '',
      notes: item.description,
    });
  }

  return (
    <Modal title="שיבוץ ביומן" onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">תאריך *</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 }}>{gregorianToHebrewStr(new Date(date))}</div>
        </div>
        <div className="field">
          <label className="label">כותרת *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label">מיקום</label>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">שיוך ללקוח קיים (אופציונלי)</label>
          <select className="select" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— לא משויך —</option>
            {clients.slice().sort((a,b) => a.name.localeCompare(b.name,'he')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>ביטול</button>
          <button type="submit" className="btn btn-primary"><Check size={16} /> שבץ ביומן</button>
        </div>
      </form>
    </Modal>
  );
}

/* ============================================================
   NOTIFICATIONS PAGE
   ============================================================ */
function NotificationsPage({ data, setData, onSelectClient }) {
  const notifications = data.notifications || [];

  return (
    <div>
      <PageHeader title="התראות" subtitle={`${notifications.length} התראות פעילות`} />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="אין התראות" subtitle="תזכורות גביה (14 יום מראש) ותזכורות פגישות יוצגו כאן" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => (
            <div key={n.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: n.type === 'billing' ? COLORS.warnBg : '#FBEEE3',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {n.type === 'billing' ? <Wallet size={18} style={{ color: COLORS.warn }} /> : <CalendarIcon size={18} style={{ color: COLORS.copper }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{n.message}</div>
                {n.type === 'billing' && (
                  <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginTop: 4 }}>
                    תזכורת זו נשלחה גם במייל ללקוח ואליך, 14 יום לפני מועד הגביה
                  </div>
                )}
              </div>
              {n.clientId && (
                <button className="btn btn-secondary btn-sm" onClick={() => onSelectClient(n.clientId)}>
                  <ExternalLink size={14} /> לכרטסת
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 20, background: COLORS.paper, border: 'none' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={18} style={{ color: COLORS.copper, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: COLORS.slate, lineHeight: 1.6 }}>
            <strong>לתשומת לבך:</strong> שליחת מיילים אוטומטית דורשת חיבור לשירות שליחת מיילים (כמו Resend או SendGrid) בצד השרת.
            בשלב זה ההתראות מוצגות כאן באתר; כדי להפעיל שליחה אוטומטית בפועל ללקוחות ואליך, נדרשת הגדרת backend מתאים.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENT PORTAL (read-only view via shared link)
   ============================================================ */
function ClientPortal({ data, client }) {
  const ledger = computeClientLedger(data, client.id);

  return (
    <div className="app-root">
      <style>{GLOBAL_STYLES}</style>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `linear-gradient(135deg, ${COLORS.copperLight}, ${COLORS.copperDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 900, fontSize: 18,
          }}>
            ח.י
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>ח.י. חיימוביץ פתרונות תקשורת</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted }}>דו"ח עבודות ותשלומים - צפיה בלבד</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>שלום,</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{client.name}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard
            icon={ledger.netBalance >= 0 ? ArrowDownRight : Wallet}
            label={ledger.netBalance >= 0 ? 'יתרה לתשלום' : 'יתרת זכות'}
            value={fmtCurrency(Math.abs(ledger.netBalance))}
            color={ledger.netBalance > 0 ? COLORS.alert : ledger.netBalance < 0 ? COLORS.success : COLORS.slate}
            bg={ledger.netBalance > 0 ? COLORS.alertBg : ledger.netBalance < 0 ? COLORS.successBg : COLORS.paper}
          />
          <StatCard icon={Briefcase} label="סך עבודות" value={ledger.jobsWithStatus.length} color={COLORS.copper} bg="#FBEEE3" />
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', fontWeight: 700, fontSize: 15, borderBottom: `1px solid ${COLORS.border}` }}>
            עבודות
          </div>
          {ledger.jobsWithStatus.length === 0 ? (
            <div style={{ padding: 20 }}><EmptyState icon={Briefcase} title="אין עבודות להצגה" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 500 }}>
                <thead>
                  <tr style={{ background: COLORS.paper, textAlign: 'right' }}>
                    <th style={thStyle}>תאריך</th>
                    <th style={thStyle}>תיאור</th>
                    <th style={thStyle}>מחיר</th>
                    <th style={thStyle}>סטטוס</th>
                    <th style={thStyle}>אופן תשלום</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.jobsWithStatus.slice().reverse().map(job => (
                    <tr key={job.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={tdStyle}>{fmtDate(job.date)}</td>
                      <td style={tdStyle}>{job.description}</td>
                      <td style={tdStyle}>{fmtCurrency(job.price)}</td>
                      <td style={tdStyle}><PaymentStatusBadge status={job.status} /></td>
                      <td style={tdStyle}>{job.paymentMethod ? <MethodLabel method={job.paymentMethod} /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: COLORS.textMuted }}>
          קישור זה הינו לצפיה בלבד · ח.י. חיימוביץ פתרונות תקשורת
        </div>
      </div>
    </div>
  );
}
