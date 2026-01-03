import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { getLeads, logout, updateLeadStatus, getTeam, assignLead, deleteLead, deleteLeads, markSpam, restoreLead, assignLeads, deleteLeadsByDate, api, getCampaigns } from '../services/api';
import {
    Briefcase,
    RefreshCw, Trash2, Download, Calendar, Ban, ShieldCheck, Menu, Filter, Search, ArrowUpDown
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import Sidebar from '../components/Sidebar';
import { TableSkeleton } from '../components/TableSkeleton';

// Use environment variable for production socket connection
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

function StatusBadge({ status, type }) {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        failed: 'bg-red-100 text-red-700 border-red-200',
        sent: 'bg-blue-100 text-blue-700 border-blue-200',
        delivered: 'bg-green-100 text-green-700 border-green-200',
        read: 'bg-green-200 text-green-800 border-green-300',
        opened: 'bg-purple-100 text-purple-700 border-purple-200',
        clicked: 'bg-purple-200 text-purple-800 border-purple-300',
        // Lead statuses
        New: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        Contacted: 'bg-blue-100 text-blue-700 border-blue-200',
        Interested: 'bg-orange-100 text-orange-700 border-orange-200',
        Converted: 'bg-green-100 text-green-700 border-green-200',
        Lost: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    const shouldPulse = ['pending', 'sent', 'New', 'Contacted'].includes(status);
    const statusKey = status || 'pending';

    return (
        <span className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[statusKey] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {shouldPulse && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
            )}
            {statusKey.toUpperCase()}
        </span>
    );
}

