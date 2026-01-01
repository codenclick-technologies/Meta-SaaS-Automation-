import React from 'react';

export default function LoadingSpinner({ size = 'md', variant = 'primary' }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const variantClasses = {
        primary: 'border-blue-600',
        white: 'border-white',
        gray: 'border-gray-600'
    };

    return (
        <div className={`${sizeClasses[size]} border-4 ${variantClasses[variant]} border-t-transparent rounded-full animate-spin`}></div>
    );
}

export function FullPageLoader() {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
                <LoadingSpinner size="xl" />
                <p className="mt-4 text-gray-600 font-medium">Loading...</p>
            </div>
        </div>
    );
}

export function InlineLoader({ text = 'Loading...' }) {
    return (
        <div className="flex items-center justify-center gap-3 py-8">
            <LoadingSpinner size="md" />
            <span className="text-gray-600">{text}</span>
        </div>
    );
}
