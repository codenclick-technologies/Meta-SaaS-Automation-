const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Enterprise Security Middleware
 */
const securityMiddleware = {
    /**
     * RBAC: Permissions Guard
     */
    authorize: (roles = []) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            if (roles.length && !roles.includes(req.user.role)) {
                securityMiddleware.logAudit(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'failure');
                return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
            }

            next();
        };
    },

    /**
     * Audit Logger
     */
    logAudit: async (req, action, status = 'success', metadata = {}) => {
        try {
            const geoip = require('geoip-lite');
            const ip = req.ip || req.connection.remoteAddress;
            const geo = geoip.lookup(ip === '::1' || ip === '127.0.0.1' ? '8.8.8.8' : ip); // Localhost fallback for demo

            const audit = new AuditLog({
                organizationId: req.user?.organizationId || metadata.organizationId,
                userId: req.user?.id || metadata.userId,
                action: action,
                resource: req.originalUrl.split('/')[1] || 'root',
                resourceId: req.params.id || null,
                status: status,
                ipAddress: ip,
                location: geo ? {
                    city: geo.city,
                    country: geo.country,
                    ll: geo.ll
                } : undefined,
                metadata: {
                    ...metadata,
                    method: req.method,
                    userAgent: req.get('User-Agent')
                }
            });
            await audit.save();
        } catch (error) {
            logger.error(`Audit Logging Failed: ${error.message}`);
        }
    },

    /**
     * Webhook Signature Verification (Enterprise SaaS Standard)
     */
    verifyWebhook: (secretHeader, secretKey) => {
        const crypto = require('crypto');
        return (req, res, next) => {
            const signature = req.headers[secretHeader];
            if (!signature) return res.status(401).send('Missing Signature');

            const hmac = crypto.createHmac('sha256', secretKey);
            const digest = Buffer.from(hmac.update(JSON.stringify(req.body)).digest('hex'), 'utf8');
            const checksum = Buffer.from(signature, 'utf8');

            if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
                return res.status(401).send('Invalid Signature');
            }
            next();
        };
    }
};

module.exports = securityMiddleware;
