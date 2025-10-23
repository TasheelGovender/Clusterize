/**
 * @jest-environment node
 */

// Setup getSession mock before importing route handlers
let getSessionMock;
jest.mock('@auth0/nextjs-auth0', () => ({
  getSession: (...args) => getSessionMock(...args),
}));

// Now initialize the mock
getSessionMock = jest.fn();

import { POST, PUT } from '../../../../../app/api/proxy/clusters/route';

// Polyfill Response for Node
if (typeof global.Response === 'undefined') {
  global.Response = class {
    static json(body, init) {
      return new global.Response(JSON.stringify(body), init);
    }
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

describe('API Route: /api/proxy/clusters/route', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getSessionMock.mockReset();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 401 if no session', async () => {
      getSessionMock.mockResolvedValue(null);
      const req = { url: 'http://localhost/api/proxy/clusters?project_id=1', json: async () => ({}) };
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 400 if missing project_id', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const req = { url: 'http://localhost/api/proxy/clusters', json: async () => ({}) };
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Missing project_id parameter');
    });

    it('returns 201 and backend data on success', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const backendData = { clusterId: 123, status: 'created' };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => backendData,
      });
      const req = {
        url: 'http://localhost/api/proxy/clusters?project_id=1&cluster_name=test&cluster_label=label',
        json: async () => ({ clusterName: 'test', clusterLabel: 'label' })
      };
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual(backendData);
    });

    it('returns backend error if backend fails', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const backendError = { error: 'fail' };
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => backendError,
      });
      const req = {
        url: 'http://localhost/api/proxy/clusters?project_id=1',
        json: async () => ({ clusterName: 'test' })
      };
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual(backendError);
    });

    it('returns 500 if error thrown', async () => {
      getSessionMock.mockImplementation(() => { throw new Error('fail'); });
      const req = { url: 'http://localhost/api/proxy/clusters?project_id=1', json: async () => ({}) };
      const res = await POST(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('PUT', () => {
    it('returns 401 if no session', async () => {
      getSessionMock.mockResolvedValue(null);
      const req = { url: 'http://localhost/api/proxy/clusters?project_id=1&cluster_number=2', json: async () => ({ label_name: 'new' }) };
      const res = await PUT(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 400 if missing required params', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const req = { url: 'http://localhost/api/proxy/clusters', json: async () => ({ label_name: 'new' }) };
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/Missing required parameters/);
    });

    it('returns 200 and backend data on success', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const backendData = { updated: true };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => backendData,
      });
      const req = {
        url: 'http://localhost/api/proxy/clusters?project_id=1&cluster_number=2',
        json: async () => ({ label_name: 'new' })
      };
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual(backendData);
    });

    it('returns backend error if backend fails', async () => {
      getSessionMock.mockResolvedValue({ accessToken: 'token', user: { sub: 'user' } });
      const backendError = { error: 'fail' };
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => backendError,
      });
      const req = {
        url: 'http://localhost/api/proxy/clusters?project_id=1&cluster_number=2',
        json: async () => ({ label_name: 'new' })
      };
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual(backendError);
    });

    it('returns 500 if error thrown', async () => {
      getSessionMock.mockImplementation(() => { throw new Error('fail'); });
      const req = { url: 'http://localhost/api/proxy/clusters?project_id=1&cluster_number=2', json: async () => ({ label_name: 'new' }) };
      const res = await PUT(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });
  });
});
