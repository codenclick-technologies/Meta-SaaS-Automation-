import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, KeyRound, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { BiometricService } from '../services/biometricService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const QuickLogin = ({ userEmail, onLoginSuccess, onSwitchToPassword }) => {
    const [mode, setMode] = useState('login'); // 'login' | 'reset'
    const [pin, setPin] = useState('');
    const [shake, setShake] = useState(false);
    const [otp, setOtp] = useState('');
    const [newPin, setNewPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bioLoading, setBioLoading] = useState(false);
    const [isBioSupported, setIsBioSupported] = useState(false);

    useEffect(() => {
        const supported = BiometricService.isSupported();
        setIsBioSupported(supported);

        // Auto-trigger biometric prompt on mobile-like devices if supported
        // This is a UX choice; some users prefer clicking a button.
        // if (supported && /Mobi|Android/i.test(navigator.userAgent)) {
        //     handleBiometricLogin();
        // }
    }, []);

    // Get persistent Device ID
    const getDeviceId = () => {
        let id = localStorage.getItem('security_device_id');
        if (!id) {
            id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('security_device_id', id);
        }
        return id;
    };

    const handlePinSubmit = async (e, manualPin) => {
        if (e) e.preventDefault();
        const pinToVerify = manualPin || pin;

        setLoading(true);
        setError('');
        setShake(false);

        try {
            const deviceId = getDeviceId();
            const res = await axios.post(`${API_URL}/api/security/pin/verify`, {
                email: userEmail,
                pin: pinToVerify,
                deviceId
            });

            if (res.data.success) {
                onLoginSuccess(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            setShake(true);
            setPin('');
            setTimeout(() => setShake(false), 500);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        setBioLoading(true);
        setError('');
        try {
            const data = await BiometricService.login(userEmail);
            onLoginSuccess(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Biometric login failed');
        } finally {
            setBioLoading(false);
        }
    };

    const handleForgotPin = async () => {
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}/api/security/pin/forgot`, { email: userEmail });
            setMode('reset');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const deviceId = getDeviceId();
            const res = await axios.post(`${API_URL}/api/security/pin/reset`, {
                email: userEmail,
                otp,
                newPin,
                deviceId
            });
            if (res.data.success) {
                setMode('login');
                setOtp('');
                setNewPin('');
                setPin('');
                setError('');
                alert('PIN reset successfully. Please login with new PIN.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            {mode === 'login' ? (
                <>
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <KeyRound className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Quick Access</h3>
                        <p className="text-sm text-gray-500">Enter PIN for {userEmail}</p>
                    </div>

                    <form onSubmit={handlePinSubmit} className="space-y-4">
                        <motion.input
                            type="password"
                            maxLength="6"
                            value={pin}
                            animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
                            transition={{ duration: 0.4 }}
                            onChange={(e) => {
                                const val = e.target.value;
                                setPin(val);
                                if (val.length === 6) {
                                    handlePinSubmit(null, val);
                                }
                            }}
                            className={`w-full text-center text-2xl tracking-[0.5em] font-bold border-2 rounded-xl py-3 focus:outline-none ${error ? 'border-red-500 text-red-600 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                            placeholder="••••"
                            autoFocus
                        />

                        {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || pin.length < 4}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Unlock'}
                        </button>
                    </form>

                    {isBioSupported && (
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={handleBiometricLogin}
                                disabled={loading || bioLoading}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                {bioLoading ? 'Scanning...' : <><Fingerprint className="w-5 h-5" /> Use Fingerprint</>}
                            </button>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 mb-2">
                            Not {userEmail}?{' '}
                            <button
                                onClick={onSwitchToPassword}
                                className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                                Switch Account
                            </button>
                        </p>
                        <button
                            onClick={handleForgotPin}
                            className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                            Forgot PIN?
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center mb-4">
                        <button onClick={() => setMode('login')} className="text-gray-500 hover:text-gray-700 mr-2">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-gray-800">Reset PIN</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Enter the OTP sent to {userEmail}</p>

                    <form onSubmit={handleResetSubmit} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                            type="password"
                            placeholder="New PIN (4-6 digits)"
                            maxLength="6"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading || !otp || newPin.length < 4}
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Set New PIN'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default QuickLogin;