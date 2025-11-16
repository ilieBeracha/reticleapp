export interface AuthContextType {
    user: any | null;      // Supabase user object
    session: any | null;   // Supabase session
    loading: boolean;
  
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithOAuth: (provider: "google" | "apple") => Promise<void>;
    signOut: () => Promise<void>;
  }
  