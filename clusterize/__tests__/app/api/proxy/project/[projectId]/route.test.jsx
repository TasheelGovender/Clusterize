/**
 * @jest-environment node
 */

import { GET, DELETE } from '../../../../../../app/api/proxy/project/[projectId]/route';

// Polyfill Response and TextDecoder for Node
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
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class {
    decode(buffer) {
      return buffer.toString();
    }
  };
}

describe('API Route: /api/proxy/project/[projectId]/route', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, SERVER_PUBLIC_BASE_URL: 'http://localhost:4000' };
    global.fetch = jest.fn();
  });
  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 if x-access-token header is missing', async () => {
      const req = { headers: new Map() };
      const context = { params: { projectId: '123' } };
      const res = await GET(req, context);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await GET(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 200 and project data on success', async () => {
        const mockData = {
            can_access: null,
            id: 58,
            owner: 6,
            project_name: 'Demo Project'
        };
        const mockStats = {
            clusters: [
            { frequency: 14, label: 'circular', name: '51' },
            { frequency: 13, label: 'lenticular', name: '52' }
            ],
            tags: [
            { frequency: 8, name: 'bright' },
            { frequency: 6, name: 'bulge' }
            ]
        };
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockData, statistics: mockStats }),
        });
        const req = { headers: new Map([['x-access-token', 'token']]) };
        const context = { params: { projectId: '123' } };
        const res = await GET(req, context);
        expect(res.status).toBe(200);
        const body = await res.json();
        console.log(body);
        expect(body.data).toEqual(mockData);
        expect(body.stats).toEqual(mockStats);
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await GET(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to fetch project');
    });
  });

  describe('DELETE', () => {
    it('returns 401 if x-access-token header is missing', async () => {
      const req = { headers: new Map() };
      const context = { params: { projectId: '123' } };
      const res = await DELETE(req, context);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = '';
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await DELETE(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Server URL not configured');
    });

    it('returns 200 on successful delete', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await DELETE(req, context);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns error if fetch fails', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 404 });
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await DELETE(req, context);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('returns 500 if fetch throws', async () => {
      global.fetch.mockRejectedValue(new Error('fail'));
      const req = { headers: new Map([['x-access-token', 'token']]) };
      const context = { params: { projectId: '123' } };
      const res = await DELETE(req, context);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Failed to delete project');
    });
  });
});
