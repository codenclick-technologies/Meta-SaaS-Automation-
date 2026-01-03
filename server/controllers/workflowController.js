const Workflow = require('../models/Workflow');
const workflowExecutionService = require('../services/workflowExecutionService');

// @desc    Get all workflows
// @route   GET /workflows
exports.getWorkflows = async (req, res) => {
    try {
        const workflows = await Workflow.find({ organizationId: req.user.organizationId });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new workflow
// @route   POST /workflows
exports.createWorkflow = async (req, res) => {
    try {
        const workflow = new Workflow({
            ...req.body,
            organizationId: req.user.organizationId
        });
        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a workflow
// @route   PUT /workflows/:id
exports.updateWorkflow = async (req, res) => {
    try {
        const workflow = await Workflow.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            req.body,
            { new: true }
        );
        if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a workflow
// @route   DELETE /workflows/:id
exports.deleteWorkflow = async (req, res) => {
    try {
        await Workflow.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
        res.json({ message: 'Workflow deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get execution logs (Placeholder for now)
// @route   GET /workflows/logs
exports.getWorkflowLogs = async (req, res) => {
    try {
        // In a real app, fetch from a WorkflowLog model
        res.json({ logs: [] });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};