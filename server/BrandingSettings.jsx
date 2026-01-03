import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Environment configuration - Adjust based on your Vite/React setup
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const BrandingSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        companyName: '',
        primaryColor: '#2563eb',
        secondaryColor: '#0f172a',
        logoUrl: '',
        faviconUrl: '',
        whiteLabelActive: false,
        customDomain: ''
    });

    // Verification State
    const [domainStatus, setDomainStatus] = useState({
        dnsVerified: false,
        sslActive: false,
        mappingStatus: 'pending'
    });

    // Feedback State
    const [message, setMessage] = useState({ type: '', text: '', details: '' });

    // Fetch Initial Data
    useEffect(() => {
        fetchBrandingConfig();
    }, []);

    const fetchBrandingConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/branding`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const { data } = response.data;
                setFormData({
                    companyName: data.companyName || '',
                    primaryColor: data.primaryColor || '#2563eb',
                    secondaryColor: data.secondaryColor || '#0f172a',
                    logoUrl: data.logoUrl || '',
                    faviconUrl: data.faviconUrl || '',
                    whiteLabelActive: data.whiteLabelActive || false,
                    customDomain: data.customDomain || ''
                });
                setDomainStatus({
                    dnsVerified: data.dnsVerified,
                    sslActive: data.sslActive,
                    mappingStatus: data.mappingStatus
                });
            }
        } catch (error) {
            console.error('Error fetching branding:', error);
            setMessage({ type: 'error', text: 'Failed to load branding configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(`${API_BASE_URL}/branding`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Branding settings updated successfully.' });
                // Update local status if domain changed and reset verification
                if (response.data.data.customDomain !== formData.customDomain) {
                    setDomainStatus(prev => ({ ...prev, dnsVerified: false, mappingStatus: 'pending' }));
                }
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to update settings.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyDNS = async () => {
        if (!formData.customDomain) return;
        setVerifying(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_BASE_URL}/branding/verify-dns`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setDomainStatus({
                    dnsVerified: true,
                    sslActive: response.data.data.sslActive,
                    mappingStatus: 'active'
                });
                setMessage({ type: 'success', text: 'Domain verified successfully! SSL is being provisioned.' });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Verification failed.';
            const technicalDetails = error.response?.data?.technicalDetails || '';

            setDomainStatus(prev => ({ ...prev, dnsVerified: false, mappingStatus: 'failed' }));
            setMessage({
                type: 'error',
                text: errorMsg,
                details: technicalDetails
            });
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Branding Configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Branding & White Labeling</h1>
                <p className="text-gray-500 mt-1">Customize the look and feel of your enterprise portal.</p>
            </div>

            {/* Notification Area */}
            {message.text && (
                <div className={`p-4 rounded-md border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {message.type === 'success' ? (
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium">{message.text}</h3>
                            {message.details && <p className="mt-1 text-xs opacity-75 font-mono">{message.details}</p>}
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">

                {/* General Branding Card */}
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-medium text-gray-900">General Appearance</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                        <div className="sm:col-span-4">
                            <label className="block text-sm font-medium text-gray-700">Company Name</label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                            <div className="mt-1 flex items-center space-x-3">
                                <input
                                    type="color"
                                    name="primaryColor"
                                    value={formData.primaryColor}
                                    onChange={handleInputChange}
                                    className="h-9 w-14 border border-gray-300 p-1 rounded shadow-sm"
                                />
                                <span className="text-sm text-gray-500 font-mono">{formData.primaryColor}</span>
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                            <div className="mt-1 flex items-center space-x-3">
                                <input
                                    type="color"
                                    name="secondaryColor"
                                    value={formData.secondaryColor}
                                    onChange={handleInputChange}
                                    className="h-9 w-14 border border-gray-300 p-1 rounded shadow-sm"
                                />
                                <span className="text-sm text-gray-500 font-mono">{formData.secondaryColor}</span>
                            </div>
                        </div>

                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                            <input
                                type="url"
                                name="logoUrl"
                                placeholder="https://example.com/logo.png"
                                value={formData.logoUrl}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>

                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
                            <input
                                type="url"
                                name="faviconUrl"
                                placeholder="https://example.com/favicon.ico"
                                value={formData.faviconUrl}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Enterprise White Labeling Card */}
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Custom Domain (Enterprise)</h3>
                        <div className="flex items-center">
                            <input
                                id="whiteLabelActive"
                                name="whiteLabelActive"
                                type="checkbox"
                                checked={formData.whiteLabelActive}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="whiteLabelActive" className="ml-2 block text-sm text-gray-900">
                                Enable White Labeling
                            </label>
                        </div>
                    </div>

                    {formData.whiteLabelActive && (
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-blue-700">
                                            To use a custom domain, add a <strong>CNAME</strong> record in your DNS provider pointing to:
                                            <code className="ml-2 bg-blue-100 px-2 py-1 rounded font-mono font-bold">cname.metasaas.com</code>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 items-end">
                                <div className="sm:col-span-4">
                                    <label className="block text-sm font-medium text-gray-700">Your Custom Domain</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                            https://
                                        </span>
                                        <input
                                            type="text"
                                            name="customDomain"
                                            placeholder="app.yourcompany.com"
                                            value={formData.customDomain}
                                            onChange={handleInputChange}
                                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <button
                                        type="button"
                                        onClick={handleVerifyDNS}
                                        disabled={verifying || !formData.customDomain}
                                        className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${verifying ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                            }`}
                                    >
                                        {verifying ? 'Checking DNS...' : 'Verify DNS Record'}
                                    </button>
                                </div>
                            </div>

                            {/* Status Indicators */}
                            <div className="border-t border-gray-200 pt-6">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Configuration Status</h4>
                                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">DNS Mapping</dt>
                                        <dd className="mt-1 flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${domainStatus.dnsVerified ? 'bg-green-100 text-green-800' :
                                                    domainStatus.mappingStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {domainStatus.dnsVerified ? 'Verified' : domainStatus.mappingStatus.toUpperCase()}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">SSL Certificate</dt>
                                        <dd className="mt-1 flex items-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${domainStatus.sslActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {domainStatus.sslActive ? 'Active (Secure)' : 'Pending'}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => fetchBrandingConfig()}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                    >
                        {saving ? 'Saving Changes...' : 'Save Branding Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BrandingSettings;