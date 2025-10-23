import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { toast } from 'sonner'
import ProfileClient from '../../../../app/(protected)/projects/page'

// Mock external dependencies
jest.mock('@auth0/nextjs-auth0/client')
jest.mock('sonner')

// Mock next/dynamic to return the component directly
jest.mock('next/dynamic', () => {
  return (importFunc, options = {}) => {
    const Component = (props) => {
      const importString = importFunc.toString()
      
      // Only show loading if explicitly in loading state
      if (options.loading && props._showLoading) {
        return options.loading()
      }
      
      if (importString.includes('CreateProjectDialog')) {
        return props.isOpen ? (
          <div data-testid="create-project-dialog">
            <button onClick={() => props.onProjectCreated({ id: 'new-1', project_name: 'New Project' })}>
              Create Project
            </button>
            <button onClick={props.onClose}>Close</button>
            {props.error && <div data-testid="create-error">{props.error}</div>}
          </div>
        ) : null
      }
      
      if (importString.includes('DeleteConfirmDialog')) {
        return props.isOpen ? (
          <div data-testid="delete-confirm-dialog">
            <span>Delete {props.projectName}?</span>
            <button onClick={props.onConfirm}>Confirm Delete</button>
            <button onClick={props.onClose}>Cancel</button>
            {props.error && <div data-testid="delete-error">{props.error}</div>}
          </div>
        ) : null
      }
      
      if (importString.includes('ProjectsTable')) {
        return (
          <div data-testid="projects-table">
            {props.projects?.map(project => (
              <div key={project.id} data-testid={`project-${project.id}`}>
                <span>{project.project_name}</span>
                <button onClick={() => props.onDeleteClick(project.id)}>Delete</button>
              </div>
            ))}
          </div>
        )
      }
      
      return <div>Mocked Component</div>
    }
    
    Component.displayName = 'MockedDynamicComponent'
    return Component
  }
})

// Mock UI components
jest.mock('../../../../components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}))

jest.mock('../../../../components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }) => (
    <div className={`skeleton ${className}`} {...props} data-testid="skeleton" />
  )
}))

