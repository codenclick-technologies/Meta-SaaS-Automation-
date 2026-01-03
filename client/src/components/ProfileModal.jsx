import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, User, Mail, Lock, Check, AlertCircle, Loader2, Fingerprint } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }));
            setPin('');
            setConfirmPin('');
            setMessage({ type: '', text: '' });
        }
    }, [isOpen, user]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { data } = await api.put(
                '/auth/profile',
                { name: formData.name, email: formData.email }
            );

            onUpdate(data);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put(
                '/auth/change-password',
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                }
            );

            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to change password'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSetPin = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (pin.length < 4 || pin.length > 6) {
            return setMessage({ type: 'error', text: 'PIN must be 4-6 digits.' });
        }
        if (pin !== confirmPin) {
            return setMessage({ type: 'error', text: 'PINs do not match.' });
        }

        setLoading(true);
        try {
            let deviceId = localStorage.getItem('security_device_id');
            if (!deviceId) {
                deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                localStorage.setItem('security_device_id', deviceId);
            }

            await api.post('/api/security/pin/set', { pin, deviceId });
            setMessage({ type: 'success', text: 'Security PIN updated successfully.' });
            setPin('');
            setConfirmPin('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to set PIN.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterBiometric = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            // Step A: Get Registration Options from Server
            const optionsRes = await api.get('/api/security/webauthn/register/options');

            // Step B: Pass options to browser's native WebAuthn API
            const attResp = await startRegistration(optionsRes.data);

            // Step C: Send the signature back to server for verification
            const verifyRes = await api.post('/api/security/webauthn/register/verify', {
                response: attResp
            });

            if (verifyRes.data.success) {
                setMessage({ type: 'success', text: 'Fingerprint registered successfully!' });
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


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Edit Profile</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        General Info
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'security'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Security
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'profile' ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-8">
                            {/* Biometric Section */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-2">Biometric Authentication</h4>
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-sm text-gray-600">Enable password-less login using your device's fingerprint scanner.</p>
                                    <button
                                        type="button"
                                        onClick={handleRegisterBiometric}
                                        disabled={loading}
                                        className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        <Fingerprint className="w-4 h-4 mr-2" />
                                        {loading ? 'Processing...' : 'Register'}
                                    </button>
                                </div>
                            </div>

                            {/* PIN Section */}
                            <form onSubmit={handleSetPin} className="space-y-4">
                                <h4 className="font-bold text-gray-800">Security PIN</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
                                    <input
                                        type="password"
                                        maxLength="6"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest"
                                        placeholder="••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                                    <input
                                        type="password"
                                        maxLength="6"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest"
                                        placeholder="••••"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !pin || !confirmPin}
                                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Set/Update PIN'}
                                </button>
                            </form>

                            {/* Change Password Section */}
                            <form onSubmit={handleChangePassword} className="space-y-4 border-t border-gray-200 pt-6">
                                <h4 className="font-bold text-gray-800">Change Password</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            value={formData.currentPassword}
                                            onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Current password"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            value={formData.newPassword}
                                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="New password"
                                            minLength={8}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !formData.currentPassword}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
