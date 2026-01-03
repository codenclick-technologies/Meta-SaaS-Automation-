import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Brain, Star, TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LeadIntelligenceFeed() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentAnalyzedLeads();
        // Socket listeners would go here for real-time updates
    }, []);

    const fetchRecentAnalyzedLeads = async () => {
        try {
            const { data } = await api.get('/leads', { limit: 5 });
            setLeads(data.leads || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getIntentColor = (intent) => {
        switch (intent) {
            case 'high_intent': return 'bg-green-100 text-green-700 border-green-200';
            case 'medium_intent': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-3xl border shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 rounded-xl shadow-lg shadow-purple-200">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">AI Intelligence Feed</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Real-time Intent Analysis</p>
                    </div>
                </div>
                <button className="p-2 hover:bg-white rounded-lg transition"><MoreHorizontal className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />)
                ) : (
                    <AnimatePresence>
                        {leads.map((lead, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={lead._id}
                                className="p-4 rounded-2xl border bg-white hover:border-purple-300 transition group"
                            >
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                            {lead.profilePicture ? <img src={lead.profilePicture} alt="" /> : <User className="w-6 h-6 text-gray-400" />}
                                        </div>
                                        {lead.aiAnalysis?.score >= 80 && (
                                            <div className="absolute -top-1 -right-1 bg-yellow-400 p-1 rounded-full border-2 border-white shadow-sm">
                                                <Star className="w-2.5 h-2.5 text-white fill-current" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h4 className="font-bold text-gray-900 truncate">{lead.name}</h4>
                                                {lead.country && (
                                                    <span className="text-xs grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100" title={lead.country}>
                                                        {String.fromCodePoint(...lead.country.split('').map(c => c.charCodeAt(0) + 127397))}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getIntentColor(lead.aiAnalysis?.intent)}`}>
                                                {lead.aiAnalysis?.score || lead.score || 0}% Match
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-1 italic">
                                            "{lead.aiAnalysis?.summary || 'Analyzing lead intent...'}"
                                        </p>
                                        
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" /> {lead.aiAnalysis?.sentiment || 'Neutral'}
                                                </span>
                                            </div>
                                            <button className="text-[10px] font-bold text-gray-400 group-hover:text-purple-600 transition flex items-center gap-1">
                                                Take Action <MoreHorizontal className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <div className="p-4 bg-purple-50 border-t">
                <button className="w-full py-2 text-xs font-bold text-purple-700 hover:text-purple-900 transition flex items-center justify-center gap-2">
                    View Comprehensive Analysis <Brain className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
