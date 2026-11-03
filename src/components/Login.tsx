import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export const Login = () => {
    const { signIn } = useAuth();

    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center">
                <span className="mx-auto mb-4 block size-3 rounded-full bg-brand" aria-hidden />
                <h1 className="text-2xl font-bold tracking-tight">טוטו הפועל</h1>
                <p className="mt-1 text-sm text-muted-foreground">התחבר כדי למלא את הטור השבועי</p>
                <Button className="mt-6 h-11 w-full" onClick={signIn}>
                    התחברות עם Google
                </Button>
            </div>
        </div>
    );
};
