import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#6B7280'];

const StatusChart = ({ filters }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const params = {};
                if (filters?.dateFrom) params.startDate = filters.dateFrom;
                if (filters?.dateTo) params.endDate = filters.dateTo;

                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/analytics/status-distribution`, {
                    headers: { 'x-auth-token': token },
                    params
                });
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch status data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [filters]);

    if (loading) return <div className="h-64 flex items-center justify-center text-gray-400">Loading Chart...</div>;
    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Lead Status Distribution</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default StatusChart;