const Role = require('../models/Role');

/**
 * Advanced Permission-Based Authorization Middleware
 * @param {string} resource - The resource being accessed (e.g., 'leads').
 * @param {string} action - The action being performed (e.g., 'delete').
 */
const authorize = (resource, action) => async (req, res, next) => {
    try {
        // Super Admins bypass all checks
        if (req.user.role === 'admin') {
            return next();
        }

        // For role-only checks (legacy/simple)
        if (typeof resource === 'string' && !action) {
            if (req.user.role === resource) {
                return next();
            }
        }

        // Find the user's role details from the database
        const userRole = await Role.findById(req.user.roleId);

        if (!userRole) {
            return res.status(403).json({ error: 'Access Denied: Role not found.' });
        }

        // Find the specific permission for the requested resource
        const permission = userRole.permissions.find(p => p.resource === resource);

        if (!permission) {
            return res.status(403).json({ error: `Access Denied: No permissions set for resource '${resource}'.` });
        }

        // Check if the required action is included in the role's permissions
        if (!permission.actions.includes(action)) {
            return res.status(403).json({ error: `Access Denied: You do not have '${action}' permission for '${resource}'.` });
        }

        // Attach scope to the request for further filtering in the controller (e.g., for 'own' vs 'any')
        req.permissionScope = permission.scope;

        next();
    } catch (error) {
        res.status(500).json({ error: 'Authorization Error' });
    }
};

module.exports = authorize;
