import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, getSettings } from '../services/api';
import ProfileModal from './ProfileModal';
import { 
    LayoutDashboard, Users, Zap, History, Shield, 
    BarChart3, Settings, LogOut, Camera, ChevronRight,
    Layout, Globe, Lock, Info
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, user, onLogout }) => {
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [displayName, setDisplayName] = useState(user?.name || 'User');
    const [profilePic, setProfilePic] = useState(user?.profilePicture || '');
    const [uploading, setUploading] = useState(false);
    const [branding, setBranding] = useState({ companyName: '', companyLogo: '' });

    useEffect(() => {
        const fetchBranding = async () => {
             try {
                 const settings = await getSettings();
                 if (settings) {
                     setBranding({
                         companyName: settings.companyName,
                         companyLogo: settings.companyLogo
                     });
                 }
             } catch (error) {
                 console.error("Failed to load branding", error);
             }
        };
        fetchBranding();
    }, []);

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/leads', label: 'Leads CRM', icon: Users },
    ];

    // Default to admin if role is undefined (legacy support)
    const isAdmin = user?.role === 'admin' || !user?.role;

    if (isAdmin) {
        menuItems.push({ path: '/integrations', label: 'Integrations', icon: Globe });
        menuItems.push({ path: '/workflows', label: 'Automation Builder', icon: Zap });
        menuItems.push({ path: '/workflows/history', label: 'Execution Logs', icon: History });
        menuItems.push({ path: '/users', label: 'Team Management', icon: Shield });
        menuItems.push({ path: '/compliance', label: 'Compliance & GDPR', icon: Lock });
        menuItems.push({ path: '/intelligence', label: 'AI Intelligence', icon: BarChart3 });
        menuItems.push({ path: '/roi-optimizer', label: 'ROI Optimizer', icon: Layout });
        menuItems.push({ path: '/security', label: 'Security Center', icon: Shield });
        menuItems.push({ path: '/settings', label: 'Settings', icon: Settings });
    }

    const handleLogout = () => setShowLogoutConfirm(true);

    const handleProfileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large! Max size allowed is 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            setUploading(true);
            try {
                const res = await api.put('/auth/profile', { profilePicture: base64 });
                setProfilePic(res.data.profilePicture);
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...currentUser, profilePicture: res.data.profilePicture }));
            } catch (error) {
                console.error("Profile upload failed", error);
                alert("Failed to upload profile picture");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleProfileUpdate = (updatedUser) => setDisplayName(updatedUser.name);

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Logout Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 transform transition-all scale-100 animate-in fade-in zoom-in duration-200 border border-slate-100">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <LogOut className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Sign Out?</h3>
                        <p className="text-slate-500 text-center mb-8 font-medium">Are you sure you want to end your session?</p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 px-6 py-3 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    onLogout();
                                }}
                                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-all hover:-translate-y-1"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[90rem] max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 relative border border-slate-100">
                        
                        {/* Header */}
                        <div className="relative bg-slate-900 p-8 md:p-10 overflow-hidden shrink-0">
                            {/* Animated Background Blobs */}
                            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2 animate-pulse animation-delay-2000"></div>
                            
                            <button 
                                onClick={() => setShowInfoModal(false)}
                                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm z-20 group"
                            >
                                <LogOut className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                            </button>

                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
                                    Meta SaaS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Architecture</span>
                                </h2>
                                <p className="text-indigo-200 font-medium text-lg leading-relaxed max-w-4xl">
                                    A comprehensive breakdown of the modules powering your autonomous growth engine. 
                                    Discover how every component works in harmony to scale your business.
                                </p>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto custom-scrollbar bg-slate-50 flex-1 p-6 md:p-10">
                            
                            <div className="space-y-12">
                                
                                {/* 1. INTELLIGENCE & ANALYTICS */}
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                                            <BarChart3 className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Intelligence & Analytics</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Dashboard */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <LayoutDashboard className="w-5 h-5 text-indigo-500" /> Command Dashboard
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">The Cockpit</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Centralized real-time overview of business health.</li>
                                                <li><strong>Benefit:</strong> Instant visibility into key metrics like conversion rates and active leads.</li>
                                                <li><strong>How:</strong> Aggregates live data streams via Socket.ios to visualize KPIs instantly.</li>
                                            </ul>
                                        </div>

                                        {/* ROI Optimizer */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Layout className="w-5 h-5 text-emerald-500" /> ROI Optimizer
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Financial Engine</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Tracks campaign profitability and ad spend efficiency.</li>
                                                <li><strong>Benefit:</strong> Maximizes budget allocation by identifying high-performing channels.</li>
                                                <li><strong>How:</strong> Calculates CAC (Customer Acquisition Cost) vs LTV (Lifetime Value) dynamically.</li>
                                            </ul>
                                        </div>

                                        {/* AI Intelligence */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Zap className="w-5 h-5 text-purple-500" /> AI Intelligence
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Predictive Brain</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Machine Learning models that analyze lead behavior.</li>
                                                <li><strong>Benefit:</strong> Increases conversion by prioritizing leads most likely to buy (94% accuracy).</li>
                                                <li><strong>How:</strong> Scores leads (0-100) based on email interactions, site visits, and demographic fit.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. AUTOMATION & CONNECTIVITY */}
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-200">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Automation & Connectivity</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Automation Builder */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-amber-500" /> Workflow Builder
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Visual Editor</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> No-code, drag-and-drop interface for creating automation sequences.</li>
                                                <li><strong>Benefit:</strong> Rapidly deploy complex multi-stage campaigns without engineering.</li>
                                                <li><strong>How:</strong> Connect triggers (e.g., "Form Submitted") to actions (e.g., "Send SMS") with logic nodes.</li>
                                            </ul>
                                        </div>

                                        {/* Integrations */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-blue-500" /> Integration Hub
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Unified Gateway</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Central connector for third-party tools (Stripe, Twilio, SendGrid).</li>
                                                <li><strong>Benefit:</strong> Eliminates data silos and ensures seamless data flow across your stack.</li>
                                                <li><strong>How:</strong> Uses secure API keys and webhooks to sync data bi-directionally in real-time.</li>
                                            </ul>
                                        </div>

                                        {/* Execution Logs */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <History className="w-5 h-5 text-slate-500" /> Execution Logs
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Black Box</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Detailed history of every automated action taken by the system.</li>
                                                <li><strong>Benefit:</strong> Full transparency for debugging and performance auditing.</li>
                                                <li><strong>How:</strong> Records generic time-stamped entries for every trigger, step, and outcome (Success/Fail).</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. GOVERNANCE & OPERATIONS */}
                                <div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200">
                                            <Shield className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Governance & Operations</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Leads CRM */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-emerald-500" /> Leads CRM
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Database of Truth</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Centralized repository for all prospect data and interaction history.</li>
                                                <li><strong>Benefit:</strong> Provides a 360-degree view of every customer for personalized sales.</li>
                                                <li><strong>How:</strong> Aggregates data from forms, ads, and uploads into unified profiles.</li>
                                            </ul>
                                        </div>

                                        {/* Team Management */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-indigo-500" /> Team Management
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">RBAC System</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Role-Based Access Control to manage user permissions.</li>
                                                <li><strong>Benefit:</strong> Ensures secure scalability by limiting access based on roles (Admin, Sales).</li>
                                                <li><strong>How:</strong> Administrators create accounts and assign specific scope/privileges.</li>
                                            </ul>
                                        </div>

                                        {/* Compliance & GDPR */}
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                                <Lock className="w-5 h-5 text-rose-500" /> Compliance & GDPR
                                            </h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Legal Safety</p>
                                            <ul className="space-y-3 text-sm text-slate-600">
                                                <li><strong>What:</strong> Tools for data privacy, encryption, and regulatory adherence.</li>
                                                <li><strong>Benefit:</strong> Builds customer trust and protects against legal liabilities.</li>
                                                <li><strong>How:</strong> Features auto-redaction, "Right to be Forgotten" workflows, and audit trails.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 md:px-10 md:py-6 bg-white border-t border-slate-100 flex justify-end items-center shrink-0">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                            >
                                Close Overview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:relative md:translate-x-0 flex flex-col
            `}>
                {/* Logo */}
                <div className="h-24 flex items-center px-8 border-b border-slate-100/50">
                    <div className="flex items-center gap-3">
                        {branding.companyLogo ? (
                             <img src={branding.companyLogo} alt="Logo" className="w-10 h-10 object-contain" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Zap className="w-6 h-6 text-white fill-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 leading-tight flex items-center gap-2">
                                {branding.companyName || 'Meta SaaS'}
                                <button 
                                    onClick={() => setShowInfoModal(true)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    <Info className="w-4 h-4" />
                                </button>
                            </h1>
                            {(!branding.companyName || branding.companyName === 'Meta SaaS') && (
                                <span className="text-xs text-indigo-500 font-extrabold uppercase tracking-widest">Automation</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-1 custom-scrollbar">
                    <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Main Menu</div>
                    {menuItems.map((item, index) => {
                        // Section divider logic if needed, simplify for now
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 768 && toggleSidebar && toggleSidebar()}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                                        isActive 
                                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-200 translate-x-1' 
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'}`} strokeWidth={isActive ? 2.5 : 2} />
                                        <span className={`font-bold text-sm ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                                        {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-200" />}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setShowProfileModal(true)}>
                        <div className="flex items-center gap-3 p-2">
                            <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 ring-2 ring-white shadow-sm group-hover:ring-indigo-100 transition-all">
                                    {profilePic ? (
                                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-100">
                                            <Users className="w-5 h-5 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                
                                {/* Image Upload Overlay */}
                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl" onClick={(e) => e.stopPropagation()}>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleProfileUpload} disabled={uploading} />
                                    <Camera className="w-4 h-4 text-white" />
                                </label>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                                <p className="text-xs font-semibold text-slate-500 truncate capitalize">{user?.role || 'Administrator'}</p>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLogout();
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <ProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    user={{ ...user, name: displayName, profilePicture: profilePic }}
                    onUpdate={handleProfileUpdate}
                />
            </aside>
            </>
    );
};

export default Sidebar;

