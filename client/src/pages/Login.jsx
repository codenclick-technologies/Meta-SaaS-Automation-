import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Chrome } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

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
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
                    <p className="text-blue-200 text-sm">Sign in to manage your automation</p>
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
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                        {!loading && <ArrowRight className="w-5 h-5" />}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
