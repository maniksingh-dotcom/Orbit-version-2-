import { prisma } from '../src/lib/prisma';

async function run() {
    const allNotes = await prisma.note.findMany({
        where: { source: 'fathom' },
        include: { customer: true }
    });

    let deleted = 0;
    for (const n of allNotes) {
        if (!n.customer.email) {
            await prisma.note.delete({ where: { id: n.id } });
            deleted++;
        }
    }

    console.log(`Deleted ${deleted} bad fathom notes`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
