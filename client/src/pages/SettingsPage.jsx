import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Key, Mail, MessageSquare, Eye, EyeOff, Info, Facebook, FileText, Link as LinkIcon, CheckCircle2, AlertCircle, Loader2, Zap, Palette, Upload, Lock, DatabaseZap, BrainCircuit, Menu } from 'lucide-react';
import {
    getSettings, updateSettings, verifyEmailSettings, verifyWhatsappSettings, verifyOpenAISettings, logout
} from '../services/api';
import Sidebar from '../components/Sidebar';

export default function SettingsPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        sendgridApiKey: '',
        emailFrom: '',
        metaAccessToken: '',
        metaPhoneId: '',
        metaBusinessId: '',
        metaPixelId: '',
        emailSubject: '',
        emailBody: '',
        brochureUrl: '',
        includeBrochure: true,
        dripCampaignEnabled: false,
        twilioSid: '',
        twilioAuthToken: '',
        twilioPhone: '',
        companyName: '',
        companyLogo: '',
        whatsappTemplateName: '',
        verifyToken: '',
        leadRetentionDays: 90,
        aiScoringEnabled: false,
        openaiApiKey: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showSendgridKey, setShowSendgridKey] = useState(false);
    const [showMetaToken, setShowMetaToken] = useState(false);
    const [showTwilioToken, setShowTwilioToken] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [activeTab, setActiveTab] = useState('keys');

    const [emailStatus, setEmailStatus] = useState('idle'); // idle, loading, success, error
    const [whatsappStatus, setWhatsappStatus] = useState('idle');
    const [aiStatus, setAiStatus] = useState('idle');

    useEffect(() => {
        // Load user data
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUser();
        loadSettings();
    }, []);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/me`, {
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            navigate('/login');
        }
    };

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('token');
        navigate('/login');
    };

    const loadSettings = async () => {
        try {
            const data = await getSettings();
            setFormData({
                sendgridApiKey: data.sendgridApiKey || '',
                emailFrom: data.emailFrom || '',
                metaAccessToken: data.metaAccessToken || '',
                metaPhoneId: data.metaPhoneId || '',
                metaBusinessId: data.metaBusinessId || '',
                metaPixelId: data.metaPixelId || '',
                emailSubject: data.emailSubject || 'Welcome!',
                emailBody: data.emailBody || 'Hi {name},\n\nThank you for your interest.',
                brochureUrl: data.brochureUrl || '',
                includeBrochure: data.includeBrochure !== undefined ? data.includeBrochure : true,
                dripCampaignEnabled: data.dripCampaignEnabled || false,
                twilioSid: data.twilioSid || '',
                twilioAuthToken: data.twilioAuthToken || '',
                twilioPhone: data.twilioPhone || '',
                companyName: data.companyName || 'Meta Automation',
                companyLogo: data.companyLogo || '',
                whatsappTemplateName: data.whatsappTemplateName || 'hello_world',
                verifyToken: data.verifyToken || 'meta_automation_verify_token',
                leadRetentionDays: data.leadRetentionDays || 90,
                aiScoringEnabled: data.aiScoringEnabled || false,
                openaiApiKey: data.openaiApiKey || ''
            });
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords do not match");
            return;
        }
        if (passwordData.newPassword.length < 8) {
            alert("Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update password');
            }

            alert('Password updated successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeTab === 'security') {
            await handleChangePassword();
            return;
        }
        setLoading(true);
        try {
            await updateSettings(formData);
            alert('Settings saved successfully! The system will now use these credentials.');
        } catch (error) {
            console.error('Save Error:', error);
            alert(`Failed to save settings: ${error.response?.data?.message || error.message || 'Server Error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        if (!formData.sendgridApiKey) return alert('Please enter API Key first');
        setEmailStatus('loading');
        try {
            await verifyEmailSettings({ apiKey: formData.sendgridApiKey });
            setEmailStatus('success');
        } catch (error) {
            setEmailStatus('error');
            alert(`Verification Failed: ${error.response?.data?.error || 'Unknown Error'}`);
        }
    };

    const handleVerifyWhatsapp = async () => {
        if (!formData.metaAccessToken || !formData.metaPhoneId) return alert('Please enter Token and Phone ID first');
        setWhatsappStatus('loading');
        try {
            await verifyWhatsappSettings({
                accessToken: formData.metaAccessToken,
                phoneId: formData.metaPhoneId
            });
            setWhatsappStatus('success');
        } catch (error) {
            setWhatsappStatus('error');
            alert(`Verification Failed: ${error.response?.data?.error || 'Unknown Error'}`);
        }
    };

    const handleVerifyAI = async () => {
        if (!formData.openaiApiKey) return alert('Please enter API Key first');
        setAiStatus('loading');
        try {
            await verifyOpenAISettings({ apiKey: formData.openaiApiKey });
            setAiStatus('success');
        } catch (error) {
            setAiStatus('error');
            alert(`Verification Failed: ${error.response?.data?.error || 'Unknown Error'}`);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Real Logic: Validate Size (Max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert("File is too large! Max size allowed is 2MB.");
                return;
            }
            // Real Logic: Convert Image to Base64 String for Storage
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, companyLogo: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    if (!user) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-gray-200 z-10">
                    <div className="px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-500 hover:text-gray-700">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-blue-600" />
                                    System Settings
                                </h1>
                                <p className="text-xs text-gray-500">Configure API services and system preferences</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('keys')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'keys' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                API Credentials
                            </button>
                            <button
                                onClick={() => setActiveTab('branding')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'branding' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Branding
                            </button>
                            <button
                                onClick={() => setActiveTab('facebook')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'facebook' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Facebook Setup
                            </button>
                            <button
                                onClick={() => setActiveTab('templates')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'templates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Workflow & Content
                            </button>
                            <button
                                onClick={() => setActiveTab('drip')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'drip' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Drip Campaigns
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex-1 py-3 text-xs md:text-sm font-medium transition ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Security
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 md:p-6 max-h-[80vh] overflow-y-auto">
                            {activeTab === 'keys' && (
                                <>
                                    {/* Email Settings */}
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Mail className="w-4 h-4" /> Email Service (SendGrid)
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-sm font-medium text-gray-700">SendGrid API Key</label>
                                                    {emailStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                                                    {emailStatus === 'error' && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>}
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showSendgridKey ? "text" : "password"}
                                                        value={formData.sendgridApiKey}
                                                        onChange={e => setFormData({ ...formData, sendgridApiKey: e.target.value })}
                                                        className={`w-full border rounded-lg px-4 py-2 pr-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailStatus === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                        placeholder="SG.xxxxxxxx..."
                                                    />
                                                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyEmail}
                                                            disabled={emailStatus === 'loading'}
                                                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-200 transition disabled:opacity-50"
                                                        >
                                                            {emailStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSendgridKey(!showSendgridKey)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showSendgridKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Found in SendGrid Dashboard &rarr; Settings &rarr; API Keys
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
                                                <input
                                                    type="email"
                                                    value={formData.emailFrom}
                                                    onChange={e => setFormData({ ...formData, emailFrom: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="info@yourdomain.com"
                                                />
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Must match a verified Sender Identity in SendGrid
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Scoring Settings */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4" /> AI Lead Scoring (OpenAI)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                                                <label htmlFor="ai-toggle" className="font-medium text-gray-800">Enable AI-Powered Scoring</label>
                                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                                    <input
                                                        type="checkbox"
                                                        id="ai-toggle"
                                                        checked={formData.aiScoringEnabled}
                                                        onChange={e => setFormData({ ...formData, aiScoringEnabled: e.target.checked })}
                                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                    />
                                                    <label htmlFor="ai-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                                </div>
                                            </div>

                                            {formData.aiScoringEnabled && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-sm font-medium text-gray-700">OpenAI API Key</label>
                                                        {aiStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                                                        {aiStatus === 'error' && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>}
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type={showOpenAIKey ? "text" : "password"}
                                                            value={formData.openaiApiKey}
                                                            onChange={e => setFormData({ ...formData, openaiApiKey: e.target.value })}
                                                            className={`w-full border rounded-lg px-4 py-2 pr-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${aiStatus === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                            placeholder="sk-xxxxxxxx..."
                                                        />
                                                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                            <button
                                                                type="button"
                                                                onClick={handleVerifyAI}
                                                                disabled={aiStatus === 'loading'}
                                                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-200 transition disabled:opacity-50"
                                                            >
                                                                {aiStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showOpenAIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Info className="w-3 h-3" />
                                                        Found in your OpenAI account settings.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Twilio Settings */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> SMS Service (Twilio)
                                        </h3>
                                        <p className="text-xs text-gray-500 -mt-2 mb-4">Required for Drip Campaigns and manual SMS.</p>
                                        {/* ... Twilio settings fields ... */}
                                    </div>

                                    {/* WhatsApp Settings */}
                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> WhatsApp Business API (Meta)
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-sm font-medium text-gray-700">Meta Access Token</label>
                                                    {whatsappStatus === 'success' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                                                    {whatsappStatus === 'error' && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>}
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type={showMetaToken ? "text" : "password"}
                                                        value={formData.metaAccessToken}
                                                        onChange={e => setFormData({ ...formData, metaAccessToken: e.target.value })}
                                                        className={`w-full border rounded-lg px-4 py-2 pr-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${whatsappStatus === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                        placeholder="EAAG..."
                                                    />
                                                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyWhatsapp}
                                                            disabled={whatsappStatus === 'loading'}
                                                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-200 transition disabled:opacity-50"
                                                        >
                                                            {whatsappStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify'}
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowMetaToken(!showMetaToken)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showMetaToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Meta Developers &rarr; App &rarr; WhatsApp &rarr; API Setup
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
                                                    <input
                                                        type="text"
                                                        value={formData.metaPhoneId}
                                                        onChange={e => setFormData({ ...formData, metaPhoneId: e.target.value })}
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="10060..."
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Info className="w-3 h-3" />
                                                        Under "Sending Phone Number"
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Account ID</label>
                                                    <input
                                                        type="text"
                                                        value={formData.metaBusinessId}
                                                        onChange={e => setFormData({ ...formData, metaBusinessId: e.target.value })}
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="10060..."
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <Info className="w-3 h-3" />
                                                        Under "WhatsApp Business Account ID"
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Pixel ID (For Conversion Tracking)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.metaPixelId}
                                                        onChange={e => setFormData({ ...formData, metaPixelId: e.target.value })}
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="1234567890..."
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Required to send "Converted" events back to Facebook Ads.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'branding' && (
                                <div className="space-y-6">
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                        <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                                            <Palette className="w-4 h-4" /> White Label Branding
                                        </h3>
                                        <p className="text-sm text-purple-700">
                                            Customize the dashboard and automated messages with your own company identity.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <input
                                            type="text"
                                            value={formData.companyName}
                                            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Meta Automation"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">This name will appear in emails, SMS, and the dashboard header.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                                        <div className="flex items-start gap-4 mt-2">
                                            {/* Logo Preview Logic */}
                                            <div className="h-16 w-16 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                                {formData.companyLogo ? (
                                                    <img src={formData.companyLogo} alt="Logo Preview" className="h-full w-full object-contain" />
                                                ) : (
                                                    <Palette className="w-6 h-6 text-gray-300" />
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition">
                                                    <Upload className="w-4 h-4" />
                                                    Upload Logo Image
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/png, image/jpeg, image/svg+xml"
                                                        onChange={handleLogoUpload}
                                                    />
                                                </label>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Max file size: <strong>2MB</strong>. Supported formats: PNG, JPG, SVG.<br />
                                                    This logo will replace the default branding across the dashboard.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'facebook' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            <Facebook className="w-4 h-4" /> How to Connect Facebook Leads
                                        </h3>
                                        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                                            <li>Go to <strong>developers.facebook.com</strong> &gt; My Apps.</li>
                                            <li>Add the <strong>Webhooks</strong> product to your app.</li>
                                            <li>Select <strong>Page</strong> object and click "Subscribe to this object".</li>
                                            <li>Enter the <strong>Callback URL</strong> and <strong>Verify Token</strong> below.</li>
                                            <li>Once verified, scroll down and subscribe to the <strong>leadgen</strong> field.</li>
                                        </ol>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Callback URL (Webhook)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${import.meta.env.VITE_API_URL || 'https://your-server-url.com'}/api/webhooks/facebook`}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-500"
                                            />
                                            <button type="button" onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || 'https://your-server-url.com'}/api/webhooks/facebook`)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Copy</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Verify Token</label>
                                        <input
                                            type="text"
                                            value={formData.verifyToken}
                                            onChange={e => setFormData({ ...formData, verifyToken: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Create a secure token (e.g., my_secret_123)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Enter this exact token in the Facebook setup popup.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'templates' && (
                                <div className="space-y-6">
                                    {/* Email Content */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Mail className="w-4 h-4" /> Automated Email Content
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                                                <input
                                                    type="text"
                                                    value={formData.emailSubject}
                                                    onChange={e => setFormData({ ...formData, emailSubject: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Welcome to our service!"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                                                <textarea
                                                    rows={4}
                                                    value={formData.emailBody}
                                                    onChange={e => setFormData({ ...formData, emailBody: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Hi {name}, thanks for contacting us..."
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Use <strong>{'{name}'}</strong> to insert the lead's name dynamically.</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-sm font-medium text-gray-700">Brochure Link (PDF/Drive)</label>
                                                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.includeBrochure}
                                                            onChange={e => setFormData({ ...formData, includeBrochure: e.target.checked })}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        Include in Email
                                                    </label>
                                                </div>
                                                <div className={`relative ${!formData.includeBrochure ? 'opacity-50' : ''}`}>
                                                    <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="url"
                                                        value={formData.brochureUrl}
                                                        onChange={e => setFormData({ ...formData, brochureUrl: e.target.value })}
                                                        disabled={!formData.includeBrochure}
                                                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        placeholder="https://example.com/brochure.pdf"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* WhatsApp Content */}
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> WhatsApp Automation
                                        </h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                                            <input
                                                type="text"
                                                value={formData.whatsappTemplateName}
                                                onChange={e => setFormData({ ...formData, whatsappTemplateName: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="e.g., welcome_message_v1"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Must match an approved template in your Meta Business Manager.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'drip' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                            <Zap className="w-4 h-4" /> Automated Drip Campaigns
                                        </h3>
                                        <p className="text-sm text-indigo-700">
                                            Enable this to automatically send follow-up messages on WhatsApp & SMS to leads who don't open your initial email. This requires Twilio for SMS functionality.
                                        </p>
                                    </div>

                                    {/* Enable/Disable Toggle */}
                                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                                        <label htmlFor="drip-toggle" className="font-medium text-gray-800">Enable Drip Campaign</label>
                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                id="drip-toggle"
                                                checked={formData.dripCampaignEnabled}
                                                onChange={e => setFormData({ ...formData, dripCampaignEnabled: e.target.checked })}
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                            />
                                            <label htmlFor="drip-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                        </div>
                                    </div>

                                    {/* Twilio Settings (Conditional) */}
                                    {formData.dripCampaignEnabled && (
                                        <div className="space-y-4 border-t pt-6">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                SMS Service (Twilio)
                                            </h3>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Account SID</label>
                                                <input
                                                    type="text"
                                                    value={formData.twilioSid}
                                                    onChange={e => setFormData({ ...formData, twilioSid: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Auth Token</label>
                                                <div className="relative">
                                                    <input
                                                        type={showTwilioToken ? "text" : "password"}
                                                        value={formData.twilioAuthToken}
                                                        onChange={e => setFormData({ ...formData, twilioAuthToken: e.target.value })}
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Your Twilio Auth Token"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowTwilioToken(!showTwilioToken)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showTwilioToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={formData.twilioPhone}
                                                    onChange={e => setFormData({ ...formData, twilioPhone: e.target.value })}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="+1234567890"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">Must be a Twilio-provided phone number.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                        <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <Lock className="w-4 h-4" /> Change Password
                                        </h3>
                                        <p className="text-sm text-orange-700">
                                            Ensure your account stays secure by using a strong password.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required={activeTab === 'security'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required={activeTab === 'security'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required={activeTab === 'security'}
                                        />
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <DatabaseZap className="w-4 h-4" /> Data Retention Policy
                                        </h3>
                                        <p className="text-sm text-orange-700 mb-4">
                                            Automatically delete old, non-converted leads to maintain database performance and comply with data policies.
                                        </p>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Delete leads older than</label>
                                            <select
                                                value={formData.leadRetentionDays}
                                                onChange={e => setFormData({ ...formData, leadRetentionDays: Number(e.target.value) })}
                                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value={30}>30 days</option>
                                                <option value={90}>90 days (Recommended)</option>
                                                <option value={180}>180 days</option>
                                                <option value={365}>1 year</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 shadow-lg transition-all"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? 'Processing...' : (activeTab === 'security' ? 'Update Password' : 'Save Configuration')}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}