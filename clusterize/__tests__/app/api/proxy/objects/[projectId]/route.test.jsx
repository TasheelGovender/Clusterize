/**
 * @jest-environment node
 */

const { GET, POST } = require('../../../../../../app/api/proxy/objects/[project_id]/route');

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

describe('API Route: /api/proxy/objects/[project_id]/route', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    process.env = { ...OLD_ENV, SERVER_PUBLIC_BASE_URL: 'http://localhost:4000' };
    global.fetch = jest.fn();
  });
  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if x-access-token header is missing', async () => {
      const req = { url: 'http://localhost/api/proxy/objects/[project_id]?clusters=1', headers: new Map() };
      const context = { params: { project_id: 1 } };
      const res = await GET(req, context);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { url: 'http://localhost/api/proxy/objects/[project_id]?clusters=1', headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { project_id: 1 } };
      const res = await GET(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 200 and image data on success', async () => {
      const mockData = { data: [{ id: 1, name: 'img1' }] };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });
      const req = { url: 'http://localhost/api/proxy/objects/[project_id]?clusters=1', headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { project_id: 1 } };
      const res = await GET(req, context);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(mockData);
    });

    it('returns 200 with empty data if backend returns 404', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
      const req = { url: 'http://localhost/api/proxy/objects/[project_id]?clusters=1', headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { project_id: 1 } };
      const res = await GET(req, context);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual({ data: [] });
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = { url: 'http://localhost/api/proxy/objects/[project_id]?clusters=1', headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { project_id: 1 } };
      const res = await GET(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch images');
    });
  });

  describe('POST', () => {
    it('returns 401 if x-access-token header is missing', async () => {
      const req = { headers: new Map(), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 400 if object_ids is missing or empty', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [], operation_type: 'add_tags', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/object_ids must be a non-empty array/);
    });

    it('returns 400 if operation_type or operation_values is missing', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/operation_type and operation_values are required/);
    });

    it('returns 400 if operation_type is invalid', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'invalid', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/Invalid operation_type/);
    });

    it('returns 400 if add_tags operation_values is not array', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: 'not_array' }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/operation_values must be an array/);
    });

    it('returns 400 if add_tags operation_values is empty', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: [] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/operation_values cannot be empty/);
    });

    it('returns 400 if new_cluster operation_values is not string or array', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'new_cluster', operation_values: 123 }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/operation_values must be a string/);
    });

    it('returns 400 if new_cluster operation_values array length is not 1', async () => {
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'new_cluster', operation_values: ['a', 'b'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/must contain exactly one value/);
    });

    it('returns 200 and batch update data on success', async () => {
      const mockUpdateData = { updated: true };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUpdateData,
      });
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockUpdateData);
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = { headers: new Map([['x-access-token', 'token']]), json: async () => ({ object_ids: [1], operation_type: 'add_tags', operation_values: ['tag1'] }) };
      const context = { params: { project_id: 1 } };
      const res = await POST(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/Failed to update objects/);
    });
  });
});
