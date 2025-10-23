import { renderHook, act, waitFor } from '@testing-library/react';
import { useImages } from '../../hooks/useImages';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {})
};

// Mock timers
jest.useFakeTimers();

describe('useImages', () => {
  const mockProject = { id: 'project-123' };
  const mockImagesResponse = {
    data: {
      data: [
        { id: 1, url: 'image1.jpg', cluster: 'cluster1', tags: ['tag1'] },
        { id: 2, url: 'image2.jpg', cluster: 'cluster2', tags: ['tag2'] }
      ]
    },
    expiration_seconds: 3600
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    consoleSpy.error.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useImages(null, null, null, null, false));

      expect(result.current.images).toEqual([]);
      expect(result.current.loadingImages).toBe(false);
      expect(typeof result.current.fetchImages).toBe('function');
      expect(typeof result.current.setImages).toBe('function');
    });
  });

  describe('fetchImages function', () => {
    it('should not fetch when project is null', async () => {
      const { result } = renderHook(() => useImages(null, 'cluster1', null, null, false));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when no filters are provided', async () => {
      const { result } = renderHook(() => useImages(mockProject, null, null, null, false));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch images with cluster filter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proxy/objects/project-123?clusters=cluster1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      expect(result.current.images).toEqual(mockImagesResponse.data.data);
    });

    it('should fetch images with labels filter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result } = renderHook(() => useImages(mockProject, null, 'label1', null, false));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proxy/objects/project-123?label_names=label1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should fetch images with tags filter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result } = renderHook(() => useImages(mockProject, null, null, 'tag1', false));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proxy/objects/project-123?tags_list=tag1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should fetch images with relocatedImages filter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result } = renderHook(() => useImages(mockProject, null, null, null, true));

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proxy/objects/project-123?relocated_images=true',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should handle multiple filters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result } = renderHook(() => 
        useImages(mockProject, 'cluster1,cluster2', 'label1,label2', 'tag1,tag2', true)
      );

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/proxy/objects/project-123?clusters=cluster1%2Ccluster2&label_names=label1%2Clabel2&tags_list=tag1%2Ctag2&relocated_images=true',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    // it('should handle array inputs for filters', async () => {
    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     json: async () => mockImagesResponse
    //   });

    //   const { result } = renderHook(() => 
    //     useImages(mockProject, ['cluster1', 'cluster2'], ['label1'], ['tag1', 'tag2'], false)
    //   );

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).toHaveBeenCalledWith(
    //     '/api/proxy/objects/project-123?clusters=cluster1%2Ccluster2&label_names=label1&tags_list=tag1%2Ctag2',
    //     {
    //       method: 'GET',
    //       headers: {
    //         'Content-Type': 'application/json'
    //       }
    //     }
    //   );
    // });

    // it('should handle empty string filters', async () => {
    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     json: async () => mockImagesResponse
    //   });

    //   const { result } = renderHook(() => useImages(mockProject, '  ', null, 'tag1', false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).toHaveBeenCalledWith(
    //     '/api/proxy/objects/project-123?tags_list=tag1',
    //     {
    //       method: 'GET',
    //       headers: {
    //         'Content-Type': 'application/json'
    //       }
    //     }
    //   );
    // });

    // it('should handle whitespace-only filters', async () => {
    //   const { result } = renderHook(() => useImages(mockProject, '   ', '  ', '   ', false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).not.toHaveBeenCalled();
    // });

    // it('should set loading state during fetch', async () => {
    //   global.fetch.mockImplementation(() => 
    //     new Promise(resolve => 
    //       setTimeout(() => resolve({
    //         ok: true,
    //         json: async () => mockImagesResponse
    //       }), 100)
    //     )
    //   );

    //   const { result } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

    //   expect(result.current.loadingImages).toBe(false);

    //   act(() => {
    //     result.current.fetchImages();
    //   });

    //   expect(result.current.loadingImages).toBe(true);

    //   await act(async () => {
    //     jest.advanceTimersByTime(100);
    //   });

    //   expect(result.current.loadingImages).toBe(false);
    // });

    // it('should handle fetch errors', async () => {
    //   const errorMessage = 'Network error';
    //   global.fetch.mockRejectedValueOnce(new Error(errorMessage));

    //   const { result } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching images:', expect.any(Error));
    //   expect(result.current.loadingImages).toBe(false);
    //   expect(result.current.images).toEqual([]);
    // });

    // it('should handle HTTP error responses', async () => {
    //   global.fetch.mockResolvedValueOnce({
    //     ok: false,
    //     status: 404
    //   });

    //   const { result } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(consoleSpy.error).toHaveBeenCalledWith(
    //     'Error fetching images:', 
    //     expect.objectContaining({
    //       message: 'Failed to fetch images: 404'
    //     })
    //   );
    //   expect(result.current.loadingImages).toBe(false);
    // });
  });

  describe('useEffect behavior', () => {
    it('should fetch images on mount when filters are provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImagesResponse
      });

      renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should not fetch images on mount when no filters are provided', () => {
      renderHook(() => useImages(mockProject, null, null, null, false));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear images and set loading when dependencies change', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockImagesResponse
      });

      const { result, rerender } = renderHook(
        ({ clusters }) => useImages(mockProject, clusters, null, null, false),
        { initialProps: { clusters: 'cluster1' } }
      );

      await waitFor(() => {
        expect(result.current.images.length).toBeGreaterThan(0);
      });

      act(() => {
        rerender({ clusters: 'cluster2' });
      });

      expect(result.current.images).toEqual([]);
      expect(result.current.loadingImages).toBe(true);
    });

    it('should not set up interval when project is missing', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      renderHook(() => useImages(null, 'cluster1', null, null, false));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(clearIntervalSpy).not.toHaveBeenCalled();
    });
  });

