import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import io from 'socket.io-client';

const NotificationToast = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Connect to the backend socket
        // Ensure VITE_API_URL is set in your .env, or fallback to localhost
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000');

        socket.on('admin_notification', (data) => {
            // Only show critical alerts like Opt-outs
            if (data.type === 'critical') {
                const id = Date.now();
                setNotifications(prev => [...prev, { ...data, id }]);

                // Auto-dismiss after 7 seconds
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, 7000);
            }
        });

        return () => {
            socket.off('admin_notification');
            socket.disconnect();
        };
    }, []);

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className="pointer-events-auto bg-white border-l-4 border-red-500 shadow-xl rounded-r-lg p-4 flex items-start gap-3 max-w-sm animate-in slide-in-from-right duration-300"
                >
                    <div className="bg-red-100 p-2 rounded-full shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;