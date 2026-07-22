import { apiClient } from './client'

export interface Currency {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
}

export async function listCurrencies(): Promise<Currency[]> {
  const { data } = await apiClient.get('/currencies')
  return data
}
