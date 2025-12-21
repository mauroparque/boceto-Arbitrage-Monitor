import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavIcon = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div className="flex flex-col items-center gap-1">
        {children}
        <span className="text-xs">{label}</span>
    </div>
);

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/', icon: '📊', label: 'Dashboard' },
        { to: '/calendar', icon: '📅', label: 'Calendario' },
        { to: '/bookings', icon: '📋', label: 'Reservas' },
        { to: '/finances', icon: '💰', label: 'Finanzas' },
        { to: '/rates', icon: '📈', label: 'TCs' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
            {/* Header */}
            <header className="bg-stone-800/50 backdrop-blur-xl border-b border-stone-700/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-semibold text-white hidden sm:block">Property Manager</h1>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-stone-700 text-white'
                                        : 'text-stone-400 hover:text-white hover:bg-stone-700/50'
                                    }`
                                }
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Menu */}
                    <div className="flex items-center gap-3">
                        {user?.photoURL && (
                            <img
                                src={user.photoURL}
                                alt={user.displayName || 'User'}
                                className="w-8 h-8 rounded-full border-2 border-stone-600"
                            />
                        )}
                        <button
                            onClick={logout}
                            className="text-stone-400 hover:text-white text-sm transition-colors"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-800/95 backdrop-blur-xl border-t border-stone-700/50 z-50">
                <div className="flex justify-around py-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${isActive ? 'text-amber-400' : 'text-stone-400'
                                }`
                            }
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-xs">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};
