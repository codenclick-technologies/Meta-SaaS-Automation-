import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    Zap, Plus, Save, Trash2, ArrowRight, Settings,
    MessageSquare, Mail, Database, Bell, Clock,
    ChevronRight, AlertCircle, CheckCircle2, Play, Globe, Languages, X, UserCheck, Split, Menu
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

export default function WorkflowBuilderPage() {
    const [workflows, setWorkflows] = useState([]);
    const [activeWorkflow, setActiveWorkflow] = useState(null);
    const [integrations, setIntegrations] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNode, setEditingNode] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [wRes, iRes, tRes] = await Promise.all([
                api.get('/workflows'),
                api.get('/integrations'),
                api.get('/users/team') // Assuming this endpoint exists based on other files
            ]);
            setWorkflows(wRes.data);
            setIntegrations(iRes.data);
            setTeamMembers(tRes.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        const newWf = {
            name: 'New Automation Workflow',
            trigger: { type: 'meta_ads', nodes: [] },
            nodes: [
                { id: 'start', type: 'action', provider: 'notification', actionType: 'internal_alert', name: 'Notify Team', config: { message: 'New Lead Alert!' }, nextNodes: [] }
            ]
        };
        setActiveWorkflow(newWf);
    };

    const addNode = (type) => {
        const newNode = {
            id: `node_${Date.now()}`,
            type: type === 'condition' ? 'condition' : 'action',
            provider: type === 'condition' ? null : 'whatsapp',
            name: type === 'condition' ? 'Check Lead Score' : 'Send WhatsApp',
            config: {
                message: '',
                subject: '',
                translations: {}
            },
            nextNodes: []
        };
        setActiveWorkflow({
            ...activeWorkflow,
            nodes: [...activeWorkflow.nodes, newNode]
        });
    };

    const updateNodeConfig = (nodeId, key, value) => {
        const newNodes = activeWorkflow.nodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, config: { ...n.config, [key]: value } };
            }
            return n;
        });
        setActiveWorkflow({ ...activeWorkflow, nodes: newNodes });
    };

    const addTranslation = (nodeId, locale) => {
        const newNodes = activeWorkflow.nodes.map(n => {
            if (n.id === nodeId) {
                const translations = { ...n.config.translations, [locale]: { message: '', subject: '' } };
                return { ...n, config: { ...n.config, translations } };
            }
            return n;
        });
        setActiveWorkflow({ ...activeWorkflow, nodes: newNodes });
    };

    const saveWorkflow = async () => {
        try {
            if (activeWorkflow._id) {
                await api.put(`/workflows/${activeWorkflow._id}`, activeWorkflow);
            } else {
                await api.post('/workflows', activeWorkflow);
            }
            alert('Workflow Saved Successfully!');
            fetchData();
            setActiveWorkflow(null);
        } catch (error) {
            alert('Failed to save workflow');
        }
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                user={user}
                onLogout={handleLogout}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                    <span className="font-bold text-gray-800 text-lg">Automation Studio</span>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto">
                    <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600 p-2 rounded-xl">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Automation Studio</h1>
                                <p className="text-xs text-gray-500">Global SaaS Template Architecture</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {activeWorkflow ? (
                                <>
                                    <button onClick={() => setActiveWorkflow(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                                    <button onClick={saveWorkflow} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 flex items-center gap-2">
                                        <Save className="w-4 h-4" /> Save Workflow
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleCreateNew} className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Create Workflow
                                </button>
                            )}
                        </div>
                    </header>

                    <main className="flex-1 p-8">
                        {!activeWorkflow ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {workflows.map(wf => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={wf._id}
                                        className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                                        onClick={() => setActiveWorkflow(wf)}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Play className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-bold text-gray-900">{wf.name}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 font-medium">
                                            <ChevronRight className="w-3 h-3" /> {wf.nodes.length} Steps Active
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className={`px-2 py-1 rounded-full ${wf.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} font-bold`}>
                                                {wf.isActive ? 'LIVE' : 'DRAFT'}
                                            </span>
                                            <span className="text-gray-400">Created: {new Date(wf.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </motion.div>
                                ))}

                                {workflows.length === 0 && (
                                    <div className="col-span-full py-32 flex flex-col items-center opacity-50">
                                        <Zap className="w-16 h-16 mb-4 text-gray-300" />
                                        <h2 className="text-2xl font-bold text-gray-400">No Automations Found</h2>
                                        <p>Start by creating your first global-scale workflow</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto pb-20">
                                <div className="mb-8">
                                    <input
                                        className="text-3xl font-bold bg-transparent border-none focus:ring-0 w-full mb-2"
                                        value={activeWorkflow.name}
                                        onChange={e => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
                                        placeholder="Workflow Name..."
                                    />
                                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                                        <Database className="w-4 h-4" /> Trigger: {activeWorkflow.trigger?.type.toUpperCase()}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-8">
                                    {/* Trigger Node */}
                                    <div className="w-72 bg-white border-2 border-blue-500 p-6 rounded-3xl shadow-lg relative flex flex-col items-center">
                                        <div className="absolute -top-3 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Trigger Node</div>
                                        <Globe className="w-10 h-10 text-blue-600 mb-3" />
                                        <span className="font-black text-gray-900 text-center leading-tight">Meta Lead Gen<br /><span className="text-[10px] text-gray-400 font-bold uppercase underline">Inbound Event</span></span>
                                    </div>

                                    <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />

                                    {/* Execution Nodes */}
                                    <Reorder.Group axis="y" values={activeWorkflow.nodes} onReorder={(newNodes) => setActiveWorkflow({ ...activeWorkflow, nodes: newNodes })} className="space-y-8 w-full flex flex-col items-center">
                                        {activeWorkflow.nodes.map((node, index) => (
                                            <Reorder.Item key={node.id} value={node} className="w-full flex flex-col items-center">
                                                <div className="flex flex-col items-center gap-8 w-full">
                                                    <div className={`w-full max-w-2xl bg-white border-2 ${editingNode === node.id ? 'border-blue-600 ring-4 ring-blue-50' : 'border-gray-100'} p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group relative`}>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`p-3 rounded-2xl ${node.type === 'condition' ? 'bg-orange-50 text-orange-600' : (node.provider === 'predictive_route' ? 'bg-indigo-50 text-indigo-600' : (node.provider === 'ab_test' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'))}`}>
                                                                    {node.type === 'condition' ? <AlertCircle className="w-6 h-6" /> : (node.provider === 'predictive_route' ? <UserCheck className="w-6 h-6" /> : (node.provider === 'ab_test' ? <Split className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />))}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{node.type} Logic Step</p>
                                                                    <input
                                                                        className="font-black text-xl text-gray-800 bg-transparent border-none p-0 focus:ring-0"
                                                                        value={node.name}
                                                                        onChange={e => {
                                                                            const n = [...activeWorkflow.nodes];
                                                                            n[index].name = e.target.value;
                                                                            setActiveWorkflow({ ...activeWorkflow, nodes: n });
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setEditingNode(editingNode === node.id ? null : node.id)}
                                                                    className={`p-2 rounded-xl transition ${editingNode === node.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                                                >
                                                                    <Settings className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setActiveWorkflow({
                                                                        ...activeWorkflow,
                                                                        nodes: activeWorkflow.nodes.filter(n => n.id !== node.id)
                                                                    })}
                                                                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <AnimatePresence>
                                                            {editingNode === node.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="overflow-hidden bg-gray-50 rounded-3xl p-6 mt-4 border border-blue-100"
                                                                >
                                                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Provider Service</label>
                                                                            <select
                                                                                className="w-full bg-white border-gray-200 rounded-xl text-sm p-3 font-bold text-gray-700"
                                                                                value={node.provider || ''}
                                                                                onChange={e => {
                                                                                    const n = [...activeWorkflow.nodes];
                                                                                    n[index].provider = e.target.value;
                                                                                    setActiveWorkflow({ ...activeWorkflow, nodes: n });
                                                                                }}
                                                                            >
                                                                                <option value="whatsapp">WhatsApp Business API</option>
                                                                                <option value="email">SendGrid Intelligence</option>
                                                                                <option value="ai_agent">GPT-4 Lead Analyst</option>
                                                                                <option value="crm">CRM Hyper-Sync</option>
                                                                                <option value="predictive_route">AI Predictive Routing</option>
                                                                                <option value="assignment">Lead Assignment</option>
                                                                                <option value="ab_test">A/B Testing Group</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Template Action</label>
                                                                            <input
                                                                                className="w-full bg-white border-gray-200 rounded-xl text-sm p-3"
                                                                                value={node.actionType || ''}
                                                                                onChange={e => {
                                                                                    const n = [...activeWorkflow.nodes];
                                                                                    n[index].actionType = e.target.value;
                                                                                    setActiveWorkflow({ ...activeWorkflow, nodes: n });
                                                                                }}
                                                                                placeholder="e.g., send_welcome_pack"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {node.type === 'condition' && (
                                                                        <div className="grid grid-cols-3 gap-4 mb-6 bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                                            <div>
                                                                                <label className="text-[9px] font-black text-orange-600 uppercase mb-1 block">Lead Field</label>
                                                                                <select
                                                                                    className="w-full text-xs font-bold rounded-lg border-orange-200"
                                                                                    value={node.config.field || ''}
                                                                                    onChange={e => updateNodeConfig(node.id, 'field', e.target.value)}
                                                                                >
                                                                                    <option value="">Select Field</option>
                                                                                    <option value="city">City</option>
                                                                                    <option value="country">Country</option>
                                                                                    <option value="score">Lead Score</option>
                                                                                    <option value="source">Source</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-black text-orange-600 uppercase mb-1 block">Operator</label>
                                                                                <select
                                                                                    className="w-full text-xs font-bold rounded-lg border-orange-200"
                                                                                    value={node.config.operator || ''}
                                                                                    onChange={e => updateNodeConfig(node.id, 'operator', e.target.value)}
                                                                                >
                                                                                    <option value="equals">Equals (=)</option>
                                                                                    <option value="contains">Contains</option>
                                                                                    <option value="greater">Greater Than {'>'}</option>
                                                                                </select>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-[9px] font-black text-orange-600 uppercase mb-1 block">Target Value</label>
                                                                                <input
                                                                                    className="w-full text-xs font-bold rounded-lg border-orange-200"
                                                                                    placeholder="e.g. Delhi"
                                                                                    value={node.config.value || ''}
                                                                                    onChange={e => updateNodeConfig(node.id, 'value', e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {node.type === 'action' && node.provider !== 'assignment' && (
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Default Global Content</label>
                                                                                <textarea
                                                                                    rows={3}
                                                                                    className="w-full bg-white border-gray-200 rounded-xl text-sm p-4"
                                                                                    placeholder="Enter message body (Global Default)"
                                                                                    value={node.config.message || ''}
                                                                                    onChange={e => updateNodeConfig(node.id, 'message', e.target.value)}
                                                                                />
                                                                            </div>

                                                                            <div className="bg-white rounded-2xl p-4 border border-blue-50">
                                                                                <div className="flex justify-between items-center mb-4">
                                                                                    <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                                                                        <Languages className="w-4 h-4" /> Multi-Language Overrides
                                                                                    </h5>
                                                                                    <select
                                                                                        className="text-[10px] bg-blue-50 text-blue-600 font-black rounded-lg p-1 px-2 uppercase border-none mr-1"
                                                                                        onChange={(e) => {
                                                                                            if (e.target.value) addTranslation(node.id, e.target.value);
                                                                                            e.target.value = '';
                                                                                        }}
                                                                                    >
                                                                                        <option value="">+ Add Localization</option>
                                                                                        <option value="hi-IN">🇮🇳 Hindi (India)</option>
                                                                                        <option value="es-ES">🇪🇸 Spanish (Spain)</option>
                                                                                        <option value="fr-FR">🇫🇷 French (France)</option>
                                                                                        <option value="ar-SA">🇸🇦 Arabic (Saudi)</option>
                                                                                    </select>
                                                                                </div>
                                                                                <div className="space-y-4">
                                                                                    {Object.keys(node.config.translations || {}).map(lang => (
                                                                                        <div key={lang} className="bg-gray-50 rounded-xl p-4 relative group/lang">
                                                                                            <div className="flex justify-between items-center mb-2">
                                                                                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{lang} Variation</span>
                                                                                                <button className="text-gray-300 hover:text-red-500 transition"><X className="w-4 h-4" /></button>
                                                                                            </div>
                                                                                            <textarea
                                                                                                rows={2}
                                                                                                className="w-full bg-white border-gray-100 rounded-lg text-xs p-3"
                                                                                                placeholder={`Enter ${lang} translation...`}
                                                                                                value={node.config.translations[lang].message}
                                                                                                onChange={e => {
                                                                                                    const translations = { ...node.config.translations };
                                                                                                    translations[lang].message = e.target.value;
                                                                                                    updateNodeConfig(node.id, 'translations', translations);
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                    {Object.keys(node.config.translations || {}).length === 0 && (
                                                                                        <p className="text-[10px] text-gray-400 font-bold italic text-center py-2">No regional overrides active. Using Global Default.</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {node.provider === 'assignment' && (
                                                                        <div className="mt-6 bg-white rounded-2xl p-4 border border-blue-50">
                                                                            <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                                <UserCheck className="w-4 h-4" /> Assign Lead To
                                                                            </h5>
                                                                            <select
                                                                                className="w-full bg-white border-gray-200 rounded-xl text-sm p-3 font-bold text-gray-700"
                                                                                value={node.config.assignedTo || ''}
                                                                                onChange={e => updateNodeConfig(node.id, 'assignedTo', e.target.value)}
                                                                            >
                                                                                <option value="">Select Team Member</option>
                                                                                {teamMembers.map(member => (
                                                                                    <option key={member._id} value={member._id}>{member.name} ({member.role})</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}

                                                                    {node.provider === 'crm' && (
                                                                        <div className="mt-6 bg-white rounded-2xl p-4 border border-blue-50">
                                                                            <div className="flex justify-between items-center mb-4">
                                                                                <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                                                                    <Settings className="w-4 h-4" /> Multi-Regional CRM Routing
                                                                                </h5>
                                                                                <select
                                                                                    className="text-[10px] bg-emerald-50 text-emerald-600 font-black rounded-lg p-1 px-2 uppercase border-none"
                                                                                    onChange={(e) => {
                                                                                        const country = e.target.value;
                                                                                        if (!country) return;
                                                                                        const overrides = { ...(node.config.regionalOverrides || {}) };
                                                                                        overrides[country] = '';
                                                                                        updateNodeConfig(node.id, 'regionalOverrides', overrides);
                                                                                        e.target.value = '';
                                                                                    }}
                                                                                >
                                                                                    <option value="">+ Add Region</option>
                                                                                    <option value="IN">🇮🇳 India Pod</option>
                                                                                    <option value="US">🇺🇸 US Main</option>
                                                                                    <option value="GB">🇬🇧 UK Branch</option>
                                                                                    <option value="DE">🇩🇪 EU Hub</option>
                                                                                </select>
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                {Object.keys(node.config.regionalOverrides || {}).map(country => (
                                                                                    <div key={country} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl">
                                                                                        <span className="text-xs font-black min-w-[30px]">{country}</span>
                                                                                        <select
                                                                                            className="flex-1 bg-white border-none text-[10px] font-bold rounded-lg p-2"
                                                                                            value={node.config.regionalOverrides[country]}
                                                                                            onChange={e => {
                                                                                                const overrides = { ...node.config.regionalOverrides };
                                                                                                overrides[country] = e.target.value;
                                                                                                updateNodeConfig(node.id, 'regionalOverrides', overrides);
                                                                                            }}
                                                                                        >
                                                                                            <option value="">Select Target Integration</option>
                                                                                            {integrations.filter(i => ['hubspot', 'salesforce', 'zoho', 'webhook'].includes(i.provider)).map(i => (
                                                                                                <option key={i._id} value={i._id}>{i.name} ({i.provider})</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const overrides = { ...node.config.regionalOverrides };
                                                                                                delete overrides[country];
                                                                                                updateNodeConfig(node.id, 'regionalOverrides', overrides);
                                                                                            }}
                                                                                            className="text-gray-300 hover:text-red-500"
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                                {(!node.config.regionalOverrides || Object.keys(node.config.regionalOverrides).length === 0) && (
                                                                                    <p className="text-[10px] text-gray-400 font-bold italic text-center py-2">No regional routing. Using default CRM integration.</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                    {index !== activeWorkflow.nodes.length - 1 && <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />}
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>

                                    {/* Add Step Button */}
                                    <div className="flex gap-4 p-8 border-4 border-dashed border-gray-200 rounded-[3rem] bg-gray-50/30">
                                        <button onClick={() => addNode('action')} className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 text-sm font-black border-2 border-gray-100 rounded-[2rem] hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 transition-all active:scale-95 group">
                                            <Plus className="w-5 h-5 text-blue-600 group-hover:rotate-90 transition" /> Add Automation Action
                                        </button>
                                        <button onClick={() => addNode('condition')} className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 text-sm font-black border-2 border-gray-100 rounded-[2rem] hover:border-orange-500 hover:shadow-2xl hover:shadow-orange-100 transition-all active:scale-95 group">
                                            <Plus className="w-5 h-5 text-orange-500 group-hover:rotate-90 transition" /> Add Logic Branch
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
