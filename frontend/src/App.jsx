import { useState, useEffect } from 'react'
import './App.css'
import BookingItem from './BookingItem'

function App() {
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

    // Simple UUID v4 generator
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const reserveBooking = (id) => {
        // Optimistic Update
        const previousBookings = [...bookings];

        // Update local state immediately
        setBookings(prev => prev.map(b =>
            b.id === id ? { ...b, availability: false } : b
        ));

        const idempotencyKey = generateUUID();

        // Make API call
        fetch('http://localhost:3001/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id,
                idempotencyKey
            }),
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    // Revert on server error
                    throw new Error(data.message || 'Failed to reserve');
                }
                // Success - state is already updated, nothing to do
            })
            .catch(err => {
                // Revert on network error or server failure
                setBookings(previousBookings);
                setBookingsError(`Failed to reserve: ${err.message}`);
                // Clear error after 3 seconds
                setTimeout(() => setBookingsError(null), 3000);
            });
    }

    return (
        <div className="App">
            <h1>Booking Playground</h1>

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
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default App
