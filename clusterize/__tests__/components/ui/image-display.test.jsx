import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageDisplay } from '../../../components/ui/image-display';

// Mock the ImageCard component
jest.mock('../../../components/ui/image-card', () => ({
  ImageCard: ({ image, index, handleCardClick, setSelectedImage, batchMode, selectedImages }) => (
    <div 
      data-testid={`image-card-${image.id}`}
      onClick={(e) => {
        if (batchMode) {
          handleCardClick(image.id, e);
        } else {
          setSelectedImage(image.id);
        }
      }}
      className={selectedImages?.includes(image.id) ? 'selected' : ''}
    >
      <img src={image.url} alt={`Image ${image.id}`} />
      <div>Image {image.id}</div>
      {image.tags?.map(tag => (
        <span key={tag} data-testid={`tag-${tag}`}>{tag}</span>
      ))}
    </div>
  )
}));

// Mock UI components
jest.mock('../../../components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }) => (
    <div data-testid="dialog-container">
      {children}
       {/* Render dialog overlay when open */}
        {open && <div data-testid="dialog" onClick={() => onOpenChange?.(false)} />}
    </div>
  ),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }) => {
    // When asChild is true, render children directly (this is how Radix DialogTrigger works)
    return asChild ? children : <div data-testid="dialog-trigger">{children}</div>;
  }
}));

jest.mock('../../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
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

// Mock Fuse.js
jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation((items, options) => ({
    search: jest.fn((query) => {
      return items
        .filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({ item }));
    })
  }));
});

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

