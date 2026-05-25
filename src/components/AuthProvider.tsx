import React, { createContext, useContext, useEffect, useState, useRef } from "react";

interface User {
  uid: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Using the injected APP_URL environment variable from AI Studio or a relative path
// For relative paths to Express proxy endpoints, we can just use /api/auth
const API_BASE = "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const authenticateWithPi = async (isAutoAttempt: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window.Pi === "undefined") {
        if (process.env.NODE_ENV !== "production") {
          console.log("Pi SDK is not loaded. Mocking Pi Network Auth for development/sandbox environment.");
          setUser({ uid: "demo_user_12345", username: "pi_demo_user" });
          setLoading(false);
          return;
        }
        throw new Error("Pi SDK is not loaded. Please ensure you are running this app inside the Pi Browser.");
      }

      // 1. Initialize Pi SDK as a Promise and fully await it before calling authenticate
      if (!isInitialized.current) {
        try {
          await window.Pi.init({ version: "2.0", sandbox: true });
          isInitialized.current = true;
        } catch (e: any) {
          console.warn("Pi.init error:", e.message || e);
          if (process.env.NODE_ENV !== "production") {
            console.log("Mocking Pi Network Auth for development/sandbox environment.");
            setUser({ uid: "demo_user_12345", username: "pi_demo_user" });
            setLoading(false);
            return;
          }
          throw new Error("Cannot connect to Pi Network. Please ensure you are running this app inside the Pi Browser.");
        }
      }

      // 2. Define incomplete payment handler (required by Pi SDK but not used in auth scope)
      const onIncompletePaymentFound = (payment: any) => {
        console.log("Incomplete payment found:", payment);
      };

      // 3. Authenticate with "username" scope
      // Request scope "username" to access the user's Pi username.
      const auth: any = await window.Pi.authenticate(["username"], onIncompletePaymentFound);

      // 4. Send the returned access token to the backend, which must validate it
      const authResponse = await fetch(`${API_BASE}/api/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken: auth.accessToken }),
      });

      if (!authResponse.ok) {
        throw new Error("Failed to validate authentication with server.");
      }

      const authData = await authResponse.json();
      
      if (authData.authenticated) {
        setUser({
          uid: authData.user.uid,
          username: authData.user.username || auth.user.username // Authenticated user's username
        });
      } else {
        throw new Error("Server rejected authentication.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to authenticate with Pi Network");
      
      // Automatic attempt fallback for desktop/browser preview in development mode
      if (process.env.NODE_ENV !== "production" && isAutoAttempt) {
        console.log("Auto-attempt failed, fallback to mock user in development mode.");
        setUser({ uid: "demo_user_12345", username: "pi_demo_user" });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Trigger Pi authentication automatically when the app loads
    authenticateWithPi(true);
  }, []);

  const signIn = async () => {
    // Trigger Pi authentication manually from button click
    await authenticateWithPi(false);
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
