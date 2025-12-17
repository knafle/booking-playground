import { useState, useEffect, useRef } from 'react'
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
        // Only set loading on initial fetch to avoid flickering during polling
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

    useEffect(() => {
        // Initial fetch
        fetchBookings()

        // Poll every 5 seconds
        const intervalId = setInterval(fetchBookings, 5000)

        // Refetch on window focus
        const onFocus = () => fetchBookings()
        window.addEventListener('focus', onFocus)
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') fetchBookings()
        })

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('focus', onFocus)
        }
    }, [])

    // Store idempotency keys for each booking ID
    const idempotencyKeys = useRef(new Map());
    const errorTimeoutRef = useRef(null);

    // Simple UUID v4 generator
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

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

        // Get or generate idempotency key for this booking ID
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

    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="App">
            <h1>Booking Playground</h1>

            <Login />

            <div className="status">
                <h2>Backend Status</h2>
                {isLoading && <p className="loading">⏳ Checking backend...</p>}
                {error && <p className="error">❌ Failed: {error}</p>}
                {healthData?.ok && <p className="success">✅ Backend is healthy!</p>}
            </div>

            <div className="bookings-section">
                <h2>Available Bookings</h2>
                <div className="bookings-list">
                    {bookingsLoading && <BookingItem isLoading={true} />}
                    {bookingsError && <BookingItem error={bookingsError} />}
                    {!bookingsLoading && !bookingsError && bookings.map(booking => (
                        <BookingItem
                            key={booking.id}
                            booking={booking}
                            onReserve={reserveBooking}
                            disabled={!user} // Validation purely visual, check is in handler too
                        />
                    ))}
                </div>
            </div>
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
