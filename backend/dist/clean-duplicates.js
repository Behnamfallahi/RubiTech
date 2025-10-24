"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanDuplicates() {
    const columns = await prisma.$queryRaw `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'laptop' AND column_name = 'serialnumber' -- اسم دقیق رو بذار
  `;
    if (columns.length === 0) {
        console.log("Column 'serialnumber' not found. Check your schema or migration.");
        return;
    }
    const duplicates = await prisma.$queryRaw `
    SELECT "serialnumber" -- اسم دقیق رو بذار
    FROM "Laptop"
    GROUP BY "serialnumber"
    HAVING COUNT(*) > 1
  `;
    for (const dup of duplicates) {
        const laptops = await prisma.laptop.findMany({
            where: { serialNumber: dup.serialnumber }, // تطبیق با اسم ستون
            orderBy: { id: "asc" },
        });
        for (let i = 1; i < laptops.length; i++) {
            await prisma.laptop.delete({ where: { id: laptops[i].id } });
            console.log(`Deleted duplicate with id ${laptops[i].id}`);
        }
    }
    console.log("Cleaning completed");
}
cleanDuplicates()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
