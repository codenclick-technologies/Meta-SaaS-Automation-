import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        try {
            await forgotPassword(email);
            setStatus('success');
            setMessage('If an account exists with this email, you will receive a reset link shortly.');
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md z-10 mx-4"
            >
                <a href="/login" className="text-blue-200 hover:text-white flex items-center gap-2 text-sm mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </a>

                <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                <p className="text-blue-200 text-sm mb-8">Enter your email and we'll send you a link to reset your password.</p>

                {status === 'success' ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-green-500/20 border border-green-500/50 text-green-100 p-4 rounded-xl text-center"
                    >
                        <p>{message}</p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3.5 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {status === 'error' && (
                            <p className="text-red-400 text-sm text-center">{message}</p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                            {!status === 'loading' && <ArrowRight className="w-5 h-5" />}
                        </motion.button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
