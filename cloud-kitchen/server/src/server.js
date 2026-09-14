import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate, requireAdmin } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';
import couponRoutes from './routes/coupons.js';
import reviewRoutes from './routes/reviews.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

// Socket.IO auth and room management
io.use(async (socket, next) => {
  // Optional: verify token for socket connections
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const { supabaseAuth } = await import('./config/supabase.js');
      const { data: { user } } = await supabaseAuth.auth.getUser(token);
      if (user) {
        const User = (await import('./models/User.js')).default;
        const dbUser = await User.findOne({ supabaseId: user.id });
        socket.user = dbUser;
      }
    } catch {
      // Allow connection but without user context
    }
  }
  next();
});

io.on('connection', (socket) => {
  // Customer subscribes to their order updates
  socket.on('joinOrder', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('leaveOrder', (orderId) => {
    socket.leave(`order:${orderId}`);
  });

  // Admin joins admin room
  socket.on('joinAdmin', () => {
    if (socket.user?.role === 'ADMIN') {
      socket.join('admin');
    }
  });

  socket.on('disconnect', () => {});
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many orders. Please try again later.' },
});

app.use('/api/', apiLimiter);

// Routes
// The stricter order limiter must be registered before the router, or the
// router handles the request first and the limiter never runs.
app.post('/api/orders', orderLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CloudKitchen API is running.' });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start
const start = async () => {
  await connectDB();
  httpServer.listen(config.port, () => {
    console.log(`CloudKitchen server running on port ${config.port}`);
  });
};

start();

export { app, httpServer, io };
