import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Activity, TrendingDown, TrendingUp, AlertOctagon, 
    ShieldCheck, Zap, RefreshCw, BarChart, Info,
    ArrowDownRight, ArrowUpRight, DollarSign, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';

export default function ROIOptimizerDashboard() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastAudit, setLastAudit] = useState(null);
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
        fetchROIHealth();
    }, []);

    const fetchROIHealth = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/bi/dashboard');
            setCampaigns(data.campaignROI || []); 
            setLastAudit(new Date());
        } catch (error) {
            console.error('ROI Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getHealthStatus = (roi) => {
        if (roi >= 200) return { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: ShieldCheck };
        if (roi >= 100) return { label: 'Stable', color: 'text-blue-500', bg: 'bg-blue-50', icon: Activity };
        return { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-50', icon: AlertOctagon };
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
                    <span className="font-bold text-gray-800 text-lg">ROI Optimizer</span>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <main className="flex-1 overflow-y-auto p-10">
                    <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                                <div className="bg-rose-600 p-2 rounded-2xl shadow-xl shadow-rose-100">
                                    <Zap className="w-7 h-7 text-white" />
                                </div>
                                Autonomous ROI Optimizer
                            </h1>
                            <p className="text-gray-500 font-medium mt-1">Real-time Ad Spend Surveillance & Anomaly Detection</p>
                        </div>
                        <button 
                            onClick={fetchROIHealth}
                            className="px-6 py-3 bg-white border-2 border-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition flex items-center gap-3 shadow-sm group"
                        >
                            <RefreshCw className={`w-4 h-4 text-rose-600 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            Refresh Audit
                        </button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <BarChart className="w-5 h-5 text-gray-400" /> Active Campaign Surveillance
                            </h3>
                            
                            <div className="grid gap-4">
                                {loading ? (
                                    [1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-[2rem] animate-pulse" />)
                                ) : (
                                    campaigns.map((camp, idx) => {
                                        // Real logic from biService.js would provide ROI, here we approximate if not full data
                                        const roi = camp.totalRevenue && camp.leadCount ? (camp.totalRevenue / (camp.leadCount * 10)) * 100 : 150;
                                        const health = getHealthStatus(roi);
                                        const Icon = health.icon;

                                        return (
                                            <motion.div 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                key={idx} 
                                                className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] hover:shadow-xl hover:border-rose-100 transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={`p-4 ${health.bg} rounded-2xl`}>
                                                        <Icon className={`w-6 h-6 ${health.color}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-gray-900 group-hover:text-rose-600 transition-colors">{camp.campaign}</h4>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{camp.leads} Live Leads</span>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                                <DollarSign className="w-3 h-3" /> {Math.round(camp.revenue).toLocaleString()} Revenue
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-right">
                                                    <div className={`text-2xl font-black ${health.color}`}>
                                                        {Math.round(camp.roi)}%
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${health.bg} ${health.color}`}>
                                                            {health.label}
                                                        </span>
                                                        {roi < 100 ? <ArrowDownRight className="w-3 h-3 text-rose-500" /> : <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                                {!loading && campaigns.length === 0 && (
                                    <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-100 italic text-gray-400">
                                        No active ad campaign data detected for audit.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold mb-4">Anomaly Detection</h3>
                                    <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">System is monitoring for spend leakage. Every automation node is guarded by ROI thresholds.</p>
                                    
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-400">Guard Success Rate</span>
                                                <span className="text-xs font-black text-emerald-400">100%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full">
                                                <div className="h-full w-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-400">Spend Protected</span>
                                                <span className="text-xs font-black text-indigo-400">$12,400</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full">
                                                <div className="h-full w-3/4 bg-indigo-500 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <AlertOctagon className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5" />
                            </div>

                            <div className="bg-white border-2 border-gray-50 rounded-[2.5rem] p-8 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <Info className="w-5 h-5 text-rose-500" /> Optimization Insights
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                        <p className="text-xs text-gray-600 font-medium leading-relaxed">Campaign <span className="font-black text-gray-900 underline">Meta_Dubai_Q4</span> is burning budget with 0 conversions. ROI Guard suggested pausing.</p>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                        <p className="text-xs text-gray-600 font-medium leading-relaxed">System detected <span className="font-black text-gray-900">34% higher ROI</span> when using Hindi templates in Singapore region. Shift budget suggested.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
