import React, { useState, useEffect } from 'react';
import { getTeam, createUser, deleteUser, updateUser } from '../services/api';
import { Trash2, UserPlus, Shield, User, X, Briefcase, TrendingUp, BadgeCheck, Copy, Check, Loader2, AlertCircle, Search, Edit2, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function UserManagement({ isOpen, onClose, onUserCreated }) {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales' });
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // State for edit modal

    useEffect(() => {
        const socket = io(SOCKET_URL);

        if (isOpen) {
            loadData(debouncedSearch);
            setError('');
            setCreatedCredentials(null);
            setNewUser({ name: '', email: '', password: '', role: 'sales' });
        }

        // Real-time updates
        socket.on('team_updated', () => {
            loadData(debouncedSearch);
        });

        return () => {
            socket.disconnect();
        };
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch data on search change
    useEffect(() => { if (isOpen) loadData(debouncedSearch); }, [debouncedSearch, isOpen]);

    const loadData = async (search = '') => {
        setListLoading(true);
        try {
            const teamData = await getTeam(search);
            setTeam(teamData || []);
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
            setShowAddForm(false); // Close form on success
            setCreatedCredentials({ ...userData }); // Store to show success message
            setNewUser({ name: '', email: '', password: '', role: 'sales' });
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
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (id === currentUser.id) {
            alert("You cannot delete your own account.");
            return;
        }

        if (!window.confirm('Are you sure you want to remove this team member?')) return;
        setDeleteLoading(id);
        try {
            await deleteUser(id);
            onUserCreated();
        } catch (err) {
            alert('Failed to delete user');
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingUser.name.trim()) {
            alert("User name cannot be empty.");
            return;
        }

        setLoading(true);
        try {
            await updateUser(editingUser._id, { name: editingUser.name, role: editingUser.role });
            setEditingUser(null);
        } catch (err) {
            // Error is now handled by a toast notification from the backend
            console.error('Update failed', err);
        } finally {
            setLoading(false);
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
                    <div className="bg-gray-50 rounded-xl border border-gray-100 mb-8">
                        <button onClick={() => setShowAddForm(!showAddForm)} className="w-full p-4 flex justify-between items-center cursor-pointer">
                            <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                                <UserPlus className="w-4 h-4" /> Add New Member
                            </h3>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
                        </button>

                        {showAddForm && (
                            <div className="p-4 md:p-6 border-t border-gray-100">
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
                        )}
                    </div>

                    {/* Team List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                                <User className="w-4 h-4" /> Existing Team ({team.length})
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search team..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                                />
                            </div>
                        </div>

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
                                    // Stats are now pre-calculated by the backend
                                    const assignedCount = member.assignedCount || 0;
                                    const convertedCount = member.convertedCount || 0;
                                    const conversionRate = assignedCount > 0 ? Math.round((convertedCount / assignedCount) * 100) : 0;

                                    return (
                                        <div key={member._id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition gap-4 relative overflow-hidden">
                                            {/* Role Indicator Strip */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${member.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden border ${member.role === 'admin' ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                                                    {member.profilePicture ? (
                                                        <img src={member.profilePicture} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        member.name?.charAt(0) || 'U'
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                                        {member.name}
                                                        {member.role === 'admin' && <BadgeCheck className="w-4 h-4 text-purple-500" title="Admin" />}
                                                    </h4>
                                                    <p className="text-xs text-gray-400">
                                                        Last active: {member.lastActive ? formatDistanceToNow(new Date(member.lastActive), { addSuffix: true }) : 'Never'}
                                                    </p>
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
                                                    onClick={() => setEditingUser(member)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Edit Member"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(member._id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title={member._id === JSON.parse(localStorage.getItem('user') || '{}').id ? "You cannot delete yourself" : "Remove Member"}
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

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Edit {editingUser.name}</h3>
                            <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Name</label>
                                <input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Role</label>
                                <select
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="sales">Sales Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Cancel</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2">
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