// Mock icons
jest.mock('lucide-react', () => ({
  SquarePen: () => <span>✏️</span>
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Projects Page', () => {
  const mockUser = { name: 'Test User', email: 'test@example.com' }
  const mockProjects = [
    { id: '1', project_name: 'Project 1', description: 'Test project 1' },
    { id: '2', project_name: 'Project 2', description: 'Test project 2' }
  ]

  beforeEach(() => {
    fetch.mockClear()
    toast.success = jest.fn()
    useUser.mockReturnValue({ user: mockUser, error: null, isLoading: false })
    
    // Mock successful projects fetch
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { data: mockProjects } })
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

    describe('Loading States', () => {
    it('renders loading skeleton when user is loading', async () => {
        useUser.mockReturnValue({ user: null, error: null, isLoading: true })
        
        await act(async () => {
        render(<ProfileClient />)
        })
        
        const skeletons = screen.getAllByTestId('skeleton')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders error state when user loading fails', async () => {
        const error = new Error('Authentication failed')
        useUser.mockReturnValue({ user: null, error, isLoading: false })
        
        await act(async () => {
        render(<ProfileClient />)
        })
        
        expect(screen.getByText('Error Loading Projects')).toBeInTheDocument()
        expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
    })

    describe('Page Structure', () => {
    it('renders the main heading and description', async () => {
        await act(async () => {
        render(<ProfileClient />)
        })
        
        await waitFor(() => {
        expect(screen.getByText('Projects')).toBeInTheDocument()
        })
        
        expect(screen.getByText('Manage your image clustering projects and access workspaces')).toBeInTheDocument()
    })

    it('renders the create project button', async () => {
        await act(async () => {
        render(<ProfileClient />)
        })
        
        await waitFor(() => {
        expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
        })
    })

    it('renders the projects table', async () => {
        await act(async () => {
        render(<ProfileClient />)
        })
        
        await waitFor(() => {
        expect(screen.getByTestId('projects-table')).toBeInTheDocument()
        })
    })
    })

  describe('Projects Data Fetching', () => {
    it('fetches projects on component mount', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proxy/projects', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })
      })
    })

    it('displays fetched projects in the table', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('project-1')).toBeInTheDocument()
        expect(screen.getByTestId('project-2')).toBeInTheDocument()
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      })
    })

    it('handles fetch error gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'))
      console.error = jest.fn()
      
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error fetching projects:', expect.any(Error))
      })
    })
  })

  describe('Create Project Dialog', () => {
    it('opens create project dialog when button is clicked', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(async () => {
        const createButton = screen.getByRole('button', { name: /create project/i })
        await act(async () => {
          fireEvent.click(createButton)
        })
      })
      
      expect(screen.getByTestId('create-project-dialog')).toBeInTheDocument()
    })

    it('closes dialog and refetches projects when project is created', async () => {
        await act(async () => {
            render(<ProfileClient />)
        })
        
        await waitFor(async () => {
            const createButton = screen.getByRole('button', { name: /create project/i })
            await act(async () => {
                fireEvent.click(createButton)
            })
        })
      
        const dialog = screen.getByTestId('create-project-dialog')
        const createProjectButton = screen.getByRole('button', { name: 'Create Project' })

        await act(async () => {
            fireEvent.click(createProjectButton)
        })

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledTimes(2) // Initial fetch + refetch after creation
            expect(screen.queryByTestId('create-project-dialog')).not.toBeInTheDocument()
        })
    })

    it('closes dialog when close button is clicked', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(async () => {
        const createButton = screen.getByRole('button', { name: /create project/i })
        await act(async () => {
          fireEvent.click(createButton)
        })
      })
      
      const closeButton = screen.getByText('Close')
      await act(async () => {
        fireEvent.click(closeButton)
      })
      
      expect(screen.queryByTestId('create-project-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Delete Project Functionality', () => {
    it('opens delete confirmation dialog when delete button is clicked', async () => {
      // Ensure fetch is properly mocked for this test
      fetch.mockImplementation((url, options) => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { data: mockProjects } })
        })
      })

      await act(async () => {
        render(<ProfileClient />)
      })
      
      // Wait for projects to load with more specific waitFor
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2) // Should have 2 delete buttons for 2 projects
      
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument()
        expect(screen.getByText('Delete Project 1?')).toBeInTheDocument()
      })
    })

    it('deletes project and shows success toast on confirmation', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      // Wait for projects to load with more specific waitFor
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Now set up the mock for successful delete
      fetch.mockImplementation((url, options) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve({ ok: true })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { data: mockProjects.filter(p => p.id !== '1') } })
        })
      })
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2) // Should have 2 delete buttons for 2 projects
      
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByText('Confirm Delete')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proxy/project/1', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
        expect(toast.success).toHaveBeenCalledWith('Project deleted successfully!')
        expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument()
      })
    })

    it('shows error message when delete fails', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      // Wait for projects to load with more specific waitFor
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Now mock fetch to fail DELETE requests
      fetch.mockImplementation((url, options) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Server error' })
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { data: mockProjects } })
        })
      })
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2) // Should have 2 delete buttons for 2 projects
      
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByText('Confirm Delete')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent('Server error')
      })
    })

    it('cancels delete when cancel button is clicked', async () => {
      // Ensure fetch is properly mocked for this test
      fetch.mockImplementation((url, options) => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { data: mockProjects } })
        })
      })

      await act(async () => {
        render(<ProfileClient />)
      })
      
      // Wait for projects to load with more specific waitFor
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
        expect(screen.getByText('Project 2')).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // Find and click the first delete button
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons).toHaveLength(2) // Should have 2 delete buttons for 2 projects
      
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })
      
      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByText('Cancel')
      await act(async () => {
        fireEvent.click(cancelButton)
      })
      
      await waitFor(() => {
        expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument()
      })
      
      // Verify no delete API call was made
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/proxy\/project\/\d+/),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Error Handling', () => {
    it('handles network errors during delete gracefully', async () => {
      // First, let projects load successfully
      await act(async () => {
        render(<ProfileClient />)
      })
      
      // Wait for projects to be displayed
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument()
      })
      
      // NOW mock fetch to fail DELETE requests
      fetch.mockImplementation((url, options) => {
        if (options?.method === 'DELETE') {
          return Promise.reject(new Error('Network error'))
        }
        // Keep returning successful GET responses
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { data: mockProjects } })
        })
      })
      
      console.error = jest.fn()
      
      // Now the delete button should exist
      await waitFor(async () => {
        const deleteButton = screen.getAllByText('Delete')[0]
        await act(async () => {
          fireEvent.click(deleteButton)
        })
      })
      
      const confirmButton = screen.getByText('Confirm Delete')
      await act(async () => {
        fireEvent.click(confirmButton)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toHaveTextContent('Failed to delete project. Please try again.')
      })
    })

    it('refetches projects when user changes', async () => {
      const { rerender } = render(<ProfileClient />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      })
      
      // Change user
      const newUser = { name: 'New User', email: 'new@example.com' }
      useUser.mockReturnValue({ user: newUser, error: null, isLoading: false })
      
      await act(async () => {
        rerender(<ProfileClient />)
      })
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2) // Initial + after user change
      })
    })
  })

  describe('UI Interactions', () => {
    it('displays proper styling classes', async () => {
        await act(async () => {
            render(<ProfileClient />)
        })

        await waitFor(() => {
            const mainContainer = screen.getByTestId('main-container')
            expect(mainContainer).toHaveClass('min-h-screen', 'bg-gradient-to-br')
        })
    })

    it('shows proper icon in create button', async () => {
      await act(async () => {
        render(<ProfileClient />)
      })
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create project/i })
        expect(createButton).toHaveTextContent('✏️')
      })
    })
  })
})
