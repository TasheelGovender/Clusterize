import { renderHook, act, waitFor } from '@testing-library/react';
import { useProject } from '../../hooks/useProject';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {})
};

describe('useProject', () => {
  const mockProjectData = {
    id: 'project-123',
    name: 'Test Project',
    description: 'A test project'
  };

  const mockStatistics = {
    totalImages: 100,
    totalClusters: 5,
    totalTags: 20
  };

  const mockProjectResponse = {
    data: mockProjectData,
    stats: mockStatistics
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useProject('project-123'));

      expect(result.current.project).toBeNull();
      expect(result.current.statistics).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.silentRefetch).toBe('function');
      expect(typeof result.current.resetProject).toBe('function');
      expect(typeof result.current.setStatistics).toBe('function');
    });
  });

  describe('fetchProject on mount', () => {
    it('should fetch project data on mount when projectId is provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse
      });

      const { result } = renderHook(() => useProject('project-123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/proxy/project/project-123', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(result.current.project).toEqual(mockProjectData);
      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.error).toBeNull();
      expect(consoleSpy.log).toHaveBeenCalledWith('Fetched project data:', mockProjectResponse);
    });

    it('should not fetch when projectId is null', () => {
      renderHook(() => useProject(null));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when projectId is undefined', () => {
      renderHook(() => useProject(undefined));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when projectId is empty string', () => {
      renderHook(() => useProject(''));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors on mount', async () => {
      const errorMessage = 'Network error';
      global.fetch.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project).toBeNull();
      expect(result.current.statistics).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching project:', expect.any(Error));
    });

    it('should handle HTTP error responses on mount', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project).toBeNull();
      expect(result.current.error).toBe('Failed to fetch project: 404');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching project:', expect.any(Error));
    });
  });

  describe('projectId changes', () => {
    it('should refetch when projectId changes', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'project-1' }, stats: { totalImages: 50 } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'project-2' }, stats: { totalImages: 75 } })
        });

      const { result, rerender } = renderHook(
        ({ projectId }) => useProject(projectId),
        { initialProps: { projectId: 'project-1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project.id).toBe('project-1');

      act(() => {
        rerender({ projectId: 'project-2' });
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project.id).toBe('project-2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not fetch when projectId changes to null', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse
      });

      const { result, rerender } = renderHook(
        ({ projectId }) => useProject(projectId),
        { initialProps: { projectId: 'project-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        rerender({ projectId: null });
      });

      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial fetch
    });
  });

  describe('refetch function', () => {
    it('should refetch project data', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...mockProjectData, name: 'Updated Project' },
            stats: { ...mockStatistics, totalImages: 150 }
          })
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.project.name).toBe('Test Project');

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.project.name).toBe('Updated Project');
      expect(result.current.statistics.totalImages).toBe(150);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during refetch', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockRejectedValueOnce(new Error('Refetch error'));

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch error');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching project:', expect.any(Error));
    });

    it('should not refetch when projectId is null', async () => {
      const { result } = renderHook(() => useProject(null));

      await act(async () => {
        await result.current.refetch();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('silentRefetch function', () => {
    it('should refetch without updating loading state', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...mockProjectData, name: 'Silently Updated' },
            stats: mockStatistics
          })
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const loadingBeforeSilentRefetch = result.current.loading;

      await act(async () => {
        await result.current.silentRefetch();
      });

      expect(result.current.loading).toBe(loadingBeforeSilentRefetch); // Loading state unchanged
      expect(result.current.project.name).toBe('Silently Updated');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not update error state during silent refetch', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockRejectedValueOnce(new Error('Silent error'));

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.silentRefetch();
      });

      expect(result.current.error).toBeNull(); // Error state unchanged
      expect(consoleSpy.error).toHaveBeenCalledWith('Error fetching project:', expect.any(Error));
    });
  });

  describe('resetProject function', () => {
    it('should reset project and refetch data', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Project reset successfully' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { ...mockProjectData, name: 'Reset Project' },
            stats: { totalImages: 0, totalClusters: 0, totalTags: 0 }
          })
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resetProject();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/proxy/project/project-123/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(result.current.project.name).toBe('Reset Project');
      expect(result.current.statistics.totalImages).toBe(0);
      expect(consoleSpy.log).toHaveBeenCalledWith('Project reset successfully:', { message: 'Project reset successfully' });
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + reset + refetch
    });

    it('should handle reset errors', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockRejectedValueOnce(new Error('Reset failed'));

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resetProject();
      });

      expect(result.current.error).toBe('Reset failed');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error resetting project:', expect.any(Error));
      expect(result.current.loading).toBe(false);
    });

    it('should handle HTTP error responses during reset', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resetProject();
      });

      expect(result.current.error).toBe('Failed to reset project: 500');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error resetting project:', expect.any(Error));
    });

    it('should not reset when projectId is null', async () => {
      const { result } = renderHook(() => useProject(null));

      await act(async () => {
        await result.current.resetProject();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('setStatistics function', () => {
    it('should allow manual statistics updates', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjectResponse
      });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.statistics.totalImages).toBe(100);

      const newStatistics = { totalImages: 200, totalClusters: 10, totalTags: 40 };

      act(() => {
        result.current.setStatistics(newStatistics);
      });

      expect(result.current.statistics).toEqual(newStatistics);
    });
  });

  describe('Loading state management', () => {
    it('should manage loading state correctly during operations', async () => {
      global.fetch.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockProjectResponse
          }), 100)
        )
      );

      const { result } = renderHook(() => useProject('project-123'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error state management', () => {
    it('should clear error on successful refetch', async () => {
      global.fetch
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.project).toEqual(mockProjectData);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid projectId changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockProjectResponse
      });

      const { rerender } = renderHook(
        ({ projectId }) => useProject(projectId),
        { initialProps: { projectId: 'project-1' } }
      );

      act(() => {
        rerender({ projectId: 'project-2' });
        rerender({ projectId: 'project-3' });
        rerender({ projectId: 'project-4' });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/proxy/project/project-4',
        expect.any(Object)
      );
    });

    it('should handle concurrent operations', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Reset successful' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjectResponse
        });

      const { result } = renderHook(() => useProject('project-123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const refetchPromise = act(async () => {
        await result.current.refetch();
      });

      const silentRefetchPromise = act(async () => {
        await result.current.silentRefetch();
      });

      await Promise.all([refetchPromise, silentRefetchPromise]);

      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + refetch + silentRefetch
    });
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });
});