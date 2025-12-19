import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import BookingItem from './BookingItem'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
function BookingApp() {
    const { user } = useAuth();
    const [healthData, setHealthData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const [bookings, setBookings] = useState([])
    const [bookingsLoading, setBookingsLoading] = useState(true)
    const [bookingsError, setBookingsError] = useState(null)
    const [isSocketConnected, setIsSocketConnected] = useState(false)

    const socketRef = useRef(null)

    useEffect(() => {
        fetch('http://localhost:3001/health')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Backend is not responding correctly')
                }
                return res.json()
            })
            .then(data => {
                setHealthData(data)
                setIsLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setIsLoading(false)
            })
    }, [])

    const fetchBookings = () => {
        // Ensure initial load state is captured without flickering during polling
        if (bookings.length === 0) setBookingsLoading(true)

        fetch('http://localhost:3001/api/bookings')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch bookings')
                }
                return res.json()
            })
            .then(data => {
                setBookings(data.bookings)
                setBookingsLoading(false)
            })
            .catch(err => {
                setBookingsError(err.message)
                setBookingsLoading(false)
            })
    }

    // Socket.IO Setup
    useEffect(() => {
        const socket = io('http://localhost:3001', {
            withCredentials: true
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to socket');
            setIsSocketConnected(true);
            fetchBookings(); // Fetch once on connect to ensure sync
        });

        socket.on('booking_reserved', () => {
            console.log('Real-time: Booking reserved');
            fetchBookings();
        });

        socket.on('booking_canceled', () => {
            console.log('Real-time: Booking canceled');
            fetchBookings();
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket');
            setIsSocketConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Initial fetch and focus listeners
    useEffect(() => {
        fetchBookings()

        // Refetch on window focus
        const onFocus = () => fetchBookings()
        window.addEventListener('focus', onFocus)
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') fetchBookings()
        }
        window.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            window.removeEventListener('focus', onFocus)
            window.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [])

    // Fallback Polling (30 seconds) - only when socket is disconnected
    useEffect(() => {
        let intervalId;
        if (!isSocketConnected) {
            console.log('Socket disconnected, starting 30s polling fallback');
            intervalId = setInterval(fetchBookings, 30000);
        }

        return () => {
            if (intervalId) {
                console.log('Clearing polling fallback');
                clearInterval(intervalId);
            }
        };
    }, [isSocketConnected]);

    // Store idempotency keys for each booking ID
    const idempotencyKeys = useRef(new Map());
    const cancelIdempotencyKeys = useRef(new Map());
    const errorTimeoutRef = useRef(null);

    // Simple UUID v4 generator
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Handles the booking reservation process with an Optimistic UI update.
     * 1. Updates local state immediately for responsiveness.
     * 2. Uses an idempotency key to safely retry requests in case of network failure.
     * 3. Reverts UI state locally if the backend fails or returns an error.
     */
    const reserveBooking = (id) => {
        if (!user) {
            alert('Please login first');
            return;
        }

        // Optimistic Update
        const previousBookings = [...bookings];

        // Update local state immediately
        setBookings(prev => prev.map(b =>
            b.id === id ? { ...b, availability: false } : b
        ));

        // Idempotency: prevent double-booking on network retries
        let key = idempotencyKeys.current.get(id);
        if (!key) {
            key = generateUUID();
            idempotencyKeys.current.set(id, key);
        }

        // Make API call
        fetch(`http://localhost:3001/api/bookings/${id}/reserve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important for cookies!
            body: JSON.stringify({
                idempotencyKey: key
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    // Revert on server error
                    throw new Error(data.message || 'Failed to reserve');
                }
                // Success - state is already updated, nothing to do
                // Force refresh to get latest state (e.g. user_id update if we displayed it)
                fetchBookings();
            })
            .catch(err => {
                // Revert on network error or server failure
                setBookings(previousBookings);
                setBookingsError(`Failed to reserve: ${err.message}`);

                // Clear previous timeout if exists
                if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                }
                // Set new timeout
                errorTimeoutRef.current = setTimeout(() => {
                    setBookingsError(null);
                    errorTimeoutRef.current = null;
                }, 3000);
            });
    }

    /**
     * Handles the cancellation of a reservation with an Optimistic UI update.
     * 1. Updates local state immediately for responsiveness.
     * 2. Uses an idempotency key to safely handle retries and race conditions.
     * 3. Reverts UI state locally if the backend fails or returns an error.
     */
    const cancelReservation = (id) => {
        if (!user) return;

        const previousBookings = [...bookings];

        // Optimistic Update: make slot available
        setBookings(prev => prev.map(b =>
            b.id === id ? { ...b, availability: true, user_id: null } : b
        ));

        let key = cancelIdempotencyKeys.current.get(id);
        if (!key) {
            key = generateUUID();
            cancelIdempotencyKeys.current.set(id, key);
        }

        fetch(`http://localhost:3001/api/bookings/${id}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                idempotencyKey: key
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Failed to cancel');
                }
                fetchBookings();
            })
            .catch(err => {
                setBookings(previousBookings);
                setBookingsError(`Failed to cancel: ${err.message}`);

                if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                }
                errorTimeoutRef.current = setTimeout(() => {
                    setBookingsError(null);
                    errorTimeoutRef.current = null;
                }, 3000);
            });
    }

    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="App">
            <header className="app-header">
                <h1>Booking Playground</h1>
                <div className="auth-container">
                    <Login />
                </div>
            </header>

            <main className="app-main">
                <div className="bookings-section">
                    <h2>Available Bookings</h2>
                    <div className="bookings-list">
                        {bookingsLoading && <BookingItem isLoading={true} />}
                        {bookingsError && <BookingItem error={bookingsError} />}
                        {!bookingsLoading && !bookingsError && bookings.map(booking => (
                            <BookingItem
                                key={booking.id}
                                booking={booking}
                                user={user}
                                onReserve={reserveBooking}
                                onCancel={cancelReservation}
                                disabled={!user}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer className="app-footer">
                <div className="status-indicator">
                    <span>Backend Status: </span>
                    {isLoading && <span className="loading">⏳ Checking...</span>}
                    {error && <span className="error">❌ {error}</span>}
                    {healthData?.ok && <span className="success">✅ Online</span>}
                </div>
            </footer>
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <BookingApp />
        </AuthProvider>
    )
}

export default App
