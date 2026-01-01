import React from 'react';

const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
        <td className="px-4 py-3">
            <div className="h-3 bg-gray-200 rounded w-full mb-1.5"></div>
            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
        <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded-full w-24"></div></td>
        <td className="px-4 py-3 text-center"><div className="h-4 w-8 bg-gray-200 rounded mx-auto"></div></td>
        <td className="px-4 py-3"><div className="h-6 bg-gray-200 rounded-lg w-full"></div></td>
        <td className="px-4 py-3 text-center"><div className="h-5 w-16 bg-gray-200 rounded-full mx-auto"></div></td>
        <td className="px-4 py-3 text-center"><div className="h-5 w-16 bg-gray-200 rounded-full mx-auto"></div></td>
        <td className="px-4 py-3"><div className="h-4 w-12 bg-gray-200 rounded"></div></td>
    </tr>
);

export const TableSkeleton = ({ rows = 5 }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
        </>
    );
};