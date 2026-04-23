import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the first user to assign as owner
  const user = await prisma.user.findFirst({
    where: { email: 'manik_singh@ug29.mesaschool.co' },
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  // Create test customer
  const customer = await prisma.customer.create({
    data: {
      name: 'Manik Singh Test',
      email: 'singhmanik2019@gmail.com',
      customerType: 'individual',
      description: 'Test customer for Gmail integration',
      userId: user.id,
    },
  });

  console.log('✅ Test customer created:', customer);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
