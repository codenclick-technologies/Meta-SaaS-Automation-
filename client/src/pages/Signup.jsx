import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Briefcase, ArrowRight, CheckCircle, Smartphone } from 'lucide-react';

export default function Signup() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        organizationName: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(formData.name, formData.email, formData.password, formData.organizationName);
            // On successful registration, move to success step (Step 3)
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.name || !formData.email || !formData.password) {
                setError('Please fill in all personal details.');
                return;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters.');
                return;
            }
        }
        setError('');
        setStep(step + 1);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-900 relative overflow-hidden font-inter">
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
                className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-lg z-10 mx-4 relative"
            >
                {/* Progress Bar */}
                {step < 3 && (
                     <div className="flex justify-center mb-8 gap-2">
                        <div className={`h-1.5 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-blue-400' : 'bg-slate-700'}`} />
                        <div className={`h-1.5 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-blue-400' : 'bg-slate-700'}`} />
                    </div>
                )}
               

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {step === 1 && 'Create Account'}
                        {step === 2 && 'Setup Organization'}
                        {step === 3 && 'Welcome Aboard!'}
                    </h2>
                    <p className="text-blue-200 text-sm">
                        {step === 1 && 'Start your journey with Meta-SaaS Automation'}
                        {step === 2 && 'Tell us about your company to personalize your workspace'}
                        {step === 3 && 'Your secure workspace is ready.'}
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl mb-6 text-sm flex items-center gap-2 font-medium"
                    >
                        <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0"></span>
                        {error}
                    </motion.div>
                )}

                <AnimatePresence mode='wait'>
                    {step === 1 && (
                        <motion.form
                            key="step1"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            onSubmit={(e) => { e.preventDefault(); nextStep(); }}
                            className="space-y-5"
                        >
                            <div className="relative group">
                                <User className="absolute left-4 top-4 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                />
                            </div>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-4 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Work Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-4 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password (min 6 chars)"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                />
                            </div>
                            
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="w-full bg-white text-blue-900 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                Next Step <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        </motion.form>
                    )}

                    {step === 2 && (
                        <motion.form
                            key="step2"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-4 h-5 w-5 text-blue-300 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    name="organizationName"
                                    placeholder="Company Name"
                                    value={formData.organizationName}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-400 pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                                    required
                                />
                            </div>

                            <p className="text-xs text-blue-200/60 px-2 leading-relaxed">
                                By creating an organization, you will become the <b>Super Admin</b>. You can invite team members and assign roles after setup.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-1/3 bg-slate-800 text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                                >
                                    Back
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-2/3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? 'Creating...' : 'Launch Workspace'}
                                    {!loading && <Briefcase className="w-5 h-5" />}
                                </motion.button>
                            </div>
                        </motion.form>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Registration Successful!</h3>
                            <p className="text-blue-200 mb-8 max-w-xs mx-auto">
                                You have successfully created your organization. Redirecting you to the onboarding checklist...
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/onboarding')}
                                className="bg-white text-blue-900 px-8 py-4 rounded-2xl font-bold shadow-lg hover:shadow-white/20 transition-all flex items-center gap-2 mx-auto"
                            >
                                Start Onboarding <ArrowRight className="w-5 h-5" />
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {step < 3 && (
                     <div className="mt-8 text-center">
                        <p className="text-slate-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-400 hover:text-white font-semibold transition-colors">
                                Sign In
                            </Link>
                        </p>
                     </div>
                )}
            </motion.div>
        </div>
    );
}
