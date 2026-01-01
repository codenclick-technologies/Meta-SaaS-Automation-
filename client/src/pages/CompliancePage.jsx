import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    ShieldCheck, Activity, Search, Download, 
    AlertTriangle, CheckCircle2, Lock, Eye, 
    Trash2, Clock, Globe, FileText, Filter, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';

export default function CompliancePage() {
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
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
            const [logsRes, statusRes] = await Promise.all([
                api.get('/compliance/audit-logs'),
                api.get('/compliance/status')
            ]);
            setLogs(logsRes.data.logs);
            setStatus(statusRes.data);
        } catch (error) {
            console.error('Compliance Data Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'PII_VIEW': return <Eye className="w-4 h-4 text-blue-500" />;
            case 'DATA_DELETION': return <Trash2 className="w-4 h-4 text-red-500" />;
            case 'DATA_EXPORT': return <Download className="w-4 h-4 text-emerald-500" />;
            default: return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="flex h-screen bg-[#FDFDFD] overflow-hidden">
            <Sidebar 
                isOpen={sidebarOpen} 
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
                user={user} 
                onLogout={handleLogout} 
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                    <span className="font-bold text-gray-800 text-lg">Compliance</span>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <main className="flex-1 overflow-y-auto p-8">
                    <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <div className="bg-black p-2 rounded-2xl shadow-xl">
                                    <ShieldCheck className="w-7 h-7 text-white" />
                                </div>
                                Compliance Command Center
                            </h1>
                            <p className="text-gray-500 font-medium mt-1">Autonomous PII Auditing & Regulatory Reporting</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 bg-white border-2 border-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Export GDPR Report
                            </button>
                            <button className="px-6 py-3 bg-black text-white font-bold rounded-2xl shadow-2xl shadow-gray-200 hover:scale-105 transition flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Lockdown Data
                            </button>
                        </div>
                    </header>

                    {/* Health Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <HealthCard 
                            title="GDPR Status" 
                            value={status?.gdpr || 'Active'} 
                            status="good"
                            icon={Globe}
                        />
                        <HealthCard 
                            title="CCPA Readiness" 
                            value={status?.ccpa || 'Compliant'} 
                            status="good"
                            icon={ShieldCheck}
                        />
                        <HealthCard 
                            title="Data Residency" 
                            value={status?.dataResidence || 'Europe West'} 
                            status="neutral"
                            icon={Lock}
                        />
                        <HealthCard 
                            title="PII Purging" 
                            value="Next in 4h" 
                            status="warning"
                            icon={Clock}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Audit Timeline */}
                        <div className="lg:col-span-2 bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Real-time Audit Logs</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Immutably Stored Events</p>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold w-64 focus:ring-2 focus:ring-black"
                                        placeholder="Search actions or users..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)
                                ) : (
                                    logs.filter(l => l.action.includes(filter) || l.userId?.name.toLowerCase().includes(filter.toLowerCase())).map((log, idx) => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={log._id} 
                                            className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition border border-transparent hover:border-gray-100"
                                        >
                                            <div className="p-3 bg-gray-100 rounded-xl">
                                                {getActionIcon(log.action)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-bold text-gray-900">{log.action.replace('_', ' ')}</p>
                                                    <span className="text-[10px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Executed by <span className="font-bold text-gray-700">{log.userId?.name || 'Automated System'}</span>
                                                </p>
                                            </div>
                                            <div className="px-3 py-1 bg-white border rounded-lg text-[10px] font-black uppercase text-gray-400">
                                                {log.category}
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                                {!loading && logs.length === 0 && (
                                    <div className="text-center py-20 opacity-30 italic">No audit records found in this cycle.</div>
                                )}
                            </div>
                        </div>

                        {/* Intelligence Side Block */}
                        <div className="space-y-8">
                            <div className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold mb-4">Risk Exposure</h3>
                                    <p className="text-sm text-gray-400 mb-6 font-medium leading-relaxed">No critical vulnerabilities detected in the last 24 hours. PII is encrypted at rest.</p>
                                    <div className="h-2 w-full bg-white/10 rounded-full mb-2">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '12%' }}
                                            className="h-full bg-emerald-400 rounded-full"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Low Risk Environment</p>
                                </div>
                                <AlertTriangle className="absolute -bottom-8 -right-8 w-40 h-40 text-white/5" />
                            </div>

                            <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-blue-600" /> Key Metrics
                                </h4>
                                <div className="space-y-6">
                                    <MetricRow label="PII Data Requests" value="1,240" trend="+12%" />
                                    <MetricRow label="Encryption Health" value="100%" />
                                    <MetricRow label="Avg Purge Cycle" value="30 Days" />
                                    <MetricRow label="Policy Compliance" value="98.4%" />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const HealthCard = ({ title, value, status, icon: Icon }) => (
    <div className="bg-white border-2 border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-black/5 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-50 rounded-xl">
                <Icon className="w-5 h-5 text-gray-500" />
            </div>
            {status === 'good' ? (
                <div className="bg-emerald-100 text-emerald-700 p-1 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
            ) : (
                <div className="bg-orange-100 text-orange-700 p-1 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
            )}
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
    </div>
);

const MetricRow = ({ label, value, trend }) => (
    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
        <span className="text-xs font-bold text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">{value}</span>
            {trend && <span className="text-[10px] font-bold text-emerald-500">{trend}</span>}
        </div>
    </div>
);
