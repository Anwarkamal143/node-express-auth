import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { AccountType, ProviderType, Role } from '.';

import { hashValue } from '@/utils/bcrypt';
import * as schema from './tables';
import { accounts, users } from './tables';

export async function seedDatabase(
  db: PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
  }
) {
  try {
    console.log('Seeding database...');
    // const hashedPassword = await createHash("T#9xLp!eW2@Zv8Rm$Q1g");
    const hashedPassword = await hashValue('Test@123');
    await db.transaction(async (txs) => {
      const [user] = await txs
        .insert(users)
        .values({
          email: 'super_admin@e-shop.com',
          name: 'admin',
          role: Role.SUPER_ADMIN,
          password: hashedPassword,
          email_verified: new Date(),
        })
        .onConflictDoNothing({ target: users.email })
        .returning();
      if (user?.id) {
        await txs
          .insert(accounts)
          .values({
            user_id: user.id,
            type: AccountType.email,
            provider: ProviderType.email,
          })
          .onConflictDoNothing({ target: accounts.user_id })
          .returning();
      }
    });
    console.log('✅ Database seeded successfully!');
    return await Promise.resolve();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error; // Re-throw to be caught by migration script
  }
}
