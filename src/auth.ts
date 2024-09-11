import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

export async function getUserToken(): Promise<string> {
  if (!process.env.USER_NAME || !process.env.USER_PASSWORD || !process.env.SITE_ID || !process.env.API_KEY) {
    throw new Error('Missing environment variables')
  }

  try {
    const response = await axios.post(
      'https://api.mindbodyonline.com/public/v6/usertoken/issue',
      {
        username: process.env.USER_NAME,
        password: process.env.USER_PASSWORD,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          siteId: process.env.SITE_ID,
          'API-Key': process.env.API_KEY,
        },
      }
    )
    const data = response.data as object
    if ('AccessToken' in data) {
      return data.AccessToken as string
    } else throw new Error('No access token returned')
  } catch (error) {
    console.error('Error fetching user token:', error)
    throw error
  }
}