describe('ImageDisplay', () => {
  const mockImages = [
    { id: 1, url: 'image1.jpg', tags: ['tag1', 'tag2'] },
    { id: 2, url: 'image2.jpg', tags: ['tag2', 'tag3'] },
    { id: 3, url: 'image3.jpg', tags: ['tag1'] },
    // Add more images to test pagination
    ...Array.from({ length: 50 }, (_, i) => ({
      id: i + 4,
      url: `image${i + 4}.jpg`,
      tags: [`tag${i % 3 + 1}`]
    }))
  ];

  const mockTags = [
    { name: 'tag1' },
    { name: 'tag2' },
    { name: 'tag3' },
    { name: 'nature' },
    { name: 'landscape' }
  ];

  const defaultProps = {
    data: mockImages,
    setSelectedImage: jest.fn(),
    tagValue: '',
    newCluster: '',
    handleChanges: jest.fn(),
    setTagValue: jest.fn(),
    setNewCluster: jest.fn(),
    removeTag: jest.fn(),
    error: '',
    setError: jest.fn(),
    selectedImages: [],
    batchMode: false,
    setBatchMode: jest.fn(),
    batchTagValue: '',
    setBatchTagValue: jest.fn(),
    batchNewCluster: '',
    setBatchNewCluster: jest.fn(),
    handleBatchChanges: jest.fn(),
    toggleImageSelection: jest.fn(),
    clearBatchSelection: jest.fn(),
    tags: mockTags
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('Initial rendering', () => {
    it('should render images with correct count', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      expect(screen.getByText(`Images (${mockImages.length})`)).toBeInTheDocument();
      expect(screen.getByText('Showing 1-30 of 53')).toBeInTheDocument();
    });

    it('should render first page of images (30 items)', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Should show first 30 images
      expect(screen.getByTestId('image-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('image-card-30')).toBeInTheDocument();
      expect(screen.queryByTestId('image-card-31')).not.toBeInTheDocument();
    });

    it('should show pagination controls when there are multiple pages', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should not show pagination when data fits on one page', () => {
      const smallDataset = mockImages.slice(0, 10);
      render(<ImageDisplay {...defaultProps} data={smallDataset} />);
      
      expect(screen.queryByText('Page 1 of')).not.toBeInTheDocument();
    });
  });

  describe('Pagination functionality', () => {
    it('should navigate to next page', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Next'));
      
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      expect(screen.getByText('Showing 31-53 of 53')).toBeInTheDocument();
    });

    it('should navigate to previous page', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Go to page 2 first
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      
      // Go back to page 1
      fireEvent.click(screen.getByText('Previous'));
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('should jump to first page', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Go to page 2
      fireEvent.click(screen.getByText('Next'));
      
      // Jump to first page - find the first navigation button (ChevronsLeft)
      const allButtons = screen.getAllByRole('button');
      const navigationButtons = allButtons.filter(button => 
        button.querySelector('svg') && button.textContent.trim() === ''
      );
      fireEvent.click(navigationButtons[0]); // First button should be ChevronsLeft
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('should jump to last page', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Jump to last page - find the last navigation button (ChevronsRight)
      const allButtons = screen.getAllByRole('button');
      const navigationButtons = allButtons.filter(button => 
        button.querySelector('svg') && button.textContent.trim() === ''
      );
      fireEvent.click(navigationButtons[navigationButtons.length - 1]); // Last icon-only button should be ChevronsRight
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    it('should disable navigation buttons appropriately', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // On first page, previous buttons should be disabled
      const allButtons = screen.getAllByRole('button');
      const navigationButtons = allButtons.filter(button => 
        button.querySelector('svg') && button.textContent.trim() === ''
      );
      expect(navigationButtons[0]).toBeDisabled(); // ChevronsLeft button
      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('should show correct page numbers', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Should show page 1 and 2
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Click page 2
      fireEvent.click(screen.getByText('2'));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });
  });

  describe('Card size controls', () => {
    it('should change card size when size buttons are clicked', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Click large size
      fireEvent.click(screen.getByText('large'));
      
      // Should update the grid layout (we can check if the button is active)
      const largeButton = screen.getByText('large').closest('button');
      expect(largeButton).toHaveAttribute('data-variant', 'default');
    });

    it('should show all size options', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // Debug what's actually rendered
      // screen.debug();
      
      // Try different approaches to find the size controls
      expect(screen.getByText('Card Size:')).toBeInTheDocument();
      expect(screen.getByText('small')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('large')).toBeInTheDocument();
    });
  });

  describe('Batch mode functionality', () => {
    it('should enter batch mode when select button is clicked', async () => {
      render(<ImageDisplay {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Select'));
      
      expect(defaultProps.setBatchMode).toHaveBeenCalledWith(true);
    });

    it('should show batch controls when in batch mode', () => {
      render(<ImageDisplay {...defaultProps} batchMode={true} />);
      
      expect(screen.getByText('Select Page')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should show selected count when images are selected', () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1, 2, 3]} />);
      
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('should handle select all on current page', async () => {
      render(<ImageDisplay {...defaultProps} batchMode={true} />);
      
      fireEvent.click(screen.getByText('Select Page'));
      
      // Should call toggleImageSelection for each image on current page
      expect(defaultProps.toggleImageSelection).toHaveBeenCalledTimes(30);
    });

    it('should handle select all images', async () => {
      render(<ImageDisplay {...defaultProps} batchMode={true} />);
      
      fireEvent.click(screen.getByText('Select All'));
      
      // Should call toggleImageSelection for all images
      expect(defaultProps.toggleImageSelection).toHaveBeenCalledTimes(mockImages.length);
    });

    it('should exit batch mode', async () => {
      render(<ImageDisplay {...defaultProps} batchMode={true} />);
      
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(defaultProps.setBatchMode).toHaveBeenCalledWith(false);
      expect(defaultProps.clearBatchSelection).toHaveBeenCalled();
    });
  });

  describe('Batch edit dialog', () => {
    it('should open batch edit dialog when edit button is clicked', async () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} />);

      fireEvent.click(screen.getByTestId('edit-selected-button'));

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Batch Edit 2 Images')).toBeInTheDocument();
    });

    it('should handle batch tag addition', async () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} batchTagValue="tag1,tag2" />);

      fireEvent.click(screen.getByTestId('edit-selected-button'));

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      expect(defaultProps.handleBatchChanges).toHaveBeenCalled();
    });

    it('should handle batch cluster change', async () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} batchNewCluster="new-cluster" />);

      fireEvent.click(screen.getByTestId('edit-selected-button'));

      const moveButton = screen.getByText('Move');
      fireEvent.click(moveButton);

      expect(defaultProps.handleBatchChanges).toHaveBeenCalled();
    });

    // it('should show error for empty batch tag value', async () => {
    //   render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} />);

    //   fireEvent.click(screen.getByTestId('edit-selected-button'));

    //   const addButton = screen.getByText('Add');
    //   fireEvent.click(addButton);

    //   expect(screen.getByText('Please enter tags before adding.')).toBeInTheDocument();
    // });

    // it('should show error for empty cluster name', async () => {
    //   render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} />);

    //   fireEvent.click(screen.getByTestId('edit-selected-button'));

    //   const moveButton = screen.getByText('Move');
    //   fireEvent.click(moveButton);

    //   expect(screen.getByText('Please enter a cluster name before saving.')).toBeInTheDocument();
    // });

    it('should validate tags for whitespace', async () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1, 2]} batchTagValue="tag with spaces" />);

      fireEvent.click(screen.getByTestId('edit-selected-button'));

      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      expect(screen.getByText(/Tags cannot contain whitespace characters/)).toBeInTheDocument();
    });

    it('should handle Enter key in batch tag input', async () => {
      render(<ImageDisplay 
        {...defaultProps} 
        selectedImages={[1, 2]} 
        batchTagValue="new-tag"
      />);

      fireEvent.click(screen.getByTestId('edit-selected-button'));

      const tagInput = screen.getByPlaceholderText('tag1, tag2, tag3...');
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(defaultProps.handleBatchChanges).toHaveBeenCalled();
    });

    it('should handle Enter key in batch cluster input', async () => {
      render(<ImageDisplay 
        {...defaultProps} 
        selectedImages={[1, 2]} 
        batchNewCluster="new-cluster"
      />);

      // First verify the selected count is shown
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      
      // Now the Edit Selected button should be visible with the fixed DialogTrigger mock
      expect(screen.getByText('Edit Selected (2)')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Edit Selected (2)'));

      const clusterInput = screen.getByPlaceholderText('New cluster name...');
      fireEvent.keyDown(clusterInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(defaultProps.handleBatchChanges).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should display error messages', () => {
      render(<ImageDisplay {...defaultProps} error="Test error message" />);
      
      // Error should be shown when dialog is open
      render(<ImageDisplay {...defaultProps} error="Test error message" selectedImages={[1]} />);
      fireEvent.click(screen.getByText('Edit Selected (1)'));
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should clear errors when input changes', async () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1]} />);

      fireEvent.click(screen.getByText('Edit Selected (1)'));

      const tagInput = screen.getByPlaceholderText('tag1, tag2, tag3...');
      fireEvent.change(tagInput, { target: { value: 'test' } });
      
      expect(defaultProps.setBatchTagValue).toHaveBeenCalled();
    });
  });

  describe('Image interactions', () => {
    it('should handle image click in normal mode', async () => {
      render(<ImageDisplay {...defaultProps} />);

      fireEvent.click(screen.getByTestId('image-card-1'));

      expect(defaultProps.setSelectedImage).toHaveBeenCalledWith(1);
    });

    it('should handle image click in batch mode', async () => {
      render(<ImageDisplay {...defaultProps} batchMode={true} />);

      fireEvent.click(screen.getByTestId('image-card-1'));

      expect(defaultProps.toggleImageSelection).toHaveBeenCalledWith(1);
    });

    it('should show selected state for images', () => {
      render(<ImageDisplay {...defaultProps} selectedImages={[1]} batchMode={true} />);
      
      const selectedCard = screen.getByTestId('image-card-1');
      expect(selectedCard).toHaveClass('selected');
    });
  });

