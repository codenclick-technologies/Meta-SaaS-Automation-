import React, { useState, useEffect } from 'react';
import { getCampaigns, syncCampaigns } from '../services/api';
import { RefreshCw, Megaphone, CheckCircle, PauseCircle, AlertCircle, Loader2, DollarSign, TrendingUp, Users, Target, BarChart2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    // Get user from local storage
    let user = {};
    try {
        const userData = localStorage.getItem('user');
        user = userData ? JSON.parse(userData) : {};
    } catch (e) {
        console.error('Failed to parse user data', e);
    }

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncCampaigns();
            await fetchData();
            alert('Campaigns synced successfully from Facebook!');
        } catch (error) {
            alert('Failed to sync. Check your Meta connection in Settings.');
        } finally {
            setSyncing(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'ACTIVE': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'PAUSED': return <PauseCircle className="w-5 h-5 text-yellow-500" />;
            default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
        }
    };

    const CampaignStatCard = ({ campaign }) => {
        const roi = campaign.roi || 0;
        const roiColor = roi >= 0 ? 'text-green-600' : 'text-red-500';
        const roiBg = roi >= 0 ? 'bg-green-50' : 'bg-red-50';

        return (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        {getStatusIcon(campaign.status)}
                        <span className={`text-xs font-bold ${campaign.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-500'}`}>{campaign.status}</span>
                    </div>
                    <button onClick={() => navigate(`/leads?campaignId=${campaign.campaignId}`)} className="text-blue-600 hover:text-blue-800 text-xs font-bold hover:underline">
                        View Leads
                    </button>
                </div>
                <h3 className="font-bold text-gray-900 truncate mb-1">{campaign.name}</h3>
                <p className="text-xs text-gray-400 mb-4 capitalize">{campaign.objective?.replace(/_/g, ' ')}</p>

                <div className="grid grid-cols-2 gap-4 text-sm mt-auto">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Spend</p>
                        <p className="font-bold text-lg">${(campaign.totalSpend || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold flex items-center gap-1"><Users className="w-3 h-3" /> Leads</p>
                        <p className="font-bold text-lg">{campaign.leadCount || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 font-bold flex items-center gap-1"><Target className="w-3 h-3" /> CPL</p>
                        <p className="font-bold text-lg">${(campaign.cpl || 0).toFixed(2)}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${roiBg}`}>
                        <p className={`text-xs font-bold flex items-center gap-1 ${roiColor}`}>
                            <TrendingUp className="w-3 h-3" /> ROI
                        </p>
                        <p className={`font-bold text-lg ${roiColor}`}>{Math.round(roi)}%</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} onLogout={() => { localStorage.removeItem('token'); navigate('/login'); }} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-xl">
                            <Megaphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Campaign Manager</h1>
                            <p className="text-xs text-gray-500">Real-time Meta Ads Synchronization</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync from Facebook'}
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-20 text-center text-gray-400">No campaigns found. Click "Sync" to fetch from Facebook.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {campaigns.map(camp => (
                                <CampaignStatCard key={camp.campaignId} campaign={camp} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}