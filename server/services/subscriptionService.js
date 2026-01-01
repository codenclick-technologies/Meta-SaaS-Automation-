const Organization = require('../models/Organization');
const Plan = require('../models/Plan');
const schedule = require('node-schedule');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Assume Stripe is configured

class SubscriptionService {
    constructor() {
        this.setupDailyChecks();
    }

    setupDailyChecks() {
        // Run every day at mightnight
        schedule.scheduleJob('0 0 * * *', async () => {
            logger.info('Starting daily subscription check...');
            await this.checkExpiringSubscriptions();
        });
    }

    async checkExpiringSubscriptions() {
        // Implementation for checking real billing status via Stripe or DB dates
        // For now, this is a placeholder for the logic
        logger.info('Checked subscriptions.');
    }

    async upgradePlan(organizationId, planName) {
        const organization = await Organization.findById(organizationId);
        if (!organization) throw new Error('Organization not found');

        // Logic to update plan features
        let planDetails = {
            name: planName,
            price: planName === 'Enterprise' ? 299 : 99,
            features: [],
            maxUsers: planName === 'Enterprise' ? 100 : 20,
            organizationId: organizationId
        };

        if (planName === 'Enterprise') {
            planDetails.features = ['Unlimited Automation', 'Unlimited Users', 'Dedicated Support', 'SSO', 'Audit Logs'];
        } else {
            planDetails.features = ['Advanced Automation', 'Up to 20 Users', 'Priority Support'];
        }

        // Update or Create new Plan record
        await Plan.findOneAndUpdate(
            { organizationId },
            planDetails,
            { upsert: true, new: true }
        );

        return planDetails;
    }
}

module.exports = new SubscriptionService();