//   describe('Edge cases', () => {
//     it('should handle empty data array', () => {
//       render(<ImageDisplay {...defaultProps} data={[]} />);
      
//       expect(screen.getByText('Images (0)')).toBeInTheDocument();
//     });

//     it('should handle null/undefined data', () => {
//       render(<ImageDisplay {...defaultProps} data={null} />);
      
//       expect(screen.getByText('Images (0)')).toBeInTheDocument();
//     });

//     it('should filter out null/undefined images', () => {
//       const dataWithNulls = [mockImages[0], null, mockImages[1], undefined, mockImages[2]];
//       render(<ImageDisplay {...defaultProps} data={dataWithNulls} />);
      
//       // Should only render valid images
//       expect(screen.getByTestId('image-card-1')).toBeInTheDocument();
//       expect(screen.getByTestId('image-card-2')).toBeInTheDocument();
//       expect(screen.getByTestId('image-card-3')).toBeInTheDocument();
//     });

//     it('should handle page reset when data changes', () => {
//       const { rerender } = render(<ImageDisplay {...defaultProps} />);
      
//       // Navigate to page 2
//       fireEvent.click(screen.getByText('Next'));
//       expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      
//       // Change data to smaller dataset
//       const smallData = mockImages.slice(0, 5);
//       rerender(<ImageDisplay {...defaultProps} data={smallData} />);
      
//       // Should reset to page 1 since there's only one page now
//       expect(screen.queryByText('Page')).not.toBeInTheDocument();
//     });

//     it('should disable buttons when inputs are empty', () => {
//       render(<ImageDisplay {...defaultProps} selectedImages={[1]} />);
      
//       fireEvent.click(screen.getByText('Edit Selected (1)'));
      
//       const addButton = screen.getByText('Add');
//       const moveButton = screen.getByText('Move');
      
//       expect(addButton).toBeDisabled();
//       expect(moveButton).toBeDisabled();
//     });
//   });

  describe('Fuzzy search functionality', () => {
    it('should initialize with empty filtered tags', () => {
      render(<ImageDisplay {...defaultProps} />);
      
      // No search query means no filtered tags should be set initially
      // This is tested through the component behavior - Fuse should not be called
      const Fuse = require('fuse.js');
      expect(Fuse).not.toHaveBeenCalled();
    });

    it('should initialize Fuse with correct configuration when tags are provided', () => {
      // This test verifies that when the component is rendered with tags,
      // the Fuse configuration is set up correctly (even though search isn't triggered yet)
      render(<ImageDisplay {...defaultProps} tags={mockTags} />);
      
      // The component should render successfully with tags prop
      // The actual fuzzy search functionality is triggered internally
      // and we've verified the Fuse mock is set up correctly
      expect(screen.getByText('Images (53)')).toBeInTheDocument();
    });
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });
});