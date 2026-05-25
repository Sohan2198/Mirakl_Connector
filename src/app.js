const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');

const app = express();

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular routes
app.use('/', apiRouter);

module.exports = app;
