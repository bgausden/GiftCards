import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import * as dotenv from 'dotenv'
import { getUserToken } from './index.js'

vi.mock('axios')
vi.mock('dotenv')

describe('getUserToken', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dotenv.config).mockReturnValue({})
    process.env.USER_NAME = 'testuser'
    process.env.USER_PASSWORD = 'testpassword'
    process.env.SITE_ID = '12345'
    process.env.API_KEY = 'testapikey'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should return an access token when the API call is successful', async () => {
    const mockResponse = { data: { AccessToken: 'test-access-token' } }
    vi.mocked(axios.post).mockResolvedValue(mockResponse)

    const result = await getUserToken()

    expect(result).toBe('test-access-token')
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.mindbodyonline.com/public/v6/usertoken/issue',
      {
        username: 'testuser',
        password: 'testpassword',
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          siteId: '12345',
          'API-Key': 'testapikey',
        },
      }
    )
  })

  it('should throw an error when the API call fails', async () => {
    const mockError = new Error('API Error')
    vi.mocked(axios.post).mockRejectedValue(mockError)

    await expect(getUserToken()).rejects.toThrow('API Error')
  })

  it('should throw an error when environment variables are missing', async () => {
    delete process.env.USER_NAME
    delete process.env.USER_PASSWORD
    delete process.env.SITE_ID
    delete process.env.API_KEY

    await expect(getUserToken()).rejects.toThrow('Missing environment variables')
  })
})