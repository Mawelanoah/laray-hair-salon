/**
 * Perfect Beauty Studio — Data Layer
 * File-based store that mirrors a real relational schema.
 * Swap this module for SQLite/PostgreSQL without changing route handlers.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  customers: [],
  professionals: [],
  services: [],
  service_options: [],
  professional_services: [],
  working_hours: [],
  breaks: [],
  closed_days: [],
  appointments: [],
  admins: [],
  settings: {
    salon_name: 'Perfect Beauty Studio',
    address: '641 Rubenstein Drive, Moreleta Park, Pretoria',
    phone: '+27673897135',
    whatsapp: '+27673897135',
    email: '',
    booking_prefix: 'PBS',
    booking_counter: 1
  },
  salon_hours: {
    monday:    { open: '09:00', close: '18:00' },
    tuesday:   { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday:  { open: '09:00', close: '18:00' },
    friday:    { open: '09:00', close: '18:00' },
    saturday:  { open: '09:00', close: '18:00' },
    sunday:    { open: '09:00', close: '16:00' }
  }
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

function read() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function write(data) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextBookingRef(db) {
  const year = new Date().getFullYear();
  const num = String(db.settings.booking_counter).padStart(4, '0');
  db.settings.booking_counter += 1;
  return `${db.settings.booking_prefix}-${year}-${num}`;
}

/** Check if a professional has a conflicting appointment */
function hasConflict(db, professionalId, date, startTime, endTime, excludeId = null) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const s = toMin(startTime);
  const e = toMin(endTime);
  return db.appointments.some((a) => {
    if (a.professional_id !== professionalId) return false;
    if (a.date !== date) return false;
    if (a.status === 'cancelled') return false;
    if (excludeId && a.appointment_id === excludeId) return false;
    const as = toMin(a.start_time);
    const ae = toMin(a.end_time);
    return s < ae && e > as; // overlap
  });
}

/** Generate time slots for a professional on a date */
function getAvailableSlots(db, professionalId, date, durationMinutes) {
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const d = new Date(date + 'T12:00:00');
  const dayName = dayNames[d.getDay()];

  // Closed day?
  if (db.closed_days.includes(date)) return [];

  // Salon hours
  const hours = db.salon_hours[dayName];
  if (!hours || !hours.open) return [];

  // Professional working hours override
  let open = hours.open;
  let close = hours.close;
  const pHours = db.working_hours.find(
    (w) => w.professional_id === professionalId && w.day === dayName
  );
  if (pHours) {
    open = pHours.opening_time;
    close = pHours.closing_time;
  }

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMin = toMin(open);
  const endMin = toMin(close);
  const slots = [];
  const step = 30; // 30-min intervals

  // Past times today
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (let t = startMin; t + durationMinutes <= endMin; t += step) {
    if (date === todayStr && t <= nowMin) continue;

    const startTime = toTime(t);
    const endTime = toTime(t + durationMinutes);

    // Breaks
    const onBreak = db.breaks.some((b) => {
      if (b.professional_id !== professionalId || b.day !== dayName) return false;
      const bs = toMin(b.start_time);
      const be = toMin(b.end_time);
      return t < be && t + durationMinutes > bs;
    });
    if (onBreak) continue;

    if (!hasConflict(db, professionalId, date, startTime, endTime)) {
      slots.push(startTime);
    }
  }
  return slots;
}

module.exports = {
  read,
  write,
  nextBookingRef,
  hasConflict,
  getAvailableSlots,
  uuidv4
};
