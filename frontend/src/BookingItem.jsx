import './BookingItem.css'

function BookingItem({ booking, isLoading, error, onReserve }) {
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

    return (
        <div className={`booking-item ${booking.availability ? 'available' : 'unavailable'}`}>
            <span className="booking-time">{booking.time}</span>
            <div className="booking-actions">
                {booking.availability ? (
                    <button
                        className="reserve-btn"
                        onClick={() => onReserve(booking.id)}
                    >
                        Reserve
                    </button>
                ) : (
                    <span className="booking-status">🔒 Booked</span>
                )}
            </div>
        </div>
    )
}

export default BookingItem
