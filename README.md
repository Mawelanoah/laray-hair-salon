# Perfect Beauty Studio — Custom Booking System

A complete salon website with a **real on-site booking system** (no Fresha redirect) and a private admin dashboard.

## What is included

### Customer website
- Home page (hero, services preview, how booking works, contact, hours)
- **Book Appointment** multi-step wizard:
  1. Choose service (by category)
  2. Service options / add-ons (price updates)
  3. Choose professional (or Any Available)
  4. Choose date (calendar; closed/past days disabled)
  5. Choose time (real availability; no double bookings)
  6. Customer details (name, phone required)
  7. Summary → Confirm
  8. Confirmation + booking reference (e.g. PBS-2026-0001)

### Admin dashboard (`/admin/`)
- Login (JWT, bcrypt password)
- Dashboard stats (today, upcoming, total, cancelled)
- Appointments list — cancel / mark completed
- View services & professionals
- Server-side double-booking protection

### Data
Verified salon data only:
- Address: 641 Rubenstein Drive, Moreleta Park, Pretoria
- Hours: Mon–Sat 09:00–18:00, Sun 09:00–16:00
- Services & prices from public Fresha listing
- Team: Nicole, Mercy, Thato, Shalom, Elelwani, Mpho, Portia, Karen, Caroline

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, vanilla JS |
| Backend | Node.js + Express |
| Database | JSON file store (schema ready for SQLite/PostgreSQL) |
| Auth | bcrypt + JWT |

The data layer (`backend/db.js`) mirrors a relational schema. You can later replace it with SQLite or PostgreSQL without rewriting route handlers.

## Setup (local)

```bash
cd backend
npm install
npm run seed          # creates admin + services + team
npm start             # http://localhost:3001
```

- Website: http://localhost:3001/
- Book:    http://localhost:3001/book.html
- Admin:   http://localhost:3001/admin/

**Default admin**
- Email: `admin@perfectbeautystudio.co.za`
- Password: `admin123`  
**Change this password after first login.**

## Environment variables (optional)

Create `backend/.env`:

```
PORT=3001
JWT_SECRET=your-long-random-secret
FRONTEND_URL=*
```

## Deploy (small business / free tier)

1. **Backend + static files together**  
   Deploy the whole `pbs-booking` folder to:
   - Railway
   - Render
   - Fly.io  
   Start command: `cd backend && npm install && npm run seed && npm start`

2. **Or** host frontend on any static host and API separately; set `FRONTEND_URL` and point the frontend API base URL to your API.

## Database file

Data is stored in `backend/data/db.json`.  
Back up this file regularly. For production scale, migrate to PostgreSQL (Supabase free tier works well).

## Important notes

- Bookings are stored on the server — not on WhatsApp.
- Double-booking is blocked on the server before an appointment is saved.
- Add-on option prices for “Removal” / “Wrap” start at R0 — set real prices in admin/API once the salon confirms them.
- Photo placeholders are ready for real salon images.
