/**
 * Migration script to transfer data from SQLite to Supabase PostgreSQL
 * and upload files from local storage to Supabase Storage
 *
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import { uploadToStorage } from '../src/lib/fileUtils';
import fs from 'fs/promises';
import path from 'path';

// SQLite database (source)
const sqliteDb = new Database('dev.db', { readonly: true });

// PostgreSQL database (destination) - already connected via Prisma
const prisma = new PrismaClient();

interface SQLiteCustomer {
  id: string;
  name: string;
  age: number | null;
  customerType: string;
  companyName: string | null;
  country: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  mandateScope: string | null;
  mandateCompensation: string | null;
  mandateExclusivity: string | null;
  mandateLegalProtections: string | null;
  mandateTransactionDef: string | null;
  createdAt: string;
  updatedAt: string;
}

async function migrateData() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n');

  try {
    // Step 1: Get the admin user from Supabase (we'll assign all data to them)
    console.log('📋 Step 1: Finding admin user...');
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL not set in environment variables');
    }

    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      console.log(`⚠️  Admin user not found. Please log in to the app first with ${adminEmail}`);
      console.log('   After logging in, run this script again.');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.name} (${adminUser.email})\n`);

    // Step 2: Migrate Customers
    console.log('📋 Step 2: Migrating customers...');
    const sqliteCustomers = sqliteDb.prepare('SELECT * FROM Customer').all() as SQLiteCustomer[];
    console.log(`   Found ${sqliteCustomers.length} customers to migrate`);

    for (const customer of sqliteCustomers) {
      try {
        await prisma.customer.create({
          data: {
            id: customer.id,
            name: customer.name,
            age: customer.age,
            customerType: customer.customerType,
            companyName: customer.companyName,
            country: customer.country,
            state: customer.state,
            email: customer.email,
            phone: customer.phone,
            website: customer.website,
            logoUrl: customer.logoUrl,
            description: customer.description,
            mandateScope: customer.mandateScope,
            mandateCompensation: customer.mandateCompensation,
            mandateExclusivity: customer.mandateExclusivity,
            mandateLegalProtections: customer.mandateLegalProtections,
            mandateTransactionDef: customer.mandateTransactionDef,
            userId: adminUser.id, // Assign to admin user
            createdAt: new Date(customer.createdAt),
            updatedAt: new Date(customer.updatedAt),
          },
        });
        console.log(`   ✓ Migrated customer: ${customer.name}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⊙ Customer already exists: ${customer.name}`);
        } else {
          console.error(`   ✗ Error migrating customer ${customer.name}:`, error.message);
        }
      }
    }

    // Step 3: Migrate Notes
    console.log('\n📋 Step 3: Migrating notes...');
    const sqliteNotes = sqliteDb.prepare('SELECT * FROM Note').all() as any[];
    console.log(`   Found ${sqliteNotes.length} notes to migrate`);

    for (const note of sqliteNotes) {
      try {
        await prisma.note.create({
          data: {
            id: note.id,
            fathomId: note.fathomId,
            title: note.title,
            content: note.content,
            source: note.source,
            addedBy: note.addedBy,
            userId: note.userId || adminUser.id,
            customerId: note.customerId,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          },
        });
        console.log(`   ✓ Migrated note: ${note.title}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⊙ Note already exists: ${note.title}`);
        } else if (error.code === 'P2003') {
          console.log(`   ⊙ Skipped note (customer not found): ${note.title}`);
        } else {
          console.error(`   ✗ Error migrating note:`, error.message);
        }
      }
    }

    // Step 4: Migrate Documents and Upload Files
    console.log('\n📋 Step 4: Migrating documents and uploading files to Supabase Storage...');
    const sqliteDocuments = sqliteDb.prepare('SELECT * FROM Document').all() as any[];
    console.log(`   Found ${sqliteDocuments.length} documents to migrate`);

    for (const doc of sqliteDocuments) {
      try {
        // Check if local file exists
        const localFilePath = path.join(process.cwd(), 'uploads', doc.filePath);

        try {
          const fileBuffer = await fs.readFile(localFilePath);

          // Upload to Supabase Storage
          const { error: uploadError } = await uploadToStorage(doc.filePath, fileBuffer, doc.mimeType);

          if (uploadError) {
            console.log(`   ⚠️  Failed to upload file for: ${doc.title}`);
          } else {
            console.log(`   ✓ Uploaded file: ${doc.filePath}`);
          }
        } catch (fileError) {
          console.log(`   ⚠️  File not found locally: ${localFilePath}`);
        }

        // Create document record in PostgreSQL
        await prisma.document.create({
          data: {
            id: doc.id,
            title: doc.title,
            filePath: doc.filePath,
            fileType: doc.fileType,
            mimeType: doc.mimeType,
            transcription: doc.transcription,
            customerId: doc.customerId,
            uploadedBy: adminUser.id,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          },
        });
        console.log(`   ✓ Migrated document: ${doc.title}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⊙ Document already exists: ${doc.title}`);
        } else if (error.code === 'P2003') {
          console.log(`   ⊙ Skipped document (customer not found): ${doc.title}`);
        } else {
          console.error(`   ✗ Error migrating document:`, error.message);
        }
      }
    }

    // Step 5: Migrate other tables if they have data
    console.log('\n📋 Step 5: Migrating other data...');

    // Team Notes
    const teamNotes = sqliteDb.prepare('SELECT * FROM TeamNote').all() as any[];
    if (teamNotes.length > 0) {
      console.log(`   Migrating ${teamNotes.length} team notes...`);
      for (const note of teamNotes) {
        try {
          await prisma.teamNote.create({
            data: {
              id: note.id,
              content: note.content,
              userId: note.userId || adminUser.id,
              customerId: note.customerId,
              dealRoomId: note.dealRoomId,
              meetingId: note.meetingId,
              source: note.source,
              createdAt: new Date(note.createdAt),
              updatedAt: new Date(note.updatedAt),
            },
          });
        } catch (error: any) {
          if (error.code !== 'P2002') {
            console.log(`   ⚠️  Error migrating team note:`, error.message);
          }
        }
      }
    }

    // Action Items
    const actionItems = sqliteDb.prepare('SELECT * FROM ActionItem').all() as any[];
    if (actionItems.length > 0) {
      console.log(`   Migrating ${actionItems.length} action items...`);
      for (const item of actionItems) {
        try {
          await prisma.actionItem.create({
            data: {
              id: item.id,
              title: item.title,
              completed: item.completed === 1,
              status: item.status,
              assigneeId: item.assigneeId,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
              priority: item.priority,
              userId: item.userId || adminUser.id,
              customerId: item.customerId,
              dealRoomId: item.dealRoomId,
              meetingId: item.meetingId,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            },
          });
        } catch (error: any) {
          if (error.code !== 'P2002') {
            console.log(`   ⚠️  Error migrating action item:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the application to verify all data migrated correctly');
    console.log('   2. Backup and archive the old dev.db and uploads/ directory');
    console.log('   3. Update your deployment configuration with Supabase credentials');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    sqliteDb.close();
  }
}

// Run migration
migrateData();
