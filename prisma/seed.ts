import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Заполнение базы данных...")

  // Create user
  const user = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Tanjiro",
    },
  })

  console.log("Создан пользователь:", user.name)

  // Create progress
  const progress = await prisma.progress.upsert({
    where: { userId: 1 },
    update: {},
    create: {
      userId: 1,
      totalXp: 0,
      rank: "Mizunoto",
      currentCycleCode: 1,
      streak: 0,
    },
  })

  console.log("Создан прогресс:", progress)

  console.log("Заполнение завершено!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
