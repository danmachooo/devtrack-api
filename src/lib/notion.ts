import { Client } from '@notionhq/client'

import { appConfig } from '@/config/config'

export const createNotionClient = (token: string): Client => {
  return new Client({
    auth: token,
    notionVersion: appConfig.notion.apiVersion
  })
}
