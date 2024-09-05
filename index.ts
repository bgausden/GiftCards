import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import csv from 'csv-parser'
import axios from 'axios'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

interface GiftCard {
  saleDate: string
  saleId: number
  client: string
  location: string
  giftCardId: string
  amount: string
}

// Get the current directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const csvFilePath = path.resolve(__dirname, 'giftcards.csv')
const results: GiftCard[] = []

async function getUserToken(): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.mindbodyonline.com/public/v6/usertoken/issue',
      {
        username: process.env.USER_NAME,
        password: process.env.USER_PASSWORD,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          SiteId: process.env.SITE_ID,
          'API-Key': process.env.API_KEY,
        },
      }
    )
    return response.data.AccessToken
  } catch (error) {
    console.error('Error fetching user token:', error)
    throw error
  }
}

async function fetchGiftCardBalances(token: string) {
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) =>
      results.push({
        saleDate: data['Sale Date'],
        saleId: parseInt(data['Sale ID']),
        client: data['Client'],
        location: data['Location'],
        giftCardId: data['Gift Card ID (Assigned)'],
        amount: data['Amount'],
      })
    )
    .on('end', async () => {
      for (const giftCard of results) {
        try {
          const response = await axios.get(
            'https://api.mindbodyonline.com/public/v6/sale/giftcardbalance',
            {
              headers: {
                Accept: 'application/json',
                siteId: process.env.SITE_ID,
                authorization: `Bearer ${token}`,
                'API-Key': process.env.API_KEY,
              },
              params: {
                barcodeId: giftCard.giftCardId,
              },
            }
          )
          console.log(
            `Balance for Gift Card ID ${giftCard.giftCardId}:`,
            response.data
          )
        } catch (error) {
          console.error(
            `Error fetching balance for Gift Card ID ${giftCard.giftCardId}:`,
            error
          )
        }
      }
    })
}

async function main() {
  try {
    const token = await getUserToken()
    await fetchGiftCardBalances(token)
  } catch (error) {
    console.error('Error in main function:', error)
  }
}

main()
