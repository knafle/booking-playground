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
            setEmail('');
            setPassword('');
        }
    };

    if (user) {
        return (
            <div className="auth-status" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9rem' }}>{user.email}</span>
                <button onClick={logout} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Logout</button>
            </div>
        );
    }

    return (
        <div className="login-form" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '120px' }}
                />
                <input
                    type="password"
                    placeholder="Pass"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '80px' }}
                />
                <button type="submit" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                    {isLogin ? 'Login' : 'Reg'}
                </button>
            </form>
            {error && <span style={{ color: 'red', fontSize: '0.7rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={error}>{error}</span>}
            <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
            >
                {isLogin ? 'Register?' : 'Login?'}
            </button>
        </div>
    );
}
