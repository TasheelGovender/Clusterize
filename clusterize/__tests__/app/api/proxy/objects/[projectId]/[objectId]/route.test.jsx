/**
 * @jest-environment node
 */

const { PUT } = require('../../../../../../../app/api/proxy/objects/[project_id]/[object_id]/route');

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

describe('API Route: /api/proxy/objects/[project_id]/[object_id]/route', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, SERVER_PUBLIC_BASE_URL: 'http://localhost:4000' };
    global.fetch = jest.fn();
  });
  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('PUT', () => {
    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ tags: ['tag1'], new_cluster: 'clusterA' }) };
      const context = { params: { project_id: 1, object_id: 2 } };
      const res = await PUT(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 401 if x-access-token header is missing', async () => {
      const req = { headers: new Map(), json: async () => ({ tags: ['tag1'], new_cluster: 'clusterA' }) };
      const context = { params: { project_id: 1, object_id: 2 } };
      const res = await PUT(req, context);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 200 and update data on success', async () => {
      const mockUpdateData = { updated: true };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUpdateData,
      });
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ tags: ['tag1'], new_cluster: 'clusterA' }) };
      const context = { params: { project_id: 1, object_id: 2 } };
      const res = await PUT(req, context);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(mockUpdateData);
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ tags: ['tag1'], new_cluster: 'clusterA' }) };
      const context = { params: { project_id: 1, object_id: 2 } };
      const res = await PUT(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to Add tag');
    });

    it('returns 500 if response not ok', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({}) });
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ tags: ['tag1'], new_cluster: 'clusterA' }) };
      const context = { params: { project_id: 1, object_id: 2 } };
      const res = await PUT(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to Add tag');
    });
  });
});
