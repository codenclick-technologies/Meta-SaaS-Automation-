const app = require('../server/server.js');
const { connectDB } = require('../server/db');

// Initialize database connection for serverless environment
// This ensures the connection is established before handling requests
connectDB().catch(err => {
    console.error('Failed to connect to database:', err);
});

module.exports = app;
