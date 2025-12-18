import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from '../App'

// Mock the AuthContext
vi.mock('../AuthContext', async () => {
    const actual = await vi.importActual('../AuthContext')
    return {
        ...actual,
        useAuth: () => ({
            user: { id: 1, email: 'test@example.com' },
            loading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn()
        })
    }
})

// Mock fetch
global.fetch = vi.fn()

describe('Optimistic UI Rollback', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should rollback the UI state if the reservation fails', async () => {
        // 1. Mock initial data fetch
        fetch.mockImplementation((url) => {
            if (url.includes('/health')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ ok: true })
                })
            }
            if (url.includes('/api/bookings')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        bookings: [
                            { id: 1, time: '10:00', availability: 1, user_id: null }
                        ]
                    })
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        })

        render(<App />)

        // Wait for items to load
        const reserveBtn = await screen.findByRole('button', { name: /reserve/i })
        expect(reserveBtn).toBeInTheDocument()

        // 2. Mock a FAILING reservation call
        fetch.mockImplementationOnce((url) => {
            if (url.includes('/reserve')) {
                return Promise.resolve({
                    ok: false,
                    json: () => Promise.resolve({ success: false, message: 'Server busy' })
                })
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        })

        // 3. Click reserve
        fireEvent.click(reserveBtn)

        // 4. Verify optimistic update (shows "Booked" initially)
        await waitFor(() => {
            expect(screen.getByText(/booked/i)).toBeInTheDocument()
        })

        // 5. Wait for the fetch to fail and show error
        await waitFor(() => {
            expect(screen.getByText(/failed to reserve: server busy/i)).toBeInTheDocument()
        })

        // 6. Wait for rollback (the error clearing timeout is 3000ms)
        // We increase the timeout here to account for the 3s wait
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /reserve/i })).toBeInTheDocument()
        }, { timeout: 5000 })

        expect(screen.queryByText(/booked/i)).not.toBeInTheDocument()
    }, 10000) // 10s test timeout
})
