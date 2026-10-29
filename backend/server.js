require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

// Step 2 & Troubleshooting Guide: Register event listeners at server startup
require('./listeners');

const app = express();

// ==========================================
// 1. CORS & MIDDLEWARE
// ==========================================
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 2. MONGODB CONNECTION
// ==========================================
// In Docker Compose, services communicate via service name 'mongodb'
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://mongodb:27017/taskdb';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully to:', MONGO_URI);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ==========================================
// 3. API ROUTES
// ==========================================

const cache = require('./utils/cache');

// Welcome / API Documentation Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Practical 11: Containerization with Docker and Docker Compose API is running.',
    version: '1.0.0',
    container: {
      status: 'active',
      database: MONGO_URI,
      environment: process.env.NODE_ENV || 'production',
      network: 'app-network (bridge)',
    },
    events: {
      'task-created': 'Asynchronously logged with task title, timestamp, and assigned user (2s delay simulation)',
      'task-deleted': 'Asynchronously logged with deleted task details',
      'error': 'Error listener catches and logs any exceptions thrown inside task handlers',
    },
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        me: 'GET /auth/me (Protected: Requires Bearer Token)',
      },
      tasks: {
        getAll: 'GET /tasks (Cached with node-cache, 60s TTL)',
        getById: 'GET /tasks/:id (Cached separately, 60s TTL)',
        create: 'POST /tasks (Emits task-created event asynchronously after 201 response)',
        update: 'PUT /tasks/:id (Invalidates cache)',
        delete: 'DELETE /tasks/:id (Emits task-deleted event asynchronously after 200 response)',
      },
      cache: {
        stats: 'GET /cache/stats (Cache hit/miss metrics)',
        clear: 'POST /cache/clear (Flush cache and reset counters)',
      },
    },
  });
});

// Cache Debug Stats Endpoints
app.get('/cache/stats', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cache performance metrics & statistics',
    data: cache.getDebugStats(),
  });
});

app.post('/cache/clear', (req, res) => {
  cache.resetStats();
  res.status(200).json({
    success: true,
    message: 'In-memory cache flushed and counters reset.',
  });
});

// Mount Routes (supporting both /auth and /api/auth, /tasks and /api/tasks)
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/tasks', taskRoutes);
app.use('/api/tasks', taskRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.originalUrl} does not exist on this server.`,
  });
});

// ==========================================
// 4. GLOBAL ERROR HANDLER MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
  console.error('⚠️ Global Error Handler:', err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = {};
    Object.keys(err.errors).forEach((key) => {
      details[key] = err.errors[key].message;
    });

    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Database schema validation failed.',
      details,
    });
  }

  // Mongoose Cast Error (Invalid ObjectID)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Invalid ID format: ${err.value}`,
    });
  }

  // Duplicate Key Error (e.g., unique email violation)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Conflict',
      message: 'A record with this field already exists.',
      details: err.keyValue,
    });
  }

  // Generic Internal Server Error
  res.status(err.status || 500).json({
    success: false,
    error: 'ServerError',
    message: err.message || 'An unexpected internal server error occurred.',
  });
});

// ==========================================
// 5. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Practical 11 Express API running on http://localhost:${PORT}`);
  console.log(`🐳 Docker Containerized stack: backend connected to ${MONGO_URI}`);
  console.log(`📡 Event-Driven Architecture active with Node.js native EventEmitter.`);
  console.log(`⚡ In-Memory Cache active with node-cache (stdTTL: 60s).`);
  console.log(`🔐 JWT Secret active with 1-hour token expiration.`);
});
