const Lead = require('../models/Lead');
const User = require('../models/User');
const logger = require('../utils/logger');
const routingService = require('./routingService');

/**
 * Executes a single node in the workflow
 * @param {Object} node - The node configuration
 * @param {Object} lead - The lead document
 */
const executeNode = async (node, lead) => {
    try {
        if (node.type === 'action') {
            switch (node.provider) {
                case 'assignment':
                    return await handleAssignment(node, lead);
                case 'predictive_route':
                    return await handlePredictiveRouting(node, lead);
                // Add other providers (email, whatsapp) here
                default:
                    return { status: 'skipped', message: `Unknown provider: ${node.provider}` };
            }
        }
        // Handle conditions if needed
        return { status: 'success' };
    } catch (error) {
        logger.error(`Error executing node ${node.id}:`, error);
        return { status: 'failed', error: error.message };
    }
};

/**
 * Handles Lead Assignment Logic
 */
const handleAssignment = async (node, lead) => {
    const { assignedTo } = node.config;

    if (!assignedTo) {
        throw new Error('Configuration Error: No team member selected for assignment.');
    }

    // Verify user exists
    const user = await User.findById(assignedTo);
    if (!user) {
        throw new Error('Assignment Error: Selected user does not exist.');
    }

    // Update Lead
    await Lead.findByIdAndUpdate(lead._id, {
        assignedTo: user._id,
        $push: {
            logs: {
                channel: 'system',
                status: 'assigned',
                response: { message: `Lead automatically assigned to ${user.name} via workflow.` },
                timestamp: new Date()
            }
        }
    });

    return {
        status: 'success',
        output: { assignedTo: user.name, assignedToId: user._id }
    };
};

/**
 * Handles Predictive Routing Logic
 */
const handlePredictiveRouting = async (node, lead) => {
    const bestAgentId = await routingService.predictBestAgent(lead);

    if (!bestAgentId) {
        throw new Error('Predictive Routing Error: No suitable agent found.');
    }

    const agent = await User.findById(bestAgentId);
    if (!agent) {
        throw new Error(`Predictive Routing Error: Agent with ID ${bestAgentId} not found.`);
    }

    // Assign the lead
    await Lead.findByIdAndUpdate(lead._id, {
        assignedTo: agent._id,
        $push: { logs: { channel: 'system', status: 'assigned', response: { message: `Lead predictively routed to ${agent.name}.` }, timestamp: new Date() } }
    });

    return {
        status: 'success',
        output: { assignedTo: agent.name, assignedToId: agent._id, reason: 'AI_PREDICTION' }
    };
};

module.exports = { executeNode };