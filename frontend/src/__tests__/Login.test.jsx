import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Login from '../Login'
import { AuthProvider } from '../AuthContext'

// Mock useAuth to track calls
const mockLogin = vi.fn(() => Promise.resolve({ success: true }))
const mockRegister = vi.fn(() => Promise.resolve({ success: true }))
const mockLogout = vi.fn()

vi.mock('../AuthContext', async () => {
    const actual = await vi.importActual('../AuthContext')
    return {
        ...actual,
        useAuth: () => ({
            user: null,
            login: mockLogin,
            register: mockRegister,
            logout: mockLogout,
            loading: false
        })
    }
})

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should call login on successful form submission', async () => {
        render(
            <AuthProvider>
                <Login />
            </AuthProvider>
        )

        const emailInput = screen.getByPlaceholderText(/email/i)
        const passwordInput = screen.getByPlaceholderText(/pass/i)
        const submitBtn = screen.getByRole('button', { name: /login/i })

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
        })
    })
})