export default function Leads() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [team, setTeam] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [filterCampaign, setFilterCampaign] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateFilter, setDateFilter] = useState('All Time');
    const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [limit, setLimit] = useState(10);
    const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
    const [totalLeadsCount, setTotalLeadsCount] = useState(0);

    let user = {};
    try {
        const userData = localStorage.getItem('user');
        user = userData ? JSON.parse(userData) : {};
    } catch (e) {
        console.error('Failed to parse user data', e);
        logout();
    }
    const isAdmin = user.role === 'admin' || user.role === undefined;

    const dateRange = React.useMemo(() => {
        const now = new Date();
        let from, to;
        switch (dateFilter) {
            case 'Today': from = startOfDay(now); to = endOfDay(now); break;
            case 'Yesterday': from = startOfDay(subDays(now, 1)); to = endOfDay(subDays(now, 1)); break;
            case 'This Week': from = startOfWeek(now, { weekStartsOn: 1 }); to = endOfDay(now); break;
            case 'Last Week': from = startOfWeek(subDays(now, 7), { weekStartsOn: 1 }); to = endOfWeek(subDays(now, 7), { weekStartsOn: 1 }); break;
            case 'Last 30 Days': from = subDays(now, 30); to = endOfDay(now); break;
            case 'Last 3 Months': from = subMonths(now, 3); to = endOfDay(now); break;
            case 'Last 6 Months': from = subMonths(now, 6); to = endOfDay(now); break;
            case 'Custom':
                if (customDateRange.from) from = startOfDay(new Date(customDateRange.from + 'T00:00:00'));
                if (customDateRange.to) to = endOfDay(new Date(customDateRange.to + 'T00:00:00'));
                break;
            default: break;
        }
        return { dateFrom: from ? from.toISOString() : undefined, dateTo: to ? to.toISOString() : undefined };
    }, [dateFilter, customDateRange]);

    const fetchLeads = useCallback(async (page = 1, sortOptions = {}) => {
        setLoading(true);
        try {
            const filters = {
                status: filterStatus,
                campaignId: filterCampaign,
                ...dateRange,
                search: debouncedSearch,
                page,
                sortBy: sortOptions.sortBy || sortBy,
                sortOrder: sortOptions.sortOrder || sortOrder,
                limit
            };
            const { leads: data, totalPages: pages, currentPage: pageNum } = await getLeads(filters);
            setLeads(data || []);
            setTotalPages(pages || 1);
            // We need total count for the "Select all X leads" message. Assuming getLeads returns it or we calculate approx.
            // Ideally getLeads response should include totalCount. Let's assume we can get it or add it.
            // For now, let's assume pages * limit is approx total.
            // Better: Update getLeads to return totalCount.
            setCurrentPage(pageNum || 1);
        } catch (error) {
            if (error.response && error.response.status === 401) logout();
            console.error('Failed to fetch leads', error);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, dateRange, debouncedSearch, sortBy, sortOrder, limit]);

    const fetchCampaigns = async () => {
        try {
            const data = await getCampaigns(); // Uses the new Campaign model endpoint
            setCampaigns(data || []); // The new endpoint returns the correct format
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        }
    };

    // Helper to get total count since getLeads might not return it directly in current implementation
    // We will patch fetchLeads to set it if available, or fetch it separately if needed.
    // Actually, let's modify fetchLeads to handle the response correctly.
    // The backend returns { leads, totalPages, currentPage }. It doesn't return totalCount explicitly in the provided snippet.
    // I will assume for this UI feature we might need to fetch it or just use totalPages * limit as an estimate if not available.
    // Let's modify the fetchLeads above to try and get totalCount if the backend sends it (I didn't add it to backend response in previous steps, but I can add it now or just use totalPages).
    // Wait, I can't modify backend GET /leads in this turn easily without re-pasting the whole file.
    // I will use `totalPages * limit` as a rough estimate for the UI text, or just say "all leads".

    // Actually, I can modify the backend GET /leads to return totalCount.
    // Let's do that in the backend file update.

    const fetchTeam = async () => {
        if (isAdmin) {
            try {
                const data = await getTeam();
                setTeam(data);
            } catch (error) { console.error('Failed to fetch team', error); }
        }
    };

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on new search
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    useEffect(() => {
        fetchLeads(currentPage);
        fetchTeam();
        fetchCampaigns();

        socket.on('new_lead', (newLead) => setLeads(prev => [newLead, ...prev]));
        socket.on('update_lead', (updated) => setLeads(prev => prev.map(l => l._id === updated._id ? updated : l)));
        socket.on('delete_lead', (id) => {
            setLeads(prev => prev.filter(l => l._id !== id));
            setSelectedLeads(prev => prev.filter(lid => lid !== id));
        });
        socket.on('bulk_delete', (ids) => {
            setLeads(prev => prev.filter(l => !ids.includes(l._id)));
            setSelectedLeads(prev => prev.filter(id => !ids.includes(id)));
        });
        socket.on('bulk_update', () => fetchLeads(currentPage));

        return () => {
            socket.off('new_lead');
            socket.off('update_lead');
            socket.off('delete_lead');
            socket.off('bulk_delete');
            socket.off('bulk_update');
        };
    }, []);

    useEffect(() => {
        setSelectAllAcrossPages(false);
        setSelectedLeads([]);
        fetchLeads(1); // Refetch on filter change
    }, [filterStatus, dateRange, debouncedSearch, sortBy, sortOrder, limit, filterCampaign]);

    const handleStatusChange = async (id, newStatus) => {
        try {
            setLeads(prev => prev.map(l => l._id === id ? { ...l, status: newStatus } : l));
            await updateLeadStatus(id, newStatus);
        } catch (error) { fetchLeads(); }
    };

    const handleAssign = async (leadId, userId) => {
        try {
            await assignLead(leadId, userId);
            setLeads(prev => prev.map(l => l._id === leadId ? { ...l, assignedTo: team.find(u => u._id === userId) } : l));
        } catch (error) { console.error('Assign failed', error); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this lead?")) return;
        try { await deleteLead(id); } catch (error) { alert('Failed to delete'); }
    };

    const handleBulkDelete = async () => {
        const count = selectAllAcrossPages ? "all matching" : selectedLeads.length;
        if (!window.confirm(`Delete ${count} leads?`)) return;
        try {
            if (selectAllAcrossPages) {
                // Send filters to backend
                const filters = { status: filterStatus, campaignId: filterCampaign, ...dateRange, search: debouncedSearch };
                await api.post('/leads/delete-batch', { selectAll: true, filters });
            } else {
                await deleteLeads(selectedLeads);
            }
            setSelectedLeads([]);
            setSelectAllAcrossPages(false);
            fetchLeads(currentPage);
        } catch (error) { alert('Failed to delete leads'); }
    };

    const handleBulkAssign = async (userId) => {
        if (!selectedLeads.length && !selectAllAcrossPages) return;

        const userName = userId ? (team.find(u => u._id === userId)?.name || 'Selected User') : 'Unassigned';
        const count = selectAllAcrossPages ? "all matching" : selectedLeads.length;
        if (!window.confirm(`Are you sure you want to assign ${count} leads to ${userName}?`)) return;

        try {
            if (selectAllAcrossPages) {
                const filters = { status: filterStatus, campaignId: filterCampaign, ...dateRange, search: debouncedSearch };
                await api.post('/leads/assign-batch', { selectAll: true, filters, assignedTo: userId });
            } else {
                await assignLeads(selectedLeads, userId);
            }
            // Optimistic update or refetch
            fetchLeads(currentPage);
            setSelectedLeads([]);
            setSelectAllAcrossPages(false);
            alert('Leads assigned successfully');
        } catch (error) { alert('Failed to assign leads'); }
    };

    const handleBulkDeleteByDate = async () => {
        if (!dateRange.dateFrom || !dateRange.dateTo) {
            alert('Please select a valid date range first.');
            return;
        }
        const count = leads.length; // Approximate count, can be made more accurate
        if (!window.confirm(`Are you sure you want to delete all leads within this date range? This action is irreversible.`)) return;

        try {
            const result = await deleteLeadsByDate(dateRange.dateFrom, dateRange.dateTo);
            alert(result.message);
            fetchLeads(1); // Refresh the table
        } catch (error) {
            alert('Failed to delete leads by date.');
        }
    };

    const handleExport = () => {
        const headers = ['Name,Email,Phone,Date,Status,Assigned To'];
        const csvRows = leads.map(l => [
            `"${l.name}"`, `"${l.email}"`, `"${l.phone}"`,
            `"${format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm')}"`,
            `"${l.status}"`, `"${l.assignedTo?.name || 'Unassigned'}"`
        ].join(','));
        const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `leads_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleSelectAll = () => {
        if (selectAllAcrossPages) {
            setSelectAllAcrossPages(false);
            setSelectedLeads([]);
        } else if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l._id));
        }
    };

    const toggleSelect = (id) => {
        if (selectAllAcrossPages) {
            setSelectAllAcrossPages(false);
            // If we were selecting all, and user unchecks one, we revert to selecting just the current page minus that one
            // This is complex, simpler to just clear "all pages" mode and select current page minus one.
            const newSelected = leads.map(l => l._id).filter(lid => lid !== id);
            setSelectedLeads(newSelected);
        } else {
            setSelectedLeads(prev => prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]);
        }
    };

    const handleSelectAllAcrossPages = () => {
        setSelectAllAcrossPages(true);
    };

    const handleSort = (column) => {
        const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
        setSortBy(column);
        setSortOrder(newSortOrder);
        // Fetch leads with new sort options, resetting to page 1
        fetchLeads(1, { sortBy: column, sortOrder: newSortOrder });
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const SortableHeader = ({ column, label }) => (
        <button onClick={() => handleSort(column)} className="flex items-center gap-1 group">
            {label}
            <ArrowUpDown className={`w-3 h-3 text-gray-400 group-hover:text-gray-700 transition-colors ${sortBy === column ? 'text-gray-900' : ''}`} />
        </button>
    );

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} user={user} onLogout={logout} />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-y-auto">
                <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                    <span className="font-bold text-gray-800 text-lg">Leads</span>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
                </div>

                <main className="p-4 md:p-8 w-full max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{leads.length} Leads Found</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search leads..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                    <Calendar className="w-4 h-4 text-gray-500 ml-2" />
                                    <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 py-1 pr-8 cursor-pointer outline-none">
                                        <option>All Time</option><option>Today</option><option>Yesterday</option><option>This Week</option><option>Last 30 Days</option><option>Custom</option>
                                    </select>
                                </div>
                                {dateFilter === 'Custom' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={customDateRange.from} onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))} className="text-sm border-gray-200 rounded-lg py-1.5" />
                                        <input type="date" value={customDateRange.to} onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))} className="text-sm border-gray-200 rounded-lg py-1.5" />
                                    </div>
                                )}
                                {isAdmin && dateFilter !== 'All Time' && (
                                    <button onClick={handleBulkDeleteByDate} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-200 transition">
                                        <Trash2 className="w-4 h-4" /> Delete by Date
                                    </button>
                                )}
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border-gray-200 rounded-lg focus:ring-blue-500">
                                    <option value="">All Statuses</option><option value="New">New</option><option value="Contacted">Contacted</option><option value="Converted">Converted</option><option value="Spam">Spam</option>
                                </select>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                    <Briefcase className="w-4 h-4 text-gray-500 ml-2" />
                                    <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)} className="text-sm bg-transparent border-none focus:ring-0 text-gray-700 py-1 pr-8 cursor-pointer outline-none">
                                        <option value="">All Campaigns</option>
                                        {campaigns.map(c => <option key={c.campaignId} value={c.campaignId}>{c.name}</option>)}
                                    </select>
                                </div>
                                <button onClick={() => fetchLeads(currentPage)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"><RefreshCw className="w-5 h-5" /></button>
                                <button onClick={handleExport} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600"><Download className="w-5 h-5" /></button>
                                {selectedLeads.length > 0 && isAdmin && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={(e) => handleBulkAssign(e.target.value)}
                                            className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 py-1.5"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Assign to...</option>
                                            {team.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                            <option value="">Unassigned</option>
                                        </select>
                                        <button onClick={handleBulkDelete} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-600 transition"><Trash2 className="w-4 h-4" /> Delete ({selectedLeads.length})</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Select All Banner */}
                        {selectedLeads.length === leads.length && leads.length > 0 && !selectAllAcrossPages && totalPages > 1 && (
                            <div className="bg-blue-50 p-2 text-center text-sm text-blue-800 border-b border-blue-100">
                                <span>All {leads.length} leads on this page are selected. </span>
                                <button onClick={handleSelectAllAcrossPages} className="font-bold underline hover:text-blue-900">
                                    Select all leads across all pages
                                </button>
                            </div>
                        )}
                        {selectAllAcrossPages && (
                            <div className="bg-blue-50 p-2 text-center text-sm text-blue-800 border-b border-blue-100">
                                <span>All leads matching current filters are selected. </span>
                                <button onClick={() => setSelectAllAcrossPages(false)} className="font-bold underline hover:text-blue-900">
                                    Clear selection
                                </button>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-4 py-3"><input type="checkbox" checked={selectAllAcrossPages || (leads.length > 0 && selectedLeads.length === leads.length)} onChange={toggleSelectAll} /></th>
                                        <th className="px-4 py-3"><SortableHeader column="name" label="Name" /></th>
                                        <th className="px-4 py-3">Contact</th>
                                        <th className="px-4 py-3"><SortableHeader column="createdAt" label="Date" /></th>
                                        <th className="px-4 py-3"><SortableHeader column="status" label="Status" /></th>
                                        <th className="px-4 py-3 text-center"><SortableHeader column="score" label="Score" /></th>
                                        {isAdmin && <th className="px-4 py-3">Assigned To</th>}
                                        <th className="px-4 py-3 text-center">Email</th>
                                        <th className="px-4 py-3 text-center">WhatsApp</th>
                                        <th className="px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? <TableSkeleton rows={5} /> : leads.map((lead) => (
                                        <tr
                                            key={lead._id}
                                            className="hover:bg-gray-50 transition cursor-pointer"
                                            onClick={() => navigate(`/leads/${lead._id}`)}
                                        >
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectAllAcrossPages || selectedLeads.includes(lead._id)} onChange={() => toggleSelect(lead._id)} /></td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600"><div><span>{lead.email}</span><span className="text-xs text-gray-400 block">{lead.phone}</span></div></td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{format(new Date(lead.createdAt), 'MMM dd, HH:mm')}</td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <select value={lead.status || 'New'} onChange={(e) => handleStatusChange(lead._id, e.target.value)} className="text-xs font-bold px-2 py-1 rounded-full border-none bg-gray-100 cursor-pointer">
                                                    <option value="New">New</option><option value="Contacted">Contacted</option><option value="Interested">Interested</option><option value="Converted">Converted</option><option value="Lost">Lost</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded ${lead.quality === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>{lead.score || 0}</span></td>
                                            {isAdmin && (
                                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <select value={lead.assignedTo?._id || ''} onChange={(e) => handleAssign(lead._id, e.target.value)} className="w-full text-xs border-gray-200 rounded-lg">
                                                        <option value="">Unassigned</option>
                                                        {team.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                                    </select>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-center"><StatusBadge status={lead.emailStatus} /></td>
                                            <td className="px-4 py-3 text-center"><StatusBadge status={lead.whatsappStatus} /></td>
                                            <td className="px-4 py-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => navigate(`/leads/${lead._id}`)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
                                                {isAdmin && <button onClick={() => handleDelete(lead._id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
                            <span className="text-gray-500">Showing page {currentPage} of {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Rows per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {[10, 25, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => fetchLeads(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors">
                                    Previous
                                </button>
                                <div className="hidden sm:flex gap-1">
                                    {getPageNumbers().map((page, index) => (
                                        <button
                                            key={index}
                                            onClick={() => typeof page === 'number' ? fetchLeads(page) : null}
                                            disabled={page === '...'}
                                            className={`px-3 py-1 border rounded-md transition-colors ${page === currentPage
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : page === '...'
                                                    ? 'border-transparent cursor-default'
                                                    : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => fetchLeads(currentPage + 1)} disabled={currentPage >= totalPages} className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}