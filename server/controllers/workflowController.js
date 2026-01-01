const Workflow = require('../models/Workflow');
const logger = require('../utils/logger');

// GET /workflows
exports.getWorkflows = async (req, res) => {
    try {
        const workflows = await Workflow.find({ organizationId: req.user.organizationId });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /workflows
exports.createWorkflow = async (req, res) => {
    try {
        const workflow = new Workflow({
            ...req.body,
            organizationId: req.user.organizationId
        });
        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        logger.error('Create Workflow Error', error);
        res.status(500).json({ message: 'Failed to create workflow' });
    }
};

// PUT /workflows/:id
exports.updateWorkflow = async (req, res) => {
    try {
        const workflow = await Workflow.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            req.body,
            { new: true }
        );
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ message: 'Update failed' });
    }
};

// DELETE /workflows/:id
exports.deleteWorkflow = async (req, res) => {
    try {
        await Workflow.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
        res.json({ message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed' });
    }
};
