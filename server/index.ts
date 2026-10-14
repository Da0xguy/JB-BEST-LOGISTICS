import express from 'express';
import { createServer } from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { config } from './config';
import { connectDatabase } from './db';
import { ActivityLog, AppointmentBooking, AuthVerification, MailboxProfile, Notification, Payment, PickupJob, RiderProfile, Shipment, User, type AppointmentService, type DeliveryOption, type Role, type ShipmentStatus } from './models';
import { allowRoles, issueToken, publicUser, requireAuth, type AuthRequest } from './auth';
import { calculateQuote, isAfterDropoffCutoff } from './pricing';
import { ApiError } from './controllers/apiError';
import v1Router from './routes/v1';
import { emitToShipment, initializeRealtime } from './realtime';
import { dispatchQueuedShipments } from './services/dispatchService';
import { isEmailConfigured, sendMail } from './lib/email';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/v1', v1Router);

const asyncRoute = (handler: express.RequestHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const verificationRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please try again later.' },
});
const verificationAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please try again later.' },
});

const ensureEmailConfigured = () => {
  if (!isEmailConfigured()) {
    throw new ApiError(503, 'Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL, or configure SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.');
  }
};

const hashVerificationCode = (code: string) =>
  crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');

const issueVerificationCode = async (
  email: string,
  purpose: 'registration' | 'password_reset',
  details: { name?: string; passwordHash?: string } = {},
) => {
  ensureEmailConfigured();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const challenge = await AuthVerification.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        codeHash: hashVerificationCode(code),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        ...details,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  try {
    await sendMail(
      email,
      purpose === 'registration' ? 'Verify your JB & Best account' : 'Reset your JB & Best password',
      `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
    );
  } catch (error) {
    await AuthVerification.deleteOne({ _id: challenge._id });
    throw error;
  }
};

const verifyCode = async (email: string, purpose: 'registration' | 'password_reset', code: string) => {
  const challenge = await AuthVerification.findOne({ email, purpose });
  if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= 5) {
    if (challenge) await AuthVerification.deleteOne({ _id: challenge._id });
    return null;
  }
  const expected = Buffer.from(challenge.codeHash, 'hex');
  const supplied = Buffer.from(hashVerificationCode(code), 'hex');
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    await AuthVerification.updateOne(
      { _id: challenge._id, attempts: challenge.attempts },
      { $inc: { attempts: 1 } },
    );
    return null;
  }
  return challenge;
};

const createTrackingId = async () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (;;) {
    const candidate = Array.from({ length: 20 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    if (!(await Shipment.exists({ trackingId: candidate }))) return candidate;
  }
};

const logActivity = (req: AuthRequest, action: string, resource: string, resourceId?: string, metadata?: unknown) =>
  ActivityLog.create({ actorId: req.user?._id, action, resource, resourceId, ip: req.ip, metadata });

app.get('/health', (_req, res) => res.json({ ok: true, service: 'jb-best-logistics-api' }));

app.post('/api/auth/register', verificationRequestLimiter, asyncRoute(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || password.length < 8) {
    return res.status(400).json({ error: 'A valid email, name, and an 8-character password are required' });
  }
  const exists = await User.exists({ email });
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' });
  await issueVerificationCode(email, 'registration', {
    name,
    passwordHash: await bcrypt.hash(password, 12),
  });
  return res.json({ message: 'A verification code has been sent to your email address.' });
}));

app.post('/api/auth/register/verify', verificationAttemptLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the email address and 6-digit verification code' });
  const challenge = await verifyCode(email, 'registration', code);
  if (!challenge?.name || !challenge.passwordHash) return res.status(400).json({ error: 'The verification code is invalid or expired' });
  const user = await User.create({
    email,
    passwordHash: challenge.passwordHash,
    name: challenge.name,
    role: 'customer',
  });
  await AuthVerification.deleteOne({ _id: challenge._id });
  return res.status(201).json({ user: publicUser(user), token: issueToken(user) });
}));

app.post('/api/auth/forgot-password', verificationRequestLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  ensureEmailConfigured();
  const user = await User.findOne({ email, status: 'active' });
  if (user) await issueVerificationCode(email, 'password_reset');
  return res.json({ message: 'If an active account exists for that email, a verification code has been sent.' });
}));

app.post('/api/auth/reset-password', verificationAttemptLimiter, asyncRoute(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !/^\d{6}$/.test(code) || password.length < 8) {
    return res.status(400).json({ error: 'Enter a valid email, 6-digit verification code, and password of at least 8 characters' });
  }
  const challenge = await verifyCode(email, 'password_reset', code);
  if (!challenge) return res.status(400).json({ error: 'The verification code is invalid or expired' });
  const user = await User.findOne({ email, status: 'active' });
  if (!user) {
    await AuthVerification.deleteOne({ _id: challenge._id });
    return res.status(400).json({ error: 'The verification code is invalid or expired' });
  }
  user.passwordHash = await bcrypt.hash(password, 12);
  user.mustChangePassword = false;
  await user.save();
  await AuthVerification.deleteOne({ _id: challenge._id });
  return res.json({ message: 'Your password has been reset. You can now sign in.' });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body as Record<string, string>;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+passwordHash');
  if (!user || user.status !== 'active' || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' });
  await logActivity(req as AuthRequest, 'login', 'user', user.id);
  return res.json({ user: publicUser(user), token: issueToken(user) });
}));

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => res.json({ user: publicUser(req.user!) }));

app.get('/api/customer/profile', requireAuth, allowRoles('customer'), asyncRoute(async (req: AuthRequest, res) => {
  const user = req.user!;
  const mailboxes = await MailboxProfile.find({ customerId: user._id }).sort({ createdAt: -1 }).lean();
  return res.json({
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.savedAddresses[0] || {},
    },
    mailboxes: mailboxes.map((mailbox) => ({
      id: mailbox._id.toString(),
      mailboxNumber: mailbox.mailboxNumber,
      plan: mailbox.plan,
      companyName: mailbox.companyName,
      keyFobId: mailbox.keyFobId,
      renewalDate: mailbox.renewalDate.toISOString().slice(0, 10),
      status: mailbox.status,
      packagesHeld: mailbox.packagesHeld,
    })),
  });
}));

app.put('/api/customer/profile', requireAuth, allowRoles('customer'), asyncRoute(async (req: AuthRequest, res) => {
  const body = req.body as {
    name?: string;
    phone?: string;
    address?: { street?: string; suite?: string; city?: string; state?: string; postalCode?: string; country?: string };
    location?: { type?: string; coordinates?: number[] };
  };
  const address = body.address;
  if (!body.name?.trim() || !body.phone?.trim() || !address?.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.postalCode?.trim() || !address.country?.trim()) {
    return res.status(400).json({ error: 'Name, phone, street, city, state, postal code, and country are required' });
  }
  if (body.location && (
    body.location.type !== 'Point'
    || !Array.isArray(body.location.coordinates)
    || body.location.coordinates.length !== 2
    || !Number.isFinite(body.location.coordinates[0])
    || !Number.isFinite(body.location.coordinates[1])
    || body.location.coordinates[0] < -180 || body.location.coordinates[0] > 180
    || body.location.coordinates[1] < -90 || body.location.coordinates[1] > 90
  )) return res.status(400).json({ error: 'Location must use valid GeoJSON longitude and latitude coordinates' });

  const user = req.user!;
  user.name = body.name.trim();
  user.phone = body.phone.trim();
  user.savedAddresses = [{
    name: user.name,
    phone: user.phone,
    email: user.email,
    street: address.street.trim(),
    suite: address.suite?.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
    ...(body.location ? { location: body.location } : {}),
  }];
  await user.save();
  return res.json({
    profile: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.savedAddresses[0],
    },
  });
}));

app.post('/api/auth/change-password', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 12) return res.status(400).json({ error: 'New password must be at least 12 characters' });
  const user = req.user!;
  if (!user.mustChangePassword) return res.status(409).json({ error: 'No temporary password change is pending' });
  if (await bcrypt.compare(newPassword, user.passwordHash)) return res.status(400).json({ error: 'Choose a password different from the temporary password' });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  await user.save();
  return res.json({ user: publicUser(user) });
}));

app.post('/api/quotes', asyncRoute(async (req, res) => {
  const { length, width, height, weight, deliveryOption, transport, international } = req.body;
  if (![length, width, height, weight].every((value) => Number.isFinite(Number(value)))) return res.status(400).json({ error: 'Package dimensions and weight are required' });
  return res.json(calculateQuote({ length: Number(length), width: Number(width), height: Number(height), weight: Number(weight), deliveryOption: deliveryOption as DeliveryOption, transport, international: Boolean(international) }));
}));

app.post('/api/shipments', requireAuth, allowRoles('customer', 'warehouse', 'warehouse_staff', 'admin'), asyncRoute(async (req: AuthRequest, res) => {
  const { sender, receiver, package: packageDetails, deliveryOption, transport, international = false } = req.body;
  if (!sender || !receiver || !packageDetails || !deliveryOption || !transport) return res.status(400).json({ error: 'Sender, receiver, package, delivery option, and transport are required' });
  const quote = calculateQuote({ ...packageDetails, deliveryOption, transport, international });
  if (quote.cutoffPassed && deliveryOption === 'same_day') return res.status(422).json({ error: 'Same-day drop-off cutoff is 5:30 PM local time' });
  const trackingId = await createTrackingId();
  const shipment = await Shipment.create({
    trackingId,
    customerId: req.user!._id,
    sender,
    receiver,
    package: { ...packageDetails, suggestedPackaging: quote.suggestedPackaging },
    deliveryOption,
    transport,
    status: 'booked',
    total: quote.total,
    currency: quote.currency,
    events: [{ status: 'booked', note: 'Shipment booking created', actorId: req.user!._id.toString() }],
  });
  await logActivity(req, 'create', 'shipment', shipment.id, { trackingId });
  await Notification.create({ userId: req.user!._id, shipmentId: shipment._id, channel: 'in_app', title: 'Shipment booked', body: `Tracking ID ${trackingId} is ready.` });
  return res.status(201).json({ shipment, quote, trackingId });
}));

app.get('/api/shipments', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
  const filter = req.user!.role === 'customer'
    ? { customerId: req.user!._id }
    : req.user!.role === 'rider'
      ? { assignedRiderId: req.user!._id }
      : {};
  const shipments = await Shipment.find(filter)
    .populate({ path: 'assignedRiderId', select: 'name email phone' })
    .sort({ createdAt: -1 })
    .limit(100);
  return res.json({ shipments });
}));

const serializeAppointment = (appointment: InstanceType<typeof AppointmentBooking>) => ({
  id: appointment._id.toString(),
  customerId: appointment.customerId.toString(),
  customerName: appointment.customerName,
  customerEmail: appointment.customerEmail,
  customerPhone: appointment.customerPhone,
  serviceType: appointment.serviceType,
  appointmentDate: appointment.appointmentDate,
  timeSlot: appointment.timeSlot,
  notes: appointment.notes,
  status: appointment.status,
  createdAt: appointment.createdAt.toISOString(),
  updatedAt: appointment.updatedAt.toISOString(),
});

app.get('/api/appointments', requireAuth, allowRoles('customer', 'warehouse', 'warehouse_staff', 'admin'), asyncRoute(async (req: AuthRequest, res) => {
  const filter = req.user!.role === 'customer' ? { customerId: req.user!._id } : {};
  const appointments = await AppointmentBooking.find(filter).sort({ appointmentDate: -1, createdAt: -1 }).limit(200);
  return res.json({ appointments: appointments.map(serializeAppointment) });
}));

app.post('/api/appointments', requireAuth, allowRoles('customer'), asyncRoute(async (req: AuthRequest, res) => {
  const body = req.body as { serviceType?: string; appointmentDate?: string; timeSlot?: string; customerPhone?: string; notes?: string };
  const services: AppointmentService[] = ['notary_public', 'custom_packing', 'mailbox_rental', 'freight_consultation', 'shredding_services', 'fingerprinting', 'livescan_fingerprinting', 'shipping_consultation', 'passport_photos', 'secure_document_shredding', 'packing_supplies', 'fax_copies'];
  const timeSlot = body.timeSlot?.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!services.includes(body.serviceType as AppointmentService) || !body.appointmentDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.appointmentDate) || !timeSlot) {
    return res.status(400).json({ error: 'Service, valid appointment date, and time slot are required' });
  }
  const date = new Date(`${body.appointmentDate}T00:00:00`);
  let hour = Number(timeSlot[1]) % 12;
  if (timeSlot[3].toUpperCase() === 'PM') hour += 12;
  date.setHours(hour, Number(timeSlot[2]), 0, 0);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) return res.status(400).json({ error: 'Choose a future appointment time' });

  const user = req.user!;
  const customerPhone = user.phone || body.customerPhone?.trim();
  if (!customerPhone) return res.status(400).json({ error: 'Add a phone number to your customer profile before booking' });
  const appointment = await AppointmentBooking.create({
    customerId: user._id,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone,
    serviceType: body.serviceType as AppointmentService,
    appointmentDate: body.appointmentDate,
    timeSlot: body.timeSlot,
    notes: body.notes?.trim() || undefined,
    status: 'confirmed',
  });
  await logActivity(req, 'create', 'appointment', appointment.id, { serviceType: appointment.serviceType });
  return res.status(201).json({ appointment: serializeAppointment(appointment) });
}));

app.get('/api/shipments/track/:trackingId', asyncRoute(async (req, res) => {
  const shipment = await Shipment.findOne({ trackingId: req.params.trackingId }).select('-customerId');
  if (!shipment) return res.status(404).json({ error: 'Tracking ID not found' });
  return res.json({ shipment });
}));

app.get('/api/shipments/:id/qr', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment || (req.user!.role === 'customer' && shipment.customerId.toString() !== req.user!._id.toString())) return res.status(404).json({ error: 'Shipment not found' });
  const dataUrl = await QRCode.toDataURL(`${config.clientOrigin}/track/${shipment.trackingId}`, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
  return res.json({ trackingId: shipment.trackingId, dataUrl });
}));

app.patch('/api/shipments/:id/status', requireAuth, allowRoles('rider', 'warehouse', 'warehouse_staff', 'admin'), asyncRoute(async (req: AuthRequest, res) => {
  const { status, note, location } = req.body as { status: ShipmentStatus; note?: string; location?: string };
  const allowed: ShipmentStatus[] = ['assigned', 'picked_up', 'at_warehouse', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid shipment status' });
  const event = { status, note: note || `Status updated to ${status}`, location, actorId: req.user!._id.toString(), createdAt: new Date() };
  const shipmentFilter = req.user!.role === 'rider'
    ? { _id: req.params.id, assignedRiderId: req.user!._id }
    : { _id: req.params.id };
  const shipment = await Shipment.findOneAndUpdate(shipmentFilter, { status, ...(status === 'delivered' ? { deliveredAt: new Date() } : {}), $push: { events: event, tracking_history: event } }, { new: true });
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  await logActivity(req, 'status_update', 'shipment', shipment.id, { status });
  await Notification.create({
    userId: shipment.customerId,
    shipmentId: shipment._id,
    channel: 'in_app',
    title: status === 'at_warehouse' ? 'Shipment received at warehouse' : 'Shipment update',
    body: status === 'at_warehouse'
      ? `Shipment ${shipment.trackingId} is at the warehouse and waiting for outbound shipping.`
      : `Shipment ${shipment.trackingId} is now ${status.replaceAll('_', ' ')}.`,
  });
  if (['at_warehouse', 'delivered', 'cancelled'].includes(status) && shipment.assignedRiderId) {
    await Promise.all([
      RiderProfile.updateOne({ userId: shipment.assignedRiderId }, { $set: { is_assigned: false } }),
      PickupJob.updateMany(
        { shipmentId: shipment._id, riderId: shipment.assignedRiderId, status: { $in: ['assigned', 'in_route'] } },
        { $set: { status: status === 'cancelled' ? 'failed' : 'completed' } },
      ),
    ]);
    void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
  }
  emitToShipment(shipment._id.toString(), 'tracking:status', { trackingNumber: shipment.trackingId, status: shipment.status, history: shipment.tracking_history });
  return res.json({ shipment });
}));

app.post('/api/shipments/:id/assign-rider', requireAuth, allowRoles('admin', 'warehouse', 'warehouse_staff'), asyncRoute(async (req: AuthRequest, res) => {
  const { riderId, scheduledAt } = req.body as { riderId: string; scheduledAt: string };
  const rider = await User.findOne({ _id: riderId, role: 'rider', status: 'active' });
  if (!rider) return res.status(400).json({ error: 'Active rider not found' });
  const shipment = await Shipment.findByIdAndUpdate(req.params.id, { assignedRiderId: rider._id, status: 'assigned' }, { new: true });
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  const job = await PickupJob.create({ shipmentId: shipment._id, riderId: rider._id, scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(), status: 'assigned' });
  await logActivity(req, 'assign', 'pickup_job', job.id, { shipmentId: shipment.id, riderId });
  return res.json({ shipment, job });
}));

app.post('/api/payments', requireAuth, allowRoles('customer', 'warehouse', 'warehouse_staff', 'admin'), asyncRoute(async (req: AuthRequest, res) => {
  const { shipmentId, method, amount, installmentNumber, installmentCount } = req.body as { shipmentId: string; method: 'cash' | 'installment' | 'paystack'; amount: number; installmentNumber?: number; installmentCount?: number };
  if (!shipmentId || !['cash', 'installment', 'paystack'].includes(method) || !Number.isFinite(Number(amount))) return res.status(400).json({ error: 'Shipment, payment method, and amount are required' });
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment || (req.user!.role === 'customer' && shipment.customerId.toString() !== req.user!._id.toString())) return res.status(404).json({ error: 'Shipment not found' });
  const reference = `JB-${crypto.randomBytes(10).toString('hex')}`;
  const payment = await Payment.create({ shipmentId: shipment._id, customerId: shipment.customerId, method, amount: Number(amount), installmentNumber, installmentCount, reference, status: method === 'cash' ? 'pending' : 'pending' });
  if (method === 'paystack') {
    if (!config.paystackSecret) return res.status(503).json({ error: 'Paystack is not configured' });
    const paystack = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${config.paystackSecret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: req.user!.email, amount: Math.round(Number(amount) * 100), reference, callback_url: `${config.clientOrigin}/payments/complete` }) });
    const result = await paystack.json() as { status?: boolean; message?: string; data?: unknown };
    if (!paystack.ok || !result.status) return res.status(502).json({ error: result.message || 'Unable to initialize Paystack payment' });
    return res.status(201).json({ payment, checkout: result.data });
  }
  return res.status(201).json({ payment });
}));

app.get('/api/jobs', requireAuth, allowRoles('rider', 'warehouse', 'warehouse_staff', 'admin'), asyncRoute(async (req: AuthRequest, res) => {
  const filter = req.user!.role === 'rider' ? { riderId: req.user!._id } : {};
  return res.json({ jobs: await PickupJob.find(filter).populate('shipmentId').sort({ scheduledAt: 1 }).limit(100) });
}));

app.get('/api/notifications', requireAuth, asyncRoute(async (req: AuthRequest, res) => {
  return res.json({ notifications: await Notification.find().where('userId').equals(req.user!._id).sort({ createdAt: -1 }).limit(50) });
}));

app.get('/api/reports/summary', requireAuth, allowRoles('admin', 'warehouse', 'warehouse_staff'), asyncRoute(async (_req, res) => {
  const [byStatus, revenue] = await Promise.all([
    Shipment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Shipment.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
  ]);
  return res.json({ generatedAt: new Date().toISOString(), byStatus, paidRevenue: revenue[0]?.total || 0 });
}));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (error instanceof ApiError) return res.status(error.statusCode).json({ error: error.message });
  if (error instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: 'Validation failed', details: Object.values(error.errors).map((item) => item.message) });
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return res.status(409).json({ error: 'A record with these unique values already exists' });
  return res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  const httpServer = createServer(app);
  initializeRealtime(httpServer);
  connectDatabase().then(() => httpServer.listen(config.port, () => {
    console.log(`JB & Best API listening on port ${config.port}`);
    void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
    setInterval(() => {
      void dispatchQueuedShipments().catch((error: unknown) => console.error('Queued dispatch retry failed', error));
    }, 15_000);
  })).catch((error) => {
    console.error('Unable to connect to MongoDB', error);
    process.exit(1);
  });
}

export default app;
