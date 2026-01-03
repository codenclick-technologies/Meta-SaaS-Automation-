import React, { useState } from 'react';
import axios from 'axios';
import { startRegistration } from '@simplewebauthn/browser';
import DeviceManagement from '../components/DeviceManagement';

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const SecuritySettings = () => {
    const [loading, setLoading] = useState(false);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Helper to get or create device ID
    const getDeviceId = () => {
        let id = localStorage.getItem('security_device_id');
        if (!id) {
            id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('security_device_id', id);
        }
        return id;
    };

    // 1. Handle Fingerprint Registration
    const handleRegisterBiometric = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');

            // Step A: Get Registration Options from Server
            const optionsRes = await axios.get(`${API_BASE_URL}/api/security/webauthn/register/options`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Step B: Pass options to browser's native WebAuthn API
            // This triggers the browser/OS prompt (TouchID, FaceID, Windows Hello)
            const attResp = await startRegistration(optionsRes.data);

            // Step C: Send the signature back to server for verification
            const verifyRes = await axios.post(`${API_BASE_URL}/api/security/webauthn/register/verify`, {
                response: attResp
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (verifyRes.data.success) {
                setMessage({ type: 'success', text: 'Fingerprint registered successfully! You can now use it to login.' });
            }
        } catch (error) {
            console.error(error);
            let errorMsg = 'Failed to register fingerprint.';

            if (error.name === 'NotAllowedError') {
                errorMsg = 'Registration cancelled or timed out.';
            } else if (error.name === 'InvalidStateError') {
                errorMsg = 'This device is already registered.';
            } else if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            }

            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle PIN Setup
    const handleSetPin = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (pin.length < 4 || pin.length > 6) {
            setMessage({ type: 'error', text: 'PIN must be between 4 and 6 digits.' });
            return;
        }
        if (pin !== confirmPin) {
            setMessage({ type: 'error', text: 'PINs do not match.' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const deviceId = getDeviceId();
            const res = await axios.post(`${API_BASE_URL}/api/security/pin/set`, { pin, deviceId }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setMessage({ type: 'success', text: 'Security PIN updated successfully.' });
                setPin('');
                setConfirmPin('');
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to set PIN.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
                <p className="text-gray-500 mt-1">Manage your biometric access and security PIN.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-md border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Device Management Section */}
            <DeviceManagement />

            {/* Biometric Section */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Biometric Authentication</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-sm text-gray-600">
                                Use your fingerprint or Face ID to login quickly without a password.
                                <br />
                                <span className="text-xs text-gray-400">Supported on devices with TouchID, FaceID, or Windows Hello.</span>
                            </p>
                        </div>
                        <button
                            onClick={handleRegisterBiometric}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Register Fingerprint'}
                        </button>
                    </div>
                </div>
            </div>

            {/* PIN Section */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Security PIN</h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Set a 4-6 digit PIN as a backup login method or for sensitive actions.
                    </p>
                    <form onSubmit={handleSetPin} className="max-w-xs space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">New PIN</label>
                            <input
                                type="password"
                                maxLength="6"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest"
                                placeholder="••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm PIN</label>
                            <input
                                type="password"
                                maxLength="6"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest"
                                placeholder="••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !pin || !confirmPin}
                            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Set PIN'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;