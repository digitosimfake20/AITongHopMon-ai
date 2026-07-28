import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rows = await prisma.$queryRaw`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema IN ('core', 'ai')
    AND table_type = 'BASE TABLE'
  ORDER BY table_schema, table_name
`

console.log(JSON.stringify(rows, null, 2))
await prisma.$disconnect()
