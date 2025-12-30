import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { getLeads, logout, updateLeadStatus, getTeam, createUser, assignLead, deleteLead, deleteLeads, markSpam, restoreLead } from '../services/api';
import {
    Users, Mail, MessageSquare, RefreshCw, LogOut,
    Search, Filter, CheckCircle, XCircle, Clock, Plus, Shield, Trash2, Download, Settings, Calendar,
    TrendingUp, AlertCircle, Ban, ShieldCheck
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import UserManagement from '../components/UserManagement';
import SettingsModal from '../components/SettingsModal';

// Use environment variable for production socket connection, fallback to localhost for dev
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'] // Prioritize websocket for real-time performance
});

function StatCard({ title, value, icon: Icon, color }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-6 h-6 text-white" />
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
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        emailSent: 0,
        whatsappSent: 0,
        pending: 0,
        conversionRate: 0,
        failed: 0
    });
    const [team, setTeam] = useState([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
    const [filterStatus, setFilterStatus] = useState('');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
    const [selectedLeads, setSelectedLeads] = useState([]);

    // Get logged in user to check role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || user.role === undefined; // Default to admin for legacy users

    const fetchLeads = async () => {
        try {
            const filters = { status: filterStatus };

            // Date Filter Logic
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

            if (from) filters.dateFrom = from.toISOString();
            if (to) filters.dateTo = to.toISOString();

            const data = await getLeads(filters);
            setLeads(data);
            calculateStats(data);
        } catch (error) {
            console.error('Failed to fetch leads', error);
            if (error.response && error.response.status === 401) logout();
            console.log("Server Error Details:", error.response?.data);
            alert(`Failed to fetch leads: ${error.response?.data?.message || error.message}`);
        }
    };

    const fetchTeam = async () => {
        if (isAdmin) {
            try {
                const data = await getTeam();
                setTeam(data);
            } catch (error) {
                console.error('Failed to fetch team', error);
            }
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await createUser(newUser);
            alert('Sales User Created!');
            setShowTeamModal(false);
            setNewUser({ name: '', email: '', password: '' });
            fetchTeam();
        } catch (error) {
            console.error('Create user error:', error);
            const msg = error.response?.data?.message || error.message || 'Failed to create user';
            alert(`Error: ${msg}`);
        }
    };

    const handleAssign = async (leadId, userId) => {
        try {
            await assignLead(leadId, userId);
            setLeads(prev => prev.map(l => l._id === leadId ? { ...l, assignedTo: team.find(u => u._id === userId) } : l));
        } catch (error) {
            console.error('Assign failed', error);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            // Optimistic update
            setLeads(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));
            await updateLeadStatus(id, newStatus);
        } catch (error) {
            console.error('Status update failed', error);
            fetchLeads(); // Revert on fail
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this lead? This cannot be undone.")) return;
        try {
            await deleteLead(id);
            // Optimistic update
            setLeads(prev => prev.filter(l => l._id !== id));
            setSelectedLeads(prev => prev.filter(lid => lid !== id));
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete lead');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLeads.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} leads? This cannot be undone.`)) return;

        try {
            await deleteLeads(selectedLeads);
            // Optimistic removal
            setLeads(prev => prev.filter(l => !selectedLeads.includes(l._id)));
            setSelectedLeads([]);
            alert('Leads deleted successfully');
        } catch (error) {
            console.error('Bulk delete failed', error);
            alert('Failed to delete leads');
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length && leads.length > 0) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l._id));
        }
    };

    const toggleSelect = (id) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(prev => prev.filter(lid => lid !== id));
        } else {
            setSelectedLeads(prev => [...prev, id]);
        }
    };

    const handleMarkSpam = async (id) => {
        if (!window.confirm("Are you sure you want to mark this lead as Spam?")) return;
        try {
            await markSpam(id);
            // Optimistic update: remove from current view
            setLeads(prev => prev.filter(l => l._id !== id));
            alert('Lead marked as Spam');
        } catch (error) {
            console.error('Mark spam failed', error);
            alert('Failed to mark as spam');
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm("Restore this lead?")) return;
        try {
            await restoreLead(id);
            setLeads(prev => prev.filter(l => l._id !== id));
            alert('Lead restored');
        } catch (error) {
            console.error('Restore failed', error);
            alert('Failed to restore lead');
        }
    };

    const handleExport = () => {
        const headers = ['Name,Email,Phone,Date,Status,Assigned To'];
        const csvRows = leads.map(l => [
            `"${l.name}"`,
            `"${l.email}"`,
            `"${l.phone}"`,
            `"${format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm')}"`,
            `"${l.status}"`,
            `"${l.assignedTo?.name || 'Unassigned'}"`
        ].join(','));

        const csvString = [headers, ...csvRows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `leads_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const calculateStats = (data) => {
        const total = data.length;
        // Count all successful states (Sent, Delivered, Read, Opened, Clicked)
        const successStates = ['sent', 'delivered', 'read', 'opened', 'clicked'];
        const emailSent = data.filter(l => successStates.includes(l.emailStatus)).length;
        const whatsappSent = data.filter(l => successStates.includes(l.whatsappStatus)).length;

        // Admin Stats
        const pending = data.filter(l => l.status === 'New').length;
        const converted = data.filter(l => l.status === 'Converted').length;
        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
        const failed = data.filter(l => l.emailStatus === 'failed' || l.whatsappStatus === 'failed').length;

        setStats({ total, emailSent, whatsappSent, pending, conversionRate, failed });
    };

    useEffect(() => {
        fetchLeads();
        fetchTeam();

        socket.on('new_lead', (newLead) => {
            setLeads((prev) => {
                const updated = [newLead, ...prev];
                calculateStats(updated);
                return updated;
            });
        });

        socket.on('update_lead', (updatedLead) => {
            setLeads((prev) => {
                const updated = prev.map(l => l._id === updatedLead._id ? updatedLead : l);
                calculateStats(updated);
                return updated;
            });
        });

        socket.on('delete_lead', (deletedId) => {
            setLeads((prev) => {
                const updated = prev.filter(l => l._id !== deletedId);
                calculateStats(updated);
                return updated;
            });
            setSelectedLeads(prev => prev.filter(id => id !== deletedId));
        });

        socket.on('bulk_delete', (deletedIds) => {
            setLeads((prev) => {
                const updated = prev.filter(l => !deletedIds.includes(l._id));
                calculateStats(updated);
                return updated;
            });
            setSelectedLeads(prev => prev.filter(id => !deletedIds.includes(id)));
        });

        return () => {
            socket.off('new_lead');
            socket.off('update_lead');
            socket.off('delete_lead');
        };
    }, []);

    // Re-fetch when filter changes
    useEffect(() => {
        fetchLeads();
    }, [filterStatus, dateFilter, customDateRange.from, customDateRange.to]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
                    Meta Automation
                </h1>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    {isAdmin && (
                        <>
                            <button onClick={() => setShowTeamModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
                                <Plus className="w-4 h-4" /> Manage Team
                            </button>
                            <button onClick={() => setShowSettingsModal(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition" title="System Settings">
                                <Settings className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-gray-100 text-gray-600'}`}>
                        <Shield className={`w-4 h-4 ${isAdmin ? 'text-indigo-600' : 'text-blue-600'}`} />
                        <span className="font-semibold">{user.name || 'Admin'}</span>
                        <span className={`text-xs uppercase px-1.5 py-0.5 rounded ${isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>{user.role || 'Admin'}</span>
                    </div>
                    <button onClick={logout} className="text-gray-500 hover:text-red-600 transition flex items-center gap-2 text-sm font-medium">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </nav>

            {/* Team Modal */}
            <UserManagement
                isOpen={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                onUserCreated={fetchTeam}
            />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
            />

            <main className="p-4 md:p-6 max-w-7xl mx-auto">
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

                {/* Admin Quick Filters */}
                {isAdmin && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button onClick={() => setFilterStatus('New')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${filterStatus === 'New' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <Clock className="w-3 h-3" /> New Leads
                        </button>
                        <button onClick={() => setFilterStatus('Converted')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${filterStatus === 'Converted' ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <TrendingUp className="w-3 h-3" /> Converted
                        </button>
                        <button onClick={() => setFilterStatus('failed')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${filterStatus === 'failed' ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <AlertCircle className="w-3 h-3" /> Failed Automations
                        </button>
                        <button onClick={() => setFilterStatus('Spam')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${filterStatus === 'Spam' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            <Ban className="w-3 h-3" /> Spam Box
                        </button>
                        {filterStatus && (
                            <button onClick={() => setFilterStatus('')} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium underline">
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Leads Table Container */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-800">Recent Leads</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Date Filter */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                <Calendar className="w-4 h-4 text-gray-500 ml-2" />
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 py-1 pr-8 cursor-pointer outline-none"
                                >
                                    <option>All Time</option>
                                    <option>Today</option>
                                    <option>Yesterday</option>
                                    <option>This Week</option>
                                    <option>Last Week</option>
                                    <option>Last 30 Days</option>
                                    <option>Last 3 Months</option>
                                    <option>Last 6 Months</option>
                                    <option>Custom</option>
                                </select>
                            </div>

                            {dateFilter === 'Custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customDateRange.from}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                        className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 py-1.5 cursor-pointer"
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="date"
                                        value={customDateRange.to}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                        className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 py-1.5 cursor-pointer"
                                    />
                                </div>
                            )}

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="text-sm border-gray-200 rounded-lg focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Interested">Interested</option>
                                <option value="Converted">Converted</option>
                                <option value="Lost">Lost</option>
                                <option value="Spam">Spam Box</option>
                            </select>
                            <button onClick={fetchLeads} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleExport}
                                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"
                                title="Export to Excel"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            {selectedLeads.length > 0 && isAdmin && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-600 transition"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete ({selectedLeads.length})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3 md:px-6 md:py-4">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={leads.length > 0 && selectedLeads.length === leads.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 md:px-6 md:py-4">Name</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4">Contact</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4">Date</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4">Status</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4 text-center">Score</th>
                                    {isAdmin && <th className="px-4 py-3 md:px-6 md:py-4">Assigned To</th>}
                                    <th className="px-4 py-3 md:px-6 md:py-4 text-center">Email</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4 text-center">WhatsApp</th>
                                    <th className="px-4 py-3 md:px-6 md:py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {leads.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-gray-50 transition">
                                        <td className="px-4 py-3 md:px-6 md:py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedLeads.includes(lead._id)}
                                                onChange={() => toggleSelect(lead._id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-gray-900">{lead.name}</td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{lead.email}</span>
                                                <span className="text-xs text-gray-400">{lead.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-sm text-gray-500">
                                            {format(new Date(lead.createdAt), 'MMM dd, HH:mm')}
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                                            <select
                                                value={lead.status || 'New'}
                                                onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                                                className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
                                                    lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                        lead.status === 'Interested' ? 'bg-green-100 text-green-800' :
                                                            lead.status === 'Converted' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                <option value="New">New</option>
                                                <option value="Contacted">Contacted</option>
                                                <option value="Interested">Interested</option>
                                                <option value="Converted">Converted</option>
                                                <option value="Lost">Lost</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${lead.quality === 'High' ? 'bg-emerald-100 text-emerald-700' :
                                                    lead.quality === 'Medium' ? 'bg-blue-50 text-blue-600' :
                                                        lead.quality === 'Spam' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {lead.score || 0}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase mt-0.5">{lead.quality}</span>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 md:px-6 md:py-4">
                                                <select
                                                    value={lead.assignedTo?._id || ''}
                                                    onChange={(e) => handleAssign(lead._id, e.target.value)}
                                                    className="w-full text-xs border-gray-200 rounded-lg"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {team.map(t => (
                                                        <option key={t._id} value={t._id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                                            <StatusBadge status={lead.emailStatus} type="email" />
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                                            <StatusBadge status={lead.whatsappStatus} type="whatsapp" />
                                        </td>
                                        <td className="px-4 py-3 md:px-6 md:py-4 flex items-center gap-3">
                                            <a href={`/leads/${lead._id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</a>
                                            {isAdmin && (
                                                <>
                                                    {lead.quality === 'Spam' ? (
                                                        <button onClick={() => handleRestore(lead._id)} className="text-gray-400 hover:text-green-600 transition" title="Restore Lead">
                                                            <ShieldCheck className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleMarkSpam(lead._id)} className="text-gray-400 hover:text-red-600 transition" title="Mark as Spam">
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(lead._id)} className="text-gray-400 hover:text-red-600 transition" title="Delete Lead">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                            No leads found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
