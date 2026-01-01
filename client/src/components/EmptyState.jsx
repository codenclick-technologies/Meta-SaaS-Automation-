import React from 'react';
import { FileQuestion, Inbox, AlertCircle, Users } from 'lucide-react';

const icons = {
    inbox: Inbox,
    users: Users,
    alert: AlertCircle,
    default: FileQuestion
};

export default function EmptyState({
    icon = 'default',
    title,
    description,
    actionLabel,
    onAction,
    variant = 'default'
}) {
    const Icon = icons[icon] || icons.default;

    const variantStyles = {
        default: 'text-gray-400',
        primary: 'text-blue-400',
        warning: 'text-orange-400'
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
            <div className={`w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4`}>
                <Icon className={`w-10 h-10 ${variantStyles[variant]}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-500 text-center max-w-md mb-6">{description}</p>
            )}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="btn-gradient px-6 py-2.5 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
