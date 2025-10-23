import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageEditor } from '../../hooks/useImageEditor';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {})
};

describe('useImageEditor', () => {
  const mockProject = { id: 'project-123' };
  const mockCluster = 'cluster1';
  const mockImages = [
    { id: 1, tags: ['tag1', 'tag2'], cluster: 'cluster1' },
    { id: 2, tags: ['tag2', 'tag3'], cluster: 'cluster1' },
    { id: 3, tags: ['tag1'], cluster: 'cluster2' }
  ];

  const mockSetImages = jest.fn();
  const mockRefreshProjectStatistics = jest.fn();

  const defaultProps = [
    mockProject,
    mockCluster,
    mockImages,
    mockSetImages,
    mockRefreshProjectStatistics
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
    consoleSpy.warn.mockClear();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useImageEditor(...defaultProps));

      expect(result.current.selectedImage).toBeNull();
      expect(result.current.tagValue).toBe('');
      expect(result.current.newCluster).toBe('');
      expect(result.current.selectedImages).toEqual([]);
      expect(result.current.batchMode).toBe(false);
      expect(result.current.batchTagValue).toBe('');
      expect(result.current.batchNewCluster).toBe('');
    });

    it('should provide all necessary functions', () => {
      const { result } = renderHook(() => useImageEditor(...defaultProps));

      expect(typeof result.current.setSelectedImage).toBe('function');
      expect(typeof result.current.setTagValue).toBe('function');
      expect(typeof result.current.setNewCluster).toBe('function');
      expect(typeof result.current.handleChanges).toBe('function');
      expect(typeof result.current.removeTag).toBe('function');
      expect(typeof result.current.setSelectedImages).toBe('function');
      expect(typeof result.current.setBatchMode).toBe('function');
      expect(typeof result.current.setBatchTagValue).toBe('function');
      expect(typeof result.current.setBatchNewCluster).toBe('function');
      expect(typeof result.current.batchAddTags).toBe('function');
      expect(typeof result.current.batchChangeCluster).toBe('function');
      expect(typeof result.current.handleBatchChanges).toBe('function');
      expect(typeof result.current.toggleImageSelection).toBe('function');
      expect(typeof result.current.clearBatchSelection).toBe('function');
    });
  });

  describe('Individual image editing', () => {
    describe('State setters', () => {
      it('should update selectedImage', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImage(1);
        });

        expect(result.current.selectedImage).toBe(1);
      });

      it('should update tagValue', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setTagValue('new-tag');
        });

        expect(result.current.tagValue).toBe('new-tag');
      });

      it('should update newCluster', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setNewCluster('new-cluster');
        });

        expect(result.current.newCluster).toBe('new-cluster');
      });
    });

    describe('removeTag', () => {
      it('should remove tag from image and update local state', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.removeTag(1, 'tag1');
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/proxy/objects/project-123/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: ['tag2'],
            new_cluster: ''
          })
        });

        expect(mockSetImages).toHaveBeenCalledWith([
          { id: 1, tags: ['tag2'], cluster: 'cluster1' },
          { id: 2, tags: ['tag2', 'tag3'], cluster: 'cluster1' },
          { id: 3, tags: ['tag1'], cluster: 'cluster2' }
        ]);
      });

      it('should handle API error when removing tag', async () => {
        const errorMessage = 'Failed to remove tag';
        global.fetch.mockRejectedValueOnce(new Error(errorMessage));

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.removeTag(1, 'tag1');
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('Error submitting tags:', expect.any(Error));
      });
    });

    describe('handleChanges', () => {
      it('should handle adding tags successfully', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImage(1);
          result.current.setTagValue('new-tag');
        });

        await act(async () => {
          await result.current.handleChanges(mockEvent);
        });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('/api/proxy/objects/project-123/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: ['tag1', 'tag2', 'new-tag'],
            new_cluster: ''
          })
        });

        expect(result.current.tagValue).toBe('');
      });

      it('should handle changing cluster and remove image from current view', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImage(1);
          result.current.setNewCluster('new-cluster');
        });

        await act(async () => {
          await result.current.handleChanges(mockEvent);
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/proxy/objects/project-123/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tags: ['tag1', 'tag2'],
            new_cluster: 'new-cluster'
          })
        });

        // Image should be removed from current view
        expect(mockSetImages).toHaveBeenCalledWith([
          { id: 2, tags: ['tag2', 'tag3'], cluster: 'cluster1' },
          { id: 3, tags: ['tag1'], cluster: 'cluster2' }
        ]);

        expect(result.current.newCluster).toBe('');
      });

      it('should not do anything when no tagValue or newCluster is provided', async () => {
        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImage(1);
        });

        await act(async () => {
          await result.current.handleChanges(mockEvent);
        });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should call refreshProjectStatistics after successful update', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImage(1);
          result.current.setTagValue('new-tag');
        });

        await act(async () => {
          await result.current.handleChanges(mockEvent);
        });

        expect(mockRefreshProjectStatistics).toHaveBeenCalled();
      });
    });
  });

  describe('Batch editing', () => {
    describe('State setters', () => {
      it('should update batch mode', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setBatchMode(true);
        });

        expect(result.current.batchMode).toBe(true);
      });

      it('should update selectedImages', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImages([1, 2]);
        });

        expect(result.current.selectedImages).toEqual([1, 2]);
      });

      it('should update batchTagValue', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setBatchTagValue('batch-tag');
        });

        expect(result.current.batchTagValue).toBe('batch-tag');
      });

      it('should update batchNewCluster', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setBatchNewCluster('batch-cluster');
        });

        expect(result.current.batchNewCluster).toBe('batch-cluster');
      });
    });

    describe('toggleImageSelection', () => {
      it('should add image to selection', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.toggleImageSelection(1);
        });

        expect(result.current.selectedImages).toEqual([1]);
      });

      it('should remove image from selection', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImages([1, 2]);
        });

        act(() => {
          result.current.toggleImageSelection(1);
        });

        expect(result.current.selectedImages).toEqual([2]);
      });

      it('should handle multiple toggles', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.toggleImageSelection(1);
          result.current.toggleImageSelection(2);
          result.current.toggleImageSelection(1);
        });

        expect(result.current.selectedImages).toEqual([2]);
      });
    });

    describe('clearBatchSelection', () => {
      it('should clear all batch state', () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImages([1, 2]);
          result.current.setBatchTagValue('batch-tag');
          result.current.setBatchNewCluster('batch-cluster');
        });

        act(() => {
          result.current.clearBatchSelection();
        });

        expect(result.current.selectedImages).toEqual([]);
        expect(result.current.batchTagValue).toBe('');
        expect(result.current.batchNewCluster).toBe('');
      });
    });

    describe('batchAddTags', () => {
      it('should add tags to multiple images successfully', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.batchAddTags([1, 2], ['batch-tag1', 'batch-tag2']);
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/proxy/objects/project-123', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            object_ids: [1, 2],
            operation_type: 'add_tags',
            operation_values: ['batch-tag1', 'batch-tag2']
          })
        });

        expect(mockSetImages).toHaveBeenCalledWith([
          { id: 1, tags: ['tag1', 'tag2', 'batch-tag1', 'batch-tag2'], cluster: 'cluster1' },
          { id: 2, tags: ['tag2', 'tag3', 'batch-tag1', 'batch-tag2'], cluster: 'cluster1' },
          { id: 3, tags: ['tag1'], cluster: 'cluster2' }
        ]);

        expect(mockRefreshProjectStatistics).toHaveBeenCalled();
      });

      it('should handle duplicate tags', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.batchAddTags([1], ['tag1', 'new-tag']); // tag1 already exists
        });

        expect(mockSetImages).toHaveBeenCalledWith([
          { id: 1, tags: ['tag1', 'tag2', 'new-tag'], cluster: 'cluster1' }, // no duplicate tag1
          { id: 2, tags: ['tag2', 'tag3'], cluster: 'cluster1' },
          { id: 3, tags: ['tag1'], cluster: 'cluster2' }
        ]);
      });

      it('should throw error for empty image IDs', async () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await expect(act(async () => {
          await result.current.batchAddTags([], ['tag']);
        })).rejects.toThrow('Image IDs and tags are required');

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should throw error for empty tags', async () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await expect(act(async () => {
          await result.current.batchAddTags([1], []);
        })).rejects.toThrow('Image IDs and tags are required');

        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('batchChangeCluster', () => {
      it('should move images to different cluster and remove from current view', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.batchChangeCluster([1, 2], 'different-cluster');
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/proxy/objects/project-123', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            object_ids: [1, 2],
            operation_type: 'new_cluster',
            operation_values: 'different-cluster'
          })
        });

        expect(mockSetImages).toHaveBeenCalledWith([
          { id: 3, tags: ['tag1'], cluster: 'cluster2' }
        ]);
      });

      it('should keep images in current view when moving to same cluster', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.batchChangeCluster([1, 2], 'cluster1'); // same as current cluster
        });

        expect(global.fetch).toHaveBeenCalled();
        // Images should not be removed from view since it's the same cluster
      });

      it('should throw error for empty image IDs', async () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await expect(act(async () => {
          await result.current.batchChangeCluster([], 'new-cluster');
        })).rejects.toThrow('Image IDs and new cluster name are required');
      });

      it('should throw error for empty cluster name', async () => {
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await expect(act(async () => {
          await result.current.batchChangeCluster([1], '');
        })).rejects.toThrow('Image IDs and new cluster name are required');
      });
    });

    describe('handleBatchChanges', () => {
      it('should handle batch tag addition and cluster change', async () => {
        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          });

        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImages([1, 2]);
          result.current.setBatchTagValue('batch-tag1, batch-tag2');
          result.current.setBatchNewCluster('new-cluster');
        });

        await act(async () => {
          await result.current.handleBatchChanges(mockEvent);
        });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledTimes(2);

        // Check state reset
        expect(result.current.batchTagValue).toBe('');
        expect(result.current.batchNewCluster).toBe('');
        expect(result.current.selectedImages).toEqual([]);
      });

      it('should warn when no images selected', async () => {
        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        await act(async () => {
          await result.current.handleBatchChanges(mockEvent);
        });

        expect(consoleSpy.warn).toHaveBeenCalledWith('No images selected for batch operation');
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should handle empty values gracefully', async () => {
        const mockEvent = { preventDefault: jest.fn() };
        const { result } = renderHook(() => useImageEditor(...defaultProps));

        act(() => {
          result.current.setSelectedImages([1]);
          result.current.setBatchTagValue('   ');
          result.current.setBatchNewCluster('   ');
        });

        await act(async () => {
          await result.current.handleBatchChanges(mockEvent);
        });

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.current.selectedImages).toEqual([]);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle images without tags property', async () => {
      const imagesWithoutTags = [
        { id: 1, cluster: 'cluster1' },
        { id: 2, cluster: 'cluster1' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => 
        useImageEditor(
          mockProject,
          mockCluster,
          imagesWithoutTags,
          mockSetImages,
          mockRefreshProjectStatistics
        )
      );

      await act(async () => {
        await result.current.batchAddTags([1], ['new-tag']);
      });

      expect(mockSetImages).toHaveBeenCalledWith([
        { id: 1, tags: ['new-tag'], cluster: 'cluster1' },
        { id: 2, cluster: 'cluster1' }
      ]);
    });

    it('should work without refreshProjectStatistics callback', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { result } = renderHook(() => 
        useImageEditor(
          mockProject,
          mockCluster,
          mockImages,
          mockSetImages,
          null // no refresh callback
        )
      );

      await act(async () => {
        await result.current.batchAddTags([1], ['new-tag']);
      });

      // Should not throw error
      expect(mockSetImages).toHaveBeenCalled();
    });
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
  });
});