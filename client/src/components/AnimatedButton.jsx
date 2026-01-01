import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function AnimatedButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    className = '',
    ...props
}) {
    const [ripples, setRipples] = useState([]);

    const handleClick = (e) => {
        if (loading || disabled) return;

        // Create ripple effect
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
            x,
            y,
            id: Date.now()
        };

        setRipples([...ripples, newRipple]);

        setTimeout(() => {
            setRipples(ripples => ripples.filter(r => r.id !== newRipple.id));
        }, 600);

        onClick?.(e);
    };

    const variantClasses = {
        primary: 'btn-gradient text-white shadow-md hover:shadow-lg',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
        success: 'bg-green-500 text-white hover:bg-green-600 shadow-md',
        danger: 'bg-red-500 text-white hover:bg-red-600 shadow-md',
        ghost: 'text-gray-700 hover:bg-gray-100'
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            className={`
                relative overflow-hidden inline-flex items-center justify-center gap-2
                rounded-lg font-medium transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
            {...props}
        >
            {/* Ripple Effects */}
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="absolute w-2 h-2 bg-white/30 rounded-full pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        animation: 'ripple 0.6s ease-out'
                    }}
                />
            ))}

            {/* Loading Spinner */}
            {loading && (
                <LoadingSpinner size="sm" variant={variant === 'primary' ? 'white' : 'primary'} />
            )}

            {/* Icon */}
            {!loading && Icon && <Icon className="w-4 h-4" />}

            {/* Content */}
            {children}
        </button>
    );
}
