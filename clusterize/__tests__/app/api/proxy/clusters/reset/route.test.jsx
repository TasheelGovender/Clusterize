/**
 * @jest-environment node
 */

const { POST } = require('../../../../../../app/api/proxy/clusters/reset/route');

// Polyfill Response for Node
if (typeof global.Response === 'undefined') {
  global.Response = class {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = init?.headers || {};
    }
    async json() {
      return JSON.parse(this.body);
    }
    async text() {
      return this.body;
    }
    get ok() {
      return this.status >= 200 && this.status < 300;
    }
  };
}

describe('API Route: /api/proxy/clusters/reset/route', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, SERVER_PUBLIC_BASE_URL: 'http://localhost:4000' };
    global.fetch = jest.fn();
  });
  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 401 if x-access-token header is missing', async () => {
      const req = { url: 'http://localhost/api/proxy/clusters/reset?projectId=1&cluster_number=2', headers: new Map(), json: async () => ({ proj_id: 1 }) };
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = {
            url: 'http://localhost/api/proxy/clusters/reset?projectId=1&cluster_number=2',
            headers: new Map([['x-access-token', 'token']]),
            json: async () => ({ proj_id: 1 })
        };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 200 and reset data on success', async () => {
      const mockResponse = {
        message: 'Cluster reset successful',
        data: { reset: true }
      };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      const req = {
        url: 'http://localhost/api/proxy/clusters/reset?projectId=1&cluster_number=2',
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe(mockResponse.message);
      expect(body.data).toEqual(mockResponse.data);
    });

    it('returns error if fetch fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404 });
      const req = {
        url: 'http://localhost/api/proxy/clusters/reset?projectId=1&cluster_number=2',
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Reset failed with status 404');
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = {
        url: 'http://localhost/api/proxy/clusters/reset?projectId=1&cluster_number=2',
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to reset cluster');
    });
  });
});
