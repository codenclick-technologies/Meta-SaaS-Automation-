const Admin = require('../models/Admin');

// POST /users
exports.createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        let user = await Admin.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new Admin({
            name,
            email,
            password,
            role: 'sales'
        });

        await user.save();

        // Send email to the new user
        const { sendTeamCredentials } = require('../services/emailService');
        await sendTeamCredentials(user, password);

        res.status(201).json({ message: 'Sales User Created & Email Sent', user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /users/team
exports.getTeam = async (req, res) => {
    try {
        const team = await Admin.find({ role: 'sales' }).select('-password');
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /users/:id
exports.deleteUser = async (req, res) => {
    try {
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
