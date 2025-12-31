import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const LeadChart = ({ filters }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const params = {};
                if (filters?.dateFrom) params.startDate = filters.dateFrom;
                if (filters?.dateTo) params.endDate = filters.dateTo;

                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/analytics/daily-leads`, {
                    headers: { 'x-auth-token': token },
                    params
                });
                // Format date for display (e.g., "Oct 24")
                const formattedData = res.data.map(item => ({
                    ...item,
                    displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }));
                setData(formattedData);
            } catch (err) {
                console.error("Failed to fetch chart data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filters]);

    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading Chart...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Lead Acquisition</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="displayDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="leads"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorLeads)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LeadChart;