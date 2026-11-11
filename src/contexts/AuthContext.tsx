import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, GROUP_CODE, GROUP_ID } from '@/services/supabase'
import { User } from '@supabase/supabase-js'

type Profile = {
    id: string
    email: string
    name: string
    is_admin: boolean
    avatar_url: string | null
}

interface AuthContextType {
    user: User | null
    profile: Profile | null
    signIn: () => Promise<User | null>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    // Check for an existing session on mount and subscribe to auth changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
        });

        const { data } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user ?? null)
        })

        return () => {
            data.subscription.unsubscribe()
        }
    }, [])

    // Sign in with email and password
    const signIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
        })
        if (error) {
            throw error
        }
        return user
    }

    // Sign out the current user
    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
    }

    useEffect(() => {
        if (!user) {
            setProfile(null)
            return
        }
        const avatar_url: string | null =
            user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null

        const loadProfile = async () => {
            // Profile row comes from the on-signup trigger; new users join the group on first visit.
            const { data: member } = await supabase
                .from('group_members')
                .select('status')
                .eq('group_id', GROUP_ID)
                .eq('user_id', user.id)
                .maybeSingle()
            if (!member) {
                const { error: joinError } = await supabase.rpc('join_group', { p_code: GROUP_CODE })
                if (joinError) throw joinError
                await supabase.rpc('set_last_group', { p_group_id: GROUP_ID })
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, avatar_url, is_system_admin')
                .eq('id', user.id)
                .single()
            if (error) throw error

            // No profile photo yet → use the Google one (never overwrite a photo picked in the app)
            if (avatar_url && !data.avatar_url) {
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url })
                    .eq('id', user.id)
                    .is('avatar_url', null)
                if (updateError) console.error(updateError)
                else data.avatar_url = avatar_url
            }
            setProfile({
                id: data.id,
                name: data.name,
                avatar_url: data.avatar_url,
                email: user.email ?? '',
                is_admin: data.is_system_admin,
            })
        }
        loadProfile()
    }, [user])

    return (
        <AuthContext.Provider value={{ user, profile, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 