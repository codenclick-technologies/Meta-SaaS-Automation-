import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { logout } from '../services/api';
import {
    Users, Mail, MessageSquare, Clock, Calendar,
    TrendingUp, AlertCircle, Menu
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import UserManagement from '../components/UserManagement';
import SettingsModal from '../components/SettingsModal';
import LeadChart from '../components/LeadChart';
import StatusChart from '../components/StatusChart';
import Sidebar from '../components/Sidebar';

// Use environment variable for production socket connection, fallback to localhost for dev
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'] // Prioritize websocket for real-time performance
});

function StatCard({ title, value, icon: Icon, color, trend }) {
    const [displayValue, setDisplayValue] = React.useState(0);

    // Animated counter effect
    React.useEffect(() => {
        const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
        if (numericValue === 0) {
            setDisplayValue(0);
            return;
        }

        const duration = 1000; // 1 second
        const steps = 30;
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 card-hover group">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mb-2 tabular-nums">
                        {displayValue}
                        {typeof value === 'string' && value.includes('%') && '%'}
                    </p>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <TrendingUp className="w-3 h-3" />
                            <span>{trend}</span>
                        </div>
                    )}
                </div>
                <div className={`p-4 rounded-xl ${color} transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white drop-shadow-lg" />
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, type }) {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-700',
        // Real-world statuses for WhatsApp (Meta) & Email (SendGrid)
        sent: 'bg-blue-100 text-blue-700',
        delivered: 'bg-green-100 text-green-700',
        read: 'bg-green-200 text-green-800',
        opened: 'bg-purple-100 text-purple-700',
        clicked: 'bg-purple-200 text-purple-800'
    };

    // Default to pending if unknown
    const statusKey = status || 'pending';

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[statusKey] || 'bg-gray-100 text-gray-600'}`}>
            {statusKey.toUpperCase()}
        </span>
    );
}

export default function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        emailSent: 0,
        whatsappSent: 0,
        pending: 0,
        conversionRate: 0,
        failed: 0
    });
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });

    const showTeamModal = location.pathname === '/users';
    const showSettingsModal = location.pathname === '/settings';

    // Get logged in user to check role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.role === undefined; // Default to admin for legacy users

    const dateRange = React.useMemo(() => {
        const now = new Date();
        let from, to;

        switch (dateFilter) {
            case 'Today':
                from = startOfDay(now);
                to = endOfDay(now);
                break;
            case 'Yesterday':
                const yesterday = subDays(now, 1);
                from = startOfDay(yesterday);
                to = endOfDay(yesterday);
                break;
            case 'This Week':
                from = startOfWeek(now, { weekStartsOn: 1 });
                to = endOfDay(now);
                break;
            case 'Last Week':
                const lastWeek = subDays(now, 7);
                from = startOfWeek(lastWeek, { weekStartsOn: 1 });
                to = endOfWeek(lastWeek, { weekStartsOn: 1 });
                break;
            case 'Last 30 Days':
                from = subDays(now, 30);
                to = endOfDay(now);
                break;
            case 'Last 3 Months':
                from = subMonths(now, 3);
                to = endOfDay(now);
                break;
            case 'Last 6 Months':
                from = subMonths(now, 6);
                to = endOfDay(now);
                break;
            case 'Custom':
                // Append time to ensure local timezone parsing (prevents date shifting)
                if (customDateRange.from) from = startOfDay(new Date(customDateRange.from + 'T00:00:00'));
                if (customDateRange.to) to = endOfDay(new Date(customDateRange.to + 'T00:00:00'));
                break;
            default:
                break;
        }

        return { dateFrom: from ? from.toISOString() : undefined, dateTo: to ? to.toISOString() : undefined };
    }, [dateFilter, customDateRange]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/analytics/dashboard-stats`, {
                headers: { 'x-auth-token': token }
            });
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
            if (error.response && error.response.status === 401) logout();
        }
    };

    useEffect(() => {
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
    }, []);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                user={user}
                onLogout={logout}
            />

            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                    <span className="font-bold text-gray-800 text-lg">Meta Automation</span>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <main className="p-4 md:p-8 w-full max-w-7xl mx-auto">
                    {/* Header Area */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name}</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <>
                                    <button onClick={() => navigate('/users')} className="hidden md:flex bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium items-center gap-2 transition shadow-sm">
                                        <Users className="w-4 h-4" /> Team
                                    </button>
                                </>
                            )}
                            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                <div className={`w-2 h-2 rounded-full ${socket.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-xs font-medium text-gray-600">{socket.connected ? 'Live' : 'Offline'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {isAdmin ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                            <StatCard title="Total Leads" value={stats.total} icon={Users} color="bg-blue-500" />
                            <StatCard title="Pending Action" value={stats.pending} icon={Clock} color="bg-amber-500" />
                            <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} icon={TrendingUp} color="bg-purple-500" />
                            <StatCard title="Failed Automations" value={stats.failed} icon={AlertCircle} color="bg-red-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                            <StatCard title="My Leads" value={stats.total} icon={Users} color="bg-blue-500" />
                            <StatCard title="Emails Sent" value={`${stats.emailSent} / ${stats.total}`} icon={Mail} color="bg-green-500" />
                            <StatCard title="WhatsApp Sent" value={`${stats.whatsappSent} / ${stats.total}`} icon={MessageSquare} color="bg-green-600" />
                        </div>
                    )}

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <LeadChart filters={dateRange} />
                        <StatusChart filters={dateRange} />
                    </div>
                </main>
            </div>

            {/* Team Modal */}
            <UserManagement
                isOpen={showTeamModal}
                onClose={() => navigate('/dashboard')}
                onUserCreated={() => { }}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => navigate('/dashboard')}
            />
        </div>
    );
}
