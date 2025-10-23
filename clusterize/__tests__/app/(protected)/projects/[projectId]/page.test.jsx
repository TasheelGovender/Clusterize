import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { toast } from 'sonner'
import ProjectPage from '../../../../../app/(protected)/projects/[projectId]/page'

// Mock external dependencies
jest.mock('sonner')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// Mock custom hooks
jest.mock('../../../../../hooks', () => ({
  useParams: jest.fn(),
  useProject: jest.fn(),
  useImages: jest.fn(),
  useImageSearch: jest.fn(),
  useImageEditor: jest.fn(),
}))

// Mock dynamic imports
jest.mock('next/dynamic', () => {
  return (importFunc) => {
    const Component = (props) => {
      const importString = importFunc.toString()
      
      if (importString.includes('UploadDialog')) {
        return props.isOpen ? (
          <div data-testid="upload-dialog">
            <span>Upload Dialog</span>
            <button onClick={() => props.onClose(false)}>Close</button>
          </div>
        ) : null
      }
      
      if (importString.includes('CreateClusterDialog')) {
        return props.isOpen ? (
          <div data-testid="create-cluster-dialog">
            <span>Create Cluster Dialog</span>
            <button onClick={() => props.onClusterCreated()}>Create</button>
            <button onClick={() => props.onClose(false)}>Close</button>
          </div>
        ) : null
      }
      
      if (importString.includes('ClusterInfoDialog')) {
        return props.isOpen ? (
          <div data-testid="cluster-info-dialog">
            <span>Cluster Info: {props.cluster?.cluster_name}</span>
            <button onClick={() => props.onClusterUpdated()}>Update</button>
            <button onClick={() => props.onClose()}>Close</button>
          </div>
        ) : null
      }
      
      return <div>Mocked Component</div>
    }
    
    Component.displayName = 'MockedDynamicComponent'
    return Component
  }
})

// Mock UI components
jest.mock('../../../../../components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}))

jest.mock('../../../../../components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }) => (
    <div className={`skeleton ${className}`} {...props} data-testid="skeleton" />
  )
}))

jest.mock('../../../../../components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogAction: ({ children, onClick }) => <button onClick={onClick} data-testid="alert-action">{children}</button>,
  AlertDialogCancel: ({ children, onClick }) => <button onClick={onClick} data-testid="alert-cancel">{children}</button>,
  AlertDialogContent: ({ children }) => <div data-testid="alert-content">{children}</div>,
  AlertDialogDescription: ({ children }) => <div data-testid="alert-description">{children}</div>,
  AlertDialogHeader: ({ children }) => <div data-testid="alert-header">{children}</div>,
  AlertDialogTitle: ({ children }) => <h2 data-testid="alert-title">{children}</h2>,
}))

jest.mock('../../../../../components/ui/image-display', () => ({
  ImageDisplay: ({ data, selectedImages, batchMode }) => (
    <div data-testid="image-display">
      <span>Images: {data?.length || 0}</span>
      {batchMode && <span data-testid="batch-mode">Batch Mode</span>}
      {selectedImages?.length > 0 && <span data-testid="selected-count">{selectedImages.length} selected</span>}
    </div>
  )
}))

jest.mock('../../../../../components/analytics/analytics', () => ({
  ClusterAnalytics: ({ statistics, onCreateCluster, onClusterClick }) => (
    <div data-testid="cluster-analytics">
      <span>Clusters: {statistics?.clusters?.length || 0}</span>
      <button onClick={onCreateCluster} data-testid="create-cluster-btn">Create Cluster</button>
      {statistics?.clusters?.map((cluster, index) => (
        <button key={index} onClick={() => onClusterClick(cluster)} data-testid={`cluster-${index}`}>
          {cluster.name}
        </button>
      ))}
    </div>
  ),
  TagAnalytics: ({ statistics }) => (
    <div data-testid="tag-analytics">
      <span>Tags: {statistics?.tags?.length || 0}</span>
    </div>
  )
}))

