import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Globe, TrendingUp, Users, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const countryNames = {
    'US': 'United States',
    'IN': 'India',
    'GB': 'United Kingdom',
    'AE': 'UAE',
    'DE': 'Germany',
    'FR': 'France',
    'ES': 'Spain',
    'SG': 'Singapore'
};

export default function RegionalRevenueChart() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRegionalStats();
    }, []);

    const fetchRegionalStats = async () => {
        try {
            const { data } = await api.get('/analytics/regional-revenue');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch regional stats', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="h-64 flex items-center justify-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="w-6 h-6 text-blue-600" />
                        Global Distribution
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">Regional performance & lead density</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-2xl">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Active Regions: {stats.length}</span>
                </div>
            </div>

            <div className="space-y-6">
                {stats.length === 0 && (
                    <div className="text-center py-12 opacity-50 italic">No regional data tracked yet.</div>
                )}
                {stats.map((region, index) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={region.country} 
                        className="group"
                    >
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                    <span className="text-lg">{String.fromCodePoint(...(region.country || 'US').split('').map(c => c.charCodeAt(0) + 127397))}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{countryNames[region.country] || region.country}</h4>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                        <span className="flex items-center gap-1 uppercase tracking-tight"><Users className="w-3 h-3" /> {region.leadCount} Leads</span>
                                        <span className="flex items-center gap-1 uppercase tracking-tight"><TrendingUp className="w-3 h-3" /> {Math.round(region.conversionRate)}% Conv.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-gray-900 flex items-center gap-1">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    {region.totalRevenue?.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(region.leadCount / stats[0].leadCount) * 100}%` }}
                                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Highest Conversion</p>
                    <p className="text-lg font-black text-gray-900">
                        {stats.length > 0 ? (countryNames[stats.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b).country] || stats[0].country) : 'N/A'}
                    </p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Top Market</p>
                    <p className="text-lg font-black text-gray-900">
                        {stats.length > 0 ? (countryNames[stats[0].country] || stats[0].country) : 'N/A'}
                    </p>
                </div>
            </div>
        </div>
    );
}
