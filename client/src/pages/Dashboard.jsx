import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { logout, api } from '../services/api';
import {
    Users, Mail, MessageSquare, TrendingUp, AlertCircle, Menu, 
    Calendar, ArrowUpRight, Zap, Target, Activity, MoreHorizontal,
    Filter, Download, ChevronDown
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import LeadChart from '../components/LeadChart';
import StatusChart from '../components/StatusChart';
import Sidebar from '../components/Sidebar';
import LeadIntelligenceFeed from '../components/LeadIntelligenceFeed';
import RegionalRevenueChart from '../components/RegionalRevenueChart';

// Use environment variable for production socket connection
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
});

function StatCard({ title, value, icon: Icon, color, trend, delay }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
        if (numericValue === 0) { setDisplayValue(0); return; }

        const duration = 1500;
        const steps = 60;
        const increment = numericValue / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
                setDisplayValue(numericValue);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay }}
            className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group relative overflow-hidden"
        >
            <div className={`absolute top-0 right-0 p-32 opacity-[0.03] transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-700 ${color?.replace('bg-', 'text-')}`}>
                <Icon className="w-full h-full" />
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-indigo-500/20 text-white transform group-hover:rotate-6 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>{trend}</span>
                        </div>
                    )}
                </div>
                
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                            {displayValue}
                            {typeof value === 'string' && value.includes('%') && '%'}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0, emailSent: 0, whatsappSent: 0, 
        pending: 0, conversionRate: 0, failed: 0, 
        highIntent: 0, avgAIScore: 0
    });
    const [dateFilter, setDateFilter] = useState('All Time');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [greeting, setGreeting] = useState(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    });

    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Good Morning');
            else if (hour < 18) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
        };
        const interval = setInterval(updateGreeting, 60000); 
        return () => clearInterval(interval);
    }, []);

    const [loading, setLoading] = useState(true);

    // User session
    let user = {};
    try {
        const userData = localStorage.getItem('user');
        user = userData ? JSON.parse(userData) : {};
    } catch (e) {
        console.error(e);
        logout();
    }
    const isAdmin = user.role === 'admin' || user.role === undefined;

    // Date Logic
    const dateRange = useMemo(() => {
        const now = new Date();
        let from, to;
        switch (dateFilter) {
            case 'Today': from = startOfDay(now); to = endOfDay(now); break;
            case 'Yesterday': from = startOfDay(subDays(now, 1)); to = endOfDay(subDays(now, 1)); break;
            case 'Last 7 Days': from = subDays(now, 7); to = endOfDay(now); break;
            case 'Last 30 Days': from = subDays(now, 30); to = endOfDay(now); break;
            case 'This Month': from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)); to = endOfDay(now); break;
            default: break;
        }
        return { dateFrom: from?.toISOString(), dateTo: to?.toISOString() };
    }, [dateFilter]);

    const fetchStats = async () => {
        try {
            const res = await api.get('/analytics/dashboard-stats');
            setStats(res.data);
        } catch (error) {
            // The response interceptor in api.js handles 401 errors globally.
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchStats();

            // Refresh stats on any lead change
            socket.on('new_lead', fetchStats);
            socket.on('update_lead', fetchStats);
            socket.on('delete_lead', fetchStats);
            socket.on('bulk_delete', fetchStats);

            return () => {
                socket.off('new_lead', fetchStats);
                socket.off('update_lead', fetchStats);
                socket.off('delete_lead', fetchStats);
                socket.off('bulk_delete', fetchStats);
            };
        } else {
            // If no token is found, the user should be logged out.
            // The interceptor would have caught this on a failed API call,
            // but this is a safeguard for direct navigation to the dashboard.
            logout();
        }
    }, []);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-jakarta">
            <Sidebar
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                user={user}
                onLogout={logout}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative scroll-smooth">
                {/* Mobile Header */}
                <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <span className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" /> Meta SaaS
                    </span>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <main className="flex-1 p-6 md:p-10 w-full max-w-[1600px] mx-auto space-y-10">
                    {/* Header Section */}
                    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                                {greeting}, {user.name?.split(' ')[0]} 👋
                            </h1>
                            <p className="text-slate-500 font-medium text-lg">Here's what's happening with your growth today.</p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm"
                        >
                            {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                                        dateFilter === filter 
                                        ? 'bg-slate-900 text-white shadow-md' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                <Calendar className="w-4 h-4" />
                            </button>
                        </motion.div>
                    </div>

                    {/* Stats Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-40 rounded-[2rem] bg-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {isAdmin ? (
                                <>
                                    <StatCard title="Total Leads" value={stats.total} icon={Users} color="bg-gradient-to-br from-blue-500 to-indigo-600" delay={0.1} />
                                    <StatCard title="High Intent (AI)" value={stats.highIntent} icon={Target} color="bg-gradient-to-br from-violet-500 to-purple-600" trend={`${stats.avgAIScore}% Match Score`} delay={0.2} />
                                    <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={Activity} color="bg-gradient-to-br from-emerald-400 to-teal-500" trend="+12.5%" delay={0.3} />
                                    <StatCard title="System Alerts" value={stats.failed} icon={AlertCircle} color="bg-gradient-to-br from-rose-500 to-red-600" delay={0.4} />
                                </>
                            ) : (
                                <>
                                    <StatCard title="My Leads" value={stats.total} icon={Users} color="bg-blue-500" delay={0.1} />
                                    <StatCard title="Emails Sent" value={stats.emailSent} icon={Mail} color="bg-green-500" delay={0.2} />
                                    <StatCard title="WhatsApp Sent" value={stats.whatsappSent} icon={MessageSquare} color="bg-emerald-600" delay={0.3} />
                                    <StatCard title="Efficiency" value="98%" icon={Zap} color="bg-amber-500" delay={0.4} />
                                </>
                            )}
                        </div>
                    )}

                    {/* Charts & Analytics */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Main Chart Area */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="xl:col-span-2 space-y-8"
                        >
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-500" /> Acquisiton Velocity
                                        </h3>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Lead volume trend over time</p>
                                    </div>
                                    <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="h-[400px] w-full">
                                    <LeadChart filters={dateRange} />
                                </div>
                            </div>

                            <RegionalRevenueChart />
                        </motion.div>

                        {/* Sidebar / Feeds */}
                        <div className="space-y-8">
                             <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                             >
                                <LeadIntelligenceFeed />
                             </motion.div>

                             <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
                             >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-900">Lead Health</h3>
                                    <button className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">View Report</button>
                                </div>
                                <div className="min-h-[300px] flex items-center justify-center">
                                    <StatusChart filters={dateRange} />
                                </div>
                             </motion.div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

