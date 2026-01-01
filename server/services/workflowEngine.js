const Workflow = require('../models/Workflow');
const logger = require('../utils/logger');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');

/**
 * PHASE 1: Smart MVP Workflow Engine
 * - Executes automation steps synchronously.
 * - Handles 'Conditions' and 'Actions'.
 * - No complex queues (for now).
 */
class WorkflowEngine {

    // Entry Point: Triggered when a new lead arrives
    async triggerWorkflow(triggerType, sourceId, data) {
        try {
            logger.info(`Checking workflows for ${triggerType} : ${sourceId}`);

            // 1. Find matching workflows
            const workflows = await Workflow.find({
                'trigger.type': triggerType,
                'trigger.sourceId': sourceId,
                isActive: true
            });

            if (workflows.length === 0) return;

            // 2. Execute each workflow
            for (const workflow of workflows) {
                this.executeWorkflow(workflow, data);
            }

        } catch (error) {
            logger.error('Workflow Trigger Error', error);
        }
    }

    async executeWorkflow(workflow, initialData) {
        logger.info(`Executing Workflow: ${workflow.name}`);
        let currentData = { ...initialData };

        // Simple sequential execution for MVP
        // In future: This will be a graph traversal
        for (const node of workflow.nodes) {
            try {
                const shouldContinue = await this.executeNode(node, currentData);
                if (!shouldContinue) break; // Stop if condition fails
            } catch (err) {
                logger.error(`Node Execution Failed [${node.id}]`, err);
                break; // Stop workflow on error
            }
        }

        // Update stats
        await Workflow.updateOne({ _id: workflow._id }, { $inc: { 'metadata.totalExecutions': 1 } });
    }

    async executeNode(node, data) {
        switch (node.type) {
            case 'condition':
                return this.evaluateCondition(node.config, data);

            case 'action':
                await this.performAction(node, data);
                return true;

            case 'delay':
                // For MVP, we skip delays or implement simple timeouts
                // Real implementation needs a Scheduler (BullMQ)
                return true;

            default:
                return true;
        }
    }

    evaluateCondition(config, data) {
        // Simple logic: "If City equals Delhi"
        const { field, operator, value } = config;
        const fieldValue = data[field];

        if (operator === 'equals') return fieldValue == value;
        if (operator === 'contains') return fieldValue?.includes(value);
        if (operator === 'greater') return fieldValue > value;

        return false;
    }

    async performAction(node, data) {
        if (node.provider === 'email') {
            await sendEmail({
                to: data.email,
                subject: node.config.subject,
                text: node.config.body
                // Template replacement logic would go here
            });
        } else if (node.provider === 'sms') {
            await sendSMS(data.phone, node.config.message);
        }
    }
}

module.exports = new WorkflowEngine();
