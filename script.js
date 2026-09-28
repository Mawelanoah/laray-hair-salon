/**
 * Cloud Nails Studio — Booking & UI Script
 * Vanilla JS · No frameworks
 * Structured for future calendar / database integration
 */

(function () {
  "use strict";

  // ============================================
  // CONFIG — edit in one place
  // ============================================
  const CONFIG = {
    whatsappNumber: "27750404794", // +27 75 040 4794 without + or spaces
    studioName: "Cloud Nails Studio",
    // Demo time slots (replace with real availability later)
    timeSlots: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
  };

  // ============================================
  // DOM REFERENCES
  // ============================================
  const header = document.getElementById("header");
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const bookingForm = document.getElementById("bookingForm");
  const serviceSelect = document.getElementById("service");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const timeSlotsContainer = document.getElementById("timeSlots");
  const formMessage = document.getElementById("formMessage");
  const mobileBookBtn = document.getElementById("mobileBookBtn");

  // ============================================
  // MOBILE NAVIGATION
  // ============================================
  function initNav() {
    if (!navToggle || !nav) return;

    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    // Close menu when a nav link is clicked
    nav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
        navToggle.focus();
      }
    });
  }

  // ============================================
  // DATE PICKER — prevent past dates
  // ============================================
  function initDatePicker() {
    if (!dateInput) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;

    // Optional: set default to tomorrow for better UX
    // const tomorrow = new Date(today);
    // tomorrow.setDate(tomorrow.getDate() + 1);
    // dateInput.value = tomorrow.toISOString().slice(0, 10);
  }

  // ============================================
  // TIME SLOT SELECTION
  // ============================================
  function initTimeSlots() {
    if (!timeSlotsContainer || !timeInput) return;

    timeSlotsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".time-slot");
      if (!btn) return;

      // Clear previous selection
      timeSlotsContainer.querySelectorAll(".time-slot").forEach((el) => {
        el.classList.remove("is-selected");
        el.setAttribute("aria-pressed", "false");
      });

      // Select this one
      btn.classList.add("is-selected");
      btn.setAttribute("aria-pressed", "true");
      timeInput.value = btn.dataset.time || "";
    });

    // Keyboard support for time slots
    timeSlotsContainer.querySelectorAll(".time-slot").forEach((btn) => {
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("role", "button");
    });
  }

  // ============================================
  // "BOOK THIS SERVICE" BUTTONS
  // ============================================
  function initServiceButtons() {
    document.querySelectorAll(".book-service-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const service = btn.dataset.service;
        if (service && serviceSelect) {
          serviceSelect.value = service;
          // Visual feedback
          serviceSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
        // Smooth scroll to booking form
        const bookingSection = document.getElementById("booking");
        if (bookingSection) {
          bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // Focus the service select for accessibility
        if (serviceSelect) {
          setTimeout(() => serviceSelect.focus(), 400);
        }
      });
    });
  }

  // ============================================
  // FORM VALIDATION
  // ============================================
  function validateForm() {
    const errors = [];

    const service = serviceSelect?.value?.trim();
    const date = dateInput?.value;
    const time = timeInput?.value;
    const name = document.getElementById("name")?.value?.trim();
    const phone = document.getElementById("phone")?.value?.trim();
    const confirm = document.getElementById("confirm")?.checked;

    if (!service) errors.push("Please select a service.");
    if (!date) errors.push("Please choose a preferred date.");
    if (!time) errors.push("Please select a preferred time.");
    if (!name) errors.push("Please enter your name.");
    if (!phone) errors.push("Please enter your WhatsApp number.");
    if (!confirm) errors.push("Please confirm that you understand this is a booking request.");

    // Basic phone check (South African style or general)
    if (phone && phone.replace(/\D/g, "").length < 9) {
      errors.push("Please enter a valid WhatsApp number.");
    }

    // Past date check (extra safety)
    if (date) {
      const selected = new Date(date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.push("Please select a date today or in the future.");
      }
    }

    return errors;
  }

  // ============================================
  // BUILD WHATSAPP MESSAGE
  // ============================================
  function buildWhatsAppMessage(data) {
    const lines = [
      `Hi ${CONFIG.studioName}! 👋`,
      ``,
      `I'd like to request an appointment:`,
      ``,
      `• Service: ${data.service}`,
      `• Date: ${data.date}`,
      `• Time: ${data.time}`,
      `• Name: ${data.name}`,
      `• WhatsApp: ${data.phone}`,
    ];

    if (data.notes) {
      lines.push(`• Notes: ${data.notes}`);
    }

    lines.push(``, `Please confirm if this time is available. Thank you!`);

    return lines.join("\n");
  }

  function openWhatsApp(message) {
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ============================================
  // FORM SUBMIT
  // ============================================
  function initForm() {
    if (!bookingForm) return;

    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Clear previous message
      if (formMessage) {
        formMessage.hidden = true;
        formMessage.className = "form-message";
        formMessage.textContent = "";
      }

      const errors = validateForm();

      if (errors.length > 0) {
        showMessage(errors.join(" "), "error");
        return;
      }

      const data = {
        service: serviceSelect.value.trim(),
        date: formatDateForMessage(dateInput.value),
        time: timeInput.value,
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        notes: document.getElementById("notes")?.value?.trim() || "",
      };

      const message = buildWhatsAppMessage(data);

      // Show confirmation before opening WhatsApp
      showMessage(
        "Opening WhatsApp with your booking request… If nothing opens, please message us on 075 040 4794.",
        "success"
      );

      // Small delay so user sees the message
      setTimeout(() => {
        openWhatsApp(message);
      }, 600);

      // Future-ready: here you could also POST to an API / database
      // e.g. saveBooking(data).then(...)
    });
  }

  function formatDateForMessage(isoDate) {
    if (!isoDate) return "";
    try {
      const d = new Date(isoDate + "T00:00:00");
      return d.toLocaleDateString("en-ZA", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  }

  function showMessage(text, type) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.className = `form-message is-${type}`;
    formMessage.hidden = false;
    formMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ============================================
  // SMOOTH SCROLL FOR ANCHOR LINKS (fallback)
  // ============================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // ============================================
  // HIDE MOBILE BOOK BTN WHEN FORM IS IN VIEW
  // ============================================
  function initMobileBookVisibility() {
    if (!mobileBookBtn) return;
    const bookingSection = document.getElementById("booking");
    if (!bookingSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Hide fixed button when booking form is visible
          if (entry.isIntersecting) {
            mobileBookBtn.style.opacity = "0";
            mobileBookBtn.style.pointerEvents = "none";
          } else {
            mobileBookBtn.style.opacity = "1";
            mobileBookBtn.style.pointerEvents = "auto";
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(bookingSection);
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    initNav();
    initDatePicker();
    initTimeSlots();
    initServiceButtons();
    initForm();
    initSmoothScroll();
    initMobileBookVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
