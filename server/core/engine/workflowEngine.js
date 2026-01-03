const Workflow = require('../../models/Workflow');
const Integration = require('../../models/Integration');
const logger = require('../../utils/logger');

/**
 * Principal Software Architect Component:
 * Global Workflow Automation Engine (Core)
 */
class WorkflowEngine {
    constructor() {
        this.actionHandlers = {
            'whatsapp': this.handleWhatsApp.bind(this),
            'email': this.handleEmail.bind(this),
            'crm': this.handleCRM.bind(this),
            'webhook': this.handleWebhook.bind(this),
            'ai_agent': this.handleAI.bind(this),
            'predictive_route': this.handlePredictiveRouting.bind(this),
            'roi_guard': this.handleROIGuard.bind(this),
            'ab_test': this.handleABTest.bind(this)
        };
    }

    /**
     * Entry Point for all Automation Events
     */
    async processEvent(organizationId, triggerType, payload) {
        try {
            // 1. Fetch active workflows for this trigger
            const workflows = await Workflow.find({
                organizationId,
                isActive: true,
                'trigger.type': triggerType
            });

            logger.info(`Found ${workflows.length} workflows for event: ${triggerType}`);

            // 2. Execute workflows in parallel 
            const executionPromises = workflows.map(wf => this.executeWorkflow(wf, payload));
            return Promise.all(executionPromises);
        } catch (error) {
            logger.error(`Engine Error in processEvent: ${error.message}`);
        }
    }

    /**
     * Recursive Workflow Executor with State Management & Detailed Logging
     */
    async executeWorkflow(workflow, payload) {
        const WorkflowLog = require('../../models/WorkflowLog');
        logger.info(`Starting Workflow: ${workflow.name} [${workflow._id}]`);

        // 1. Initialize Log Entry
        const executionLog = new WorkflowLog({
            organizationId: workflow.organizationId,
            workflowId: workflow._id,
            leadId: payload._id,
            triggerData: payload,
            status: 'running',
            steps: []
        });
        await executionLog.save();

        // BI Logic: Track Workflow Start
        const BIService = require('../../services/biService');
        await BIService.trackEvent({
            organizationId: workflow.organizationId,
            leadId: payload._id,
            type: 'WORKFLOW_TRIGGERED',
            metadata: { workflowName: workflow.name }
        });

        const startTime = Date.now();
        let currentNode = workflow.nodes.find(n => n.id === 'start' || workflow.trigger.nextNodes?.includes(n.id));
        const state = {
            payload,
            organizationId: workflow.organizationId,
            variables: {},
            history: []
        };

        while (currentNode) {
            const stepStart = new Date();
            const stepEntry = {
                nodeId: currentNode.id,
                nodeName: currentNode.name,
                nodeType: currentNode.type,
                startTime: stepStart
            };

            try {
                const result = await this.executeNode(currentNode, state, workflow.organizationId);

                stepEntry.status = 'completed';
                stepEntry.output = result;
                stepEntry.endTime = new Date();

                state.history.push({ nodeId: currentNode.id, success: true });
                executionLog.steps.push(stepEntry);

                // Logic for finding next node
                const nextId = currentNode.type === 'condition'
                    ? currentNode.nextNodes[result ? 0 : 1]
                    : currentNode.nextNodes[0];

                currentNode = this.findNextNode(workflow, nextId);
            } catch (error) {
                logger.error(`Node Execution Failed: ${currentNode.id} - ${error.message}`);

                stepEntry.status = 'failed';
                stepEntry.error = error.message;
                stepEntry.endTime = new Date();
                executionLog.steps.push(stepEntry);
                executionLog.status = 'partial'; // Mark as partial if a node fails but we might continue

                if (currentNode.failureNodes?.length > 0) {
                    currentNode = this.findNextNode(workflow, currentNode.failureNodes[0]);
                } else {
                    executionLog.status = 'failed';
                    break;
                }
            }
        }

        // Finalize Log
        executionLog.status = executionLog.status === 'running' ? 'success' : executionLog.status;
        executionLog.totalDurationMs = Date.now() - startTime;
        await executionLog.save();
    }

