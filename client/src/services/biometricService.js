import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { api } from './api';

/**
 * Enterprise Biometric Authentication Service (Fingerprint/FaceID)
 */
export const BiometricService = {
    /**
     * Registers a new biometric device (Fingerprint)
     */
    register: async () => {
        try {
            // 1. Get options from server
            const { data: options } = await api.post('/auth/biometric/register-options');

            // 2. Trigger Browser Biometric Prompt
            const attestationResponse = await startRegistration(options);

            // 3. Verify on server
            const { data: result } = await api.post('/auth/biometric/register-verify', attestationResponse);
            return result;
        } catch (error) {
            console.error('Biometric registration failed:', error);
            throw error;
        }
    },

    /**
     * Authenticates using a registered biometric device
     */
    login: async (email) => {
        try {
            // 1. Get challenge for this email
            const { data: options } = await api.post('/auth/biometric/login-options', { email });

            // 2. Trigger Browser Biometric Prompt
            const assertionResponse = await startAuthentication(options);

            // 3. Verify on server and get JWT
            const { data: authResult } = await api.post('/auth/biometric/login-verify', {
                email,
                body: assertionResponse
            });

            return authResult;
        } catch (error) {
            console.error('Biometric login failed:', error);
            throw error;
        }
    }
};
