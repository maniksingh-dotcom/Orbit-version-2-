import { prisma } from '../src/lib/prisma';

async function debugGmail() {
  console.log('=== Gmail Debug ===\n');

  // Check customers with emails
  const customers = await prisma.customer.findMany({
    where: { email: { not: null } },
    select: { id: true, name: true, email: true },
  });

  console.log('Customers with email addresses:');
  if (customers.length === 0) {
    console.log('❌ NO CUSTOMERS WITH EMAIL ADDRESSES FOUND!');
    console.log('This is why you\'re not seeing any emails.\n');
  } else {
    customers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} - ${c.email}`);
    });
    console.log('');
  }

  // Check Google account
  const accounts = await prisma.account.findMany({
    where: { provider: 'google' },
    select: {
      id: true,
      userId: true,
      scope: true,
      access_token: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  console.log('Google OAuth accounts:');
  if (accounts.length === 0) {
    console.log('❌ NO GOOGLE ACCOUNT CONNECTED!');
    console.log('You need to sign in with Google to access Gmail.\n');
  } else {
    accounts.forEach((a) => {
      console.log(`User: ${a.user.name} (${a.user.email})`);
      console.log(`Scopes: ${a.scope || 'No scopes set'}`);
      console.log(`Has access token: ${a.access_token ? 'Yes' : 'No'}`);

      // Check if Gmail scope is included
      if (a.scope?.includes('gmail')) {
        console.log('✅ Gmail scope is present');
      } else {
        console.log('❌ Gmail scope is MISSING - you need to re-authenticate with Gmail permissions');
      }
      console.log('');
    });
  }

  await prisma.$disconnect();
}

debugGmail().catch(console.error);
