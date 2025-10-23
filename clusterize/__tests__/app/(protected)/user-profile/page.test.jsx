import '@testing-library/jest-dom'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: jest.fn()
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: jest.fn() })
}))
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }) => <img data-testid="avatar-image" src={src} alt={alt} />,
  AvatarFallback: ({ children }) => <div data-testid="avatar-fallback">{children}</div>
}))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>
}))
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span>←</span>,
  LogOut: () => <span>⎋</span>,
  Mail: () => <span>✉️</span>,
  User: () => <span>👤</span>
}))
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack })
}))

import { useUser } from '@auth0/nextjs-auth0/client'
import UserProfile from '../../../../app/(protected)/user-profile/page'

describe('UserProfile Page', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    picture: 'test.jpg',
    email_verified: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state when isLoading is true', () => {
    useUser.mockReturnValue({ user: null, isLoading: true })
    render(<UserProfile />)
    expect(screen.getAllByTestId('loading-animation').length).toBeGreaterThan(0)
  })

  it('renders not authenticated state when user is null', () => {
    useUser.mockReturnValue({ user: null, isLoading: false })
    render(<UserProfile />)
    expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    expect(screen.getByText('Please sign in to view your profile')).toBeInTheDocument()
  })

  it('renders user profile info when user is present', () => {
    useUser.mockReturnValue({ user: mockUser, isLoading: false })
    render(<UserProfile />)
    expect(screen.getByText('User Profile')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-image')).toHaveAttribute('src', 'test.jpg')
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('TU')
  })

  it('renders fallback avatar if name is missing', () => {
    useUser.mockReturnValue({ user: { ...mockUser, name: undefined }, isLoading: false })
    render(<UserProfile />)
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('U')
  })

  it('renders email not verified state', () => {
    useUser.mockReturnValue({ user: { ...mockUser, email_verified: false }, isLoading: false })
    render(<UserProfile />)
    expect(screen.getByText('Not verified')).toBeInTheDocument()
  })

  it('renders Go Back and Sign Out buttons', () => {
    useUser.mockReturnValue({ user: mockUser, isLoading: false })
    render(<UserProfile />)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls router.back when Go Back is clicked', () => {
    useUser.mockReturnValue({ user: mockUser, isLoading: false })
    render(<UserProfile />)
    fireEvent.click(screen.getByRole('button', { name: /go back/i }))
    expect(mockBack).toHaveBeenCalled()
  })

  it('redirects to logout when Sign Out is clicked', () => {
    useUser.mockReturnValue({ user: mockUser, isLoading: false })
    delete window.location
    window.location = { href: '' }
    render(<UserProfile />)
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(window.location.href).toBe('/api/auth/logout')
  })
})
