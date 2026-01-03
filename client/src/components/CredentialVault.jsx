import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    ShieldCheck, Plus, Trash2, Edit2, 
    Facebook, MessageCircle, CreditCard, 
    Cpu, Globe, Lock, AlertTriangle, Check
} from 'lucide-react';

export default function CredentialVault() {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        provider: 'meta',
        name: '',
        value: '',
        metadata: {}
    });

    useEffect(() => {
        fetchCredentials();
    }, []);

    const fetchCredentials = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/credentials');
            setCredentials(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/credentials', formData);
            alert('Credential securely stored in encrypted vault.');
            setShowAddForm(false);
            setFormData({ provider: 'meta', name: '', value: '', metadata: {} });
            fetchCredentials();
        } catch (error) {
            console.error(error);
            alert('Failed to save credential.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This will break any integration using this key.')) return;
        try {
            await api.delete(`/credentials/${id}`);
            fetchCredentials();
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (provider) => {
        switch(provider) {
            case 'meta': return <Facebook className="w-5 h-5 text-blue-600" />;
            case 'whatsapp': return <MessageCircle className="w-5 h-5 text-green-500" />;
            case 'openai': return <Cpu className="w-5 h-5 text-teal-600" />;
            case 'stripe': return <CreditCard className="w-5 h-5 text-indigo-600" />;
            default: return <Globe className="w-5 h-5 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Enterprise Credential Vault</h3>
                    <p className="text-slate-500 font-medium mt-1">
                        Securely manage 3rd-party API keys. All values are <span className="text-emerald-600 font-bold flex items-center gap-1 inline-flex"><Lock className="w-3 h-3"/> encrypted at rest</span> using AES-256.
                    </p>
                </div>
                <button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                    <Plus className="w-4 h-4" /> Add New Secret
                </button>
            </div>

            {showAddForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 mb-8 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Provider Type</label>
                                <select 
                                    className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                                    value={formData.provider}
                                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                                >
                                    <option value="meta">Meta Graph API</option>
                                    <option value="whatsapp">WhatsApp Business Cloud</option>
                                    <option value="openai">OpenAI (GPT-4)</option>
                                    <option value="sendgrid">SendGrid / Twilio</option>
                                    <option value="custom">Custom Integration</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Friendly Name</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. Production WhatsApp Key"
                                    className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500 tracking-widest">API Secret / Token</label>
                            <div className="relative">
                                <input 
                                    type="password" 
                                    required
                                    placeholder="sk-..."
                                    className="w-full bg-white border border-slate-200 p-3 rounded-xl font-mono text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 pl-10"
                                    value={formData.value}
                                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                                />
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> This value will be encrypted immediately. We never display it again.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setShowAddForm(false)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2"
                            >
                                <Lock className="w-4 h-4" /> Encrypt & Store
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {credentials.map((cred) => (
                    <div key={cred._id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                {getIcon(cred.provider)}
                            </div>
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${cred.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {cred.isActive ? 'Active' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 mb-1">{cred.name}</h4>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{cred.provider}</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6 flex items-center justify-between">
                            <span className="font-mono text-xs text-slate-400">•••• •••• •••• ••••</span>
                            <Lock className="w-3 h-3 text-slate-300" />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                            <p className="text-[10px] text-slate-400 font-medium">Added {new Date(cred.updatedAt).toLocaleDateString()}</p>
                            <button 
                                onClick={() => handleDelete(cred._id)}
                                className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition"
                                title="Revoke Credential"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {credentials.length === 0 && !loading && (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-slate-600 font-bold mb-2">Vault is Empty</h4>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">No external credentials stored. Add your Meta or OpenAI keys to enable integrations.</p>
                </div>
            )}
        </div>
    );
}
