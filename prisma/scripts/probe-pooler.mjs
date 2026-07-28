import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const envLine = readFileSync('.env', 'utf8')
  .split('\n')
  .find((line) => line.startsWith('DATABASE_URL='))

if (!envLine) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}

const password = envLine.split('://')[1]?.split('@')[0]?.split(':').slice(1).join(':')
const projectRef = 'tgiilmpxcyczmnuakttj'
const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'us-east-1',
  'us-west-1',
  'eu-west-1',
  'eu-central-1',
  'sa-east-1',
]
const prefixes = ['aws-0', 'aws-1']

async function test(label, url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    await prisma.$queryRaw`SELECT 1 as ok`
    console.log('OK', label)
    console.log('URL', url.replace(password, '***'))
    await prisma.$disconnect()
    return url
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    console.log('FAIL', label, '-', message)
    try {
      await prisma.$disconnect()
    } catch {
      // ignore
    }
    return null
  }
}

for (const prefix of prefixes) {
  for (const region of regions) {
    const host = `${prefix}-${region}.pooler.supabase.com`
    const auth = `postgresql://postgres.${projectRef}:${password}@${host}`
    const transaction = await test(`${host}:6543`, `${auth}:6543/postgres?pgbouncer=true`)
    if (transaction) process.exit(0)
    const session = await test(`${host}:5432`, `${auth}:5432/postgres`)
    if (session) process.exit(0)
  }
}

console.log('No working pooler region found')
