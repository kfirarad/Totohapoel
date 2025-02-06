import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { Volleyball } from 'lucide-react'

const Header = () => {
    const { user, signIn, signOut, profile } = useAuth()

    // Dummy login handler using prompt for demonstration.
    const handleLogin = async () => {
        try {
            await signIn();
        } catch (error) {
            console.error('Login error', error)
        }
    }

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Logout error', error)
        }
    }

    return (
        <header className="w-full flex items-center justify-between p-4 shadow-sm bg-gray-200">
            <div className="flex items-center space-x-2">
                <Volleyball className="h-6 w-6" />
                <h1 className="text-xl font-bold">TotoHapoel</h1>
            </div>
            <div>
                {user ? (
                    <div className="flex items-center space-x-2">
                        <div
                            className="flex items-center space-x-2 gap-2">
                            <img
                                className="h-8 w-8 rounded-full"
                                src={profile?.avatar_url || 'https://ui-avatars.com/api/?name=Anonymous'}
                                alt={profile?.name}
                            /> {profile?.name}</div>
                        <Button variant="outline" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleLogin}>Login</Button>
                )}
            </div>
        </header>
    )
}
export { Header }
