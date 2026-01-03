const Branding = require('../models/Branding');

const domainValidator = async (req, res, next) => {
    try {
        // 1. Get the hostname from the request (Host header)
        const hostname = req.hostname;

        // 2. Define allowed system domains (Localhost + Main SaaS Domain)
        // Adjust 'metasaas.com' to your actual production domain
        const systemDomains = [
            'localhost',
            '127.0.0.1',
            process.env.MAIN_DOMAIN || 'metasaas.com'
        ];

        // 3. Check if current hostname is a system domain
        // We use .endsWith to allow subdomains (e.g., api.metasaas.com)
        const isSystemDomain = systemDomains.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        );

        if (isSystemDomain) {
            req.isCustomDomain = false;
            return next();
        }

        // 4. If not a system domain, it MUST be a custom domain. Verify it.
        // We look for a Branding record where this custom domain is registered.
        const branding = await Branding.findOne({ customDomain: hostname });

        if (!branding) {
            console.warn(`[Security] Blocked request from unknown domain: ${hostname}`);
            return res.status(403).json({
                success: false,
                error: 'Security Alert: This domain is not recognized by the platform.'
            });
        }

        // 5. Attach context for downstream controllers
        // This allows controllers to know which organization is being accessed
        req.branding = branding;
        req.organizationId = branding.organizationId;
        req.isCustomDomain = true;

        next();

    } catch (error) {
        console.error('Domain Validation Middleware Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error during domain validation.' });
    }
};

module.exports = domainValidator;