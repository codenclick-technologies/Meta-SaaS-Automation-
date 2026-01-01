import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
    History, CheckCircle2, XCircle, AlertCircle, Clock, 
    ArrowRight, ChevronRight, Search, Filter, RefreshCcw, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkflowExecutionLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [filters, setFilters] = useState({ status: '', workflowId: '' });

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/workflows/logs', { params: filters });
            setLogs(data.logs);
        } catch (error) {
            console.error('Fetch logs error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'partial': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            default: return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[#F8FAFC]">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <History className="w-6 h-6 text-blue-600" /> Execution History
                    </h1>
                    <p className="text-gray-500">Audit trail for all automated lead lifecycles</p>
                </div>
                <button 
                    onClick={fetchLogs}
                    className="p-2 hover:bg-white rounded-lg transition border border-transparent hover:border-gray-200"
                >
                    <RefreshCcw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Logs List */}
                <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
                    {loading && logs.length === 0 ? (
                        [1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
                    ) : (
                        logs.map(log => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={log._id}
                                onClick={() => setSelectedLog(log)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                    selectedLog?._id === log._id 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                    : 'bg-white hover:border-blue-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold truncate max-w-[150px]">{log.workflowId?.name || 'Unknown Workflow'}</h3>
                                    {getStatusIcon(log.status)}
                                </div>
                                <div className={`text-xs flex items-center gap-2 mb-3 ${selectedLog?._id === log._id ? 'text-blue-100' : 'text-gray-400'}`}>
                                    <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                    selectedLog?._id === log._id ? 'bg-blue-500/50 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    ID: ...{log._id.slice(-6)}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Log Detail View */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {selectedLog ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                key={selectedLog._id}
                                className="bg-white rounded-3xl border shadow-sm p-8"
                            >
                                <div className="flex justify-between items-start border-b pb-6 mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-bold text-gray-900">{selectedLog.workflowId?.name}</h2>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                                                selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {selectedLog.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm">Target Lead: <span className="text-blue-600 font-medium">{selectedLog.leadId?.name || 'Unknown'}</span> ({selectedLog.leadId?.email || 'No email'})</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Duration</p>
                                        <p className="text-lg font-bold text-gray-900">{selectedLog.totalDurationMs}ms</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Execution Timeline</h4>
                                    {selectedLog.steps.map((step, idx) => (
                                        <div key={idx} className="flex gap-4 group">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${
                                                    step.status === 'completed' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                                                }`}>
                                                    {step.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                                </div>
                                                {idx !== selectedLog.steps.length - 1 && <div className="w-0.5 h-full bg-gray-100 my-1" />}
                                            </div>
                                            <div className="flex-1 pb-8">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h5 className="font-bold text-gray-800">{step.nodeName || step.nodeId}</h5>
                                                    <span className="text-[10px] text-gray-400">{new Date(step.startTime).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2 capitalize">{step.nodeType} node via {step.status}</p>
                                                
                                                {step.error && (
                                                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-red-600 text-xs font-medium">
                                                        Error: {step.error}
                                                    </div>
                                                )}
                                                
                                                {step.output && typeof step.output === 'object' && (
                                                    <div className="bg-gray-50 p-3 rounded-xl text-[10px] font-mono text-gray-600 overflow-x-auto">
                                                        Output: {JSON.stringify(step.output, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-gray-50 border-2 border-dashed rounded-3xl opacity-50">
                                <History className="w-12 h-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-400">Select an execution to see details</h3>
                                <p className="text-sm max-w-[200px]">Click on any log entry from the left to inspect the step-by-step logic execution</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
