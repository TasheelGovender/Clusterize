import { renderHook, act } from '@testing-library/react';
import { useImageSearch } from '../../hooks/useImageSearch';

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {})
};

describe('useImageSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.error.mockClear();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useImageSearch());

      expect(result.current.clusters).toEqual([]);
      expect(result.current.labels).toEqual([]);
      expect(result.current.tags).toEqual([]);
      expect(result.current.relocatedImages).toBe(false);
      expect(result.current.searchTriggered).toBe(false);
      expect(typeof result.current.setClusters).toBe('function');
      expect(typeof result.current.setLabels).toBe('function');
      expect(typeof result.current.setTags).toBe('function');
      expect(typeof result.current.setRelocatedImages).toBe('function');
      expect(typeof result.current.setSearchTriggered).toBe('function');
      expect(typeof result.current.handleSearch).toBe('function');
      expect(typeof result.current.clearSearch).toBe('function');
    });
  });

  describe('Filter state setters', () => {
    it('should update clusters state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1', 'cluster2']);
      });

      expect(result.current.clusters).toEqual(['cluster1', 'cluster2']);
    });

    it('should update labels state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setLabels(['label1', 'label2']);
      });

      expect(result.current.labels).toEqual(['label1', 'label2']);
    });

    it('should update tags state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setTags(['tag1', 'tag2']);
      });

      expect(result.current.tags).toEqual(['tag1', 'tag2']);
    });

    it('should update relocatedImages state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setRelocatedImages(true);
      });

      expect(result.current.relocatedImages).toBe(true);
    });

    it('should update searchTriggered state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setSearchTriggered(true);
      });

      expect(result.current.searchTriggered).toBe(true);
    });
  });

  describe('handleSearch function', () => {
    it('should trigger search when clusters are provided', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1']);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should trigger search when labels are provided', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setLabels(['label1']);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should trigger search when tags are provided', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setTags(['tag1']);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should trigger search when relocatedImages is true', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setRelocatedImages(true);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should trigger search with multiple filters', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1']);
        result.current.setLabels(['label1']);
        result.current.setTags(['tag1']);
        result.current.setRelocatedImages(true);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should log error and not trigger search when no filters are provided', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Search input is empty.');
    });

    it('should log error and not trigger search when all filters are empty', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters([]);
        result.current.setLabels([]);
        result.current.setTags([]);
        result.current.setRelocatedImages(false);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Search input is empty.');
    });

    it('should trigger search even when some filters are empty but at least one is populated', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters([]);
        result.current.setLabels([]);
        result.current.setTags(['tag1']);
        result.current.setRelocatedImages(false);
      });

      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('clearSearch function', () => {
    it('should clear all search filters and reset searchTriggered', () => {
      const { result } = renderHook(() => useImageSearch());

      // Set up some search state
      act(() => {
        result.current.setClusters(['cluster1', 'cluster2']);
        result.current.setLabels(['label1']);
        result.current.setTags(['tag1', 'tag2']);
        result.current.setRelocatedImages(true);
        result.current.setSearchTriggered(true);
      });

      // Verify state is set
      expect(result.current.clusters).toEqual(['cluster1', 'cluster2']);
      expect(result.current.labels).toEqual(['label1']);
      expect(result.current.tags).toEqual(['tag1', 'tag2']);
      expect(result.current.relocatedImages).toBe(true);
      expect(result.current.searchTriggered).toBe(true);

      // Clear search
      act(() => {
        result.current.clearSearch();
      });

      // Verify everything is cleared
      expect(result.current.clusters).toEqual([]);
      expect(result.current.labels).toEqual([]);
      expect(result.current.tags).toEqual([]);
      expect(result.current.relocatedImages).toBe(false);
      expect(result.current.searchTriggered).toBe(false);
    });

    it('should work when called on already empty state', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.clusters).toEqual([]);
      expect(result.current.labels).toEqual([]);
      expect(result.current.tags).toEqual([]);
      expect(result.current.relocatedImages).toBe(false);
      expect(result.current.searchTriggered).toBe(false);
    });

    it('should work when called multiple times', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1']);
        result.current.setSearchTriggered(true);
      });

      act(() => {
        result.current.clearSearch();
        result.current.clearSearch();
        result.current.clearSearch();
      });

      expect(result.current.clusters).toEqual([]);
      expect(result.current.searchTriggered).toBe(false);
    });
  });

  describe('Search workflow integration', () => {
    it('should support complete search workflow', () => {
      const { result } = renderHook(() => useImageSearch());

      // Initial state
      expect(result.current.searchTriggered).toBe(false);

      // Set filters
      act(() => {
        result.current.setClusters(['cluster1']);
        result.current.setTags(['tag1']);
      });

      // Trigger search
      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);

      // Clear search
      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.clusters).toEqual([]);
      expect(result.current.tags).toEqual([]);
      expect(result.current.searchTriggered).toBe(false);
    });

    // it('should handle multiple search cycles', () => {
    //   const { result } = renderHook(() => useImageSearch());

    //   // First search cycle
    //   act(() => {
    //     result.current.setClusters(['cluster1']);
    //     result.current.handleSearch();
    //   });

    //   expect(result.current.searchTriggered).toBe(true);

    //   act(() => {
    //     result.current.clearSearch();
    //   });

    //   expect(result.current.searchTriggered).toBe(false);

    //   // Second search cycle
    //   act(() => {
    //     result.current.setTags(['tag1']);
    //   });
      
    //   // Verify tags are set before calling handleSearch
    //   expect(result.current.tags).toEqual(['tag1']);
      
    //   act(() => {
    //     result.current.handleSearch();
    //   });

    //   expect(result.current.searchTriggered).toBe(true);
    //   expect(result.current.tags).toEqual(['tag1']);
    // });

    it('should handle search trigger reset without clearing filters', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1']);
        result.current.setTags(['tag1']);
      });
      
      // Verify filters are set before calling handleSearch
      expect(result.current.clusters).toEqual(['cluster1']);
      expect(result.current.tags).toEqual(['tag1']);
      
      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);

      // Reset only searchTriggered
      act(() => {
        result.current.setSearchTriggered(false);
      });

      expect(result.current.searchTriggered).toBe(false);
      expect(result.current.clusters).toEqual(['cluster1']);
      expect(result.current.tags).toEqual(['tag1']);

      // Should be able to search again with existing filters
      act(() => {
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(true);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle empty arrays vs null/undefined for filters', () => {
      const { result } = renderHook(() => useImageSearch());

      // Empty arrays should be treated as no filters
      act(() => {
        result.current.setClusters([]);
        result.current.setLabels([]);
        result.current.setTags([]);
        result.current.handleSearch();
      });

      expect(result.current.searchTriggered).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Search input is empty.');
    });

    it('should handle boolean toggle for relocatedImages', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setRelocatedImages(true);
      });

      expect(result.current.relocatedImages).toBe(true);

      act(() => {
        result.current.setRelocatedImages(false);
      });

      expect(result.current.relocatedImages).toBe(false);
    });

    it('should handle concurrent filter updates', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1']);
        result.current.setLabels(['label1']);
        result.current.setTags(['tag1']);
        result.current.setRelocatedImages(true);
      });

      expect(result.current.clusters).toEqual(['cluster1']);
      expect(result.current.labels).toEqual(['label1']);
      expect(result.current.tags).toEqual(['tag1']);
      expect(result.current.relocatedImages).toBe(true);
    });

    it('should maintain filter independence', () => {
      const { result } = renderHook(() => useImageSearch());

      // Update clusters without affecting other filters
      act(() => {
        result.current.setClusters(['cluster1']);
      });

      expect(result.current.clusters).toEqual(['cluster1']);
      expect(result.current.labels).toEqual([]);
      expect(result.current.tags).toEqual([]);
      expect(result.current.relocatedImages).toBe(false);

      // Update multiple filters independently
      act(() => {
        result.current.setLabels(['label1']);
      });

      expect(result.current.clusters).toEqual(['cluster1']);
      expect(result.current.labels).toEqual(['label1']);
      expect(result.current.tags).toEqual([]);
      expect(result.current.relocatedImages).toBe(false);
    });

    it('should handle filter overwriting', () => {
      const { result } = renderHook(() => useImageSearch());

      act(() => {
        result.current.setClusters(['cluster1', 'cluster2']);
      });

      expect(result.current.clusters).toEqual(['cluster1', 'cluster2']);

      act(() => {
        result.current.setClusters(['cluster3']);
      });

      expect(result.current.clusters).toEqual(['cluster3']);
    });
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
  });
});