    async executeNode(node, state, organizationId) {
        // Global SaaS Rule: Check Compliance before executing any PII-related action
        const Organization = require('../../models/Organization');
        const org = await Organization.findById(organizationId);

        if (org?.compliance?.isGDPR && node.type === 'action' && !state.payload.gdprConsent) {
            logger.warn(`Compliance Block: Node ${node.id} skipped due to missing GDPR consent.`);
            return false;
        }

        switch (node.type) {
            case 'action':
                return await this.runAction(node, state, organizationId);
            case 'condition':
                return this.evaluateCondition(node, state);
            case 'delay':
                const TimezoneUtility = require('../../utils/timezoneUtility');
                const tz = org?.settings?.timezone || 'UTC';
                const nextTime = TimezoneUtility.getNextAvailableTime(tz);
                const delayMs = nextTime.getTime() - Date.now();

                if (delayMs > 0) {
                    logger.info(`Engine: Global Smart Delay active for ${delayMs}ms [TZ: ${tz}]`);
                    await this.wait(Math.min(delayMs, node.config.durationMs || 3600000));
                }
                return true;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    async runAction(node, state, organizationId) {
        const handler = this.actionHandlers[node.provider];
        if (!handler) throw new Error(`Untrusted Provider: ${node.provider}`);

        // Fetch Integration credentials (Internal services bypass this)
        const internalProviders = ['predictive_route', 'roi_guard', 'ai_agent'];
        if (internalProviders.includes(node.provider)) {
            return await handler(node.actionType, node.config, state, null);
        }

        const integration = await Integration.findOne({
            organizationId,
            provider: node.provider,
            isActive: true
        });

        if (!integration) throw new Error(`Missing active integration for provider: ${node.provider}`);

        return await handler(node.actionType, node.config, state, integration);
    }

    evaluateCondition(node, state) {
        // Advanced Logic Algorithm: Rule Engine implementation
        const { field, operator, value } = node.config;
        let actualValue = state.payload[field];

        // Global SaaS: Automatic localization/routing extraction
        if (field === 'country' && !actualValue) {
            actualValue = state.payload.rawData?.country_code || state.payload.ipCountry || 'Unknown';
        }

        switch (operator) {
            case 'equals': return String(actualValue).toLowerCase() === String(value).toLowerCase();
            case 'not_equals': return String(actualValue).toLowerCase() !== String(value).toLowerCase();
            case 'contains': return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
            case 'greater_than': return Number(actualValue) > Number(value);
            case 'is_in_region':
                const regions = { 'EU': ['FR', 'DE', 'IT', 'ES'], 'AS': ['IN', 'SG', 'AE'] };
                return regions[value]?.includes(actualValue);
            default: return false;
        }
    }

    findNextNode(workflow, nodeId) {
        return workflow.nodes.find(n => n.id === nodeId);
    }

    wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    // --- Provider Handlers ---
    async handleAI(action, config, state, integration) {
        const openaiService = require('../../services/openaiService');
        const Lead = require('../../models/Lead');

        logger.info(`Engine: AI Principal analysis triggered for ${state.payload.name}`);
        const aiResult = await openaiService.analyzeLead(state.payload, integration.organizationId);

        if (aiResult) {
            // Enrich state for next nodes
            state.variables.ai_score = aiResult.score;
            state.variables.ai_intent = aiResult.intent;

            // Persist to Lead model for UI
            await Lead.findByIdAndUpdate(state.payload._id, {
                $set: {
                    aiAnalysis: aiResult,
                    score: aiResult.score
                }
            });
            return aiResult;
        }
        return false;
    }

    async handleWhatsApp(action, config, state, integration) {
        const whatsappService = require('../../services/whatsappService');
        const lead = state.payload;
        logger.info(`Engine: Multi-Lang WhatsApp Node triggered for ${lead.name}`);

        // Smart Translation: Detect locale and pick correct content
        const locale = this.detectLeadLocale(lead);
        const translatedConfig = this.getTranslatedConfig(config, locale);

        const response = await whatsappService.sendCustomMessage(lead, translatedConfig, integration.credentials);

        // BI Logic: Track Communication
        const BIService = require('../../services/biService');
        await BIService.trackEvent({
            organizationId: state.organizationId,
            leadId: lead._id,
            type: 'MESSAGE_SENT',
            metadata: { channel: 'whatsapp', node: action.name }
        });

        return response;
    }

    async handleEmail(action, config, state, integration) {
        const emailService = require('../../services/emailService');
        const lead = state.payload;
        logger.info(`Engine: Multi-Lang Email Node triggered for ${lead.name}`);

        const locale = this.detectLeadLocale(lead);
        const translatedConfig = this.getTranslatedConfig(config, locale);

        const response = await emailService.sendCustomEmail(lead, translatedConfig, integration.credentials);

        // BI Logic: Track Communication
        const BIService = require('../../services/biService');
        await BIService.trackEvent({
            organizationId: state.organizationId,
            leadId: lead._id,
            type: 'MESSAGE_SENT',
            metadata: { channel: 'email', node: action.name }
        });

        return response;
    }

    /**
     * Detects lead locale based on Meta rawData, Phone extension, or IP metadata
     */
    detectLeadLocale(lead) {
        if (lead.rawData?.locale) return lead.rawData.locale;
        // Simple mapping based on phone prefix if locale missing
        if (lead.phone?.startsWith('+91')) return 'hi-IN';
        if (lead.phone?.startsWith('+34')) return 'es-ES';
        if (lead.phone?.startsWith('+33')) return 'fr-FR';
        return 'en-US'; // Default fallback
    }

    /**
     * Picks the correct translation from node config if available
     */
    getTranslatedConfig(config, locale) {
        if (config.translations && config.translations[locale]) {
            logger.info(`Engine: Applying translation for locale [${locale}]`);
            return {
                ...config,
                message: config.translations[locale].message || config.message,
                subject: config.translations[locale].subject || config.subject
            };
        }
        return config; // Fallback to default config
    }

    async handleCRM(action, config, state, integration) {
        const crmService = require('../../services/crmService');
        const Integration = require('../../models/Integration');
        const lead = state.payload;

        logger.info(`Engine: Multi-Regional CRM Node triggered for ${lead.name}`);

        // Logic: Check if there's a regional specific CRM integration defined in the node config
        let targetIntegration = integration;
        const leadRegion = lead.country; // Using detected country code as region key

        if (config.regionalOverrides && config.regionalOverrides[leadRegion]) {
            const overrideId = config.regionalOverrides[leadRegion];
            const foundOverride = await Integration.findById(overrideId);
            if (foundOverride) {
                logger.info(`Engine: Regional Override match! Routing to [${foundOverride.name}] for region [${leadRegion}]`);
                targetIntegration = foundOverride;
            }
        }

        const response = await crmService.syncLead(lead, targetIntegration);

        // BI Logic: Track CRM Sync
        const BIService = require('../../services/biService');
        await BIService.trackEvent({
            organizationId: targetIntegration.organizationId,
            leadId: lead._id,
            type: 'CRM_SYNC',
            metadata: { provider: targetIntegration.provider }
        });

        return response;
    }

    async handleWebhook(action, config, state, integration) {
        const axios = require('axios');
        logger.info(`Engine: Webhook Outbound triggered to ${config.url}`);
        try {
            await axios.post(config.url, state.payload);
            return true;
        } catch (e) {
            logger.error(`Webhook Node Failed: ${e.message}`);
            return false;
        }
    }

    /**
     * PREDICTIVE ROUTING: Intelligent Lead Assignment
     */
    async handlePredictiveRouting(action, config, state) {
        const routingService = require('../../services/routingService');
        const Lead = require('../../models/Lead');
        const lead = state.payload;

        logger.info(`Engine: Executing Predictive Routing for Lead [${lead.name}]`);

        const bestAgentId = await routingService.predictBestAgent(lead);

        if (bestAgentId) {
            await Lead.findByIdAndUpdate(lead._id, { assignedTo: bestAgentId });
            logger.info(`Engine: Lead successfully routed to Agent ID: ${bestAgentId}`);

            // BI Event for Routing Success
            const BIService = require('../../services/biService');
            await BIService.trackEvent({
                organizationId: lead.organizationId,
                leadId: lead._id,
                type: 'WORKFLOW_TRIGGERED',
                metadata: { action: 'PREDICTIVE_ASSIGNMENT', agentId: bestAgentId }
            });
        }

        return { assignedTo: bestAgentId };
    }

    /**
     * ROI GUARD: Protects ad spend by checking campaign health on-the-fly
     */
    async handleROIGuard(action, config, state) {
        const biService = require('../../services/biService');
        const lead = state.payload;
        const campaignName = lead.rawData?.campaign_name || lead.campaign;

        logger.info(`Engine: ROI Guard checking Campaign [${campaignName}]`);

        const healthReport = await biService.getCampaignROIHealth(state.organizationId);
        const campaignStats = healthReport.find(c => c.campaign === campaignName);

        if (campaignStats && campaignStats.roi < 100 && campaignStats.leads > 10) {
            logger.error(`Engine: ROI ALERT! Campaign [${campaignName}] has negative ROI (${campaignStats.roi}%).`);

            // Log Anomaly Event
            const BIService = require('../../services/biService');
            await BIService.trackEvent({
                organizationId: state.organizationId,
                leadId: lead._id,
                type: 'WORKFLOW_TRIGGERED',
                metadata: { action: 'ROI_GUARD_TRIGGERED', status: 'UNHEALTHY', roi: campaignStats.roi }
            });

            return { status: 'unsafe', roi: campaignStats.roi };
        }

        return { status: 'safe', roi: campaignStats?.roi || 100 };
    }

    /**
     * A/B TESTING: Regional & Strategic Split Testing
     */
    async handleABTest(action, config, state) {
        const testingService = require('../../services/testingService');
        const lead = state.payload;

        logger.info(`Engine: Executing A/B Test [${config.testId}] for Lead [${lead.name}]`);

        const variant = await testingService.split(lead, config);

        // Store selected variant in state variables for subsequent nodes
        state.variables.ab_variant = variant;

        return { selectedVariant: variant };
    }
}

module.exports = new WorkflowEngine();
