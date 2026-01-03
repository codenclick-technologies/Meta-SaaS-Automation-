import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Trash2, Globe, ShieldCheck, Key, ExternalLink, Loader2, Mail, MessageSquare, Database, Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newIntegration, setNewIntegration] = useState({
        provider: 'meta',
        name: '',
        authType: 'api_key',
        credentials: { apiKey: '', accessToken: '' }
    });

    // Get user from local storage
    let user = {};
    try {
        const userData = localStorage.getItem('user');
        user = userData ? JSON.parse(userData) : {};
    } catch (e) {
        console.error('Failed to parse user data', e);
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    useEffect(() => {
        fetchIntegrations();
    }, []);

    const fetchIntegrations = async () => {
        try {
            const { data } = await api.get('/integrations');
            setIntegrations(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post('/integrations', newIntegration);
            setIsModalOpen(false);
            fetchIntegrations();
        } catch (error) {
            alert('Failed to add integration');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this integration?')) return;
        try {
            await api.delete(`/integrations/${id}`);
            fetchIntegrations();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const getProviderIcon = (provider) => {
        switch (provider) {
            case 'meta': return <Globe className="w-5 h-5 text-blue-600" />;
            case 'sendgrid': return <Mail className="w-5 h-5 text-blue-500" />;
            case 'twilio': return <MessageSquare className="w-5 h-5 text-red-600" />;
            default: return <Key className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar 
                isOpen={isSidebarOpen} 
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                user={user} 
                onLogout={handleLogout} 
            />
            
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                    <span className="font-bold text-gray-800 text-lg">Integrations</span>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 max-w-6xl mx-auto w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Connected Services</h1>
                            <p className="text-gray-500">Manage your API connections and automated integrations</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <Plus className="w-4 h-4" /> Add Integration
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {integrations.map(integration => (
                                <div key={integration._id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            {getProviderIcon(integration.provider)}
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(integration._id)}
                                            className="text-gray-400 hover:text-red-600 transition p-1 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1 capitalize">{integration.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                        <span className={`w-2 h-2 rounded-full ${integration.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                        {integration.provider.toUpperCase()} Integration
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <span className="text-xs font-medium text-gray-400">Authenticated via {integration.authType}</span>
                                        <ShieldCheck className="w-4 h-4 text-green-600" />
                                    </div>
                                </div>
                            ))}

                            {integrations.length === 0 && (
                                <div className="col-span-full py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center">
                                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                        <Database className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h2 className="text-lg font-medium text-gray-900">No active integrations</h2>
                                    <p className="text-gray-500 mb-6">Connect your favorite tools to start automating</p>
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="text-blue-600 font-bold hover:underline"
                                    >
                                        Connect your first service &rarr;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
                            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                                <h2 className="text-xl font-bold mb-6">New Integration</h2>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Provider</label>
                                        <select 
                                            className="w-full border rounded-lg p-2"
                                            value={newIntegration.provider}
                                            onChange={e => setNewIntegration({...newIntegration, provider: e.target.value})}
                                        >
                                            <option value="meta">Meta (Facebook/Instagram)</option>
                                            <option value="sendgrid">SendGrid Email</option>
                                            <option value="twilio">Twilio SMS/WA</option>
                                            <option value="google_sheets">Google Sheets</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Friendly Name</label>
                                        <input 
                                            type="text" required
                                            className="w-full border rounded-lg p-2"
                                            placeholder="e.g. My Website Meta Pixel"
                                            value={newIntegration.name}
                                            onChange={e => setNewIntegration({...newIntegration, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">API Key / Token</label>
                                        <input 
                                            type="password" required
                                            className="w-full border rounded-lg p-2"
                                            placeholder="Paste your key here"
                                            value={newIntegration.credentials.apiKey}
                                            onChange={e => setNewIntegration({
                                                ...newIntegration, 
                                                credentials: { ...newIntegration.credentials, apiKey: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-6">
                                        <button 
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
