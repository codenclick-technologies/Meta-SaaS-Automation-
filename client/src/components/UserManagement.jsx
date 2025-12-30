import React, { useState, useEffect } from 'react';
import { getTeam, createUser, deleteUser, getLeads } from '../services/api';
import { Trash2, UserPlus, Shield, User, Users, X, Briefcase, TrendingUp, BadgeCheck, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

export default function UserManagement({ isOpen, onClose, onUserCreated }) {
    const [team, setTeam] = useState([]);
    const [allLeads, setAllLeads] = useState([]); // Fetch all leads internally for accurate stats
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales' });
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            setError('');
            setCreatedCredentials(null);
            setNewUser({ name: '', email: '', password: '', role: 'sales' });
        }
    }, [isOpen]);

    const loadData = async () => {
        setListLoading(true);
        try {
            const [teamData, leadsData] = await Promise.all([
                getTeam(),
                getLeads({})
            ]);
            setTeam(teamData || []);
            setAllLeads(leadsData || []);
        } catch (err) {
            console.error("Failed to load data", err);
            setError("Failed to load team data. Please try again.");
        } finally {
            setListLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        const trimmedEmail = newUser.email.trim().toLowerCase();

        // Frontend duplicate check
        if (team.some(u => u.email.toLowerCase() === trimmedEmail)) {
            setError('User with this email already exists in the team.');
            return;
        }

        if (newUser.password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        setError('');
        setCreatedCredentials(null);

        try {
            const userData = { ...newUser, email: trimmedEmail, name: newUser.name.trim() };
            await createUser(userData);
            setCreatedCredentials({ ...userData }); // Store to show success message
            setNewUser({ name: '', email: '', password: '', role: 'sales' });
            // Refresh team list
            const teamData = await getTeam();
            setTeam(teamData || []);
            onUserCreated(); // Callback to refresh dashboard dropdowns
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to create user';
            const detail = err.response?.data?.error || '';
            setError(`${msg} ${detail ? `(${detail})` : ''}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this team member?')) return;
        setDeleteLoading(id);
        try {
            await deleteUser(id);
            const teamData = await getTeam();
            setTeam(teamData || []);
            onUserCreated();
        } catch (err) {
            alert('Failed to delete user');
        } finally {
            setDeleteLoading(null);
        }
    };

    const copyToClipboard = async () => {
        if (!createdCredentials) return;
        const text = `Welcome to Meta Automation!\n\nHere are your login details:\nURL: ${window.location.origin}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for non-secure contexts
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                alert('Unable to copy automatically. Please copy manually.');
            }
            document.body.removeChild(textArea);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Team Management
                    </h2>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {/* Create User Form */}
                    <div className="bg-gray-50 p-4 md:p-6 rounded-xl border border-gray-100 mb-8">
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4" /> Add New Member
                        </h3>
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {createdCredentials && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h4 className="text-green-800 font-bold flex items-center gap-2">
                                        <Check className="w-4 h-4" /> User Created Successfully!
                                    </h4>
                                    <p className="text-green-700 text-sm mt-1">
                                        Share these credentials with <strong>{createdCredentials.name}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-2 bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-100 transition shadow-sm"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy Details'}
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                placeholder="Full Name"
                                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                required
                            />
                            <input
                                placeholder="Email Address"
                                type="email"
                                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                required
                            />
                            <select
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="sales">Sales Agent</option>
                                <option value="admin">Admin</option>
                            </select>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Password"
                                    type="password"
                                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Team List */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Existing Team
                        </h3>
                        <div className="space-y-3">
                            {listLoading ? (
                                <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    <p>Loading team members...</p>
                                </div>
                            ) : team.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No team members yet.</p>
                            ) : (
                                team.map(member => {
                                    // Calculate Stats
                                    const assignedCount = allLeads.filter(l => l.assignedTo?._id === member._id || l.assignedTo === member._id).length;
                                    const convertedCount = allLeads.filter(l => (l.assignedTo?._id === member._id || l.assignedTo === member._id) && l.status === 'Converted').length;
                                    const conversionRate = assignedCount > 0 ? Math.round((convertedCount / assignedCount) * 100) : 0;

                                    return (
                                        <div key={member._id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition gap-4 relative overflow-hidden">
                                            {/* Role Indicator Strip */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${member.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${member.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {member.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                                        {member.name}
                                                        {member.role === 'admin' && <BadgeCheck className="w-4 h-4 text-purple-500" title="Admin" />}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 truncate">{member.email}</p>

                                                    {/* Performance Stats */}
                                                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1.5">
                                                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                                                            <Briefcase className="w-3 h-3" />
                                                            <span>{assignedCount} Leads</span>
                                                        </div>
                                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${conversionRate > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                                                            <TrendingUp className="w-3 h-3" />
                                                            <span>{conversionRate}% Conv.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                                <span className={`px-3 py-1 text-xs font-medium rounded-full uppercase tracking-wide ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {member.role || 'Sales'}
                                                </span>
                                                <button
                                                    onClick={() => handleDelete(member._id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Remove Member"
                                                    disabled={deleteLoading === member._id}
                                                >
                                                    {deleteLoading === member._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
