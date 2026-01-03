const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const User = require('../models/User');
const logger = require('../utils/logger');

// Relying Party Settings
const rpName = 'Antigravity Meta SaaS';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:5173';

class SecurityService {
    /**
     * REGISTRATION: Step 1 - Generate Options
     */
    async getRegistrationOptions(user) {
        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: user._id.toString(),
            userName: user.email,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // Enforce platform biometrics (TouchID/FaceID/Fingerprint)
            },
        });

        // Save challenge to user document for verification
        user.currentChallenge = options.challenge;
        await user.save();

        return options;
    }

    /**
     * REGISTRATION: Step 2 - Verify & Save Device
     */
    async verifyRegistration(user, body) {
        const expectedChallenge = user.currentChallenge;

        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });
        } catch (error) {
            logger.error(`Registration Verification Failed: ${error.message}`);
            throw new Error('Registration failed');
        }

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = registrationInfo;

            // Save new authenticator
            user.authenticators.push({
                credentialID: Buffer.from(credentialID).toString('base64'),
                credentialPublicKey: Buffer.from(credentialPublicKey),
                counter,
                credentialDeviceType: registrationInfo.credentialDeviceType,
                credentialBackedUp: registrationInfo.credentialBackedUp,
            });

            user.currentChallenge = null;
            await user.save();
            return true;
        }

        return false;
    }

    /**
     * AUTHENTICATION: Step 1 - Generate Options
     */
    async getAuthenticationOptions(user) {
        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: user.authenticators.map((auth) => ({
                id: Buffer.from(auth.credentialID, 'base64'),
                type: 'public-key',
                transports: auth.transports,
            })),
            userVerification: 'preferred',
        });

        user.currentChallenge = options.challenge;
        await user.save();

        return options;
    }

    /**
     * AUTHENTICATION: Step 2 - Verify Signature
     */
    async verifyAuthentication(user, body) {
        const expectedChallenge = user.currentChallenge;
        const authenticator = user.authenticators.find(
            (auth) => auth.credentialID === body.id
        );

        if (!authenticator) throw new Error('Authenticator not found');

        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: body,
                expectedChallenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                authenticator: {
                    credentialID: Buffer.from(authenticator.credentialID, 'base64'),
                    credentialPublicKey: authenticator.credentialPublicKey,
                    counter: authenticator.counter,
                },
            });
        } catch (error) {
            logger.error(`Authentication Verification Failed: ${error.message}`);
            throw new Error('Biometric login failed');
        }

        const { verified, authenticationInfo } = verification;

        if (verified) {
            // Update counter for replay protection
            authenticator.counter = authenticationInfo.newCounter;
            user.currentChallenge = null;
            await user.save();
            return true;
        }

        return false;
    }
}

module.exports = new SecurityService();
