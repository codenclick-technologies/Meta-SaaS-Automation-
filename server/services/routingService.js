const biService = require('./biService');
const Lead = require('../models/Lead');
const User = require('../models/User');
const logger = require('../utils/logger');

class RoutingService {
    /**
     * Predictive Routing Algorithm
     * Assigns a lead to the most "competent" agent based on historical data.
     */
    async predictBestAgent(lead) {
        const { organizationId, country, aiAnalysis } = lead;
        const intent = aiAnalysis?.intent || 'unknown';

        logger.info(`Routing: Predictive Engine analyzing Lead [${lead.name}] from [${country}] with intent [${intent}]`);

        try {
            // 1. Get the Expertise Matrix
            const matrix = await biService.getPredictiveExpertiseMatrix(organizationId);

            // 2. Filter matrix for specific country and intent
            const matches = matrix.filter(m => m.country === country && m.intent === intent);

            let bestAgentId = null;

            if (matches.length > 0) {
                // Return the agent with highest success count for this pair
                bestAgentId = matches[0].agentId;
                logger.info(`Routing: Match found! Best Agent ID: ${bestAgentId} based on success matrix.`);
            } else {
                // Fallback: Check just country expertise
                const countryMatches = matrix.filter(m => m.country === country);
                if (countryMatches.length > 0) {
                    bestAgentId = countryMatches[0].agentId;
                    logger.info(`Routing: Country match found. Routing to agent with strongest performance in ${country}.`);
                } else {
                    // Final Fallback: Round Robin or Load Balanced
                    return await this.getLowestLoadAgent(organizationId);
                }
            }

            return bestAgentId;
        } catch (error) {
            logger.error('Predictive Routing Failed:', error.message);
            return await this.getLowestLoadAgent(organizationId);
        }
    }

    /**
     * Load Balancing Fallback
     */
    async getLowestLoadAgent(organizationId) {
        logger.info('Routing: Using Load Balancing fallback.');
        const agents = await User.find({ organizationId, role: { $in: ['admin', 'sales'] } });

        if (agents.length === 0) return null;

        // Group leads by assigned agent to find current load
        const loadStats = await Lead.aggregate([
            { $match: { organizationId, status: { $ne: 'Converted' } } },
            { $group: { _id: "$assignedTo", count: { $sum: 1 } } }
        ]);

        // Find agent with minimum active leads
        let lowestLoadAgent = agents[0]._id;
        let minLeads = Infinity;

        agents.forEach(agent => {
            const stat = loadStats.find(s => s._id?.toString() === agent._id.toString());
            const count = stat ? stat.count : 0;
            if (count < minLeads) {
                minLeads = count;
                lowestLoadAgent = agent._id;
            }
        });

        return lowestLoadAgent;
    }
}

module.exports = new RoutingService();
