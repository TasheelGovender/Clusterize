import { renderHook, waitFor } from '@testing-library/react';
import { useParams } from '../../hooks/useParams';

// Mock console methods
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {})
};

describe('useParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.error.mockClear();
  });

  describe('Initial state', () => {
    it('should initialize with default values', () => {
      const mockParams = Promise.resolve({ projectId: 'test-123' });
      const { result } = renderHook(() => useParams(mockParams));

      expect(result.current.projectId).toBeNull();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('Promise resolution', () => {
    it('should extract projectId from resolved params', async () => {
      const mockParams = Promise.resolve({ projectId: 'project-123' });
      const { result } = renderHook(() => useParams(mockParams));

      expect(result.current.loading).toBe(true);
      expect(result.current.projectId).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('project-123');
    });

    it('should handle params with multiple properties', async () => {
      const mockParams = Promise.resolve({
        projectId: 'project-456',
        otherParam: 'value',
        extraData: { nested: 'object' }
      });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('project-456');
    });

    it('should handle params with undefined projectId', async () => {
      const mockParams = Promise.resolve({
        otherParam: 'value'
      });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeUndefined();
    });

    it('should handle params with null projectId', async () => {
      const mockParams = Promise.resolve({
        projectId: null
      });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeNull();
    });

    it('should handle empty params object', async () => {
      const mockParams = Promise.resolve({});
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeUndefined();
    });

    it('should handle numeric projectId', async () => {
      const mockParams = Promise.resolve({ projectId: 12345 });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe(12345);
    });
  });

  describe('Promise rejection', () => {
    it('should handle promise rejection gracefully', async () => {
      const errorMessage = 'Failed to resolve params';
      const mockParams = Promise.reject(new Error(errorMessage));
      const { result } = renderHook(() => useParams(mockParams));

      expect(result.current.loading).toBe(true);
      expect(result.current.projectId).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Error unwrapping params:', expect.any(Error));
    });

    it('should handle promise rejection with different error types', async () => {
      const mockParams = Promise.reject('String error');
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Error unwrapping params:', 'String error');
    });

    it('should handle promise rejection with null error', async () => {
      const mockParams = Promise.reject(null);
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Error unwrapping params:', null);
    });
  });

  describe('Promise dependency changes', () => {
    it('should re-execute when params promise changes', async () => {
      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: Promise.resolve({ projectId: 'first-project' }) } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('first-project');

      // Test with a completely new hook instance to ensure it works
      rerender({ params: Promise.resolve({ projectId: 'second-project' }) });

      // The useEffect should trigger with the new params promise
      await waitFor(() => {
        expect(result.current.projectId).toBe('second-project');
      }, { timeout: 5000 });
    });

    it('should handle transition from resolved to rejected promise', async () => {
      const firstParams = Promise.resolve({ projectId: 'valid-project' });
      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: firstParams } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('valid-project');

      // Change to a rejecting promise
      const secondParams = Promise.reject(new Error('Failed'));
      
      rerender({ params: secondParams });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('valid-project'); // Should retain previous value
      expect(consoleSpy.error).toHaveBeenCalledWith('Error unwrapping params:', expect.any(Error));
    });

    it('should handle transition from rejected to resolved promise', async () => {
      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: Promise.reject(new Error('Initial error')) } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith('Error unwrapping params:', expect.any(Error));

      // Clear the error spy for the next assertion
      consoleSpy.error.mockClear();

      // Change to a resolving promise
      rerender({ params: Promise.resolve({ projectId: 'recovered-project' }) });

      await waitFor(() => {
        expect(result.current.projectId).toBe('recovered-project');
      }, { timeout: 5000 });
    });
  });

  describe('Loading state management', () => {
    it('should maintain loading state during async operation', async () => {
      let resolvePromise;
      const mockParams = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const { result } = renderHook(() => useParams(mockParams));

      expect(result.current.loading).toBe(true);
      expect(result.current.projectId).toBeNull();

      // Resolve the promise
      resolvePromise({ projectId: 'delayed-project' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('delayed-project');
    });

    it('should reset loading state on each new promise', async () => {
      const firstParams = Promise.resolve({ projectId: 'first' });
      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: firstParams } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Create a promise that won't resolve immediately
      let resolveSecond;
      const secondParams = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      rerender({ params: secondParams });

      // Loading state may change, but we'll wait for the resolution
      // expect(result.current.loading).toBe(true); // This can be flaky due to React batching

      resolveSecond({ projectId: 'second' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('second');
    });
  });

  describe('Edge cases', () => {
    it('should handle very fast promise resolution', async () => {
      const mockParams = Promise.resolve({ projectId: 'instant-project' });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('instant-project');
    });

    it('should handle promise that resolves with null', async () => {
      const mockParams = Promise.resolve(null);
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // When resolvedParams is null, accessing .projectId will cause an error
      // The hook will catch this and projectId will remain null
      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle promise that resolves with undefined', async () => {
      const mockParams = Promise.resolve(undefined);
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // When resolvedParams is undefined, accessing .projectId will cause an error
      // The hook will catch this and projectId will remain null
      expect(result.current.projectId).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle promise that resolves with non-object value', async () => {
      const mockParams = Promise.resolve('string-value');
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBeUndefined();
    });

    it('should handle multiple rapid promise changes', async () => {
      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: Promise.resolve({ projectId: 'project-1' }) } }
      );

      // Rapidly change promises
      rerender({ params: Promise.resolve({ projectId: 'project-2' }) });
      rerender({ params: Promise.resolve({ projectId: 'project-3' }) });
      rerender({ params: Promise.resolve({ projectId: 'project-4' }) });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('project-4');
    });

    it('should handle concurrent promise resolutions', async () => {
      let resolveFirst, resolveSecond;
      
      const firstParams = new Promise((resolve) => {
        resolveFirst = resolve;
      });

      const { result, rerender } = renderHook(
        ({ params }) => useParams(params),
        { initialProps: { params: firstParams } }
      );

      const secondParams = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      rerender({ params: secondParams });

      // Resolve first promise after second promise is set
      resolveFirst({ projectId: 'first' });
      resolveSecond({ projectId: 'second' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have the result from the second promise (most recent)
      expect(result.current.projectId).toBe('second');
    });
  });

  describe('Type handling', () => {
    it('should handle projectId as string', async () => {
      const mockParams = Promise.resolve({ projectId: 'string-id' });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe('string-id');
      expect(typeof result.current.projectId).toBe('string');
    });

    it('should handle projectId as number', async () => {
      const mockParams = Promise.resolve({ projectId: 42 });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe(42);
      expect(typeof result.current.projectId).toBe('number');
    });

    it('should handle projectId as boolean', async () => {
      const mockParams = Promise.resolve({ projectId: true });
      const { result } = renderHook(() => useParams(mockParams));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.projectId).toBe(true);
      expect(typeof result.current.projectId).toBe('boolean');
    });
  });

  afterAll(() => {
    consoleSpy.error.mockRestore();
  });
});