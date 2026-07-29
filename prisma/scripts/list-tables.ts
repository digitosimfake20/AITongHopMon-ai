import prisma from '@/lib/prisma'

async function main() {
  const rows = await prisma.$queryRaw<
    { table_schema: string; table_name: string }[]
  >`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('core', 'ai')
      AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `
  console.log(JSON.stringify(rows, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
