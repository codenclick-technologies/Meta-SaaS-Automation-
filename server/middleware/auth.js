const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User'); // Import User model to verify user existence

module.exports = async function (req, res, next) {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, config.jwtSecret);

            // Enterprise Session Check: Verify session is still valid in DB
            const sessionService = require('../services/sessionService');
            const session = await sessionService.validateSession(token);

            if (!session) {
                return res.status(401).json({ message: 'Session expired or revoked. Please login again.' });
            }

            console.log('Token and Session verified for user:', decoded.id);

            // Check if user and organization exist in the token
            if (!decoded.id || !decoded.organizationId) {
                return res.status(401).json({ message: 'Not authorized, token is missing user or organization ID' });
            }

            // Optional but recommended: Check if the user still exists in the database
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Security Check: Ensure the user's organization in DB matches the token
            if (user.organizationId.toString() !== decoded.organizationId) {
                console.warn(`Auth Middleware: Organization mismatch. User org: ${user.organizationId}, Token org: ${decoded.organizationId}`);
                return res.status(401).json({ message: 'Not authorized, organization mismatch' });
            }

            // Attach user and organization info to the request object
            req.user = {
                id: decoded.id,
                organizationId: decoded.organizationId,
                role: user.role // Also attach role for permission checks
            };

            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        console.warn('Auth Middleware: No token provided in headers');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};