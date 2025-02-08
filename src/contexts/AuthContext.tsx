import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { Session, User } from '@supabase/supabase-js'

type Profile = {
    id: string
    email: string
    name: string
    is_admin: boolean
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
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
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
        if (user) {
            supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single().then(({ data, error }) => {
                    if (!data) {
                        supabase
                            .from('profiles')
                            .insert({
                                id: user.id,
                                email: user.email,
                                name: user.user_metadata.full_name,
                                is_admin: false,
                            }).then(({ data, error }) => {
                                if (error) {
                                    throw error
                                }
                                setProfile(data)
                            })
                    }
                    if (error) {
                        throw error
                    }
                    setProfile(data)
                })
        } else {
            setProfile(null)
        }
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