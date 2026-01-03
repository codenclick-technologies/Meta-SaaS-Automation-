const Session = require('../models/Session');
const crypto = require('crypto');
const User = require('../models/User');

class SessionService {
    /**
     * Creates a new session record on login
     */
    async createSession(user, req, token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Matches JWT 30d

        const session = new Session({
            userId: user._id,
            organizationId: user.organizationId,
            token: crypto.createHash('sha256').update(token).digest('hex'),
            deviceInfo: {
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent')
            },
            expiresAt
        });

        await session.save();

        // Update user last active
        await User.findByIdAndUpdate(user._id, { lastActive: new Date() });

        return session;
    }

    /**
     * Revokes a specific session (Logout)
     */
    async revokeSession(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await Session.findOneAndUpdate({ token: tokenHash }, { isValid: false });
    }

    /**
     * Revokes all sessions for a user (Kill all devices / Password change)
     */
    async revokeAllSessions(userId) {
        await Session.updateMany({ userId }, { isValid: false });
    }

    /**
     * Validates if a session is still active and valid
     */
    async validateSession(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await Session.findOne({ token: tokenHash, isValid: true });

        if (!session) return false;

        // Update last activity periodically (e.g., every 5 mins to save DB load)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (session.lastActivity < fiveMinutesAgo) {
            session.lastActivity = new Date();
            await session.save();
            await User.findByIdAndUpdate(session.userId, { lastActive: new Date() });
        }

        return session;
    }
}

module.exports = new SessionService();
