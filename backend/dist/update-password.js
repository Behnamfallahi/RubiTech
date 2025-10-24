"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_1 = require("./src/utils/auth"); // مسیر رو تنظیم کن
const prisma = new client_1.PrismaClient();
async function updatePassword() {
    const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
    if (user) {
        const hashed = await (0, auth_1.hashPassword)("testpass123");
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });
        console.log("Password updated for", user.email);
    }
    else {
        console.log("User not found");
    }
    await prisma.$disconnect();
}
updatePassword().catch(console.error);
