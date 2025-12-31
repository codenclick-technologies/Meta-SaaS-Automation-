import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeam, createUser, deleteUser, updateUser, logout } from '../services/api';
import { Trash2, UserPlus, Shield, User, X, Briefcase, TrendingUp, BadgeCheck, Copy, Check, Loader2, AlertCircle, Search, Edit2, ChevronDown, Menu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import Sidebar from '../components/Sidebar';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function UsersPage() {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
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
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/me`, {
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user', error);
            navigate('/login');
        }
    };

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('token');
        navigate('/login');
    };

    useEffect(() => {
        if (!user) return;

        const socket = io(SOCKET_URL);
        loadData(debouncedSearch);

        socket.on('team_updated', () => {
            loadData(debouncedSearch);
        });

        return () => {
            socket.disconnect();
        };
    }, [user, debouncedSearch]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadData = async (search = '') => {
        setListLoading(true);
        try {
            const teamData = await getTeam(search);
            setTeam(teamData || []);
        } catch (err) {
            console.error("Failed to load data", err);
            setError("Failed to load team data.");
        } finally {
            setListLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const trimmedEmail = newUser.email.trim().toLowerCase();

        if (team.some(u => u.email.toLowerCase() === trimmedEmail)) {
            setError('Email already exists in the team.');
            return;
        }

        if (newUser.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await createUser({ ...newUser, email: trimmedEmail });
            setCreatedCredentials({ ...newUser, email: trimmedEmail });
            setNewUser({ name: '', email: '', password: '', role: 'sales' });
            setShowAddForm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (id === user?._id || id === user?.id) {
            alert("You cannot delete yourself.");
            return;
        }
        if (!window.confirm('Remove this member?')) return;
        setDeleteLoading(id);
        try {
            await deleteUser(id);
        } catch (err) {
            alert('Failed to delete user');
        } finally {
            setDeleteLoading(null);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(editingUser._id, { name: editingUser.name, role: editingUser.role });
            setEditingUser(null);
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        const text = `Welcome to Meta Automation!\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-gray-200 z-10">
                    <div className="px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-500 hover:text-gray-700">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    Team Management
                                </h1>
                                <p className="text-xs text-gray-500">Manage your organization's members and roles</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="w-full max-w-7xl mx-auto space-y-6">
                        {/* Add User Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <button onClick={() => setShowAddForm(!showAddForm)} className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition">
                                <h3 className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2 tracking-wider">
                                    <UserPlus className="w-5 h-5 text-blue-500" /> Add New Member
                                </h3>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
                            </button>

                            {showAddForm && (
                                <div className="p-6 border-t border-gray-50 bg-gray-50/30">
                                    {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2 border border-red-100"><AlertCircle className="w-4 h-4" />{error}</div>}
                                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <input placeholder="Full Name" className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                                        <input placeholder="Email Address" type="email" className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                                            <option value="sales">Sales Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <input placeholder="Password" type="password" className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition flex-1" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                                            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center disabled:opacity-50 min-w-[100px]">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create'}</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>

                        {createdCredentials && (
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4">
                                <div>
                                    <h4 className="text-green-800 font-bold flex items-center gap-2"><Check className="w-5 h-5" /> Account created successfully!</h4>
                                    <p className="text-green-700 text-sm mt-1">Credentials ready to share with <strong>{createdCredentials.name}</strong></p>
                                </div>
                                <button onClick={copyToClipboard} className="bg-white text-green-700 border border-green-200 px-6 py-2.5 rounded-xl font-bold hover:bg-green-100 transition-all shadow-sm flex items-center gap-2">{copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Access Details</>}</button>
                                <button onClick={() => setCreatedCredentials(null)} className="text-green-600 hover:text-green-800 p-2"><X className="w-5 h-5" /></button>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
                            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h3 className="text-sm font-bold text-gray-600 uppercase flex items-center gap-2 tracking-wider">
                                    <User className="w-5 h-5 text-gray-400" /> Existing Members ({team.length})
                                </h3>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm" />
                                </div>
                            </div>

                            <div className="p-0 overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Member</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Performance</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Activity</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {listLoading ? (
                                            <tr><td colSpan="5" className="py-20 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />Loading team members...</td></tr>
                                        ) : team.length === 0 ? (
                                            <tr><td colSpan="5" className="py-20 text-center text-gray-400">No members found matching your search</td></tr>
                                        ) : team.map(member => (
                                            <tr key={member._id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {member.profilePicture ? <img src={member.profilePicture} alt={member.name} className="w-full h-full rounded-full object-cover" /> : member.name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                                                                {member.name}
                                                                {member.role === 'admin' && <BadgeCheck className="w-3.5 h-3.5 text-purple-600" />}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {member.role || 'Sales'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-gray-700">{member.assignedCount || 0}</span>
                                                            <span className="text-[10px] text-gray-400 font-medium">Leads</span>
                                                        </div>
                                                        <div className="w-px h-8 bg-gray-100" />
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-bold ${member.convertedCount > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                                                {member.assignedCount > 0 ? Math.round(((member.convertedCount || 0) / member.assignedCount) * 100) : 0}%
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-medium">Conv.</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        {member.lastActive ? formatDistanceToNow(new Date(member.lastActive), { addSuffix: true }) : 'Never active'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditingUser(member)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 className="w-5 h-5" /></button>
                                                        <button
                                                            onClick={() => handleDelete(member._id)}
                                                            disabled={deleteLoading === member._id || member._id === user?._id || member._id === user?.id}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-20"
                                                        >
                                                            {deleteLoading === member._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Edit Modal (Keeping it simple) */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <h3 className="font-bold text-gray-800">Edit Member Settings</h3>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-xl transition"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Full Name</label>
                                <input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Member Role</label>
                                <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium">
                                    <option value="sales">Sales Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
