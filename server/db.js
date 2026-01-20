const mongoose = require('mongoose');
const config = require('./config');

/**
 * MongoDB Connection Module for Serverless Environments
 * 
 * This module implements connection pooling and caching to prevent
 * repeated database connections in serverless functions (Vercel).
 * 
 * Key Features:
 * - Singleton pattern: Reuses existing connections
 * - Connection pooling: Maintains a pool of connections
 * - Serverless optimized: Caches connections across invocations
 */

// Global variable to cache the database connection
let cachedConnection = null;

/**
 * Connect to MongoDB with connection pooling
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
async function connectDB() {
    // If we have a cached connection and it's ready, return it
    if (cachedConnection && cachedConnection.readyState === 1) {
        console.log('Using cached MongoDB connection');
        return cachedConnection;
    }

    try {
        // Configure mongoose for serverless environment
        mongoose.set('strictQuery', false);

        // Connection options optimized for serverless
        const options = {
            // Connection pool settings
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections to maintain

            // Timeout settings
            serverSelectionTimeoutMS: 5000, // Timeout for server selection (5 seconds)
            socketTimeoutMS: 45000,         // Socket timeout (45 seconds)

            // Retry settings
            retryWrites: true,
            retryReads: true,

            // Buffer settings (important for serverless)
            bufferCommands: false, // Disable buffering, fail fast if not connected

            // Auto-index in production
            autoIndex: process.env.NODE_ENV !== 'production',
        };

        console.log('Establishing new MongoDB connection...');

        // Connect to MongoDB
        await mongoose.connect(config.mongoUri, options);

        // Cache the connection
        cachedConnection = mongoose.connection;

        console.log('MongoDB Connected Successfully');
        console.log(`Database: ${cachedConnection.db.databaseName}`);
        console.log(`Host: ${cachedConnection.host}`);

        // Handle connection events
        cachedConnection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            cachedConnection = null; // Clear cache on error
        });

        cachedConnection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            cachedConnection = null; // Clear cache on disconnect
        });

        // Graceful shutdown handler
        process.on('SIGINT', async () => {
            if (cachedConnection) {
                await cachedConnection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            }
        });

        return cachedConnection;

    } catch (error) {
        console.error('MongoDB Connection FAILED:', error.message);
        console.error('Please check:');
        console.error('1. Your MONGO_URI in environment variables');
        console.error('2. IP Whitelist in MongoDB Atlas (should allow 0.0.0.0/0 for Vercel)');
        console.error('3. Database user credentials');

        cachedConnection = null; // Clear cache on error
        throw error;
    }
}

/**
 * Get the current connection status
 * @returns {string} Connection status
 */
function getConnectionStatus() {
    if (!cachedConnection) {
        return 'Not connected';
    }

    const states = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting',
    };

    return states[cachedConnection.readyState] || 'Unknown';
}

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
    if (cachedConnection) {
        await cachedConnection.close();
        cachedConnection = null;
        console.log('MongoDB connection closed');
    }
}

module.exports = {
    connectDB,
    getConnectionStatus,
    closeConnection,
};
