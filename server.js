/**
 * Perfect Beauty Studio — Booking API
 * Real appointment system with double-booking protection
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const {
  read, write, nextBookingRef, hasConflict, getAvailableSlots, uuidv4
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'pbs-change-this-secret-in-production';
const FRONTEND = process.env.FRONTEND_URL || '*';

app.use(cors({ origin: FRONTEND === '*' ? true : FRONTEND }));
app.use(express.json());

// Serve frontend & admin static files when deployed together
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// ─── Auth middleware ───────────────────────────────────────
function authAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── PUBLIC: Services ──────────────────────────────────────
app.get('/api/services', (req, res) => {
  const db = read();
  const list = db.services.filter((s) => s.active);
  const options = db.service_options.filter((o) => o.active);
  res.json({
    services: list,
    options,
    categories: [...new Set(list.map((s) => s.category))]
  });
});

app.get('/api/services/:id', (req, res) => {
  const db = read();
  const service = db.services.find((s) => s.service_id === req.params.id && s.active);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const options = db.service_options.filter(
    (o) => o.service_id === service.service_id && o.active
  );
  res.json({ service, options });
});

// ─── PUBLIC: Professionals ─────────────────────────────────
app.get('/api/professionals', (req, res) => {
  const db = read();
  const serviceId = req.query.service_id;
  let list = db.professionals.filter((p) => p.active);
  if (serviceId) {
    const allowed = new Set(
      db.professional_services
        .filter((ps) => ps.service_id === serviceId)
        .map((ps) => ps.professional_id)
    );
    list = list.filter((p) => allowed.has(p.professional_id));
  }
  res.json({ professionals: list });
});

// ─── PUBLIC: Availability ──────────────────────────────────
app.get('/api/availability', (req, res) => {
  const { professional_id, service_id, date } = req.query;
  if (!professional_id || !service_id || !date) {
    return res.status(400).json({ error: 'professional_id, service_id and date required' });
  }
  const db = read();
  const service = db.services.find((s) => s.service_id === service_id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  // Past dates blocked
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) return res.json({ slots: [] });

  const slots = getAvailableSlots(db, professional_id, date, service.duration);
  res.json({ slots, duration: service.duration });
});

// Calendar helper: which dates in a month have any availability
app.get('/api/availability/month', (req, res) => {
  const { professional_id, service_id, year, month } = req.query;
  if (!professional_id || !service_id || !year || !month) {
    return res.status(400).json({ error: 'Missing params' });
  }
  const db = read();
  const service = db.services.find((s) => s.service_id === service_id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const y = parseInt(year, 10);
  const m = parseInt(month, 10); // 1-12
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const available = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (date < today) continue;
    const slots = getAvailableSlots(db, professional_id, date, service.duration);
    if (slots.length > 0) available.push(date);
  }
  res.json({ available });
});

// ─── PUBLIC: Create booking (with double-booking protection) ─
app.post('/api/bookings', (req, res) => {
  const {
    service_id,
    option_ids = [],
    professional_id,
    date,
    start_time,
    customer_name,
    customer_phone,
    customer_email = '',
    notes = ''
  } = req.body;

  if (!service_id || !professional_id || !date || !start_time || !customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const db = read();
  const service = db.services.find((s) => s.service_id === service_id && s.active);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const pro = db.professionals.find((p) => p.professional_id === professional_id && p.active);
  if (!pro) return res.status(404).json({ error: 'Professional not found' });

  // Calculate end time
  let duration = service.duration;
  let total = service.price;
  const selectedOptions = [];
  (option_ids || []).forEach((oid) => {
    const opt = db.service_options.find((o) => o.option_id === oid && o.active);
    if (opt) {
      selectedOptions.push(opt);
      if (!opt.included) total += opt.price || 0;
    }
  });

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const end_time = toTime(toMin(start_time) + duration);

  // CRITICAL: server-side double-booking check
  if (hasConflict(db, professional_id, date, start_time, end_time)) {
    return res.status(409).json({
      error: 'This time slot is no longer available. Please choose another time.'
    });
  }

  // Also verify slot is still in available list
  const slots = getAvailableSlots(db, professional_id, date, duration);
  if (!slots.includes(start_time)) {
    return res.status(409).json({
      error: 'This time slot is no longer available. Please choose another time.'
    });
  }

  // Upsert customer by phone
  let customer = db.customers.find((c) => c.phone === customer_phone);
  if (!customer) {
    customer = {
      customer_id: uuidv4(),
      name: customer_name,
      phone: customer_phone,
      email: customer_email || '',
      created_at: new Date().toISOString()
    };
    db.customers.push(customer);
  } else {
    customer.name = customer_name;
    if (customer_email) customer.email = customer_email;
  }

  const booking_reference = nextBookingRef(db);
  const appointment = {
    appointment_id: uuidv4(),
    booking_reference,
    customer_id: customer.customer_id,
    professional_id,
    service_id,
    option_ids: selectedOptions.map((o) => o.option_id),
    option_names: selectedOptions.map((o) => o.name),
    date,
    start_time,
    end_time,
    duration,
    total_price: total,
    status: 'confirmed',
    notes: notes || '',
    created_at: new Date().toISOString()
  };
  db.appointments.push(appointment);
  write(db);

  res.status(201).json({
    success: true,
    appointment: {
      ...appointment,
      service_name: service.name,
      professional_name: pro.name,
      customer_name: customer.name,
      customer_phone: customer.phone
    }
  });
});

// ─── PUBLIC: Get booking by reference ──────────────────────
app.get('/api/bookings/:ref', (req, res) => {
  const db = read();
  const a = db.appointments.find((x) => x.booking_reference === req.params.ref);
  if (!a) return res.status(404).json({ error: 'Booking not found' });
  const service = db.services.find((s) => s.service_id === a.service_id);
  const pro = db.professionals.find((p) => p.professional_id === a.professional_id);
  const customer = db.customers.find((c) => c.customer_id === a.customer_id);
  res.json({
    appointment: {
      ...a,
      service_name: service?.name,
      professional_name: pro?.name,
      customer_name: customer?.name,
      customer_phone: customer?.phone
    }
  });
});

// ─── PUBLIC: Settings / hours ──────────────────────────────
app.get('/api/settings', (req, res) => {
  const db = read();
  res.json({
    salon_name: db.settings.salon_name,
    address: db.settings.address,
    phone: db.settings.phone,
    whatsapp: db.settings.whatsapp,
    salon_hours: db.salon_hours
  });
});

// ─── ADMIN LOGIN ───────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const db = read();
  const admin = db.admins.find((a) => a.email === email);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { admin_id: admin.admin_id, email: admin.email },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, name: admin.name });
});

// ─── ADMIN: Dashboard stats ────────────────────────────────
app.get('/api/admin/dashboard', authAdmin, (req, res) => {
  const db = read();
  const today = new Date().toISOString().slice(0, 10);
  const apps = db.appointments;
  res.json({
    today: apps.filter((a) => a.date === today && a.status !== 'cancelled').length,
    upcoming: apps.filter((a) => a.date >= today && a.status === 'confirmed').length,
    total: apps.length,
    cancelled: apps.filter((a) => a.status === 'cancelled').length,
    recent: apps
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 10)
      .map((a) => enrichAppointment(db, a))
  });
});

function enrichAppointment(db, a) {
  const service = db.services.find((s) => s.service_id === a.service_id);
  const pro = db.professionals.find((p) => p.professional_id === a.professional_id);
  const customer = db.customers.find((c) => c.customer_id === a.customer_id);
  return {
    ...a,
    service_name: service?.name,
    professional_name: pro?.name,
    customer_name: customer?.name,
    customer_phone: customer?.phone
  };
}

// ─── ADMIN: Appointments ───────────────────────────────────
app.get('/api/admin/appointments', authAdmin, (req, res) => {
  const db = read();
  let list = db.appointments.map((a) => enrichAppointment(db, a));
  if (req.query.date) list = list.filter((a) => a.date === req.query.date);
  if (req.query.professional_id) {
    list = list.filter((a) => a.professional_id === req.query.professional_id);
  }
  if (req.query.status) list = list.filter((a) => a.status === req.query.status);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    list = list.filter(
      (a) =>
        (a.customer_name || '').toLowerCase().includes(q) ||
        (a.customer_phone || '').includes(q) ||
        (a.booking_reference || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  res.json({ appointments: list });
});

app.patch('/api/admin/appointments/:id', authAdmin, (req, res) => {
  const db = read();
  const a = db.appointments.find((x) => x.appointment_id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });

  const { status, date, start_time, professional_id, notes } = req.body;
  if (status) a.status = status;
  if (notes !== undefined) a.notes = notes;

  // Reschedule with conflict check
  if (date || start_time || professional_id) {
    const newDate = date || a.date;
    const newStart = start_time || a.start_time;
    const newPro = professional_id || a.professional_id;
    const service = db.services.find((s) => s.service_id === a.service_id);
    const duration = a.duration || service?.duration || 60;
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const newEnd = toTime(toMin(newStart) + duration);
    if (hasConflict(db, newPro, newDate, newStart, newEnd, a.appointment_id)) {
      return res.status(409).json({ error: 'Conflict with existing appointment' });
    }
    a.date = newDate;
    a.start_time = newStart;
    a.end_time = newEnd;
    a.professional_id = newPro;
  }
  write(db);
  res.json({ appointment: enrichAppointment(db, a) });
});

// ─── ADMIN: Professionals CRUD ─────────────────────────────
app.get('/api/admin/professionals', authAdmin, (req, res) => {
  res.json({ professionals: read().professionals });
});

app.post('/api/admin/professionals', authAdmin, (req, res) => {
  const db = read();
  const pro = {
    professional_id: uuidv4(),
    name: req.body.name,
    role: req.body.role || '',
    photo: req.body.photo || null,
    description: req.body.description || '',
    active: true
  };
  db.professionals.push(pro);
  write(db);
  res.status(201).json({ professional: pro });
});

app.patch('/api/admin/professionals/:id', authAdmin, (req, res) => {
  const db = read();
  const pro = db.professionals.find((p) => p.professional_id === req.params.id);
  if (!pro) return res.status(404).json({ error: 'Not found' });
  ['name', 'role', 'photo', 'description', 'active'].forEach((k) => {
    if (req.body[k] !== undefined) pro[k] = req.body[k];
  });
  write(db);
  res.json({ professional: pro });
});

// ─── ADMIN: Services CRUD ──────────────────────────────────
app.get('/api/admin/services', authAdmin, (req, res) => {
  const db = read();
  res.json({ services: db.services, options: db.service_options });
});

app.post('/api/admin/services', authAdmin, (req, res) => {
  const db = read();
  const svc = {
    service_id: uuidv4(),
    category: req.body.category,
    name: req.body.name,
    description: req.body.description || '',
    price: Number(req.body.price) || 0,
    duration: Number(req.body.duration) || 60,
    active: true
  };
  db.services.push(svc);
  write(db);
  res.status(201).json({ service: svc });
});

app.patch('/api/admin/services/:id', authAdmin, (req, res) => {
  const db = read();
  const svc = db.services.find((s) => s.service_id === req.params.id);
  if (!svc) return res.status(404).json({ error: 'Not found' });
  ['category', 'name', 'description', 'price', 'duration', 'active'].forEach((k) => {
    if (req.body[k] !== undefined) svc[k] = req.body[k];
  });
  write(db);
  res.json({ service: svc });
});

// Service options
app.post('/api/admin/options', authAdmin, (req, res) => {
  const db = read();
  const opt = {
    option_id: uuidv4(),
    service_id: req.body.service_id,
    name: req.body.name,
    price: Number(req.body.price) || 0,
    included: !!req.body.included,
    active: true
  };
  db.service_options.push(opt);
  write(db);
  res.status(201).json({ option: opt });
});

app.patch('/api/admin/options/:id', authAdmin, (req, res) => {
  const db = read();
  const opt = db.service_options.find((o) => o.option_id === req.params.id);
  if (!opt) return res.status(404).json({ error: 'Not found' });
  ['name', 'price', 'included', 'active'].forEach((k) => {
    if (req.body[k] !== undefined) opt[k] = req.body[k];
  });
  write(db);
  res.json({ option: opt });
});

// ─── ADMIN: Hours & closed days ────────────────────────────
app.get('/api/admin/hours', authAdmin, (req, res) => {
  const db = read();
  res.json({
    salon_hours: db.salon_hours,
    working_hours: db.working_hours,
    breaks: db.breaks,
    closed_days: db.closed_days
  });
});

app.put('/api/admin/hours', authAdmin, (req, res) => {
  const db = read();
  if (req.body.salon_hours) db.salon_hours = req.body.salon_hours;
  if (req.body.closed_days) db.closed_days = req.body.closed_days;
  if (req.body.working_hours) db.working_hours = req.body.working_hours;
  if (req.body.breaks) db.breaks = req.body.breaks;
  write(db);
  res.json({ ok: true });
});

// ─── ADMIN: Settings ───────────────────────────────────────
app.get('/api/admin/settings', authAdmin, (req, res) => {
  res.json({ settings: read().settings });
});

app.put('/api/admin/settings', authAdmin, (req, res) => {
  const db = read();
  Object.assign(db.settings, req.body);
  write(db);
  res.json({ settings: db.settings });
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPA fallbacks
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/index.html'));
});

app.listen(PORT, () => {
  console.log(`PBS Booking API running on http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin/`);
  console.log(`Site:  http://localhost:${PORT}/`);
});
