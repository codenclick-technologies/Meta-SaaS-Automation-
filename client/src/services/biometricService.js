import axios from 'axios';
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const BiometricService = {
    isSupported: () => {
        return browserSupportsWebAuthn();
    },

    register: async () => {
        if (!browserSupportsWebAuthn()) {
            throw new Error('Biometrics not supported on this device/browser.');
        }

        const token = localStorage.getItem('token');
        try {
            // 1. Get Options
            const optionsRes = await axios.get(`${API_URL}/api/security/webauthn/register/options`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 2. Browser Native Prompt
            const attResp = await startRegistration(optionsRes.data);

            // 3. Verify
            return axios.post(`${API_URL}/api/security/webauthn/register/verify`, {
                response: attResp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Biometric Registration Error:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Registration cancelled or timed out.');
            } else if (error.name === 'InvalidStateError') {
                throw new Error('This authenticator is already registered.');
            }
            throw error;
        }
    },

    login: async (email) => {
        // 1. Get Options
        const optionsRes = await axios.post(`${API_URL}/api/security/webauthn/login/options`, { email });

        // 2. Browser Native Prompt
        const asseResp = await startAuthentication(optionsRes.data);

        // 3. Verify
        const verifyRes = await axios.post(`${API_URL}/api/security/webauthn/login/verify`, {
            email,
            response: asseResp
        });
        return verifyRes.data;
    }
};