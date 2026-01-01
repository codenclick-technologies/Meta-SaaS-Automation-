const WorkflowLog = require('../models/WorkflowLog');
const logger = require('../utils/logger');

// GET /workflows/logs
exports.getWorkflowLogs = async (req, res) => {
    try {
        const { workflowId, status, page = 1, limit = 20 } = req.query;
        let query = { organizationId: req.user.organizationId };

        if (workflowId) query.workflowId = workflowId;
        if (status) query.status = status;

        const logs = await WorkflowLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('workflowId', 'name')
            .populate('leadId', 'name email');

        const count = await WorkflowLog.countDocuments(query);

        res.json({
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        logger.error('Fetch Workflow Logs Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /workflows/logs/:id
exports.getWorkflowLogById = async (req, res) => {
    try {
        const log = await WorkflowLog.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        }).populate('workflowId', 'name nodes').populate('leadId');

        if (!log) return res.status(404).json({ message: 'Log not found' });
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