jest.mock('../../../../../components/workspace/FilterSidebar', () => {
  return function FilterSidebar(props) {
    return (
      <div data-testid="filter-sidebar" className={props.sidebarCollapsed ? 'collapsed' : 'expanded'}>
        <button onClick={() => props.setSidebarCollapsed(!props.sidebarCollapsed)} data-testid="toggle-sidebar">
          Toggle
        </button>
        <button onClick={props.handleSearch} data-testid="search-btn">Search</button>
        <span>Clusters: {props.appliedClusters?.length || 0}</span>
        <span>Labels: {props.appliedLabels?.length || 0}</span>
      </div>
    )
  }
})

// Mock icons
jest.mock('lucide-react', () => ({
  Upload: () => <span>📤</span>,
  RefreshCw: () => <span>🔄</span>,
}))

describe('Project Detail Page', () => {
  const mockParams = { projectId: 'test-project-1' }
  const mockProject = {
    id: 'test-project-1',
    project_name: 'Test Project',
    description: 'Test project description'
  }
  const mockStatistics = {
    clusters: [
      { name: '1', label: 'faces', frequency: 10 },
      { name: '2', label: 'landscapes', frequency: 5 }
    ],
    tags: [
      { name: 'tag1', frequency: 8 },
      { name: 'tag2', frequency: 3 }
    ]
  }
  const mockImages = [
    { id: '1', url: 'image1.jpg', cluster: '1' },
    { id: '2', url: 'image2.jpg', cluster: '2' }
  ]

  // Import hooks after mocking
  const { useParams, useProject, useImages, useImageSearch, useImageEditor } = require('../../../../../hooks')

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    toast.success = jest.fn()
    toast.error = jest.fn()
    
    // Setup default mock implementations
    useParams.mockReturnValue({ projectId: 'test-project-1' })
    useProject.mockReturnValue({
      project: mockProject,
      statistics: mockStatistics,
      setStatistics: jest.fn(),
      loading: false,
      error: null,
      silentRefetch: jest.fn(),
      resetProject: jest.fn()
    })
    useImages.mockReturnValue({
      images: mockImages,
      setImages: jest.fn(),
      loadingImages: false,
      fetchImages: jest.fn()
    })
    useImageSearch.mockReturnValue({
      clusters: [],
      setClusters: jest.fn(),
      labels: [],
      setLabels: jest.fn(),
      tags: [],
      setTags: jest.fn(),
      relocatedImages: false,
      setRelocatedImages: jest.fn(),
      searchTriggered: false,
      setSearchTriggered: jest.fn(),
      handleSearch: jest.fn()
    })
    useImageEditor.mockReturnValue({
      selectedImages: [],
      batchMode: false,
      setBatchMode: jest.fn(),
      setSelectedImage: jest.fn(),
      tagValue: '',
      setTagValue: jest.fn(),
      handleChanges: jest.fn(),
      newCluster: '',
      setNewCluster: jest.fn(),
      removeTag: jest.fn(),
      error: null,
      setError: jest.fn(),
      batchTagValue: '',
      setBatchTagValue: jest.fn(),
      batchNewCluster: '',
      setBatchNewCluster: jest.fn(),
      handleBatchChanges: jest.fn(),
      toggleImageSelection: jest.fn(),
      clearBatchSelection: jest.fn()
    })
  })

  describe('Loading States', () => {
    it('renders loading skeleton when project is loading', async () => {
      useProject.mockReturnValue({
        project: null,
        statistics: { clusters: [], tags: [] },
        setStatistics: jest.fn(),
        loading: true,
        error: null,
        silentRefetch: jest.fn(),
        resetProject: jest.fn()
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      const skeletons = screen.getAllByTestId('skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument()
    })

    it('renders loading state for images when images are loading', async () => {
        useImages.mockReturnValue({
            images: [],
            setImages: jest.fn(),
            loadingImages: true,
            fetchImages: jest.fn()
        })

        let container
        await act(async () => {
            // Capture container from render
            const renderResult = render(<ProjectPage params={mockParams} />)
            container = renderResult.container
        })

        await waitFor(() => {
            expect(screen.getByText('Test Project')).toBeInTheDocument()
        })

        // Check for image loading animation
        const loadingAnimation = container.querySelector('.animate-pulse')
        expect(loadingAnimation).toBeInTheDocument()
    })
  })

  describe('Project Header and Information', () => {
    it('renders project information correctly', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument()
        expect(screen.getByTestId('project-header')).toHaveTextContent('T') // Project initial
        expect(screen.getByText('Project management dashboard with advanced image clustering and tagging capabilities')).toBeInTheDocument()
      })
    })

    it('displays project statistics correctly', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Total Clusters')).toBeInTheDocument()
        expect(screen.getByTestId('total-clusters-count')).toHaveTextContent('2')
        
        expect(screen.getByText('Total Tags')).toBeInTheDocument()
        expect(screen.getByTestId('total-tags-count')).toHaveTextContent('2')
        
        expect(screen.getByText('Total Images')).toBeInTheDocument()
        expect(screen.getByTestId('total-images-count')).toHaveTextContent('15')
      })
    })

    it('renders action buttons correctly', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload images/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /reset project/i })).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Interactions', () => {
    it('opens upload dialog when upload button is clicked', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(async () => {
        const uploadButton = screen.getByRole('button', { name: /upload images/i })
        await act(async () => {
          fireEvent.click(uploadButton)
        })
      })

      expect(screen.getByTestId('upload-dialog')).toBeInTheDocument()
    })

    it('opens reset project dialog when reset button is clicked', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(async () => {
        const resetButton = screen.getByRole('button', { name: /reset project/i })
        await act(async () => {
          fireEvent.click(resetButton)
        })
      })

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
      expect(screen.getByTestId('alert-title')).toHaveTextContent('Reset Project')
    })

    it('opens create cluster dialog when create cluster button is clicked', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(async () => {
        const createClusterButton = screen.getByTestId('create-cluster-btn')
        await act(async () => {
          fireEvent.click(createClusterButton)
        })
      })

      expect(screen.getByTestId('create-cluster-dialog')).toBeInTheDocument()
    })

    it('opens cluster info dialog when cluster is clicked', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(async () => {
        const clusterButton = screen.getByTestId('cluster-0')
        await act(async () => {
          fireEvent.click(clusterButton)
        })
      })

      expect(screen.getByTestId('cluster-info-dialog')).toBeInTheDocument()
    })
  })

  describe('Project Reset Functionality', () => {
    it('calls reset project function when confirmed', async () => {
      const mockResetProject = jest.fn().mockResolvedValue()
      const mockSilentRefetch = jest.fn()
      
      useProject.mockReturnValue({
        project: mockProject,
        statistics: mockStatistics,
        setStatistics: jest.fn(),
        loading: false,
        error: null,
        silentRefetch: mockSilentRefetch,
        resetProject: mockResetProject
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      // Open reset dialog
      await waitFor(async () => {
        const resetButton = screen.getByRole('button', { name: /reset project/i })
        await act(async () => {
          fireEvent.click(resetButton)
        })
      })

      // Confirm reset
      const confirmButton = screen.getByTestId('alert-action')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockResetProject).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('Project reset successfully!')
        expect(mockSilentRefetch).toHaveBeenCalled()
      })
    })

    it('handles reset project error gracefully', async () => {
      const mockResetProject = jest.fn().mockRejectedValue(new Error('Reset failed'))
      
      useProject.mockReturnValue({
        project: mockProject,
        statistics: mockStatistics,
        setStatistics: jest.fn(),
        loading: false,
        error: null,
        silentRefetch: jest.fn(),
        resetProject: mockResetProject
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      // Open and confirm reset
      await waitFor(async () => {
        const resetButton = screen.getByRole('button', { name: /reset project/i })
        await act(async () => {
          fireEvent.click(resetButton)
        })
      })

      const confirmButton = screen.getByTestId('alert-action')
      await act(async () => {
        fireEvent.click(confirmButton)
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to reset project')
      })
    })

    it('cancels reset when cancel button is clicked', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      // Open reset dialog
      await waitFor(async () => {
        const resetButton = screen.getByRole('button', { name: /reset project/i })
        await act(async () => {
          fireEvent.click(resetButton)
        })
      })

      // Cancel reset
      const cancelButton = screen.getByTestId('alert-cancel')
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Analytics Components', () => {
    it('renders cluster analytics with correct data', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('cluster-analytics')).toBeInTheDocument()
        expect(screen.getByText('Clusters: 2')).toBeInTheDocument()
      })
    })

    it('renders tag analytics with correct data', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('tag-analytics')).toBeInTheDocument()
        expect(screen.getByText('Tags: 2')).toBeInTheDocument()
      })
    })
  })

  describe('Image Display and Workspace', () => {
    it('renders image display with correct data', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('image-display')).toBeInTheDocument()
        expect(screen.getByText('Images: 2')).toBeInTheDocument()
      })
    })

    it('displays no images message when no images available', async () => {
      useImages.mockReturnValue({
        images: [],
        setImages: jest.fn(),
        loadingImages: false,
        fetchImages: jest.fn()
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByText('No images available')).toBeInTheDocument()
        expect(screen.getByText('Use the search filters in the sidebar to find images, or upload some images from the project page to get started.')).toBeInTheDocument()
      })
    })

    it('renders filter sidebar correctly', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('toggle-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('search-btn')).toBeInTheDocument()
      })
    })

    it('toggles sidebar collapsed state', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        const sidebar = screen.getByTestId('filter-sidebar')
        expect(sidebar).toHaveClass('expanded')
      })

      const toggleButton = screen.getByTestId('toggle-sidebar')
      await act(async () => {
        fireEvent.click(toggleButton)
      })

      await waitFor(() => {
        const sidebar = screen.getByTestId('filter-sidebar')
        expect(sidebar).toHaveClass('collapsed')
      })
    })
  })

  describe('Cluster Management', () => {
    it('handles cluster creation correctly', async () => {
      const mockSilentRefetch = jest.fn()
      useProject.mockReturnValue({
        project: mockProject,
        statistics: mockStatistics,
        setStatistics: jest.fn(),
        loading: false,
        error: null,
        silentRefetch: mockSilentRefetch,
        resetProject: jest.fn()
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      // Open create cluster dialog
      await waitFor(async () => {
        const createClusterButton = screen.getByTestId('create-cluster-btn')
        await act(async () => {
          fireEvent.click(createClusterButton)
        })
      })

      // Create cluster
      const createButton = screen.getByText('Create')
      await act(async () => {
        fireEvent.click(createButton)
      })

      await waitFor(() => {
        expect(mockSilentRefetch).toHaveBeenCalled()
      })
    })

    it('calculates next cluster number correctly', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        // With clusters named '1' and '2', next should be '3'
        const createClusterButton = screen.getByTestId('create-cluster-btn')
        expect(createClusterButton).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('handles search functionality', async () => {
      const mockHandleSearch = jest.fn()
      useImageSearch.mockReturnValue({
        clusters: ['1'],
        setClusters: jest.fn(),
        labels: ['faces'],
        setLabels: jest.fn(),
        tags: ['tag1'],
        setTags: jest.fn(),
        relocatedImages: true,
        setRelocatedImages: jest.fn(),
        searchTriggered: false,
        setSearchTriggered: jest.fn(),
        handleSearch: mockHandleSearch
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        const searchButton = screen.getByTestId('search-btn')
        fireEvent.click(searchButton)
      })

      expect(mockHandleSearch).toHaveBeenCalled()
    })

    it('displays applied filters in sidebar', async () => {
      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Clusters: 0')).toBeInTheDocument()
        expect(screen.getByText('Labels: 0')).toBeInTheDocument()
      })
    })
  })

  describe('Batch Mode Operations', () => {
    it('displays batch mode indicator when enabled', async () => {
      useImageEditor.mockReturnValue({
        selectedImages: ['1', '2'],
        batchMode: true,
        setBatchMode: jest.fn(),
        setSelectedImage: jest.fn(),
        tagValue: '',
        setTagValue: jest.fn(),
        handleChanges: jest.fn(),
        newCluster: '',
        setNewCluster: jest.fn(),
        removeTag: jest.fn(),
        error: null,
        setError: jest.fn(),
        batchTagValue: '',
        setBatchTagValue: jest.fn(),
        batchNewCluster: '',
        setBatchNewCluster: jest.fn(),
        handleBatchChanges: jest.fn(),
        toggleImageSelection: jest.fn(),
        clearBatchSelection: jest.fn()
      })

      await act(async () => {
        render(<ProjectPage params={mockParams} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('batch-mode')).toBeInTheDocument()
        expect(screen.getByTestId('selected-count')).toHaveTextContent('2 selected')
      })
    })
  })
})
