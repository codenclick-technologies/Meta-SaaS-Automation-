import React, { useState, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generate2FASecret, enable2FA, disable2FA } from '../services/api';

const TwoFactorAuth = ({ user }) => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [setupInfo, setSetupInfo] = useState(null); // { qrCodeUrl, secret }
    const [verificationToken, setVerificationToken] = useState('');

    useEffect(() => {
        setTwoFactorEnabled(user?.twoFactorEnabled || false);
    }, [user]);

    const handleGenerateSecret = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await generate2FASecret();
            setSetupInfo(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate 2FA secret.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        if (!verificationToken) {
            setError('Please enter the verification token.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await enable2FA(verificationToken);
            setTwoFactorEnabled(true);
            setSetupInfo(null);
            setVerificationToken('');
            alert('2FA enabled successfully!');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to enable 2FA. The token may be incorrect.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await disable2FA();
            setTwoFactorEnabled(false);
            alert('2FA disabled successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to disable 2FA.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border-t pt-6">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Two-Factor Authentication (2FA)
                </h3>
                <p className="text-sm text-yellow-700">
                    Add an extra layer of security to your account. When enabled, you will be required to enter a code from your authenticator app during login.
                </p>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative my-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {twoFactorEnabled ? (
                <div className="mt-4 flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                    <div>
                        <h4 className="font-semibold text-green-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> 2FA is Enabled
                        </h4>
                        <p className="text-sm text-green-700">Your account is protected with 2FA.</p>
                    </div>
                    <button
                        onClick={handleDisable2FA}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
                    </button>
                </div>
            ) : (
                <div className="mt-4">
                    {!setupInfo ? (
                        <button
                            onClick={handleGenerateSecret}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
                        </button>
                    ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                            <p className="text-sm">Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).</p>
                            <div className="flex justify-center">
                                <img src={setupInfo.qrCodeUrl} alt="2FA QR Code" className="border p-2 bg-white" />
                            </div>
                            <p className="text-xs text-center text-gray-600">
                                Can't scan? Manually enter this secret: <br />
                                <strong className="font-mono bg-gray-200 p-1 rounded">{setupInfo.secret}</strong>
                            </p>
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Verification Token</label>
                                <input
                                    type="text"
                                    value={verificationToken}
                                    onChange={(e) => setVerificationToken(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter 6-digit code"
                                    maxLength="6"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleEnable2FA}
                                    disabled={isLoading}
                                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                                </button>
                                <button
                                    onClick={() => setSetupInfo(null)}
                                    className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TwoFactorAuth;
