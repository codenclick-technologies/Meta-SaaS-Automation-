import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { login, loginWith2FA } from '../services/api';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Shield, Fingerprint } from 'lucide-react';
import { BiometricService } from '../services/biometricService';
import QuickLogin from '../components/QuickLogin';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token2fa, setToken2fa] = useState('');
    const [userId, setUserId] = useState(null);
    const [is2faRequired, setIs2faRequired] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [bioLoading, setBioLoading] = useState(false);

    // Security Setup State
    const [showSetup, setShowSetup] = useState(false);
    const [setupPin, setSetupPin] = useState('');

    // Check for saved user session for Quick Login
    const [savedEmail, setSavedEmail] = useState(localStorage.getItem('last_user_email'));
    const [showQuickLogin, setShowQuickLogin] = useState(!!localStorage.getItem('last_user_email'));

    const navigate = useNavigate();

    const handleLoginSuccess = (data) => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user || {}));
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (is2faRequired) {
                await loginWith2FA(userId, token2fa);
                // Auto-whitelist IP after successful 2FA
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_BASE_URL}/api/security/whitelist/current`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (e) { console.error('Failed to whitelist IP', e); }
            } else {
                const data = await login(email, password);
                if (data.status === '2fa_required') {
                    setIs2faRequired(true);
                    setUserId(data.userId);
                } else {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user || {}));
                    checkSecurityAndRedirect(data.token, email);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const checkSecurityAndRedirect = async (token, userEmail) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/security/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.pinEnabled) {
                localStorage.setItem('last_user_email', userEmail);
                navigate('/');
            } else {
                setShowSetup(true);
            }
        } catch (e) {
            console.error(e);
            navigate('/');
        }
    };

    const handleBiometricLogin = async () => {
        if (!email) return setError('Please enter your email first to use biometric login');
        setBioLoading(true);
        setError('');
        try {
            await BiometricService.login(email);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Biometric login failed');
        } finally {
            setBioLoading(false);
        }
    };

    const handleSetupComplete = async () => {
        if (setupPin.length < 4) return setError('PIN must be 4-6 digits');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Generate device ID
            let deviceId = localStorage.getItem('security_device_id');
            if (!deviceId) {
                deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem('security_device_id', deviceId);
            }

            await axios.post(`${API_BASE_URL}/api/security/pin/set`, { pin: setupPin, deviceId }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Try registering biometric if supported (optional, can skip)
            try {
                await BiometricService.register();
            } catch (e) {
                console.log('Biometric skipped or failed', e);
            }

            localStorage.setItem('last_user_email', email);
            navigate('/');
        } catch (err) {
            setError('Failed to setup security');
        } finally {
            setLoading(false);
        }
    };

    // Render Quick Login if available
    if (showQuickLogin && savedEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 relative overflow-hidden p-4">
                <QuickLogin userEmail={savedEmail} onLoginSuccess={handleLoginSuccess} onSwitchToPassword={() => setShowQuickLogin(false)} />
            </div>
        );
    }

    if (showSetup) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Your Device</h2>
                    <p className="text-gray-500 mb-6">Set a PIN to enable Quick Login for this device next time.</p>

                    <input
                        type="password"
                        placeholder="Create 4-6 digit PIN"
                        className="w-full text-center text-2xl tracking-widest border-2 border-gray-200 rounded-xl py-3 mb-6 focus:border-blue-500 outline-none"
                        maxLength="6"
                        value={setupPin}
                        onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))}
                    />

                    <button onClick={handleSetupComplete} disabled={loading || setupPin.length < 4} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition mb-3">
                        {loading ? 'Setting up...' : 'Save PIN & Enable Biometrics'}
                    </button>
                    <button onClick={() => navigate('/')} className="text-gray-400 text-sm hover:text-gray-600">
                        Skip for now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 mx-4"
            >
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform rotate-3 hover:rotate-6 transition-all">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {is2faRequired ? 'Enter 2FA Code' : 'Welcome Back'}
                    </h2>
                    <p className="text-blue-200 text-sm">
                        {is2faRequired ? 'Enter the code from your authenticator app.' : 'Sign in to manage your automation'}
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg mb-6 text-sm flex items-center gap-2"
                    >
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!is2faRequired ? (
                        <>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div className="relative group">
                            <Shield className="absolute left-3 top-3.5 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="6-digit code"
                                value={token2fa}
                                onChange={(e) => setToken2fa(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                                maxLength="6"
                            />
                        </div>
                    )}


                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center text-blue-200 cursor-pointer hover:text-white transition-colors">
                            <input type="checkbox" className="mr-2 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-offset-0 focus:ring-blue-500" />
                            Remember me
                        </label>
                        <a href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                            Forgot Password?
                        </a>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading || bioLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Verifying...' : (is2faRequired ? 'Verify Code' : 'Sign In')}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </motion.button>

                    {!is2faRequired && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={handleBiometricLogin}
                            disabled={loading || bioLoading}
                            className="w-full bg-white/5 border border-white/20 text-white py-3.5 rounded-xl font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                        >
                            {bioLoading ? 'Scanning...' : 'Login with Fingerprint'}
                            {!bioLoading && <Fingerprint className="w-5 h-5 text-blue-400" />}
                        </motion.button>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-blue-400 hover:text-white font-semibold transition-colors">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
