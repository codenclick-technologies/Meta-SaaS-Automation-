const Role = require('../models/Role');
const User = require('../models/User');

/**
 * @desc    Get all roles for an organization
 * @route   GET /api/governance/roles
 * @access  Private (Admin)
 */
exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find({ organizationId: req.user.organizationId });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Create a new custom role
 * @route   POST /api/governance/roles
 * @access  Private (Admin)
 */
exports.createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const newRole = new Role({
            name,
            description,
            permissions,
            organizationId: req.user.organizationId,
        });
        await newRole.save();
        res.status(201).json(newRole);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create role', details: error.message });
    }
};

/**
 * @desc    Update a user's role
 * @route   PUT /api/governance/users/:userId/role
 * @access  Private (Admin)
 */
exports.assignRoleToUser = async (req, res) => {
    try {
        const { roleId } = req.body;
        const { userId } = req.params;

        // Ensure the role belongs to the same organization
        const role = await Role.findOne({ _id: roleId, organizationId: req.user.organizationId });
        if (!role) {
            return res.status(404).json({ error: 'Role not found or not part of your organization.' });
        }

        const user = await User.findOneAndUpdate(
            { _id: userId, organizationId: req.user.organizationId },
            { $set: { role: role.name, roleId: role._id } }, // Storing name for quick checks, ID for reference
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found.' });

        res.json({ success: true, message: `User ${user.name} assigned to role ${role.name}.` });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};