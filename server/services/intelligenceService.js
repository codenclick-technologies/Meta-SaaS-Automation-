const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class IntelligenceService {
    /**
     * Calculate Risk Score for a login attempt
     * Returns a score from 0 (Safe) to 100 (High Risk)
     */
    async calculateLoginRisk(user, req) {
        let score = 0;
        const geoip = require('geoip-lite');
        const ip = req.ip || req.connection.remoteAddress;
        // Localhost fallback for demo: 8.8.8.8 (California)
        const currentGeo = geoip.lookup(ip === '::1' || ip === '127.0.0.1' ? '8.8.8.8' : ip);
        const currentUA = req.get('User-Agent');

        try {
            // 1. Fetch historical login data (last 10 successful logins)
            const history = await AuditLog.find({
                userId: user._id,
                action: 'USER_LOGIN',
                status: 'success'
            }).sort({ createdAt: -1 }).limit(10);

            if (history.length === 0) return 10; // New accounts have slight risk baseline

            const lastLogin = history[0];

            // 2. Location Check (City/Country Anomaly)
            if (currentGeo && lastLogin.location) {
                if (currentGeo.country !== lastLogin.location.country) {
                    score += 40; // International login change
                } else if (currentGeo.city !== lastLogin.location.city) {
                    score += 15; // City change
                }

                // 3. Impossible Travel Check (Simple math: > 1000km in < 2 hours)
                const dist = this.calculateDistance(
                    currentGeo.ll[0], currentGeo.ll[1],
                    lastLogin.location.ll[0], lastLogin.location.ll[1]
                );
                const timeDiffHours = (Date.now() - new Date(lastLogin.createdAt).getTime()) / (1000 * 60 * 60);

                if (dist > 500 && timeDiffHours < 1) score += 50; // High suspicion
            }

            // 4. Device Anomaly
            const knownDevices = history.map(h => h.metadata?.userAgent);
            if (!knownDevices.includes(currentUA)) {
                score += 20; // New device/browser
            }

            // 5. Time Anomaly (Login during unusual hours?)
            const currentHour = new Date().getHours();
            const averageHour = history.reduce((acc, h) => acc + new Date(h.createdAt).getHours(), 0) / history.length;
            if (Math.abs(currentHour - averageHour) > 6) {
                score += 10; // Unusual timing
            }

        } catch (error) {
            logger.error('Risk Calculation Failed', error);
        }

        return Math.min(score, 100);
    }

    // Helper: Haversine distance formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

module.exports = new IntelligenceService();
