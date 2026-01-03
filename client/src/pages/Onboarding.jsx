import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Settings, Shield, Zap, Users, CreditCard, ArrowRight, LayoutDashboard, Upload, Palette } from 'lucide-react';

import { getMe, getSettings, updateSettings } from '../services/api';

const steps = [
    {
        id: 'profile',
        title: 'Review Profile',
        desc: 'Confirm your admin profile settings.',
        icon: Users
    },
    {
        id: 'branding',
        title: 'Configure Branding',
        desc: 'Upload logo and set brand colors.',
        icon: LayoutDashboard
    },
    {
        id: 'integrations',
        title: 'Connect Integrations',
        desc: 'Link OpenAI, Twilio and SendGrid.',
        icon: Zap
    },
    {
        id: 'security',
        title: 'Security Setup',
        desc: 'Enable 2FA and Audit Logs.',
        icon: Shield
    },
    {
        id: 'billing',
        title: 'Billing & Plan',
        desc: 'Review your subscription plan.',
        icon: CreditCard
    }
];

export default function Onboarding() {
    const [completedSteps, setCompletedSteps] = useState([]);
    const [activeStep, setActiveStep] = useState(0);
    const [user, setUser] = useState(null);
    const [brandingData, setBrandingData] = useState({ companyLogo: '' });
    const [integrationData, setIntegrationData] = useState({ openaiApiKey: '', twilioSid: '', sendgridApiKey: '' });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
             try {
                 const [userData, settingsData] = await Promise.all([getMe(), getSettings()]);
                 setUser(userData);
                 if (settingsData) {
                     setBrandingData({ companyLogo: settingsData.companyLogo || '' });
                     setIntegrationData({
                         openaiApiKey: settingsData.openaiApiKey || '',
                         twilioSid: settingsData.twilioSid || '',
                         sendgridApiKey: settingsData.sendgridApiKey || ''
                     });
                 }
             } catch (err) {
                 console.error('Failed to fetch data', err);
             }
        };
        fetchData();
    }, []);

    const handleStepClick = (index) => {
        // Only allow clicking if previous step is done or it's the next logical step
        if (index <= completedSteps.length) {
            setActiveStep(index);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBrandingData(prev => ({ ...prev, companyLogo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const markComplete = async (index) => {
        if (index === 1) { // Branding Step
             try {
                 await updateSettings({ companyLogo: brandingData.companyLogo });
             } catch (err) {
                 console.error('Failed to save branding', err);
                 alert('Failed to save logo.');
                 return;
             }
        }
        if (index === 2) { // Integrations Step
             try {
                 await updateSettings(integrationData);
             } catch (err) {
                 console.error('Failed to save integrations', err);
                 alert('Failed to save integrations.');
                 return;
             }
        }

        if (!completedSteps.includes(index)) {
            setCompletedSteps([...completedSteps, index]);
        }
        if (index < steps.length - 1) {
            setTimeout(() => setActiveStep(index + 1), 500); // Auto-advance
        }
    };

    const allComplete = completedSteps.length === steps.length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-inter">
            {/* Sidebar */}
            <div className="w-1/3 bg-white p-10 border-r border-slate-100 hidden md:block">
                <div className="mb-12">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Setup Your Workspace</h1>
                    <p className="text-slate-500 font-medium">Complete these steps to fully activate your Meta-SaaS Dashboard.</p>
                </div>

                <div className="space-y-6 relative">
                    {/* Progress Line */}
                    <div className="absolute left-6 top-4 bottom-4 w-1 bg-slate-100 rounded-full z-0" />
                    
                    {steps.map((step, idx) => {
                        const isCompleted = completedSteps.includes(idx);
                        const isActive = activeStep === idx;
                        const Icon = step.icon;

                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleStepClick(idx)}
                                className={`relative z-10 flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer ${isActive ? 'bg-indigo-50 border border-indigo-100 shadow-sm' : 'hover:bg-slate-50'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-200' : (isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-2 border-slate-100 text-slate-400')}`}>
                                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-lg ${isActive ? 'text-indigo-900' : (isCompleted ? 'text-slate-800' : 'text-slate-500')}`}>
                                        {step.title}
                                    </h4>
                                    <p className="text-sm text-slate-500 leading-snug">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-10 flex items-center justify-center">
                <div className="max-w-2xl w-full">
                    <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden"
                    >
                        {/* Step Content */}
                        <div className="mb-10 text-center">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-6">
                                {React.createElement(steps[activeStep].icon, { size: 40 })}
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4">{steps[activeStep].title}</h2>
                            <p className="text-slate-500 text-lg leading-relaxed">
                                Please navigate to the settings page or use the quick-action button below to complete this configuration directly.
                            </p>
                        </div>

                        {/* Simulate Action Area */}
                        <div className="bg-slate-50 rounded-2xl p-6 mb-10 border border-slate-100">
                            {activeStep === 0 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                                {user?.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{user?.name || 'Loading...'}</p>
                                                <p className="text-xs text-slate-500">{user?.email || '...'}</p>
                                            </div>
                                        </div>
                                        <button className="text-indigo-600 font-bold text-sm">Edit</button>
                                    </div>
                                </div>
                            )}
                            {activeStep === 1 && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-6 mb-4">
                                        <div className="h-24 w-24 border rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                                            {brandingData.companyLogo ? (
                                                <img src={brandingData.companyLogo} alt="Logo Preview" className="h-full w-full object-contain" />
                                            ) : (
                                                <Palette className="w-8 h-8 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h4 className="font-bold text-slate-800 mb-1">Company Logo</h4>
                                            <p className="text-xs text-slate-400 mb-3">Recommended size 400x400px. Max 2MB.</p>
                                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition">
                                                <Upload className="w-4 h-4" />
                                                 {brandingData.companyLogo ? 'Change File' : 'Upload File'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/png, image/jpeg, image/svg+xml"
                                                    onChange={handleLogoUpload}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeStep === 2 && (
                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">OpenAI API Key</label>
                                        <input 
                                            type="password" 
                                            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="sk-..."
                                            value={integrationData.openaiApiKey}
                                            onChange={(e) => setIntegrationData({...integrationData, openaiApiKey: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Twilio Account SID</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="AC..."
                                            value={integrationData.twilioSid}
                                            onChange={(e) => setIntegrationData({...integrationData, twilioSid: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">SendGrid API Key</label>
                                        <input 
                                            type="password" 
                                            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="SG..."
                                            value={integrationData.sendgridApiKey}
                                            onChange={(e) => setIntegrationData({...integrationData, sendgridApiKey: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}
                            {/* ... Content for other steps would be real forms in prod ... */}
                            {activeStep >= 2 && activeStep < 4 && (
                                <p className="text-center text-slate-400 italic">Configuration form would appear here...</p>
                            )}
                             {activeStep === 4 && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                                    <p className="text-emerald-700 font-bold">Enterprise Plan Active</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {allComplete ? (
                             <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/dashboard')}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
                            >
                                Go to Dashboard <LayoutDashboard className="w-6 h-6" />
                            </motion.button>
                        ) : (
                            <button
                                onClick={() => markComplete(activeStep)}
                                className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${completedSteps.includes(activeStep) ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                            >
                                {completedSteps.includes(activeStep) ? 'Completed' : 'Mark as Complete & Continue'}
                                {!completedSteps.includes(activeStep) && <ArrowRight className="w-6 h-6" />}
                            </button>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
