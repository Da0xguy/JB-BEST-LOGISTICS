# JB & Best Logistics backend

The repository now includes a standalone Express API in `server/` backed by MongoDB. The existing Vite storefront can migrate endpoint-by-endpoint without losing the current demo experience.

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
2. Start MongoDB.
3. Run `pnpm server:dev`.
4. The API listens on `http://localhost:4000`.

To bootstrap the first admin, set `MONGODB_URI`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_EMAIL` in the local environment, then run `pnpm seed:admin`. The command refuses to run if an admin already exists and prints a cryptographically generated temporary password once; the account must change it at `/admin/login` before using the portal.

## Core endpoints

- `POST /api/auth/register` customer registration
- `POST /api/auth/login` customer, rider, warehouse, and admin login
- `GET /api/auth/me` current session
- `POST /api/quotes` shipping quote, packaging suggestion, and cutoff result
- `POST /api/shipments` create a shipment and 20-character alphanumeric tracking ID
- `GET /api/shipments` role-scoped shipment list
- `GET /api/appointments` role-scoped appointment history; `POST /api/appointments` persists a customer appointment booking.
- `GET /api/shipments/track/:trackingId` public tracking lookup
- `GET /api/shipments/:id/qr` authenticated QR code generation
- `PATCH /api/shipments/:id/status` rider, warehouse, or admin status update
- `POST /api/shipments/:id/assign-rider` warehouse/admin assignment
- `GET /api/jobs` rider and operations job queue
- `GET /api/notifications` in-app notification feed
- `GET /api/reports/summary` operations summary report
- `GET /api/customer/profile` and `PUT /api/customer/profile` read and update a customer's saved contact details, default address, and optional GeoJSON location.

## Versioned logistics API

- `POST /api/v1/shipments/book` customer, warehouse, or admin booking; requires sender/receiver, package dimensions, quantity and weight, pickup/delivery GeoJSON Points, and an appointment window (`start`, `end`, optional `slot`). Creates a queued pickup job transactionally and starts automatic size-aware dispatch.
- `GET /api/v1/shipments/track/:trackingNumber` public tracking history without customer address details.
- `PATCH /api/v1/riders/location` rider GPS update; body: `{ "location": { "type": "Point", "coordinates": [longitude, latitude] } }`.
- `PATCH /api/v1/riders/status` rider availability toggle; body: `{ "is_active": true }`.
- `GET /api/v1/riders/profile` and `GET /api/v1/riders/offers` provide rider availability and pending size-matched pickup offers.
- `POST /api/v1/riders/accept-job` and `POST /api/v1/riders/reject-job` respond to an offer using `{ "offerId": "..." }`.
- `GET /api/v1/admin/users` lists administrator and operations accounts for the admin dashboard.
- `POST /api/v1/admin/users` provisions an `admin`, `rider`, `warehouse`, or legacy `warehouse_staff`; rider requests also provide `vehicleType` and `weightCapacityKg`.
- `PATCH /api/v1/admin/users/:userId/status` suspends or reactivates a rider or warehouse account; administrator accounts cannot be changed through this endpoint.
- `DELETE /api/v1/admin/users/:userId` permanently deletes a rider or warehouse account, but rejects administrator accounts and staff with active shipments.
- `GET /api/v1/warehouse/mailboxes` and `POST /api/v1/warehouse/mailboxes` list and assign persisted mailbox profiles to existing customer accounts.
- `POST /api/auth/change-password` completes a forced temporary-password change; the new password must be at least 12 characters.

Dispatch first searches active, unassigned riders within 10 km using the rider-location `2dsphere` index, then falls back to the nearest eligible rider if no local candidate is available. Bikes are eligible below 15 kg and up to 60 cm longest side; vans are eligible up to 150 kg and 300 cm; larger parcels require trucks. Rider capacity must meet the package weight. The dispatcher persists one 30-second offer at a time; rider acceptance commits assignment, while rejection or timeout advances to the next candidate. Queued bookings are retried every 15 seconds and when rider availability or location changes. Socket.IO emits `dispatch:offer` to the rider's authenticated user room, and the rider portal also polls for pending offers.

Staff provisioning may omit `password`; the API generates a unique cryptographically random temporary password per account and returns it once in the creation response. There is no shared default password. The password is stored only as a bcrypt hash. Accounts must change it before using protected APIs or authenticated Socket.IO; generated temporary passwords are not written to logs.

Socket.IO shares the API HTTP server. Clients authenticate with `auth: { token: "<jwt>" }` for user events; public tracking clients may connect without a token and emit `tracking:subscribe` with a tracking number. Shipment rooms receive `tracking:status` and `tracking:location` events. MongoDB transactions require a replica set or sharded cluster; use MongoDB Atlas or configure local MongoDB as a single-node replica set.

All protected endpoints use `Authorization: Bearer <jwt>`. Customer registration is the only public role creation path. Rider, warehouse, and admin accounts must be provisioned by an administrative workflow, preventing privilege escalation through the public API.

## Security baseline

Helmet, CORS allowlisting, request rate limiting, bcrypt password hashing, JWT expiry, suspended-account checks, role middleware, audit activity logs, and Mongoose validation are enabled. Payment webhooks should continue to verify Paystack signatures before marking payments as paid.

`CLIENT_ORIGIN` accepts a comma-separated origin allowlist. In non-production, `http://localhost:3000` and `http://localhost:3001` are also allowed for Vite's automatic port fallback. Restart the API after changing this setting.

## Next integration steps

- Connect the existing booking and pickup forms to `/api/quotes`, `/api/shipments`, and `/api/jobs`.
- Replace Firebase tracking reads with `/api/shipments/track/:trackingId` or retain Firebase during the migration window.
- Add a managed queue for email/SMS providers and persist delivery attempts in the notification collection.
- Add a payment collection and Paystack initialization endpoint alongside the existing verified webhook.
