import * as fs from 'node:fs'
import * as path from 'node:path'
import csv from 'csv-parser'
import axios, { AxiosError } from 'axios'
import dotenv from 'dotenv'
import { createObjectCsvWriter } from 'csv-writer'
import ExcelJS from 'exceljs'

// Load environment variables from .env file
dotenv.config()

interface GiftCard {
  saleDate: string
  saleId: number
  client: string
  location: string
  giftCardId: string
  amount: string
  balance?: number
}

// Get the current directory name
const __dirname = new URL('.', import.meta.url).pathname

const csvFilePath = path.resolve(__dirname, '..', 'giftcards.csv')
const giftCards: GiftCard[] = []

// Export the getUserToken function
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
      giftCards.push({
        saleDate: data['Sale Date'],
        saleId: parseInt(data['Sale ID']),
        client: data['Client'],
        location: data['Location'],
        giftCardId: data['Gift Card ID (Assigned)'],
        amount: data['Amount'],
      })
    )
    .on('end', async () => {
      for (const giftCard of giftCards) {
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
          giftCard.balance = response.data.RemainingBalance
          console.log(
            `Balance for Gift Card ID ${giftCard.giftCardId}:`,
            response.data.RemainingBalance
          )
        } catch (error) {
          console.error(
            `Error fetching balance for Gift Card ID ${giftCard.giftCardId}:`,
            error instanceof AxiosError ? error.response?.data : error
          )
        }
      }
      await writeCardsWithBalancesToCsv(giftCards)
      await writeCardsWithBalancesToExcel(giftCards)
    })
}

async function writeCardsWithBalancesToCsv(giftCards: GiftCard[]) {
  const csvWriter = createObjectCsvWriter({
    path: path.resolve(__dirname, '..', 'giftcard_balances.csv'),
    header: [
      { id: 'saleDate', title: 'Sale Date' },
      { id: 'saleId', title: 'Sale ID' },
      { id: 'client', title: 'Client' },
      { id: 'location', title: 'Location' },
      { id: 'giftCardId', title: 'Gift Card ID' },
      { id: 'amount', title: 'Original Amount' },
      { id: 'balance', title: 'Current Balance' },
    ],
  })

  try {
    const giftCardsWithPositiveBalance = giftCards.filter(
      (giftCard) => giftCard.balance !== undefined && giftCard.balance > 0
    )

    await csvWriter.writeRecords(giftCardsWithPositiveBalance)
    console.log(
      'Gift cards with positive balance have been written to giftcard_balances.csv in the workspace directory'
    )
  } catch (error) {
    console.error('Error writing to CSV:', error)
  }
}

async function writeCardsWithBalancesToExcel(giftCards: GiftCard[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Gift Card Balances')

  worksheet.columns = [
    { header: 'Sale Date', key: 'saleDate', width: 15 },
    { header: 'Sale ID', key: 'saleId', width: 10 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Location', key: 'location', width: 15 },
    { header: 'Gift Card ID', key: 'giftCardId', width: 20 },
    { header: 'Original Amount', key: 'amount', width: 15 },
    { header: 'Current Balance', key: 'balance', width: 15 },
  ]

  const giftCardsWithPositiveBalance = giftCards.filter(
    (giftCard) => giftCard.balance !== undefined && giftCard.balance > 0
  )

  worksheet.addRows(giftCardsWithPositiveBalance)

  try {
    await workbook.xlsx.writeFile(
      path.resolve(__dirname, '..', 'giftcard_balances.xlsx')
    )
    console.log(
      'Gift cards with positive balance have been written to giftcard_balances.xlsx in the workspace directory'
    )
  } catch (error) {
    console.error('Error writing to Excel:', error)
  }
}

async function purchaseAccountCreditFromCsv(csvFilePath: string): Promise<void>
async function purchaseAccountCreditFromCsv(
  giftCards: Partial<GiftCard>[]
): Promise<void>
async function purchaseAccountCreditFromCsv(
  input: string | Partial<GiftCard>[]
): Promise<void> {
  let giftCards: Partial<GiftCard>[]

  if (typeof input === 'string') {
    giftCards = await readGiftCardsFromCsv(input)
  } else {
    giftCards = input
  }

  if (giftCards.length === 0) {
    console.log('No gift cards found.')
    return
  }

  for (const giftCard of giftCards) {
    await purchaseAccountCredit(giftCard)
  }
}

async function readGiftCardsFromCsv(
  csvFilePath: string
): Promise<Partial<GiftCard>[]> {
  const giftCards: Partial<GiftCard>[] = []

  await new Promise((resolve) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        giftCards.push({
          giftCardId: row['Gift Card ID'],
          balance: parseFloat(row['Balance']),
        })
      })
      .on('end', resolve)
  })

  return giftCards
}

async function purchaseAccountCredit(
  giftCard: Partial<GiftCard>
): Promise<void> {
  const payload = {
    ClientId: process.env.CLIENT_ID,
    ProgramId: process.env.PROGRAM_ID,
    Amount: giftCard.balance,
    PaymentInfo: {
      Type: 'GiftCard',
      MetaData: {
        GiftCardId: giftCard.giftCardId,
      },
    },
  }

  try {
    const response = await axios.post(
      'https://api.mindbodyonline.com/public/v6/sale/purchaseaccountcredit',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.API_KEY,
          SiteId: process.env.SITE_ID,
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
      }
    )

    console.log(
      `Account credit purchased successfully for Gift Card ID ${giftCard.giftCardId}:`,
      response.data
    )
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        `Error purchasing account credit for Gift Card ID ${giftCard.giftCardId}:`,
        error.response?.data || error.message
      )
    } else {
      console.error(
        `Error purchasing account credit for Gift Card ID ${giftCard.giftCardId}:`,
        error
      )
    }
  }
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
