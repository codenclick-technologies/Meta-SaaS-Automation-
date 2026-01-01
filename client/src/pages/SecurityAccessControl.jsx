import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    Shield, Key, ClipboardList, UserCheck, 
    Lock, Eye, AlertTriangle, CheckCircle, 
    UserPlus, ShieldAlert, Fingerprint, Globe, ShieldCheck, Database, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

import { BiometricService } from '../services/biometricService';
import CredentialVault from '../components/CredentialVault';

export default function SecurityAccessControl() {
    const [activeTab, setActiveTab] = useState('audit');
    const [logs, setLogs] = useState([]);
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bioEnrollLoading, setBioEnrollLoading] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [reportingLoading, setReportingLoading] = useState(false);
    const [branding, setBranding] = useState({
        companyName: '',
        primaryColor: '#6366f1',
        whiteLabelActive: false
    });

    const handleSaveBranding = async (e) => {
        e.preventDefault();
        try {
            await api.post('/branding', branding);
            alert('Branding settings updated! Refresh to see changes.');
        } catch (error) {
            console.error('Branding save error:', error);
            alert('Could not save branding settings.');
        }
    };

    const handleDownloadReport = async () => {
        setReportingLoading(true);
        try {
            const response = await api.get('/security/reports/security', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `security-report-${new Date().toLocaleDateString()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Report error:', error);
            alert('Could not generate PDF report at this time.');
        } finally {
            setReportingLoading(false);
        }
    };

    const handleEnrollBiometric = async () => {
        setBioEnrollLoading(true);
        try {
            await BiometricService.register();
            alert('Fingerprint registered successfully! You can now login with your biometric device.');
        } catch (error) {
            console.error('Enrollment error:', error);
            alert('Could not register biometric device. Make sure your browser supports it and you have a scanner.');
        } finally {
            setBioEnrollLoading(false);
        }
    };

    const handleRunBackup = async () => {
        setBackupLoading(true);
        try {
            const { data } = await api.post('/security/backup/now');
            alert(`Backup successful! Saved locally as a snapshot: ${data.path}`);
        } catch (error) {
            console.error('Backup error:', error);
            alert('Automatic backup cycle is already running or failed. Check logs.');
        } finally {
            setBackupLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurityData();
    }, [activeTab]);

    const fetchSecurityData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'audit') {
                const { data } = await api.get('/security/audit-logs');
                setLogs(data);
            } else if (activeTab === 'governance') {
                const { data } = await api.get('/security/roles');
                setRoles(data);
            } else if (activeTab === 'white-label') {
                const { data } = await api.get('/branding');
                setBranding(data);
            } else if (activeTab === 'heatmap') {
                const { data } = await api.get('/security/audit-logs');
                // Only show successful logins for the map
                setLogs(data.filter(l => l.action === 'USER_LOGIN' && l.location));
            } else {
                const { data } = await api.get('/security/api-keys');
                setApiKeys(data);
            }
        } catch (err) {
            console.error('Security fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFBFF] p-10 font-inter">
            <header className="mb-12">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Security Hub</h1>
                        <p className="text-slate-500 font-medium">Access Control, Identity Management & Audit Logs</p>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50 overflow-x-auto whitespace-nowrap">
                    <button 
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ClipboardList className="w-5 h-5" /> Audit Trails
                    </button>
                    <button 
                        onClick={() => setActiveTab('keys')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'keys' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Key className="w-5 h-5" /> API Management
                    </button>
                    <button 
                        onClick={() => setActiveTab('biometrics')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'biometrics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Fingerprint className="w-5 h-5" /> Identity & Biometrics
                    </button>
                    <button 
                        onClick={() => setActiveTab('white-label')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'white-label' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Globe className="w-5 h-5" /> White-label Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('vault')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'vault' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Lock className="w-5 h-5" /> Secret Vault
                    </button>
                    <button 
                        onClick={() => setActiveTab('backup')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'backup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ShieldCheck className="w-5 h-5" /> Disaster Recovery
                    </button>
                    <button 
                        onClick={() => setActiveTab('governance')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'governance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <UserCheck className="w-5 h-5" /> Governance & Roles
                    </button>
                    <button 
                        onClick={() => setActiveTab('heatmap')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'heatmap' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Globe className="w-5 h-5 text-rose-500" /> Threat Radar
                    </button>
                    <button 
                        onClick={() => setActiveTab('branding')}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shrink-0 ${activeTab === 'branding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Eye className="w-5 h-5" /> Branding Control
                    </button>
                </div>

                <div className="p-10">
                    {activeTab === 'vault' && (
                        <CredentialVault />
                    )}

                    {activeTab === 'audit' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Live Activity Tracking</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> System Secured
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5">Actor / User</th>
                                            <th className="px-8 py-5">Action</th>
                                            <th className="px-8 py-5">Resource</th>
                                            <th className="px-8 py-5">IP Address</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {logs.map((log, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 text-sm font-bold text-slate-700">{log.userId?.name || 'System'}</td>
                                                <td className="px-8 py-5 text-sm">
                                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-black text-[10px] uppercase">
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-sm text-slate-500 font-medium truncate max-w-[150px]">{log.resource}</td>
                                                <td className="px-8 py-5 text-sm text-slate-400 font-mono tracking-tighter">{log.ipAddress}</td>
                                                <td className="px-8 py-5">
                                                    {log.status === 'success' ? (
                                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                    ) : (
                                                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-sm text-slate-400 font-medium">{new Date(log.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'keys' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">External System Credentials</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Managed API Access Control</p>
                                </div>
                                <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-xl shadow-slate-200">
                                    <UserPlus className="w-4 h-4" /> Issue New Key
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {apiKeys.map((key, i) => (
                                    <div key={i} className="p-8 border-2 border-slate-50 rounded-[2rem] hover:border-indigo-100 transition relative group bg-slate-50/20">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm">
                                                <Fingerprint className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase px-3 py-1 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-50">
                                                {key.role}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-slate-800 text-lg mb-2">{key.name}</h4>
                                        <div className="bg-slate-100/50 p-4 rounded-2xl mb-6 font-mono text-sm text-slate-500 flex justify-between items-center border border-slate-100">
                                            {key.displayKey}
                                            <Lock className="w-4 h-4 opacity-30" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Created {new Date(key.createdAt).toLocaleDateString()}
                                            </span>
                                            <button className="text-[10px] font-black text-rose-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                Revoke Access
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {apiKeys.length === 0 && (
                                    <div className="col-span-2 py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                                        <p className="text-slate-400 font-bold">No active API keys found for this organization.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'biometrics' && (
                        <div className="max-w-2xl mx-auto py-10 text-center">
                            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                                <Fingerprint className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Next-Gen Biometric Security</h3>
                            <p className="text-slate-500 font-medium mb-12 leading-relaxed">
                                Activate hardware-level biometric authentication to secure your account using your device's fingerprint or face scanner. This provides protection even if your password is compromised.
                            </p>

                            <div className="bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-10 relative overflow-hidden group">
                                <div className="relative z-10 text-left">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-white rounded-xl shadow-sm">
                                            <Shield className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <h4 className="font-black text-slate-800">Hardware Fingerprint Active</h4>
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium mb-8">
                                        Once activated, you can login instantly without a password. Your biometric data never leaves your device and is not stored on our servers.
                                    </p>
                                    <button 
                                        onClick={handleEnrollBiometric}
                                        disabled={bioEnrollLoading}
                                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {bioEnrollLoading ? 'Initializing Hardware...' : 'Sync Fingerprint Scanner'}
                                        {!bioEnrollLoading && <CheckCircle className="w-5 h-5" />}
                                    </button>
                                </div>
                                <Fingerprint className="absolute -bottom-10 -right-10 w-48 h-48 text-indigo-600/5 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="max-w-4xl mx-auto py-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative group">
                                    <div className="relative z-10">
                                        <div className="p-3 bg-white/10 rounded-xl w-fit mb-6">
                                            <Database className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Automated Cloud Backups</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-8">Full database snapshots are captured every 24 hours and stored in an encrypted cloud vault for disaster recovery.</p>
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                            <CheckCircle className="w-4 h-4" /> System Resilient
                                        </div>
                                    </div>
                                    <ShieldCheck className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 transition-all duration-700" />
                                </div>

                                <div className="p-8 border-2 border-slate-100 rounded-[2.5rem] bg-white group">
                                    <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6">
                                        <AlertTriangle className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Manual Snapshot</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-8">Perform an immediate backup of the entire system state. Use this before major configuration changes or updates.</p>
                                    <button 
                                        onClick={handleRunBackup}
                                        disabled={backupLoading}
                                        className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-900 transition flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {backupLoading ? 'Backing up Database...' : 'Run Backup Now'}
                                        {!backupLoading && <Database className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[2rem] p-8">
                                <h4 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                                    <ShieldAlert className="w-5 h-5 text-rose-500" /> Disaster Recovery Protocols
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { title: 'Point-in-Time Recovery', desc: 'Roll back the entire system to any state within the last 7 days.' },
                                        { title: 'Encrypted Off-site Storage', desc: 'All backups are encrypted using AES-256 before cloud transmission.' },
                                        { title: 'Security Alert Engine', desc: 'Real-time notifications for every login attempt and critical system change.' }
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                                                <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'governance' && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] text-white relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black mb-4 tracking-tight">Enterprise Compliance Report</h3>
                                        <p className="text-indigo-100 mb-8 max-w-xs leading-relaxed">Generate a comprehensive PDF audit of all security events, logins, and backup cycles for compliance officers.</p>
                                        <button 
                                            onClick={handleDownloadReport}
                                            disabled={reportingLoading}
                                            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-50 transition flex items-center gap-3 disabled:opacity-50"
                                        >
                                            {reportingLoading ? 'Generating PDF...' : 'Download Security Audit'}
                                            <ClipboardList className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <Shield className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                                </div>

                                <div className="p-10 border-2 border-slate-50 bg-slate-50/30 rounded-[3rem] flex flex-col justify-center">
                                    <h4 className="text-slate-800 font-black text-xl mb-2">Access Hierarchy Summary</h4>
                                    <p className="text-slate-500 text-sm mb-6">You have 4 base system roles and <b>{roles.length} custom roles</b> active in this organization.</p>
                                    <div className="flex -space-x-3 mb-8">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="w-12 h-12 rounded-2xl bg-white border-4 border-slate-50 shadow-sm flex items-center justify-center font-black text-indigo-600">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-slate-50 shadow-sm flex items-center justify-center font-black text-white text-xs">
                                            +{roles.length}
                                        </div>
                                    </div>
                                    <button className="text-indigo-600 font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                                        View Full Organization Chart <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xl font-black text-slate-800 tracking-tight">Custom Employee Roles</h4>
                                    <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 text-sm">
                                        <UserPlus className="w-4 h-4" /> Define New Role
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {roles.map((role, i) => (
                                        <div key={i} className="bg-white p-8 border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow relative group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: role.color }} />
                                                <span className="text-[10px] font-black uppercase text-slate-400">Custom Role</span>
                                            </div>
                                            <h5 className="font-black text-slate-800 text-lg mb-2">{role.name}</h5>
                                            <p className="text-xs text-slate-500 mb-6 leading-relaxed line-clamp-2">{role.description}</p>
                                            
                                            <div className="flex flex-wrap gap-2 mb-8">
                                                {role.permissions?.slice(0, 3).map((p, idx) => (
                                                    <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-bold text-[9px] uppercase">
                                                        {p.resource}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-400">0 Active Members</span>
                                                <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                                    <Lock className="w-4 h-4 text-slate-300" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {roles.length === 0 && (
                                        <div className="col-span-3 py-16 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                                            <p className="text-slate-400 font-bold">No custom roles defined. Admins currently use system defaults.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'heatmap' && (
                        <div className="space-y-10">
                            <div className="p-10 bg-slate-900 rounded-[3rem] text-white overflow-hidden relative group border-[6px] border-slate-800">
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-12">
                                        <div>
                                            <h3 className="text-3xl font-black mb-2 tracking-tight">Global Access Radar</h3>
                                            <p className="text-slate-400 font-medium">Visualizing real-time login attempts and physical terminal locations.</p>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black border border-emerald-500/20 animate-pulse">
                                            LIVE MONITORING ACTIVE
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="md:col-span-2 aspect-video bg-slate-800/50 rounded-[2rem] border border-slate-700/50 flex items-center justify-center relative overflow-hidden">
                                            {/* Mock Map Representation */}
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                            <Globe className="w-64 h-64 text-slate-700/50 absolute" />
                                            
                                            {logs.slice(0, 5).map((log, i) => (
                                                <motion.div 
                                                    key={i}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                                                    className="absolute w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                                    style={{ 
                                                        left: `${30 + (i * 15)}%`, 
                                                        top: `${40 + (i * 10)}%` 
                                                    }}
                                                >
                                                    <div className="absolute -top-12 -left-1/2 bg-slate-800 border border-slate-700 p-2 rounded-lg text-[10px] whitespace-nowrap">
                                                        {log.location?.city}, {log.location?.country}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Latest Terminals</h4>
                                            {logs.slice(0, 4).map((log, i) => (
                                                <div key={i} className="p-4 bg-slate-800/30 border border-slate-700/30 rounded-2xl flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                                        <Globe className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm truncate">{log.location?.city}, {log.location?.country} </p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{log.ipAddress}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {logs.length === 0 && <p className="text-slate-600 text-xs italic">No geo-data available for recent sessions.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'white-label' && (
                        <div className="max-w-4xl mx-auto space-y-10">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Branding & Experience</h3>
                                    <p className="text-slate-500 font-medium">Customize the platform identity to match your organization's brand guidelines.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className={`px-4 py-2 rounded-full text-xs font-black ${branding.whiteLabelActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {branding.whiteLabelActive ? 'WHITE-LABEL ACTIVE' : 'SYSTEM DEFAULTS'}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-sm font-black text-slate-700">Display Name</label>
                                        <input 
                                            type="text"
                                            value={branding.companyName}
                                            onChange={(e) => setBranding({...branding, companyName: e.target.value})}
                                            className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold"
                                            placeholder="e.g. Acme Corp Automation"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-sm font-black text-slate-700">Primary Theme Color</label>
                                        <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                            <input 
                                                type="color"
                                                value={branding.primaryColor}
                                                onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                                                className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                                            />
                                            <span className="font-mono font-bold text-slate-600">{branding.primaryColor}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-[2rem] border-2 border-indigo-100">
                                        <input 
                                            type="checkbox"
                                            checked={branding.whiteLabelActive}
                                            onChange={(e) => setBranding({...branding, whiteLabelActive: e.target.checked})}
                                            className="w-6 h-6 rounded-lg"
                                        />
                                        <div>
                                            <p className="font-black text-indigo-900 text-sm">Enable White-label Engine</p>
                                            <p className="text-indigo-600 text-xs">Remove all Meta-SaaS branding from the dashboard and login pages.</p>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black hover:bg-slate-800 transition shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3"
                                    >
                                        Save Brand Configuration
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    <div className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem]">
                                        <div className="flex justify-between items-start mb-6">
                                            <h4 className="text-lg font-black text-slate-800">Custom Domain Mapping</h4>
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${branding.mappingStatus === 'verified' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {branding.mappingStatus || 'PENDING'}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4 mb-8">
                                            <input 
                                                type="text"
                                                value={branding.customDomain}
                                                onChange={(e) => setBranding({...branding, customDomain: e.target.value})}
                                                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                                                placeholder="app.yourcompany.com"
                                            />
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">DNS CONFIGURATION</p>
                                                <p className="text-[11px] text-slate-600">Type: <b>CNAME</b> | Target: <b>proxy.metasaas.com</b></p>
                                                <p className="text-[11px] text-slate-600">Type: <b>A</b> | Target: <b>159.203.187.120</b></p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                try {
                                                    const { data } = await api.post('/branding/verify-domain');
                                                    alert(data.message);
                                                    setBranding({...branding, mappingStatus: data.status, dnsVerified: data.success});
                                                } catch (err) {
                                                    alert('Verification failed. Check console.');
                                                }
                                            }}
                                            className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-2"
                                        >
                                            Verify DNS Mapping <Globe className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-sm font-black text-slate-700">Preview (Live)</label>
                                        <div className="bg-white border-4 border-slate-100 rounded-[3rem] p-10 shadow-inner overflow-hidden relative">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: branding.primaryColor }} />
                                                <h4 className="font-black text-slate-800">{branding.companyName || 'Meta-SaaS'}</h4>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="h-4 w-3/4 bg-slate-50 rounded-full" />
                                                <div className="h-4 w-1/2 bg-slate-50 rounded-full" />
                                                <div className="h-20 w-full bg-slate-50 rounded-[1.5rem] mt-6" />
                                                <div className="h-12 w-full rounded-2xl mt-4" style={{ backgroundColor: branding.primaryColor, opacity: 0.1 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
