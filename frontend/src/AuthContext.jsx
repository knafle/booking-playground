import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        fetch('http://localhost:3001/api/auth/me', {
            credentials: 'include'
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Not logged in');
            })
            .then(data => {
                if (data.success) setUser(data.user);
            })
            .catch(() => {
                // Not logged in, that's fine
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            setUser(data.user);
            return { success: true };
        }
        return { success: false, message: data.message };
    };

    const register = async (email, password) => {
        const res = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            setUser(data.user);
            return { success: true };
        }
        return { success: false, message: data.message };
    };

    const logout = async () => {
        await fetch('http://localhost:3001/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
