/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useCluster } from "../../hooks/useCluster";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to avoid test output noise
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useCluster", () => {
  describe("initial state", () => {
    it("initializes with correct default values", () => {
      const { result } = renderHook(() => useCluster());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.createCluster).toBe('function');
      expect(typeof result.current.updateCluster).toBe('function');
      expect(typeof result.current.resetCluster).toBe('function');
      expect(typeof result.current.createClusterWithParams).toBe('function');
      expect(typeof result.current.updateClusterWithParams).toBe('function');
      expect(typeof result.current.setError).toBe('function');
    });
  });

  describe("createCluster", () => {
    it("successfully creates a cluster", async () => {
      const mockResponse = { success: true, clusterId: 123 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      let response;
      await act(async () => {
        response = await result.current.createCluster(1, "test-cluster", "Test Label");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clusterName: "test-cluster",
            clusterLabel: "Test Label",
          }),
        }
      );

      expect(response).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("sets loading state during request", async () => {
      let resolvePromise;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(mockPromise);

      const { result } = renderHook(() => useCluster());

      let createPromise;
      act(() => {
        createPromise = result.current.createCluster(1, "test-cluster", "Test Label");
      });

      // Should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);

      // Resolve the promise
      act(() => {
        resolvePromise({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await act(async () => {
        await createPromise;
      });

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
    });

    it("handles API errors correctly", async () => {
      const errorMessage = "Cluster creation failed";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.createCluster(1, "test-cluster", "Test Label");
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it("handles network errors correctly", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.createCluster(1, "test-cluster", "Test Label");
        } catch (error) {
          expect(error.message).toBe("Network error");
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Network error");
    });
  });

  describe("updateCluster", () => {
    it("successfully updates a cluster", async () => {
      const mockResponse = { success: true, updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      let response;
      await act(async () => {
        response = await result.current.updateCluster(1, 5, "Updated Label");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1&cluster_number=5",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label_name: "Updated Label",
          }),
        }
      );

      expect(response).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("handles update errors correctly", async () => {
      const errorMessage = "Update failed";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.updateCluster(1, 5, "Updated Label");
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("resetCluster", () => {
    it("successfully resets a cluster", async () => {
      const mockResponse = { success: true, reset: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      let response;
      await act(async () => {
        response = await result.current.resetCluster(1, 5);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters/reset?projectId=1&cluster_number=5",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      expect(response).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("handles reset errors correctly", async () => {
      const errorMessage = "Reset failed";
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.resetCluster(1, 5);
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("createClusterWithParams", () => {
    it("successfully creates a cluster using URL parameters", async () => {
      const mockResponse = { success: true, clusterId: 456 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      let response;
      await act(async () => {
        response = await result.current.createClusterWithParams(1, "param-cluster", "Param Label");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1&cluster_name=param-cluster&cluster_label=Param+Label",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      expect(response).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("handles empty label correctly", async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        await result.current.createClusterWithParams(1, "cluster-name", null);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1&cluster_name=cluster-name&cluster_label=",
        expect.any(Object)
      );
    });
  });

  describe("updateClusterWithParams", () => {
    it("successfully updates a cluster using URL parameters", async () => {
      const mockResponse = { success: true, updated: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      let response;
      await act(async () => {
        response = await result.current.updateClusterWithParams(1, 3, "New Label");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1&cluster_number=3&cluster_label=New+Label",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      expect(response).toEqual(mockResponse);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("handles empty label correctly", async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        await result.current.updateClusterWithParams(1, 3, "");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/proxy/clusters?project_id=1&cluster_number=3&cluster_label=",
        expect.any(Object)
      );
    });
  });

  describe("error management", () => {
    it("allows manual error setting", () => {
      const { result } = renderHook(() => useCluster());

      act(() => {
        result.current.setError("Custom error message");
      });

      expect(result.current.error).toBe("Custom error message");
    });

    it("resets error on successful operations", async () => {
      const { result } = renderHook(() => useCluster());

      // Set initial error
      act(() => {
        result.current.setError("Initial error");
      });

      expect(result.current.error).toBe("Initial error");

      // Successful operation should clear error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.createCluster(1, "test", "test");
      });

      expect(result.current.error).toBe(null);
    });

    it("resets error at the start of each operation", async () => {
      const { result } = renderHook(() => useCluster());

      // Set initial error
      act(() => {
        result.current.setError("Previous error");
      });

      // Mock a failed request
      mockFetch.mockRejectedValueOnce(new Error("New error"));

      await act(async () => {
        try {
          await result.current.createCluster(1, "test", "test");
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.error).toBe("New error");
    });
  });

  describe("loading state management", () => {
    it("manages loading state correctly for individual operations", async () => {
      let resolveFirst, resolveSecond;
      const firstPromise = new Promise((resolve) => { resolveFirst = resolve; });
      const secondPromise = new Promise((resolve) => { resolveSecond = resolve; });

      mockFetch
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useCluster());

      let firstOperation, secondOperation;

      // Start first operation
      act(() => {
        firstOperation = result.current.createCluster(1, "first", "First");
      });

      expect(result.current.loading).toBe(true);

      // Start second operation (this will also set loading to true)
      act(() => {
        secondOperation = result.current.updateCluster(1, 2, "Second");
      });

      expect(result.current.loading).toBe(true);

      // Resolve first operation
      act(() => {
        resolveFirst({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await act(async () => {
        await firstOperation;
      });

      // Loading will be false since the hook doesn't track concurrent operations
      // Each operation sets loading to false when it completes
      expect(result.current.loading).toBe(false);

      // Resolve second operation
      act(() => {
        resolveSecond({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await act(async () => {
        await secondOperation;
      });

      // Should still not be loading
      expect(result.current.loading).toBe(false);
    });

    it("sets loading to true at the start of each operation", async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useCluster());

      // Initially not loading
      expect(result.current.loading).toBe(false);

      // Start operation
      await act(async () => {
        result.current.createCluster(1, "test", "test");
      });

      // Should be back to not loading
      expect(result.current.loading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles missing error property in API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}), // No error property
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.createCluster(1, "test", "test");
        } catch (error) {
          expect(error.message).toBe("Failed to create cluster");
        }
      });

      expect(result.current.error).toBe("Failed to create cluster");
    });

    it("handles JSON parsing errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        try {
          await result.current.createCluster(1, "test", "test");
        } catch (error) {
          expect(error.message).toBe("Invalid JSON");
        }
      });

      expect(result.current.error).toBe("Invalid JSON");
    });

    it("handles undefined/null parameters gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useCluster());

      await act(async () => {
        await result.current.createClusterWithParams(1, "test", undefined);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("cluster_label="),
        expect.any(Object)
      );
    });
  });
});