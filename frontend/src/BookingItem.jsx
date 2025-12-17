import './BookingItem.css'

function BookingItem({ booking, isLoading, error, onReserve, user }) {
    if (isLoading) {
        return (
            <div className="booking-item loading">
                <p>⏳ Loading...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="booking-item error">
                <p>❌ Error: {error}</p>
            </div>
        )
    }

    const isMyBooking = !booking.availability && user && booking.user_id === user.id;

    return (
        <div className={`booking-item ${booking.availability ? 'available' : isMyBooking ? 'my-booking' : 'unavailable'}`}>
            <span className="booking-time">{booking.time}</span>
            <div className="booking-actions">
                {booking.availability ? (
                    user ? (
                        <button
                            className="reserve-btn"
                            onClick={() => onReserve(booking.id)}
                        >
                            Reserve
                        </button>
                    ) : (
                        <span className="guest-notice">Log in to reserve</span>
                    )
                ) : (
                    isMyBooking ? (
                        <span className="booking-status owner">✅ Reserved by you</span>
                    ) : (
                        <span className="booking-status">🔒 Booked</span>
                    )
                )}
            </div>
        </div>
    )
}

export default BookingItem