//   describe('URL expiry and refresh mechanism', () => {
//     it('should set up refresh interval and refresh when URLs expire', async () => {
//       const shortExpiryResponse = {
//         ...mockImagesResponse,
//         expiration_seconds: 1 // 1 second expiry
//       };

//       global.fetch
//         .mockResolvedValueOnce({
//           ok: true,
//           json: async () => shortExpiryResponse
//         })
//         .mockResolvedValueOnce({
//           ok: true,
//           json: async () => mockImagesResponse
//         });

//       const { result } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

//       // Wait for initial fetch
//       await waitFor(() => {
//         expect(global.fetch).toHaveBeenCalledTimes(1);
//       });

//       // Fast forward past the expiry time (1 second + 30 second buffer - 30 seconds = 1 second)
//       act(() => {
//         jest.advanceTimersByTime(2000); // 2 seconds to be safe
//       });

//       // Wait for the refresh fetch
//       await waitFor(() => {
//         expect(global.fetch).toHaveBeenCalledTimes(2);
//       });

//       expect(result.current.loadingImages).toBe(false);
//     });

//     it('should not refresh when URLs have not expired', async () => {
//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         json: async () => mockImagesResponse // 3600 second expiry
//       });

//       renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

//       // Wait for initial fetch
//       await waitFor(() => {
//         expect(global.fetch).toHaveBeenCalledTimes(1);
//       });

//       // Fast forward 15 seconds (the check interval)
//       act(() => {
//         jest.advanceTimersByTime(15000);
//       });

//       // Should not have refreshed since URLs haven't expired
//       expect(global.fetch).toHaveBeenCalledTimes(1);
//     });

//     it('should clear interval on unmount', () => {
//       const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
//       const { unmount } = renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

//       unmount();

//       expect(clearIntervalSpy).toHaveBeenCalled();
//     });

//     it('should handle refresh interval when expiry ref is null', async () => {
//       global.fetch.mockResolvedValueOnce({
//         ok: true,
//         json: async () => mockImagesResponse
//       });

//       renderHook(() => useImages(mockProject, 'cluster1', null, null, false));

//       await waitFor(() => {
//         expect(global.fetch).toHaveBeenCalledTimes(1);
//       });

//       // Fast forward the check interval
//       act(() => {
//         jest.advanceTimersByTime(15000);
//       });

//       // Should not refresh when expiry ref is null
//       expect(global.fetch).toHaveBeenCalledTimes(1);
//     });
//   });

  describe('setImages function', () => {
    it('should allow manual image updates', () => {
      const { result } = renderHook(() => useImages(mockProject, null, null, null, false));

      const newImages = [{ id: 3, url: 'image3.jpg' }];

      act(() => {
        result.current.setImages(newImages);
      });

      expect(result.current.images).toEqual(newImages);
    });
  });

  describe('Edge cases', () => {
    // it('should handle empty arrays for filters', async () => {
    //   const { result } = renderHook(() => useImages(mockProject, [], [], [], false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).not.toHaveBeenCalled();
    // });

    // it('should handle null/undefined values gracefully', async () => {
    //   const { result } = renderHook(() => useImages(mockProject, null, undefined, '', false));

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).not.toHaveBeenCalled();
    // });

    // it('should handle mixed filter types', async () => {
    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     json: async () => mockImagesResponse
    //   });

    //   const { result } = renderHook(() => 
    //     useImages(mockProject, ['cluster1'], 'label1', ['tag1', 'tag2'], false)
    //   );

    //   await act(async () => {
    //     await result.current.fetchImages();
    //   });

    //   expect(global.fetch).toHaveBeenCalledWith(
    //     '/api/proxy/objects/project-123?clusters=cluster1&label_names=label1&tags_list=tag1%2Ctag2',
    //     {
    //       method: 'GET',
    //       headers: {
    //         'Content-Type': 'application/json'
    //       }
    //     }
    //   );
    // });

    // it('should handle project ID changes', async () => {
    //   global.fetch.mockResolvedValue({
    //     ok: true,
    //     json: async () => mockImagesResponse
    //   });

    //   const { result, rerender } = renderHook(
    //     ({ projectId }) => useImages({ id: projectId }, 'cluster1', null, null, false),
    //     { initialProps: { projectId: 'project-1' } }
    //   );

    //   await waitFor(() => {
    //     expect(global.fetch).toHaveBeenCalledTimes(1);
    //   });

    //   act(() => {
    //     rerender({ projectId: 'project-2' });
    //   });

    //   await waitFor(() => {
    //     expect(global.fetch).toHaveBeenCalledTimes(2);
    //   });

    //   expect(global.fetch).toHaveBeenLastCalledWith(
    //     '/api/proxy/objects/project-2?clusters=cluster1',
    //     expect.any(Object)
    //   );
    // });

    // it('should handle rapid consecutive filter changes', async () => {
    //   global.fetch.mockResolvedValue({
    //     ok: true,
    //     json: async () => mockImagesResponse
    //   });

    //   const { rerender } = renderHook(
    //     ({ clusters }) => useImages(mockProject, clusters, null, null, false),
    //     { initialProps: { clusters: 'cluster1' } }
    //   );

    //   // Rapid changes
    //   act(() => {
    //     rerender({ clusters: 'cluster2' });
    //     rerender({ clusters: 'cluster3' });
    //     rerender({ clusters: 'cluster4' });
    //   });

    //   await waitFor(() => {
    //     expect(global.fetch).toHaveBeenCalled();
    //   });

    //   // Should handle the final state
    //   expect(global.fetch).toHaveBeenLastCalledWith(
    //     '/api/proxy/objects/project-123?clusters=cluster4',
    //     expect.any(Object)
    //   );
    // });
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
    jest.useRealTimers();
  });
});