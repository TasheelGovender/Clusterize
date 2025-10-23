import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageCard } from '../../../components/ui/image-card';

// Mock UI components
jest.mock('../../../components/ui/card', () => ({
  Card: ({ children, className, onClick, ...props }) => (
    <div 
      className={className} 
      onClick={onClick}
      data-testid="image-card"
      {...props}
    >
      {children}
    </div>
  ),
  CardContent: ({ children, className }) => (
    <div className={className} data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children, className }) => (
    <div className={className} data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, className }) => (
    <h3 className={className} data-testid="card-title">{children}</h3>
  )
}));

jest.mock('../../../components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }) => (
    <div data-testid="dialog-container">
      {children}
      {open && <div data-testid="dialog" onClick={() => onOpenChange?.(false)} />}
    </div>
  ),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }) => {
    return asChild ? children : <div data-testid="dialog-trigger">{children}</div>;
  }
}));

jest.mock('../../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../components/ui/input', () => ({
  Input: ({ onChange, value, onKeyDown, ...props }) => (
    <input
      onChange={onChange}
      value={value}
      onKeyDown={onKeyDown}
      {...props}
    />
  )
}));

jest.mock('../../../components/ui/badge', () => ({
  Badge: ({ children, className, variant }) => (
    <span className={className} data-variant={variant} data-testid="tag-badge">
      {children}
    </span>
  )
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: ({ onClick, className, size, ...props }) => {
    // Differentiate between clear button and tag removal based on size/className
    const testId = size === 8 ? 'x-icon-tag-remove' : 'x-icon-clear-search';
    return (
      <svg 
        onClick={onClick} 
        className={className} 
        data-testid={testId}
        width={size} 
        height={size}
        {...props}
      />
    );
  },
  EllipsisVertical: ({ onClick, className, ...props }) => {
    // Differentiate between clickable and decorative icons based on onClick handler
    const testId = onClick ? 'ellipsis-vertical-icon-clickable' : 'ellipsis-vertical-icon-decorative';
    return (
      <svg 
        onClick={onClick} 
        className={className} 
        data-testid={testId}
        {...props}
      />
    );
  },
  Check: ({ className, ...props }) => (
    <svg className={className} data-testid="check-icon" {...props} />
  ),
  AlertCircle: ({ className, ...props }) => (
    <svg className={className} data-testid="alert-circle-icon" {...props} />
  )
}));

// Mock react-zoom-pan-pinch
jest.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }) => <div data-testid="transform-wrapper">{children}</div>,
  TransformComponent: ({ children }) => <div data-testid="transform-component">{children}</div>
}));

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

