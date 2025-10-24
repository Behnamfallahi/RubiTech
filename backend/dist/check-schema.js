"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkColumn() {
    try {
        // گرفتن اطلاعات یه ردیف برای دیدن ساختار
        const laptop = await prisma.laptop.findFirst();
        if (laptop) {
            console.log("Structure of Laptop:", Object.keys(laptop));
            console.log("serialNumber exists:", "serialNumber" in laptop);
        }
        else {
            console.log("No data in Laptop table to check structure.");
        }
    }
    catch (error) {
        console.error("Error checking column:", error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkColumn();
