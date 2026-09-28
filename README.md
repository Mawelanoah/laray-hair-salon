# Cloud Nails Studio — Demo Website

Premium, mobile-first booking website for **Cloud Nails Studio**.

## Files

```
/
├── index.html      ← Main page
├── style.css       ← All styles
├── script.js       ← Booking logic + UI
├── assets/         ← Put real images here
└── README.md
```

## Confirmed business details used

- **Name:** Cloud Nails Studio  
- **Type:** Nail salon  
- **Address:** 284 Ben Viljoen St, Pretoria North, Pretoria, 0182, South Africa  
- **WhatsApp:** +27 75 040 4794  
- **Rating:** 5.0 from 25 reviews  

Everything else is clearly marked **PLACEHOLDER — CONFIRM WITH BUSINESS**.

---

## How to replace images

Drop real photos into the `assets/` folder with these exact names:

| File | Used for |
|------|----------|
| `assets/hero.jpg` | Hero section |
| `assets/logo.png` | Logo (optional) |
| `assets/service-1.jpg` | Gel Overlay |
| `assets/service-2.jpg` | Acrylic Full Set |
| `assets/service-3.jpg` | Nail Art |
| `assets/service-4.jpg` | Pedicure |
| `assets/gallery-1.jpg` … `gallery-6.jpg` | Gallery |
| `assets/about.jpg` | About section |

Then update the HTML placeholders to use real `<img>` tags (search for the file names).

## How to edit services & prices

In `index.html`, find the service cards and the `<select id="service">` dropdown.  
Update names, descriptions, prices (`R___`) and durations (`___ min`).

Also update the matching options in the booking form select.

## How to add social links

In `index.html`, search for `id="socialInstagram"` and `id="socialTikTok"` and replace `href="#"`.

## How to embed Google Maps

Replace the map placeholder div with a Google Maps embed iframe (Get embed code from Google Maps → Share → Embed a map).

## How to change WhatsApp number

In `script.js`, edit:

```js
whatsappNumber: "27750404794",
```

And update any `https://wa.me/27750404794` links in `index.html`.

## Deploy on GitHub Pages

1. Push this folder to a GitHub repository.
2. Settings → Pages → Deploy from branch `main` (root).
3. Site will be live at `https://yourusername.github.io/repo-name/`.

## Customer journey

Instagram / TikTok → Website → Services → Book this service → Date + Time → Details → Continue to WhatsApp → Studio confirms.

---

© 2026 Cloud Nails Studio — Demo website for owner review.
