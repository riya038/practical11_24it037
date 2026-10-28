const taskEvents = require('./events');

// ============================================================================
// 1. Task Created Listener (Step 2, Step 5)
// Asynchronous background notification handler with simulated slow processing
// ============================================================================
taskEvents.on('task-created', (task) => {
  try {
    const receivedAt = new Date().toISOString();
    console.log(`[Event Received] 'task-created' event captured at ${receivedAt} for task: "${task?.title || 'Untitled'}"`);

    // Check if error simulation is requested (Supplementary Problem 2 testing)
    if (task && task.forceError) {
      throw new Error(`Simulated failure inside 'task-created' handler for task "${task.title}"`);
    }

    // Step 5: Artificial delay (setTimeout of 2 seconds) to make the asynchronous behavior visible
    setTimeout(() => {
      try {
        if (task && task.forceAsyncError) {
          throw new Error(`Simulated async error during background notification dispatch for task "${task.title}"`);
        }

        const completionTimestamp = new Date().toISOString();
        const assignedUser = task?.user ? (task.user._id || task.user) : 'Unassigned';

        // Log notification: task title, timestamp, assigned user
        console.log(`[Notification] Task "${task?.title}" created at ${completionTimestamp}`);
        console.log(`  └─ Details: Assigned User: ${assignedUser} | Priority: ${task?.priority || 'medium'} | Task ID: ${task?._id}`);
      } catch (asyncErr) {
        // Forward error to the error event listener
        taskEvents.emit('error', asyncErr);
      }
    }, 2000);
  } catch (err) {
    // Forward synchronous errors inside handler to the error event listener
    taskEvents.emit('error', err);
  }
});

// ============================================================================
// 2. Task Deleted Listener (Supplementary Problem 1)
// Logs a distinct notification message when a task is deleted
// ============================================================================
taskEvents.on('task-deleted', (task) => {
  try {
    const receivedAt = new Date().toISOString();
    console.log(`[Event Received] 'task-deleted' event captured at ${receivedAt} for task ID: ${task?._id}`);

    // Simulated async background cleanup/notification (1 second delay)
    setTimeout(() => {
      try {
        const completionTimestamp = new Date().toISOString();
        const assignedUser = task?.user ? (task.user._id || task.user) : 'Unassigned';

        console.log(`[Notification] Task "${task?.title || 'Unknown'}" (ID: ${task?._id}) was deleted at ${completionTimestamp}`);
        console.log(`  └─ Details: Previously assigned to User: ${assignedUser}`);
      } catch (err) {
        taskEvents.emit('error', err);
      }
    }, 1000);
  } catch (err) {
    taskEvents.emit('error', err);
  }
});

// ============================================================================
// 3. Error Event Listener (Supplementary Problem 2)
// Catches and logs any error thrown inside task event handlers
// ============================================================================
taskEvents.on('error', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[Error Listener] Error caught at ${timestamp}: ${err.message}`);
});

console.log('⚡ TaskEvents listeners registered (task-created, task-deleted, error).');

module.exports = taskEvents;
