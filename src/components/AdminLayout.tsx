import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export const AdminLayout = () => {
    const { profile } = useAuth();
    const location = useLocation();

    if (!profile?.is_admin) {
        return <Navigate to="/" />;
    }

    const navItems = [
        { path: '/admin/columns', label: 'Columns' },
        { path: '/admin/users', label: 'Users' },
    ];

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
            {/* Mobile Top Bar */}
            <div className="md:hidden bg-gray-100 border-b">
                <nav className="flex overflow-x-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'px-4 py-3 text-sm whitespace-nowrap transition-colors',
                                location.pathname.startsWith(item.path)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-gray-200'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 bg-gray-100 border-r">
                <nav className="p-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'block px-4 py-2 my-1 rounded-md transition-colors',
                                location.pathname.startsWith(item.path)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-gray-200'
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <Outlet />
            </main>
        </div>
    );
}; 