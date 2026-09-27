require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded verification documents are NOT served statically - they contain PAN /
// Aadhaar and are streamed through the auth-gated route in employer.routes.js
// (GET /api/employer/documents/:id/file).

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/worker', require('./routes/worker.routes'));
app.use('/api/employer', require('./routes/employer.routes'));
app.use('/api/jobs', require('./routes/job.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/ratings', require('./routes/rating.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/milestones', require('./routes/milestone.routes'));
app.use('/api/disputes', require('./routes/dispute.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/roles', require('./routes/role.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
require('./lib/socket').init(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
