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
const domainValidator = require('./middleware/domainValidator'); // Domain Validation Middleware

// Import Routes
const webhookRoutes = require('./routes/webhook');
const leadRoutes = require('./routes/leads');
const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const smsRoutes = require('./routes/sms');
const settingsRoutes = require('./routes/settings');
const twilioWebhookRoutes = require('./routes/twilioWebhook');
const analyticsRoutes = require('./routes/analytics');
const backupService = require('./services/backupService');
const brandingRoutes = require('./routes/branding');
const facebookService = require('./services/facebookService');
const cron = require('node-cron');
const securityRoutes = require('./routes/securityRoutes');

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
app.use(domainValidator); // Validate Custom Domains

// Rate Limiting for Production
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Max 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Too many requests, please try again later' }
});
app.use('/leads', globalLimiter);
app.use('/analytics', globalLimiter);
app.use('/settings', globalLimiter);
app.use('/users', globalLimiter);
app.use('/sms', globalLimiter);


const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Max 20 auth attempts per 5 minutes per IP to prevent brute force
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, message: 'Too many login attempts, please try again later' }
});
app.use('/auth', authLimiter);

// Webhooks can come in bursts, so a slightly higher limit
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // Max 200 webhook events per minute
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/webhook', webhookLimiter);
app.use('/webhooks/twilio', webhookLimiter);

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
app.use('/campaigns', require('./routes/campaigns')); // New Campaign Route
app.use('/integrations', auth, require('./routes/integrations'));
app.use('/workflows', auth, require('./routes/workflows'));
app.use('/organizations', auth, require('./routes/organizations'));
app.use('/sms', auth, smsRoutes);
app.use('/settings', auth, settingsRoutes);
app.use('/analytics', auth, analyticsRoutes);
app.use('/users', auth, require('./routes/users'));
app.use('/compliance', auth, require('./routes/compliance'));
app.use('/bi', auth, require('./routes/bi'));
app.use('/security', auth, require('./routes/security'));
app.use('/branding', brandingRoutes);
app.use('/api/security', securityRoutes); // Advanced Biometric/PIN Routes
app.use('/api/governance', require('./routes/governanceRoutes'));
app.use('/credentials', auth, require('./routes/credentials'));


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
    require('./cleanupScheduler')();


    // Initialize Disaster Recovery System (Automated Backups)
    backupService.startAutoBackup();

    // Schedule Hourly Campaign Sync
    cron.schedule('0 * * * *', () => {
        console.log('Running hourly campaign sync...');
        facebookService.syncAllCampaigns();
    });
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
