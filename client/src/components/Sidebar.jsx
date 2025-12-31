import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProfileModal from './ProfileModal';

const Sidebar = ({ isOpen, toggleSidebar, user, onLogout }) => {
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [displayName, setDisplayName] = useState(user?.name || 'User');
    const [profilePic, setProfilePic] = useState(user?.profilePicture || '');
    const [uploading, setUploading] = useState(false);

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { path: '/leads', label: 'Leads', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ];

    // Default to admin if role is undefined (legacy support)
    const isAdmin = user?.role === 'admin' || !user?.role;

    if (isAdmin) {
        menuItems.push({ path: '/users', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' });
        menuItems.push({ path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' });
    }

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleProfileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large! Max size allowed is 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            setUploading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/profile`,
                    { profilePicture: base64 },
                    { headers: { 'x-auth-token': token } }
                );

                setProfilePic(res.data.profilePicture);
                // Update local storage so it persists on refresh
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...currentUser, profilePicture: res.data.profilePicture }));
            } catch (error) {
                console.error("Profile upload failed", error);
                alert("Failed to upload profile picture");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleProfileUpdate = (updatedUser) => {
        setDisplayName(updatedUser.name);
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
                        <p className="text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    onLogout();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="flex flex-col h-full">
                    {/* Logo Area */}
                    <div className="flex items-center justify-center h-16 border-b border-gray-100 bg-blue-600 text-white shadow-sm">
                        <span className="text-xl font-bold tracking-tight">Meta Automation</span>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => {
                                    // Auto close on mobile/if toggle prop implies it
                                    if (window.innerWidth < 768 && toggleSidebar) toggleSidebar();
                                }}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-blue-50 text-blue-600 shadow-sm font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                    }`
                                }
                            >
                                <svg className={`w-5 h-5 mr-3 transition-colors ${
                                    // Use isActive logic if possible, but NavLink handles it. 
                                    // We can just rely on CSS group-hover from parent
                                    'group-hover:text-blue-600'
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon}></path>
                                </svg>
                                {item.label}
                            </NavLink>
                        ))}

                        {/* Quick Action Button for Admin */}
                        {isAdmin && (
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <button
                                    onClick={() => navigate('/users')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    Create User
                                </button>
                            </div>
                        )}
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center p-3 mb-3 bg-gray-50 rounded-lg">
                            <div className="relative group shrink-0 cursor-pointer" title="Change Profile Picture">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
                                    {profilePic ? (
                                        <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all cursor-pointer">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleProfileUpload}
                                        disabled={uploading}
                                    />
                                    <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </label>
                            </div>
                            <div
                                className="ml-3 overflow-hidden cursor-pointer group"
                                onClick={() => setShowProfileModal(true)}
                                title="Edit Profile"
                            >
                                <p className="text-sm font-medium text-gray-700 truncate group-hover:text-blue-600 transition-colors">{displayName}</p>
                                <p className="text-xs text-gray-500 capitalize truncate">{user?.role || 'Member'}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 transition-colors bg-red-50 rounded-lg hover:bg-red-100"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>

                <ProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    user={{ ...user, name: displayName, profilePicture: profilePic }}
                    onUpdate={handleProfileUpdate}
                />
            </div>
        </>
    );
};

export default Sidebar;
