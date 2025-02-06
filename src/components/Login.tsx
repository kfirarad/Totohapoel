import { useAuth } from "@/contexts/AuthContext";

export const Login = () => {
    const { signIn } = useAuth();

    return (
        <div className="flex items-center justify-center min-h-screen">
            <button
                onClick={signIn}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Sign in with Google
            </button>
        </div>
    );
};
