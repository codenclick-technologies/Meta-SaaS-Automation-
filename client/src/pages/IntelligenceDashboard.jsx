import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    BarChart3, PieChart, TrendingUp, Layers, 
    Zap, Brain, Target, Filter, Download, 
    Calendar, RefreshCcw, ArrowUpRight, Shield, Menu
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';

export default function IntelligenceDashboard() {
    const [biData, setBiData] = useState(null);
    const [loading, setLoading] = useState(true);
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
        fetchBIIntelligence();
    }, []);

    const fetchBIIntelligence = async () => {
        try {
            const { data } = await api.get('/bi/dashboard');
            setBiData(data);
        } catch (error) {
            console.error('BI Fetch Error:', error);
        } finally {
            setLoading(false);
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
                    <span className="font-bold text-gray-800 text-lg">BI Intelligence</span>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <main className="flex-1 overflow-y-auto p-8 md:p-12">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Compiling Intelligence...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header section */}
                            <header className="mb-12 flex flex-col lg:row md:items-center justify-between gap-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200">
                                            <Brain className="w-8 h-8 text-white" />
                                        </div>
                                        BI Intelligence Hub
                                    </h1>
                                    <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Predictive Analytics & Multi-Touch Attribution
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition flex items-center gap-2 shadow-sm">
                                        <Calendar className="w-4 h-4" /> Last 30 Days
                                    </button>
                                    <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 transition flex items-center gap-2">
                                        <Download className="w-4 h-4" /> Global Export
                                    </button>
                                </div>
                            </header>

                            {/* Core Funnel View */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden group">
                                    <div className="flex justify-between items-center mb-10">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900">Conversion Funnel</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Full Acquisition Lifecycle</p>
                                        </div>
                                        <Layers className="w-6 h-6 text-indigo-500" />
                                    </div>

                                    <div className="space-y-6 relative z-10">
                                        <FunnelStep 
                                            label="Ingested Leads" 
                                            value={biData?.funnel.ingested} 
                                            percent={100} 
                                            color="bg-slate-900" 
                                        />
                                        <FunnelStep 
                                            label="AI Processed" 
                                            value={biData?.funnel.analyzed} 
                                            percent={(biData?.funnel.analyzed / biData?.funnel.ingested) * 100} 
                                            color="bg-indigo-600" 
                                        />
                                        <FunnelStep 
                                            label="CRM Sync" 
                                            value={biData?.funnel.synced} 
                                            percent={(biData?.funnel.synced / biData?.funnel.ingested) * 100} 
                                            color="bg-blue-500" 
                                        />
                                        <FunnelStep 
                                            label="Sale Converted" 
                                            value={biData?.funnel.converted} 
                                            percent={(biData?.funnel.converted / biData?.funnel.ingested) * 100} 
                                            color="bg-emerald-500" 
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">AI Precision Metric</h3>
                                            <p className="text-slate-400 text-sm font-medium">Confidence vs. Conversion Reality</p>
                                        </div>
                                        
                                        <div className="py-8">
                                            <div className="text-6xl font-black text-indigo-400 mb-2">
                                                {Math.round(biData?.aiMetrics.precision || 0)}%
                                            </div>
                                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Model Accuracy Score</p>
                                        </div>

                                        <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700">
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                AI is currently identifying high-value leads with <span className="text-white font-bold">{biData?.aiMetrics.precision}% precision</span> based on {biData?.aiMetrics.sampleSize} data points.
                                            </p>
                                        </div>
                                    </div>
                                    <Zap className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5" />
                                </div>
                            </div>

                            {/* Attribution Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-rose-500" /> Revenue Attribution
                                    </h3>
                                    <div className="space-y-4">
                                        {biData?.attribution.slice(0, 5).map((attr, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-colors group">
                                                <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 truncate max-w-[150px]">{attr._id}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-black text-slate-400">{attr.leadCount} Leads</span>
                                                    <span className="text-sm font-black text-slate-900">${attr.totalRevenue.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {biData?.attribution.length === 0 && (
                                            <div className="text-center py-10 opacity-30 italic text-sm">No attribution data tracked.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <RefreshCcw className="w-5 h-5 text-indigo-500" /> Real-time Ops Flow
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <MetricCard label="Automation Success" value={`${biData?.operational.automationSuccess}%`} />
                                        <MetricCard label="Avg Response Time" value={`${biData?.operational.avgResponseTime}s`} />
                                        <MetricCard label="CRM Sync Rate" value="98.2%" />
                                        <MetricCard label="Team Performance" value={`${biData?.operational.teamPerformance.length} Active`} />
                                    </div>
                                </div>
                            </div>

                            {/* Team Leaderboard Section */}
                            <div className="mt-12 bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Sales Intensity Leaderboard</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real Conversion Performance by User</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {biData?.operational.teamPerformance.map((member, idx) => (
                                        <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-transparent hover:border-indigo-100 transition group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                                    <Target className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                    {Math.round(member.conversionRate)}% CR
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-800 truncate">{member.name}</h4>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{member.conversions} Sales</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{member.leadsHandled} Leads</span>
                                            </div>
                                        </div>
                                    ))}
                                    {biData?.operational.teamPerformance.length === 0 && (
                                        <div className="col-span-full py-10 text-center opacity-30 italic">No sales assignments tracked in this period.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

const FunnelStep = ({ label, value, percent, color }) => (
    <div className="group/step">
        <div className="flex justify-between items-end mb-2">
            <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
                <p className="text-lg font-black text-slate-900">{value?.toLocaleString() || 0}</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{Math.round(percent)}% of total</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className={`h-full ${color} rounded-full shadow-lg transition-all`}
            />
        </div>
    </div>
);

const MetricCard = ({ label, value, trend, inverse }) => (
    <div className="bg-slate-50 p-4 rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center justify-between">
            <span className="text-lg font-black text-slate-900">{value}</span>
            {trend && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${inverse ? (trend.startsWith('-') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600') : (trend.startsWith('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600')}`}>
                    {trend}
                </span>
            )}
        </div>
    </div>
);
