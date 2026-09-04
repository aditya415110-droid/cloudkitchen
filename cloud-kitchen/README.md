# CloudKitchen - Cloud Kitchen Food Ordering Platform

A production-ready full-stack cloud kitchen ordering system built with React, Node.js, Express, MongoDB, and Supabase.

## Features

- **Google OAuth** via Supabase authentication
- **Menu browsing** with category filtering and image carousels
- **Shopping cart** with quantity management
- **Secure checkout** with server-side price validation
- **QR code** generation for order pickup
- **Real-time order tracking** via Socket.IO
- **Email notifications** (order confirmation, ready for pickup, cancellation)
- **Admin dashboard** with menu CRUD, order management, and QR scanner
- **Role-based access control** (USER/ADMIN)
- **Mobile-first responsive design** with Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Tailwind CSS, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Auth | Supabase (Google OAuth) |
| Storage | Supabase Storage (food images) |
| Real-time | Socket.IO |
| Email | Nodemailer (generic SMTP) |
| QR Codes | qrcode library |

## Project Structure

```
cloud-kitchen/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Reusable components
│       ├── context/         # Auth + Cart context providers
│       ├── pages/           # Customer + Admin pages
│       ├── services/        # API client, Supabase, Socket.IO
│       └── App.jsx          # Routes
├── server/                  # Express backend
│   ├── src/
│   │   ├── config/          # DB, Supabase, env config
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, validation, upload, errors
│   │   ├── models/          # Mongoose schemas (User, MenuItem, Order)
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Email, QR, Storage services
│   │   ├── utils/           # ID generation helpers
│   │   └── server.js        # Entry point
│   └── tests/               # Jest tests
├── .env.example             # Environment variable template
└── package.json             # Root scripts
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Supabase project
- SMTP email credentials

### 1. Clone and Install

```bash
git clone <repo-url>
cd cloud-kitchen
npm run install:all
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Google OAuth** in Authentication → Providers → Google
   - You'll need Google Cloud Console OAuth credentials
   - Set the redirect URL from Supabase's auth settings
3. Create a **public storage bucket** named `food-images`
   - Go to Storage → New Bucket → Name: `food-images`, Public: ON
4. Copy your project URL, anon key, and service role key

### 3. MongoDB Atlas Setup

1. Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist your IP
3. Copy the connection string

### 4. Environment Variables

```bash
# Server
cp .env.example server/.env
# Edit server/.env with your real values

# Client
cat > client/.env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF
```

**Server-side only** (never expose to frontend):
- `MONGODB_URI` — MongoDB connection string
- `SUPABASE_SERVICE_ROLE_KEY` — admin Supabase key
- `EMAIL_*` — SMTP credentials
- `JWT_SECRET` — session signing secret

**Frontend-safe** (prefixed with `VITE_`):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key

### 5. Create an Admin User

After your first Google login, promote yourself to admin in MongoDB:

```js
// In MongoDB shell or Atlas UI:
db.users.updateOne(
  { email: "your-email@gmail.com" },
  { $set: { role: "ADMIN" } }
)
```

### 6. Run

```bash
# Development (both client + server)
npm run dev

# Or separately:
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173
```

### 7. Test

```bash
npm test
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu` | List available menu items |
| GET | `/api/menu/:id` | Get single menu item |
| GET | `/api/health` | Health check |

### Authenticated (Customer)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/my-orders` | List my orders |
| GET | `/api/orders/:id` | Get order details + QR |

### Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu/admin/all` | List all menu items |
| POST | `/api/menu/admin` | Create menu item |
| PATCH | `/api/menu/admin/:id` | Update menu item |
| PATCH | `/api/menu/admin/:id/status` | Toggle availability |
| DELETE | `/api/menu/admin/:id` | Soft-delete item |
| GET | `/api/orders/admin/all` | List all orders |
| GET | `/api/orders/admin/:id` | Get any order |
| PATCH | `/api/orders/admin/:id/status` | Update order status |
| PATCH | `/api/orders/admin/:id/estimated-time` | Update pickup time |
| POST | `/api/orders/admin/:id/cancel` | Cancel order |
| POST | `/api/orders/admin/:id/complete` | Complete order |
| POST | `/api/orders/admin/qr/verify` | Verify QR code |

## Security

- Supabase JWT verification on every authenticated request
- Role-based middleware (`authenticate`, `requireAdmin`)
- Server-side price recalculation (never trusts client prices)
- Rate limiting (100 req/15min general, 10 req/15min for orders)
- Helmet security headers
- CORS restricted to client origin
- File upload validation (MIME type + size limits)
- QR tokens are cryptographically random (32 bytes hex)
- Soft-delete for menu items (preserves order history)
- Email deduplication flags prevent duplicate notifications
- No secrets in client-side code

## Production Deployment

### Frontend (Vercel/Netlify)
```bash
cd client && npm run build
# Deploy the dist/ folder
# Set environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

### Backend (Railway/Render/Fly.io)
```bash
# Deploy server/ directory
# Set all server environment variables
# Ensure CLIENT_URL points to deployed frontend
```

### CORS
Update `CLIENT_URL` in server env to match the deployed frontend URL.

## Order Lifecycle

```
PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED
                                                   ↗
                    (any active status) → CANCELLED
```

- Email sent on: PLACED (confirmation), READY_FOR_PICKUP (pickup notification), CANCELLED
- QR invalidated on: COMPLETED or CANCELLED
- Real-time Socket.IO events on every status change
