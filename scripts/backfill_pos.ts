import 'dotenv/config';
import prisma from '../lib/db';
import { PosconeClient } from '../lib/poscone';

async function backfill() {
    const loginId = process.env.POSCONE_LOGIN_ID || '';
    const loginPw = process.env.POSCONE_LOGIN_PW || '';
    const client = new PosconeClient(loginId, loginPw);

    console.log('Logging in to POSCONE...');
    await client.login();

    const today = new Date();
    const shops: ('love_point' | 'room_of_love_point')[] = ['love_point', 'room_of_love_point'];

    for (let i = 0; i < 60; i++) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() - i);
        const dateStr = targetDate.toISOString().split('T')[0];
        console.log(`--- Syncing ${dateStr} ---`);

        for (const shopId of shops) {
            try {
                const txs = await client.fetchTransactions(shopId, dateStr, dateStr);
                console.log(`  [${shopId}] Found ${txs.length} transactions.`);
                
                if (txs.length > 0) {
                    for (const tx of txs) {
                        await prisma.posTransaction.upsert({
                            where: { id: tx.id },
                            update: {
                                closedAt: tx.closedAt,
                                castName: tx.castName,
                                itemName: tx.itemName,
                                category: tx.category,
                                quantity: tx.quantity,
                                unitPrice: tx.unitPrice,
                                totalPrice: tx.totalPrice,
                            },
                            create: {
                                id: tx.id,
                                shopId,
                                closedAt: tx.closedAt,
                                castName: tx.castName,
                                itemName: tx.itemName,
                                category: tx.category,
                                quantity: tx.quantity,
                                unitPrice: tx.unitPrice,
                                totalPrice: tx.totalPrice,
                            }
                        });
                    }
                }
            } catch (e) {
                console.error(`  [${shopId}] Error:`, e);
            }
        }
    }
    console.log('Backfill complete!');
}

backfill();
