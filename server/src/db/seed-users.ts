import { InsertUser } from '@/schema/user';
import { db } from '.';
import { AccountType, ProviderType, Role } from './enumTypes';
import { accounts, users } from './tables';

function generatePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+[]{}|;:,.<>?';

  // Ensure at least one uppercase and one special character
  const allChars = uppercase + lowercase + digits + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill remaining 6 chars randomly
  for (let i = 0; i < 6; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password chars so uppercase and special aren't always in front
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// export const seedUsersBatch = async () => {
//   console.log('✅ Database seeding with Users!');

//   const dummyUsers: InsertUser[] = [];
//   for (let i = 1; i <= 200; i++) {
//     dummyUsers.push({
//       email: `user${i}@example.com`,
//       password: generatePassword(),
//       name: 'user' + i,
//       role: Role.USER,
//       email_verified: new Date(),
//     });
//   }

//   const usersArray = await db.insert(users).values(dummyUsers).returning();

//   const accountsArray = usersArray.map(user => ({
//     user_id: user.id,
//     type: AccountType.email,
//     provider: ProviderType.email,
//   }));

//   await db.insert(accounts).values(accountsArray).returning();

//   console.log('✅ Seeding users completed!');
// };
export const seedUsers = async () => {
  console.log('✅ Database seeding with Users!');

  for (let i = 1; i <= 200; i++) {
    const userData: InsertUser = {
      email: `user${i}@example.com`,
      password: generatePassword(),
      name: 'user' + i,
      role: Role.USER,
      email_verified: new Date(),
    };

    const [user] = await db.insert(users).values(userData).returning();

    if (user) {
      await db
        .insert(accounts)
        .values({
          user_id: user.id,
          type: AccountType.email,
          provider: ProviderType.email,
        })
        .returning();
    }

    // Optional: slow down inserts if needed
    // await wait(100); // 100ms delay, for example
  }

  console.log('✅ Seeding users completed!');
};
