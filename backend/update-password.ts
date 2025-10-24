import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./src/utils/auth"; // مسیر رو تنظیم کن

const prisma = new PrismaClient();

async function updatePassword() {
  const user = await prisma.user.findUnique({ where: { email: "test@example.com" } });
  if (user) {
    const hashed = await hashPassword("testpass123");
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });
    console.log("Password updated for", user.email);
  } else {
    console.log("User not found");
  }
  await prisma.$disconnect();
}

updatePassword().catch(console.error);