/**
 * @jest-environment node
 */
import { TextDecoder } from 'util'
global.TextDecoder = TextDecoder

import { GET, POST } from '../../../../../app/api/proxy/projects/route'
import { Response } from '@edge-runtime/primitives'
global.Response = Response
global.fetch = jest.fn()

describe('API Route: /api/proxy/projects', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.SERVER_PUBLIC_BASE_URL = 'https://mock-server.com'
  })

  describe('GET', () => {
    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = ''
      const req = { headers: new Map() }
      const res = await GET(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/Server URL not configured/)
    })

    it('returns 401 if userId or accessToken is missing', async () => {
      const req = { headers: new Map() }
      const res = await GET(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/Unauthorized/)
    })

    it('returns 200 and data on success', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        }
      }
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ projects: ['p1', 'p2'] })
      })
      const res = await GET(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.projects).toEqual(['p1', 'p2'])
    })

    it('returns 500 on fetch error', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        }
      }
      global.fetch.mockRejectedValue(new Error('Network error'))
      const res = await GET(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/Failed to fetch projects/)
    })
  })

  describe('POST', () => {
    it('returns 500 if SERVER_PUBLIC_BASE_URL is missing', async () => {
      process.env.SERVER_PUBLIC_BASE_URL = ''
      const req = { headers: new Map(), json: async () => ({}) }
      const res = await POST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/Server URL not configured/)
    })

    it('returns 401 if userId or accessToken is missing', async () => {
      const req = { headers: new Map(), json: async () => ({}) }
      const res = await POST(req)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/Unauthorized/)
    })

    it('returns 400 if body is empty', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        },
        json: async () => ({})
      }
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/Request body is empty/)
    })

    it('returns 200 and success on valid POST', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        },
        json: async () => ({ name: 'New Project' })
      }
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'p123', name: 'New Project' })
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('New Project')
    })

    it('returns error if backend fails', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        },
        json: async () => ({ name: 'New Project' })
      }
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Backend error' })
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Backend error')
    })

    it('returns 500 on fetch error', async () => {
      const req = {
        headers: {
          get: (key) => (key === 'x-user-id' ? 'user1' : key === 'x-access-token' ? 'token1' : undefined)
        },
        json: async () => ({ name: 'New Project' })
      }
      global.fetch.mockRejectedValue(new Error('Network error'))
      const res = await POST(req)
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toMatch(/Failed to create project/)
    })
  })
})
