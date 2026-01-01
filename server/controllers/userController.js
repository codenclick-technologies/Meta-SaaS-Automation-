const User = require('../models/User');
const Organization = require('../models/Organization');
const { sendTeamCredentials } = require('../services/emailService');

// POST /users
// @desc    Create a new user within the same organization (Admin only)
// @access  Private/Admin
exports.createUser = async (req, res) => {
    // Only admins can create new users
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only administrators can add new users.' });
    }

    try {
        const { name, email, password, role = 'sales' } = req.body;
        const { organizationId } = req.user;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with that email already exists.' });
        }

        const newUser = await User.create({
            name,
            email,
            password,
            role,
            organizationId,
        });

        // Add user to the organization's user list
        await Organization.findByIdAndUpdate(organizationId, { $push: { users: newUser._id } });

        // Optionally, send welcome/credentials email
        // await sendTeamCredentials(newUser, password);

        res.status(201).json({
            message: 'User created successfully.',
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });

    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'Server error while creating user.' });
    }
};

// GET /users
// @desc    Get all users within the organization
// @access  Private
exports.getUsers = async (req, res) => {
    try {
        // Fetch all users belonging to the same organization as the requestor
        const users = await User.find({ organizationId: req.user.organizationId }).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /users/:id
// @desc    Delete a user within the same organization (Admin only)
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    // Only admins can delete users
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Only administrators can delete users.' });
    }

    try {
        const { organizationId } = req.user;
        const userIdToDelete = req.params.id;
        
        // Prevent admin from deleting themselves
        if(userIdToDelete === req.user.id) {
            return res.status(400).json({ message: "You cannot delete your own account."});
        }

        const user = await User.findOne({ _id: userIdToDelete, organizationId });

        if (!user) {
            return res.status(404).json({ message: 'User not found in your organization.' });
        }

        await User.deleteOne({ _id: userIdToDelete });

        // Remove user from the organization's user list
        await Organization.findByIdAndUpdate(organizationId, { $pull: { users: userIdToDelete } });

        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
