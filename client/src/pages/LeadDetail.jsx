import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLeadById, getLeadLogs, retryEmail, retryWhatsapp, updateLeadStatus, restoreLead, markSpam } from '../services/api'; import { ArrowLeft, RefreshCw, Mail, MessageSquare, ShieldCheck, AlertCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';

export default function LeadDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lead, setLead] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [l, lg] = await Promise.all([getLeadById(id), getLeadLogs(id)]);
            setLead(l);
            setLogs(lg);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRetryEmail = async () => {
        setLoading(true);
        try {
            await retryEmail(id);
            fetchData(); // Refresh data
            alert('Email retry triggered');
        } catch (err) {
            alert('Failed to retry email');
        } finally {
            setLoading(false);
        }
    };

    const handleRetryWhatsapp = async () => {
        setLoading(true);
        try {
            await retryWhatsapp(id);
            fetchData();
            alert('WhatsApp retry triggered');
        } catch (err) {
            alert('Failed to retry WhatsApp');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!window.confirm('Mark this lead as safe (Not Spam)?')) return;
        setLoading(true);
        try {
            const updatedLead = await restoreLead(id);
            setLead(updatedLead);
            alert('Lead restored successfully!');
        } catch (err) {
            alert('Failed to restore lead');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkSpam = async () => {
        if (!window.confirm('Are you sure you want to mark this lead as Spam?')) return;
        setLoading(true);
        try {
            const updatedLead = await markSpam(id);
            setLead(updatedLead);
            alert('Lead marked as Spam');
        } catch (err) {
            alert('Failed to mark as spam');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-700',
            sent: 'bg-blue-100 text-blue-700',
            delivered: 'bg-green-100 text-green-700',
            read: 'bg-green-200 text-green-800',
            opened: 'bg-purple-100 text-purple-700',
            clicked: 'bg-purple-200 text-purple-800'
        };
        return styles[status] || styles.pending;
    };

    if (!lead) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                </button>

                {lead.quality === 'Spam' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-full">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-800">Marked as Spam</h3>
                                <p className="text-sm text-red-600">This lead will be automatically deleted in 30 days.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRestore}
                            disabled={loading}
                            className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition flex items-center gap-2 whitespace-nowrap"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Restore Lead
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                            <p className="text-gray-500 text-sm mt-1">Lead ID: {lead.fb_lead_id}</p>
                        </div>
                    </div>
                    <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 text-left md:text-right">
                        <select
                            value={lead.status || 'New'}
                            onChange={async (e) => {
                                const newStatus = e.target.value;
                                setLead(prev => ({ ...prev, status: newStatus }));
                                await updateLeadStatus(id, newStatus);
                            }}
                            className={`text-sm font-bold px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-blue-500 cursor-pointer mb-2 ${lead.status === 'New' ? 'bg-blue-100 text-blue-800' :
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
                        <p className="text-gray-500 text-sm">Created: {format(new Date(lead.createdAt), 'PPP p')}</p>
                    </div>
                </div>

                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Contact Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Contact Details</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400">Email</label>
                                <div className="text-gray-900 font-medium">{lead.email}</div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400">Phone</label>
                                <div className="text-gray-900 font-medium">{lead.phone}</div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400">Form ID</label>
                                <div className="text-gray-900 font-medium">{lead.form_id || 'N/A'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions & Status</h3>
                        <div className="space-y-4">
                            {/* Email Action */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">Email Status</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(lead.emailStatus)}`}>
                                            {(lead.emailStatus || 'pending').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRetryEmail}
                                    disabled={loading}
                                    className="text-sm border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-sm transition disabled:opacity-50"
                                >
                                    Retry
                                </button>
                            </div>

                            {/* WhatsApp Action */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-full">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">WhatsApp Status</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(lead.whatsappStatus)}`}>
                                            {(lead.whatsappStatus || 'pending').toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRetryWhatsapp}
                                    disabled={loading}
                                    className="text-sm border border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-sm transition disabled:opacity-50"
                                >
                                    Retry
                                </button>
                            </div>

                            {/* Mark as Spam Action (Only visible if NOT spam) */}
                            {lead.quality !== 'Spam' && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-200 text-gray-600 rounded-full">
                                            <Ban className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-700">Lead Quality</p>
                                            <span className="text-xs text-gray-500">Mark as spam if invalid</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleMarkSpam}
                                        disabled={loading}
                                        className="text-sm border border-red-200 text-red-600 bg-white hover:bg-red-50 px-3 py-1.5 rounded-md shadow-sm transition disabled:opacity-50"
                                    >
                                        Mark Spam
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Logs Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 md:p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Activity Log</h2>
                    </div>
                    <div className="p-0">
                        {logs.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No logs available.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {logs.map(log => (
                                    <div key={log._id} className="p-4 flex gap-4 items-start hover:bg-gray-50">
                                        <div className={`mt-1 w-2 h-2 rounded-full ${log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <p className="font-medium text-gray-900 capitalize">{log.channel} - {log.status}</p>
                                                <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}</span>
                                            </div>
                                            {log.response && log.response.error && (
                                                <p className="text-xs text-red-500 mt-1 font-mono bg-red-50 p-2 rounded">
                                                    Error: {log.response.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
