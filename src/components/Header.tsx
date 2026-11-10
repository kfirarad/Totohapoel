import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { Link, NavLink } from 'react-router-dom'
import { Avatar } from '@/components/Avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, isLanguage, setLanguage } from '@/i18n'

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'whitespace-nowrap rounded-lg px-3 py-2 text-sm',
        isActive ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'
    )

const Header = () => {
    const { user, signIn, signOut, profile } = useAuth()
    const { t, i18n } = useTranslation()

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
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2.5 md:px-8">
                <Link to="/" className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-brand" aria-hidden />
                    <span className="text-lg font-bold tracking-tight">{t('app.name')}</span>
                </Link>

                {user && (
                    <nav className="order-last -mx-3 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:w-auto">
                        <NavLink to="/column" className={navClass}>{t('header.myColumn')}</NavLink>
                        <NavLink to="/stats" className={navClass}>{t('header.stats')}</NavLink>
                        <NavLink to="/profile" className={navClass}>{t('header.profile')}</NavLink>
                        {profile?.is_admin && <NavLink to="/admin" className={navClass}>{t('header.admin')}</NavLink>}
                    </nav>
                )}

                <div className="ms-auto">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button aria-label={t('header.userMenu')} className="rounded-full p-0.5 hover:bg-muted">
                                    <Avatar url={profile?.avatar_url} name={profile?.name} className="size-9" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{profile?.name}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link to="/profile">{t('header.profile')}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                    {t('header.language')}
                                </DropdownMenuLabel>
                                <DropdownMenuRadioGroup
                                    value={i18n.resolvedLanguage}
                                    onValueChange={(lng) => isLanguage(lng) && setLanguage(lng)}
                                >
                                    {LANGUAGES.map((lng) => (
                                        <DropdownMenuRadioItem key={lng} value={lng} lang={lng}>
                                            {t(`languages.${lng}`)}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleLogout}>{t('header.logout')}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button onClick={handleLogin}>{t('header.login')}</Button>
                    )}
                </div>
            </div>
        </header>
    )
}
export { Header }
