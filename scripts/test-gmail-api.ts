import { prisma } from '../src/lib/prisma';
import { fetchCustomerEmails } from '../src/lib/gmail';

async function testGmailAPI() {
  console.log('=== Testing Gmail API ===\n');

  // Get the first user
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log('❌ No user found!');
    return;
  }

  console.log(`Testing for user: ${user.name} (${user.email})`);
  console.log('Fetching emails...\n');

  const emails = await fetchCustomerEmails(user.id);

  console.log(`\n✅ API returned ${emails.length} emails`);

  if (emails.length > 0) {
    console.log('\nEmail details:');
    emails.forEach((email, i) => {
      console.log(`\n${i + 1}. Subject: ${email.subject}`);
      console.log(`   From: ${email.from} (${email.fromEmail})`);
      console.log(`   Customer: ${email.customerName || 'Unknown'}`);
      console.log(`   Date: ${email.date}`);
      console.log(`   Snippet: ${email.snippet.substring(0, 50)}...`);
    });
  } else {
    console.log('\n❌ No emails were returned!');
    console.log('This means the fetchCustomerEmails function is filtering them out.');
  }

  await prisma.$disconnect();
}

testGmailAPI().catch(console.error);
