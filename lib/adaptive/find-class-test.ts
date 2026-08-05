import prisma from '@/lib/prisma'

export async function findClassTestByTestId(testId: string) {
  return prisma.classTest.findFirst({
    where: {
      OR: [
        { testId },
        { easyTestId: testId },
        { mediumTestId: testId },
        { hardTestId: testId },
      ],
    },
    include: {
      testGroup: { select: { title: true, subject: true, topic: true } },
    },
  })
}
