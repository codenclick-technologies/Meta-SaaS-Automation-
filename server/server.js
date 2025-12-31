const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const config = require('./config');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const auth = require('./middleware/auth'); // Import Security Middleware

// Import Routes
const webhookRoutes = require('./routes/webhook');
const leadRoutes = require('./routes/leads');
const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const smsRoutes = require('./routes/sms');
const settingsRoutes = require('./routes/settings');
const twilioWebhookRoutes = require('./routes/twilioWebhook');
const analyticsRoutes = require('./routes/analytics');

// Initialize App
const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*', // Production me .env se URL uthayega
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*' // Security: Sirf apne frontend ko allow karein
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use('/leads', globalLimiter);

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login requests per hour
    message: 'Too many login attempts from this IP, please try again after an hour'
});
app.use('/auth', authLimiter);

const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60 // Allow high throughput for Facebook webhooks
});
app.use('/webhook', webhookLimiter);

// Database Connection
mongoose.connect(config.mongoUri)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(err => {
        console.error('MongoDB Connection FAILED:', err.message);
        console.error('Please check your IP Whitelist in MongoDB Atlas!');
        process.exit(1);
    });

// Make io available in routes via request object
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/webhook', webhookRoutes);
app.use('/auth', authRoutes);
app.use('/webhooks/twilio', twilioWebhookRoutes); // Public route for Twilio
app.use('/tracking', trackingRoutes);
// Protected Routes (Login Required)
app.use('/leads', auth, leadRoutes);
app.use('/sms', auth, smsRoutes);
app.use('/settings', auth, settingsRoutes);
app.use('/users', auth, require('./routes/users'));
app.use('/analytics', auth, analyticsRoutes);

// Serve Assets (Brochure)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Basic Health Check
app.get('/', (req, res) => {
    res.send('Meta Lead Automation Server is Running');
});

// Socket Connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start Server
const PORT = config.port || 4000;
const httpServer = server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initialize Cron Jobs
    require('./dripScheduler')();
    require('./backupScheduler')();
    require('./cleanupScheduler')();
});

// Helper for graceful shutdown with timeout
const gracefulShutdown = (signal) => {
    console.log(`${signal} received: closing HTTP server`);

    // Force exit if graceful shutdown takes too long (e.g. 1000ms)
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        if (signal === 'SIGUSR2') {
            process.kill(process.pid, 'SIGUSR2');
        } else {
            process.exit(1);
        }
    }, 1000);

    mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        httpServer.close(() => {
            console.log('HTTP server closed');
            if (signal === 'SIGUSR2') {
                process.kill(process.pid, 'SIGUSR2');
            } else {
                process.exit(0);
            }
        });
    });
};

// Handle graceful shutdown for Nodemon restarts
process.once('SIGUSR2', function () {
    gracefulShutdown('SIGUSR2');
});

process.on('SIGINT', function () {
    gracefulShutdown('SIGINT');
});

process.on('SIGTERM', function () {
    gracefulShutdown('SIGTERM');
});
