jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))
jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: jest.fn(),
}))
jest.mock('@/components/user-avatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar">Avatar</div>,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@auth0/nextjs-auth0/client'
import ProtectedLayout from '../../../components/layouts/ProtectedLayout'

describe('ProtectedLayout', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    useRouter.mockReturnValue({ push: mockPush })
    usePathname.mockReturnValue('/projects')
    useUser.mockReturnValue({ user: { name: 'Test User' } })
  })

  describe('Header visibility', () => {
    it('shows header on regular pages', () => {
      usePathname.mockReturnValue('/projects')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
    })

    it('hides header on workspace pages', () => {
      usePathname.mockReturnValue('/workspace/123')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    })
  })

  describe('Back button', () => {
    it('shows back button on project detail pages', () => {
      usePathname.mockReturnValue('/projects/123')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.getByText('Back to Projects')).toBeInTheDocument()
    })

    it('hides back button on other pages', () => {
      usePathname.mockReturnValue('/projects')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.queryByText('Back to Projects')).not.toBeInTheDocument()
    })

    it('navigates to projects when back button is clicked', () => {
      usePathname.mockReturnValue('/projects/123')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      fireEvent.click(screen.getByText('Back to Projects'))
      expect(mockPush).toHaveBeenCalledWith('/projects')
    })
  })

  describe('User avatar', () => {
    it('shows user avatar on regular pages', () => {
      usePathname.mockReturnValue('/projects')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
    })

    it('hides user avatar on user profile page', () => {
      usePathname.mockReturnValue('/user-profile')

      render(
        <ProtectedLayout>
          <div>Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument()
    })
  })

  describe('Content rendering', () => {
    it('renders children correctly', () => {
      usePathname.mockReturnValue('/projects')

      render(
        <ProtectedLayout>
          <div data-testid="child-content">Test Content</div>
        </ProtectedLayout>
      )
      
      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })
  })
})