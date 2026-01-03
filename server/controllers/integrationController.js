const Integration = require('../models/Integration');
const logger = require('../utils/logger');

// GET /integrations
exports.getIntegrations = async (req, res) => {
    try {
        const integrations = await Integration.find({ organizationId: req.user.organizationId }).select('-credentials.apiKey -credentials.accessToken');
        res.json(integrations);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching integrations' });
    }
};

// POST /integrations
exports.addIntegration = async (req, res) => {
    try {
        const { provider, name, authType, credentials } = req.body;

        const newIntegration = new Integration({
            organizationId: req.user.organizationId,
            provider,
            name,
            authType,
            credentials
        });

        await newIntegration.save();
        res.status(201).json(newIntegration);
    } catch (error) {
        logger.error('Add Integration Error', error);
        res.status(500).json({ message: 'Failed to add integration' });
    }
};

// DELETE /integrations/:id
exports.deleteIntegration = async (req, res) => {
    try {
        await Integration.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
        res.json({ message: 'Integration removed' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete integration' });
    }
};
