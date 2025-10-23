import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import Page from '../../app/page'

// Mock window.location.href
delete window.location
window.location = { href: '' }

describe('Home Page', () => {
  beforeEach(() => {
    window.location.href = ''
  })

  describe('Page Structure', () => {
    it('renders the main heading', () => {
      render(<Page />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Clusterize')
    })

    it('renders the hero description', () => {
      render(<Page />)
      
      const description = screen.getByText(/Organize, analyze, and manage your clustered data/)
      expect(description).toBeInTheDocument()
    })

    it('renders the sign-in prompt', () => {
      render(<Page />)
      
      const signInText = screen.getByText('Sign in to begin organizing your image collections')
      expect(signInText).toBeInTheDocument()
    })
  })

  describe('Feature Cards', () => {
    it('renders cluster management feature card', () => {
      render(<Page />)
      
      const clusterTitle = screen.getByText('Cluster Management')
      const clusterDescription = screen.getByText('Manage existing clusters and create new ones with ease.')
      
      expect(clusterTitle).toBeInTheDocument()
      expect(clusterDescription).toBeInTheDocument()
    })

    it('renders artifact operations feature card', () => {
      render(<Page />)
      
      const artifactTitle = screen.getByText('Artifact Operations')
      const artifactDescription = screen.getByText('Add tags to artifacts and filter images efficiently.')
      
      expect(artifactTitle).toBeInTheDocument()
      expect(artifactDescription).toBeInTheDocument()
    })

    it('renders project management feature card', () => {
      render(<Page />)
      
      const projectTitle = screen.getByText('Project Management')
      const projectDescription = screen.getByText('Organize your work into projects with detailed statistics')
      
      expect(projectTitle).toBeInTheDocument()
      expect(projectDescription).toBeInTheDocument()
    })

    it('renders all three feature cards', () => {
      render(<Page />)
      
      const featureCards = screen.getAllByRole('generic').filter(el => 
        el.className.includes('p-6') && el.className.includes('bg-gradient-to-br')
      )
      
      // Should have 3 feature cards
      expect(featureCards).toHaveLength(3)
    })
  })

  describe('Get Started Button', () => {
    it('renders the get started button', () => {
      render(<Page />)
      
      const button = screen.getByRole('button', { name: /get started/i })
      expect(button).toBeInTheDocument()
    })

    it('redirects to login when get started button is clicked', () => {
      render(<Page />)
      
      const button = screen.getByRole('button', { name: /get started/i })
      fireEvent.click(button)
      
      expect(window.location.href).toContain('/api/auth/login')
    })

    it('has proper styling classes for the button', () => {
      render(<Page />)
      
      const button = screen.getByRole('button', { name: /get started/i })
      expect(button).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600')
    })
  })

  describe('Visual Elements', () => {
    it('contains background decorative elements', () => {
    render(<Page />)
    
    // Look for the main container by its classes instead of role
    const container = document.querySelector('.relative.w-full.h-screen')
    expect(container).toBeInTheDocument()
    })

    it('displays the logo icon', () => {
      render(<Page />)
      
      // Check for the logo container
      const logoContainer = document.querySelector('.w-20.h-20.bg-gradient-to-br')
      expect(logoContainer).toBeInTheDocument()
    })

    it('has proper layout structure', () => {
      render(<Page />)
      
      // Check main container has proper classes
      const mainContainer = document.querySelector('.relative.w-full.h-screen.flex')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('bg-gradient-to-br', 'from-gray-950')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<Page />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      const h3Elements = screen.getAllByRole('heading', { level: 3 })
      
      expect(h1).toBeInTheDocument()
      expect(h3Elements).toHaveLength(3) // Three feature card titles
    })

    it('button is keyboard accessible', () => {
      render(<Page />)
      
      const button = screen.getByRole('button', { name: /get started/i })
      
      // Focus the button
      button.focus()
      expect(button).toHaveFocus()
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      expect(window.location.href).toBe('/api/auth/login')
    })
  })

  describe('Content Validation', () => {
    it('displays correct brand name', () => {
      render(<Page />)
      
      expect(screen.getByText('Clusterize')).toBeInTheDocument()
    })

    it('shows all expected text content', () => {
      render(<Page />)
      
      const expectedTexts = [
        'Clusterize',
        'Organize, analyze, and manage your clustered data',
        'Transform chaos into clarity',
        'Get Started',
        'Sign in to begin organizing your image collections'
      ]
      
      expectedTexts.forEach(text => {
        expect(screen.getByText(new RegExp(text, 'i'))).toBeInTheDocument()
      })
    })
  })
})