describe('ImageCard', () => {
  const mockImage = {
    id: 1,
    name: 'Test Image',
    url: 'https://example.com/image.jpg',
    tags: ['tag1', 'tag2', 'tag3'],
    cluster_id: 1,
    original_cluster: 1
  };

  const mockCurrentConfig = {
    maxWidth: 'max-w-[280px]',
    titleSize: 'text-sm',
    padding: 'p-4'
  };

  const mockTags = [
    { name: 'nature' },
    { name: 'landscape' },
    { name: 'animals' },
    { name: 'tag1' }
  ];

  const defaultProps = {
    image: mockImage,
    index: 0,
    currentConfig: mockCurrentConfig,
    cardSize: 'medium',
    selectedImages: [],
    batchMode: false,
    handleCardClick: jest.fn(),
    setSelectedImage: jest.fn(),
    tagValue: '',
    setTagValue: jest.fn(),
    newCluster: '',
    setNewCluster: jest.fn(),
    handleChanges: jest.fn(),
    removeTag: jest.fn(),
    error: '',
    setError: jest.fn(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    filteredTags: [],
    tags: mockTags
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('Initial rendering', () => {
    it('should render image card with basic information', () => {
      render(<ImageCard {...defaultProps} />);
      
      expect(screen.getByTestId('image-card')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toHaveTextContent('Test Image');
      
      // Get all images with the alt text and check the main card image (first one)
      const images = screen.getAllByAltText('Test Image');
      expect(images).toHaveLength(2); // One in card, one in dialog
      expect(images[0]).toBeInTheDocument();
      expect(images[0]).toHaveAttribute('src', mockImage.url);
    });

    it('should render "Untitled" when image has no name', () => {
      const imageWithoutName = { ...mockImage, name: undefined };
      render(<ImageCard {...defaultProps} image={imageWithoutName} />);
      
      expect(screen.getByTestId('card-title')).toHaveTextContent('Untitled');
    });

    it('should render all image tags', () => {
      render(<ImageCard {...defaultProps} />);
      
      const tagBadges = screen.getAllByTestId('tag-badge');
      expect(tagBadges).toHaveLength(3);
      
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
    });

    it('should handle image without tags', () => {
      const imageWithoutTags = { ...mockImage, tags: [] };
      render(<ImageCard {...defaultProps} image={imageWithoutTags} />);
      
      expect(screen.queryAllByTestId('tag-badge')).toHaveLength(0);
    });
  });

  describe('Batch mode functionality', () => {
    it('should show checkbox when in batch mode', () => {
      render(<ImageCard {...defaultProps} batchMode={true} />);
      
      // Look for the checkbox div with specific classes
      const cardHeader = screen.getByTestId('card-header');
      const checkbox = cardHeader.querySelector('.rounded.border-2.flex.items-center.justify-center');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveClass('border-gray-400'); // Unselected state
    });

    it('should show selected state when image is selected', () => {
      render(<ImageCard {...defaultProps} batchMode={true} selectedImages={[1]} />);
      
      // Check if the card has selected styling
      const card = screen.getByTestId('image-card');
      expect(card).toHaveClass('ring-2', 'ring-blue-500');
      
      // Check if checkbox shows selected state
      const cardHeader = screen.getByTestId('card-header');
      const checkbox = cardHeader.querySelector('.rounded.border-2.flex.items-center.justify-center');
      expect(checkbox).toHaveClass('bg-blue-600', 'border-blue-600');
    });

    it('should call handleCardClick when card is clicked', () => {
      render(<ImageCard {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('image-card'));
      
      expect(defaultProps.handleCardClick).toHaveBeenCalledWith(mockImage.id, expect.any(Object));
    });
  });

  describe('Cluster status styling', () => {
    it('should show orange border when cluster has changed', () => {
      const movedImage = { ...mockImage, cluster_id: 2, original_cluster: 1 };
      render(<ImageCard {...defaultProps} image={movedImage} />);
      
      const card = screen.getByTestId('image-card');
      expect(card).toHaveClass('border-2', 'border-orange-500');
    });

    it('should show normal border when cluster unchanged', () => {
      render(<ImageCard {...defaultProps} />);
      
      const card = screen.getByTestId('image-card');
      expect(card).toHaveClass('border', 'border-gray-700');
    });
  });

  describe('Dialog functionality', () => {
    it('should open dialog when ellipsis button is clicked', () => {
      render(<ImageCard {...defaultProps} />);
      
      const ellipsisButton = screen.getByTestId('ellipsis-vertical-icon-clickable');
      fireEvent.click(ellipsisButton);
      
      expect(defaultProps.setSelectedImage).toHaveBeenCalledWith(mockImage.id);
    });

    it('should show dialog content when opened', () => {
      render(<ImageCard {...defaultProps} />);
      
      // Open dialog
      const ellipsisButton = screen.getByTestId('ellipsis-vertical-icon-clickable');
      fireEvent.click(ellipsisButton);
      
      expect(screen.getByText('Image Details')).toBeInTheDocument();
      expect(screen.getByText(/View image, add tags or change the cluster assignment/)).toBeInTheDocument();
    });

    it('should show zoomable image in dialog', () => {
      render(<ImageCard {...defaultProps} />);
      
      expect(screen.getByTestId('transform-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('transform-component')).toBeInTheDocument();
    });
  });

  describe('Add tag functionality', () => {
    it('should handle tag input changes', () => {
      render(<ImageCard {...defaultProps} tagValue="test" />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.change(tagInput, { target: { value: 'new-tag' } });
      
      expect(defaultProps.setTagValue).toHaveBeenCalledWith('new-tag');
      expect(defaultProps.setSearchQuery).toHaveBeenCalledWith('new-tag');
    });

    it('should add tag when Add button is clicked', async () => {
      render(<ImageCard {...defaultProps} tagValue="new-tag" />);
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      expect(defaultProps.handleChanges).toHaveBeenCalled();
    });

    it('should add tag when Enter key is pressed', async () => {
      render(<ImageCard {...defaultProps} tagValue="new-tag" />);
      
      const tagInput = screen.getByPlaceholderText('Add a tag...');
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
      
      expect(defaultProps.handleChanges).toHaveBeenCalled();
    });

    // it('should show error for empty tag', async () => {
    //   render(<ImageCard {...defaultProps} tagValue="" />);
      
    //   const addButton = screen.getByText('Add');
    //   fireEvent.click(addButton);
      
    //   await waitFor(() => {
    //     expect(screen.getByText('Please enter a tag before adding.')).toBeInTheDocument();
    //   });
    // });

    it('should show error for tag with whitespace', async () => {
      render(<ImageCard {...defaultProps} tagValue="tag with spaces" />);
      
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Tags cannot contain whitespace characters/)).toBeInTheDocument();
      });
    });

    it('should disable Add button when tag value is empty', () => {
      render(<ImageCard {...defaultProps} tagValue="" />);
      
      const addButton = screen.getByText('Add');
      expect(addButton).toBeDisabled();
    });

    it('should enable Add button when tag value is provided', () => {
      render(<ImageCard {...defaultProps} tagValue="new-tag" />);
      
      const addButton = screen.getByText('Add');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Tag suggestions functionality', () => {
    it('should show filtered tag suggestions when searching', () => {
      render(<ImageCard {...defaultProps} searchQuery="nat" filteredTags={[{ name: 'nature' }]} />);
      
      expect(screen.getByText('nature')).toBeInTheDocument();
    });

    it('should select suggestion when clicked', () => {
      render(<ImageCard {...defaultProps} searchQuery="nat" filteredTags={[{ name: 'nature' }]} />);
      
      fireEvent.click(screen.getByText('nature'));
      
      expect(defaultProps.setTagValue).toHaveBeenCalledWith('nature');
      expect(defaultProps.setSearchQuery).toHaveBeenCalledWith('');
    });

    it('should show clear button when search query exists', () => {
      render(<ImageCard {...defaultProps} searchQuery="test" />);
      
      // Target the clear button specifically by its variant
      const clearButton = screen.getByRole('button', { name: '' });
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveAttribute('data-variant', 'ghost');
    });

    it('should clear search when X button is clicked', () => {
      render(<ImageCard {...defaultProps} searchQuery="test" />);
      
      // Target the clear button by its specific X icon child
      const clearButton = screen.getByTestId('x-icon-clear-search').closest('button');
      fireEvent.click(clearButton);
      
      expect(defaultProps.setSearchQuery).toHaveBeenCalledWith('');
      expect(defaultProps.setTagValue).toHaveBeenCalledWith('');
    });
  });

//   describe('Change cluster functionality', () => {
//     it('should handle cluster input changes', () => {
//       render(<ImageCard {...defaultProps} newCluster="test-cluster" />);
      
//       const clusterInput = screen.getByPlaceholderText('Set new cluster...');
//       fireEvent.change(clusterInput, { target: { value: 'new-cluster' } });
      
//       expect(defaultProps.setNewCluster).toHaveBeenCalledWith('new-cluster');
//     });

//     it('should save cluster when Save button is clicked', async () => {
//       render(<ImageCard {...defaultProps} newCluster="new-cluster" />);
      
//       const saveButton = screen.getByText('Save');
//       fireEvent.click(saveButton);
      
//       expect(defaultProps.handleChanges).toHaveBeenCalled();
//     });

//     it('should save cluster when Enter key is pressed', async () => {
//       render(<ImageCard {...defaultProps} newCluster="new-cluster" />);
      
//       const clusterInput = screen.getByPlaceholderText('Set new cluster...');
//       fireEvent.keyDown(clusterInput, { key: 'Enter', code: 'Enter' });
      
//       expect(defaultProps.handleChanges).toHaveBeenCalled();
//     });

//     it('should show error for empty cluster name', async () => {
//       render(<ImageCard {...defaultProps} newCluster="" />);
      
//       const saveButton = screen.getByText('Save');
//       fireEvent.click(saveButton);
      
//       await waitFor(() => {
//         expect(screen.getByText('Please enter a cluster name before saving.')).toBeInTheDocument();
//       });
//     });

//     it('should disable Save button when cluster name is empty', () => {
//       render(<ImageCard {...defaultProps} newCluster="" />);
      
//       const saveButton = screen.getByText('Save');
//       expect(saveButton).toBeDisabled();
//     });

//     it('should enable Save button when cluster name is provided', () => {
//       render(<ImageCard {...defaultProps} newCluster="new-cluster" />);
      
//       const saveButton = screen.getByText('Save');
//       expect(saveButton).not.toBeDisabled();
//     });
//   });

//   describe('Remove tag functionality', () => {
//     it('should call removeTag when tag X button is clicked', async () => {
//       render(<ImageCard {...defaultProps} />);
      
//       // Find the first tag's remove button (X)
//       const tagBadges = screen.getAllByTestId('tag-badge');
//       const removeButton = tagBadges[0].querySelector('button');
      
//       fireEvent.click(removeButton);
      
//       expect(defaultProps.removeTag).toHaveBeenCalledWith(mockImage.id, 'tag1');
//     });

//     it('should handle remove tag error', async () => {
//       const mockError = new Error('Failed to remove tag');
//       defaultProps.removeTag.mockRejectedValue(mockError);
      
//       render(<ImageCard {...defaultProps} />);
      
//       const tagBadges = screen.getAllByTestId('tag-badge');
//       const removeButton = tagBadges[0].querySelector('button');
      
//       fireEvent.click(removeButton);
      
//       await waitFor(() => {
//         expect(screen.getByText('Failed to remove tag. Please try again.')).toBeInTheDocument();
//       });
//     });
//   });

//   describe('Error handling', () => {
//     it('should display error messages', () => {
//       render(<ImageCard {...defaultProps} error="Test error message" />);
      
//       expect(screen.getByText('Test error message')).toBeInTheDocument();
//     });

//     it('should clear errors when input changes', () => {
//       render(<ImageCard {...defaultProps} />);
      
//       const tagInput = screen.getByPlaceholderText('Add a tag...');
//       fireEvent.change(tagInput, { target: { value: 'test' } });
      
//       // Error clearing is tested through the side effects
//       expect(defaultProps.setTagValue).toHaveBeenCalled();
//     });

//     it('should handle async operation failures', async () => {
//       const mockError = new Error('Network error');
//       defaultProps.handleChanges.mockRejectedValue(mockError);
      
//       render(<ImageCard {...defaultProps} tagValue="new-tag" />);
      
//       const addButton = screen.getByText('Add');
//       fireEvent.click(addButton);
      
//       await waitFor(() => {
//         expect(screen.getByText('Network error')).toBeInTheDocument();
//       });
//     });
//   });

//   describe('Dialog state management', () => {
//     it('should clear inputs when dialog is closed', () => {
//       render(<ImageCard {...defaultProps} />);
      
//       // Open dialog by clicking ellipsis
//       const ellipsisButton = screen.getByTestId('dialog-container');
//       fireEvent.click(ellipsisButton);
      
//       // Simulate dialog close
//       const dialog = screen.getByTestId('dialog');
//       fireEvent.click(dialog);
      
//       expect(defaultProps.setTagValue).toHaveBeenCalledWith('');
//       expect(defaultProps.setNewCluster).toHaveBeenCalledWith('');
//     });

//     it('should close dialog after successful tag addition', async () => {
//       defaultProps.handleChanges.mockResolvedValue();
      
//       render(<ImageCard {...defaultProps} tagValue="new-tag" />);
      
//       const addButton = screen.getByText('Add');
//       fireEvent.click(addButton);
      
//       await waitFor(() => {
//         expect(defaultProps.setTagValue).toHaveBeenCalledWith('');
//       });
//     });

//     it('should close dialog after successful cluster change', async () => {
//       defaultProps.handleChanges.mockResolvedValue();
      
//       render(<ImageCard {...defaultProps} newCluster="new-cluster" />);
      
//       const saveButton = screen.getByText('Save');
//       fireEvent.click(saveButton);
      
//       await waitFor(() => {
//         expect(defaultProps.setNewCluster).toHaveBeenCalledWith('');
//       });
//     });
//   });

//   describe('Card size variations', () => {
//     it('should apply small size styles', () => {
//       render(<ImageCard {...defaultProps} cardSize="small" />);
      
//       expect(screen.getByTestId('image-card')).toBeInTheDocument();
//       // Size-specific styling would be verified through className checks
//     });

//     it('should apply large size styles', () => {
//       render(<ImageCard {...defaultProps} cardSize="large" />);
      
//       expect(screen.getByTestId('image-card')).toBeInTheDocument();
//     });
//   });

//   describe('Edge cases', () => {
//     it('should handle image without id', () => {
//       const imageWithoutId = { ...mockImage, id: undefined };
//       render(<ImageCard {...defaultProps} image={imageWithoutId} />);
      
//       expect(screen.getByTestId('image-card')).toBeInTheDocument();
//     });

//     it('should handle missing currentConfig', () => {
//       render(<ImageCard {...defaultProps} currentConfig={{}} />);
      
//       expect(screen.getByTestId('image-card')).toBeInTheDocument();
//     });

//     it('should handle null tags array', () => {
//       const imageWithNullTags = { ...mockImage, tags: null };
//       render(<ImageCard {...defaultProps} image={imageWithNullTags} />);
      
//       expect(screen.queryAllByTestId('tag-badge')).toHaveLength(0);
//     });

//     it('should handle undefined cluster information', () => {
//       const imageWithoutCluster = { ...mockImage, cluster_id: undefined, original_cluster: undefined };
//       render(<ImageCard {...defaultProps} image={imageWithoutCluster} />);
      
//       const card = screen.getByTestId('image-card');
//       expect(card).toHaveClass('border', 'border-gray-700');
//     });
//   });

  afterAll(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });
});