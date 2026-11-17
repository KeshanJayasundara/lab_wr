import { PrismaClient, Role, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // 1. Generate a strong random temporary password
  const tempPassword = crypto.randomBytes(6).toString("hex") + "@NWSDB2026";
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // 2. Upsert default Super Admin account with username & force reset flag
  const admin = await prisma.user.upsert({
    where: { email: "admin@nwsdb.lk" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@nwsdb.lk",
      username: "admin", // 👈 Default username for login support
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true, // 👈 Forces admin to change password on first login
    },
  });

  console.log("==================================================");
  console.log("🚀 DEFAULT SUPER ADMIN ACCOUNT CREATED SUCCESSFULLY!");
  console.log(`📧 Email: admin@nwsdb.lk`);
  console.log(`👤 Username: admin`);
  console.log(`🔑 Temporary Password: ${tempPassword}`);
  console.log("⚠️  PLEASE SAVE THIS PASSWORD AND CHANGE IT ON FIRST LOGIN!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });