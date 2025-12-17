import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login() {
    const { user, login, register, logout } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email format');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        const action = isLogin ? login : register;
        const result = await action(email, password);

        if (!result.success) {
            setError(result.message);
        } else {
            // clear form
            setEmail('');
            setPassword('');
        }
    };

    if (user) {
        return (
            <div className="auth-status">
                <p>Welcome, {user.email} (ID: {user.id})</p>
                <button onClick={logout}>Logout</button>
            </div>
        );
    }

    return (
        <div className="login-form">
            <h3>{isLogin ? 'Login' : 'Register'}</h3>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{ padding: '8px', marginRight: '5px' }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ padding: '8px' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
            </form>
            <p style={{ fontSize: '0.9em' }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                    onClick={() => { setIsLogin(!isLogin); setError(null); }}
                    style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    {isLogin ? 'Register' : 'Login'}
                </button>
            </p>
        </div>
    );
}
