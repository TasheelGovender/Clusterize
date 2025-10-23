/**
 * @jest-environment node
 */

const { POST } = require('../../../../../../app/api/proxy/clusters/create/route');

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

describe('API Route: /api/proxy/clusters/create/route', () => {
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
      const req = { headers: new Map(), json: async () => ({ clusterData: {}, proj_id: 1 }) };
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ clusterData: {}, proj_id: 1 }) };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 201 and cluster data on success', async () => {
      const mockClusterData = { id: 1, name: 'Test Cluster' };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockClusterData,
      });
      const req = {
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ clusterData: { foo: 'bar' }, proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data).toEqual(mockClusterData);
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = {
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ clusterData: { foo: 'bar' }, proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to create clusters');
    });

    it('returns 500 if response not ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
      const req = {
        headers: new Map([['x-access-token', 'token']]),
        json: async () => ({ clusterData: { foo: 'bar' }, proj_id: 1 })
      };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to create clusters');
    });
  });
});
