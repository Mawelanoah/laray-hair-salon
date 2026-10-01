/**
 * Seed Perfect Beauty Studio with verified data only
 */
const bcrypt = require('bcryptjs');
const { read, write, uuidv4 } = require('./db');

async function seed() {
  const db = read();

  // Admin account (change password after first login)
  const hash = await bcrypt.hash('admin123', 10);
  db.admins = [{
    admin_id: uuidv4(),
    email: 'admin@perfectbeautystudio.co.za',
    password_hash: hash,
    name: 'Salon Admin',
    created_at: new Date().toISOString()
  }];

  // Professionals (verified from Fresha)
  const pros = [
    { name: 'Nicole', role: 'Nail Technician' },
    { name: 'Mercy', role: 'Nail Technician' },
    { name: 'Thato', role: 'Nail Technician' },
    { name: 'Shalom', role: 'Nail Technician' },
    { name: 'Elelwani', role: 'Nail Technician' },
    { name: 'Mpho', role: 'Nail Technician' },
    { name: 'Portia', role: 'Nail Technician' },
    { name: 'Karen', role: 'Nail Technician' },
    { name: 'Caroline', role: 'Lash / Brow / Wax Technician' }
  ];
  db.professionals = pros.map((p) => ({
    professional_id: uuidv4(),
    name: p.name,
    role: p.role,
    photo: null,
    description: '',
    active: true
  }));

  // Services (verified from Fresha public listing)
  const services = [
    { category: 'Nails', name: 'Gel Overlay (Rubber Base)', description: 'Rubber base gel overlay for strong, long-lasting results.', price: 390, duration: 105 },
    { category: 'Nails', name: 'Gel Overlay Enhance (hard gel/polygel)', description: 'Hard gel or polygel enhancement for added strength and length.', price: 470, duration: 105 },
    { category: 'Nails', name: 'Gel Overlay Toes', description: 'Durable gel overlay for toes with a polished finish.', price: 260, duration: 60 },
    { category: 'Nails', name: 'Classic French / Ombre (full set)', description: 'Classic French or ombre finish as an add-on or full set.', price: 50, duration: 15 },
    { category: 'Lashes', name: 'Wet Look Lashes', description: 'Full set of wet look lash extensions for a glossy finish.', price: 400, duration: 120 },
    { category: 'Lashes', name: 'Angel Volume Lashes', description: 'Voluminous angel lash extensions for a soft look.', price: 450, duration: 120 },
    { category: 'Brows', name: 'Brow Tint Only', description: 'Professional eyebrow tinting to define your brows.', price: 190, duration: 20 },
    { category: 'Brows', name: 'Eyebrow Shape', description: 'Expert brow shaping tailored to your face.', price: 230, duration: 20 },
    { category: 'Waxing', name: 'Brazilian', description: 'Professional Brazilian waxing.', price: 300, duration: 35 },
    { category: 'Waxing', name: 'Hollywood', description: 'Full Hollywood wax for a complete result.', price: 330, duration: 45 },
    { category: 'Waxing', name: 'Extended Bikini', description: 'Extended bikini wax for a neat finish.', price: 285, duration: 45 },
    { category: 'Waxing', name: 'Basic Bikini', description: 'Basic bikini line wax.', price: 260, duration: 30 },
    { category: 'Waxing', name: 'Wax Bundle (Full Face)', description: 'Full face wax bundle — multiple facial areas.', price: 350, duration: 110 }
  ];
  db.services = services.map((s) => ({
    service_id: uuidv4(),
    category: s.category,
    name: s.name,
    description: s.description,
    price: s.price,
    duration: s.duration,
    active: true
  }));

  // Service options (common add-ons — prices as placeholders editable in admin)
  // Only generic options; salon can edit prices in dashboard
  db.service_options = [];
  const gelServices = db.services.filter((s) => s.name.includes('Gel Overlay') && !s.name.includes('Toes'));
  gelServices.forEach((svc) => {
    db.service_options.push(
      { option_id: uuidv4(), service_id: svc.service_id, name: 'Removal', price: 0, included: false, active: true, note: 'Set price in admin' },
      { option_id: uuidv4(), service_id: svc.service_id, name: 'Wrap', price: 0, included: false, active: true, note: 'Set price in admin' },
      { option_id: uuidv4(), service_id: svc.service_id, name: 'Base', price: 0, included: true, active: true, note: 'Included' }
    );
  });

  // Link all nail techs to nail services, Caroline to lashes/brows/wax
  db.professional_services = [];
  db.professionals.forEach((pro) => {
    db.services.forEach((svc) => {
      const isNail = svc.category === 'Nails';
      const isOther = ['Lashes', 'Brows', 'Waxing'].includes(svc.category);
      if ((pro.role.includes('Nail') && isNail) || (pro.name === 'Caroline' && isOther) || pro.role.includes('Nail')) {
        // All nail techs can do nails; Caroline does lashes/brows/wax; for simplicity all can do all active services
        db.professional_services.push({
          professional_id: pro.professional_id,
          service_id: svc.service_id
        });
      }
    });
  });
  // Simplify: every active pro can do every active service (salon can restrict in admin)
  db.professional_services = [];
  db.professionals.forEach((pro) => {
    db.services.forEach((svc) => {
      db.professional_services.push({
        professional_id: pro.professional_id,
        service_id: svc.service_id
      });
    });
  });

  db.appointments = [];
  db.customers = [];
  db.breaks = [];
  db.closed_days = [];
  db.working_hours = [];

  write(db);
  console.log('Seed complete.');
  console.log('Admin login: admin@perfectbeautystudio.co.za / admin123');
  console.log('CHANGE THIS PASSWORD after first login.');
}

seed().catch(console.error);
