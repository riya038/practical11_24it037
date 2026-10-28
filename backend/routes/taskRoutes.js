const express = require('express');
const Task = require('../models/Task');
const cache = require('../utils/cache');
const taskEvents = require('../events');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateTask,
  validateTaskUpdate,
} = require('../middleware/validationMiddleware');

const router = express.Router();

// ==========================================
// 0. GET /tasks/cache/stats (Debug Endpoint)
// Expose cache hit / miss counters & metrics
// ==========================================
router.get('/cache/stats', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Cache performance metrics & statistics',
    data: cache.getDebugStats(),
  });
});

// Optional cache reset endpoint for testing
router.post('/cache/clear', (req, res) => {
  cache.resetStats();
  res.status(200).json({
    success: true,
    message: 'In-memory cache flushed and counters reset.',
  });
});

// Apply Authentication Middleware to subsequent task routes in this pipeline
router.use(authMiddleware);

// ==========================================
// 1. GET /tasks
// Fetch all tasks for the logged-in user with In-Memory Caching (60s TTL)
// ==========================================
router.get('/', async (req, res, next) => {
  try {
    const cacheKey = req.user ? `all_tasks_${req.user.id}` : 'all_tasks';

    // 1. Check cache first
    const cached = cache.get(cacheKey) || cache.get('all_tasks');
    if (cached) {
      cache.recordHit();
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }

    // 2. Cache Miss: Query MongoDB
    cache.recordMiss();
    res.setHeader('X-Cache', 'MISS');

    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });

    const responsePayload = {
      success: true,
      count: tasks.length,
      data: tasks,
    };

    // 3. Store in cache (Default stdTTL: 60s)
    cache.set(cacheKey, responsePayload);
    cache.set('all_tasks', responsePayload);

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. GET /tasks/:id
// Fetch single task by ID with Single-Task Caching
// ==========================================
router.get('/:id', async (req, res, next) => {
  try {
    const cacheKey = req.user
      ? `task_${req.user.id}_${req.params.id}`
      : `task_${req.params.id}`;

    // 1. Check single-task cache
    const cached = cache.get(cacheKey) || cache.get(`task_${req.params.id}`);
    if (cached) {
      cache.recordHit();
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }

    // 2. Cache Miss: Query MongoDB
    cache.recordMiss();
    res.setHeader('X-Cache', 'MISS');

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Task with ID ${req.params.id} was not found or does not belong to you.`,
      });
    }

    const responsePayload = {
      success: true,
      data: task,
    };

    // 3. Store in single-task cache
    cache.set(cacheKey, responsePayload);
    cache.set(`task_${req.params.id}`, responsePayload);

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. POST /tasks
// Create a new task and Invalidate Cache
// ==========================================
router.post('/', validateTask, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    const task = new Task({
      user: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      completed: completed === true,
      priority: priority || 'medium',
    });

    await task.save();

    // Invalidate Cache after successful write
    cache.del('all_tasks');
    if (req.user) {
      cache.del(`all_tasks_${req.user.id}`);
    }

    // Step 3: Respond immediately before event handler finishes
    console.log(`[API] Response sent at ${new Date().toISOString()}`);
    res.status(201).json({
      success: true,
      message: 'Task created and secured with JWT ownership.',
      data: task,
    });

    // Prepare task payload and forward test flags if provided
    const taskData = task.toObject ? task.toObject() : { ...task };
    if (req.body.forceError) taskData.forceError = true;
    if (req.body.forceAsyncError) taskData.forceAsyncError = true;

    // Emit 'task-created' event handled asynchronously by listener
    taskEvents.emit('task-created', taskData);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. PUT /tasks/:id
// Update a task and Invalidate Cache
// ==========================================
router.put('/:id', validateTaskUpdate, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Task with ID ${req.params.id} was not found or does not belong to you.`,
      });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (completed !== undefined) task.completed = Boolean(completed);
    if (priority !== undefined) task.priority = priority;

    await task.save();

    // Invalidate Cache (all tasks and specific single task)
    cache.del('all_tasks');
    cache.del(`task_${req.params.id}`);
    if (req.user) {
      cache.del(`all_tasks_${req.user.id}`);
      cache.del(`task_${req.user.id}_${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: task,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. DELETE /tasks/:id
// Delete a task and Invalidate Cache
// ==========================================
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: `Task with ID ${req.params.id} was not found or does not belong to you.`,
      });
    }

    // Invalidate Cache (all tasks and specific single task)
    cache.del('all_tasks');
    cache.del(`task_${req.params.id}`);
    if (req.user) {
      cache.del(`all_tasks_${req.user.id}`);
      cache.del(`task_${req.user.id}_${req.params.id}`);
    }

    // Supplementary Problem 1: Respond immediately and emit 'task-deleted'
    console.log(`[API] Delete response sent at ${new Date().toISOString()}`);
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully from database.',
      data: task,
    });

    taskEvents.emit('task-deleted', task);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
