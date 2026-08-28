import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// Create a separate Prisma client for seeding
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
});

async function main() {
    // 1. Seed currencies
    const currencies = [
        { code: 'CNY', nameTh: 'จีน : หยวน เรนมินบิ', nameEn: 'CHINA : YUAN RENMINBI', symbol: '¥' },
        { code: 'USD', nameTh: 'สหรัฐอเมริกา : ดอลลาร์', nameEn: 'USA : US DOLLAR', symbol: '$' },
        { code: 'THB', nameTh: 'ไทย : บาท', nameEn: 'THAILAND : BAHT', symbol: '฿' },
        { code: 'EUR', nameTh: 'ยูโรโซน : ยูโร', nameEn: 'EUROZONE : EURO', symbol: '€' },
        { code: 'JPY', nameTh: 'ญี่ปุ่น : เยน', nameEn: 'JAPAN : YEN', symbol: '¥' },
        { code: 'GBP', nameTh: 'อังกฤษ : ปอนด์', nameEn: 'GREAT BRITAIN : POUND', symbol: '£' },
        { code: 'KRW', nameTh: 'เกาหลีใต้ : วอน', nameEn: 'SOUTH KOREA : WON', symbol: '₩' },
    ];

    for (const currency of currencies) {
        await prisma.currency.upsert({
            where: { code: currency.code },
            update: currency,
            create: currency,
        });
    }
    console.log('✅ Seeded currencies');

    // 2. Seed Users
    const targetUsers = [
        { name: 'Admin', email: 'admin@currency.local', password: 'admin1234', role: 'admin' },
        { name: 'Pond', email: 'pond@currency.local', password: 'admin1234', role: 'user' },
        { name: 'Tummy', email: 'tummy@currency.local', password: 'admin1234', role: 'user' },
    ];

    const dbUsers = [];
    for (const tu of targetUsers) {
        let user = await prisma.user.findFirst({ where: { email: tu.email } });
        if (!user) {
            const ctx = await auth.api.signUpEmail({
                body: { name: tu.name, email: tu.email, password: tu.password },
            });
            if (ctx?.user) {
                user = await prisma.user.update({
                    where: { id: ctx.user.id },
                    data: { role: tu.role },
                });
                console.log(`✅ Seeded user: ${tu.email}`);
            }
        } else {
            console.log(`ℹ️  User already exists: ${tu.email}`);

            // Auto update password? To guarantee the password is correct, 
            // Better-auth doesn't have an easy reset without token usually. 
            // Assuming password hasn't changed.
        }
        if (user) dbUsers.push(user);
    }

    const adminUser = dbUsers.find(u => u.email === 'admin@currency.local') || dbUsers[0];

    // 3. Seed Company
    let company = await prisma.company.findFirst();
    if (!company) {
        company = await prisma.company.create({
            data: {
                name: 'Main Company HQ',
                taxId: '0105555555555',
                address: '123 Test St, Bangkok',
                phone: '02-111-2222',
                createdBy: adminUser.id,
            }
        });
        console.log('✅ Created default company');
    } else {
        console.log(`ℹ️  Using existing company: ${company.name}`);
    }

    // Assign users to company
    for (const u of dbUsers) {
        const cu = await prisma.companyUser.findFirst({
            where: { userId: u.id, companyId: company.id }
        });
        if (!cu) {
            await prisma.companyUser.create({
                data: {
                    userId: u.id,
                    companyId: company.id,
                    role: u.role === 'admin' ? 'ADMIN' : 'DATA_ENTRY'
                }
            });
        }
    }

    // 4. Create Mock Customers
    console.log('Seeding customers...');
    const customerNames = [
        'บริษัท เอกชัย ดิสทริบิวชั่น จำกัด', 'บมจ. ซีพี ออลล์', 'บริษัท เซ็นทรัลพัฒนา จำกัด',
        'บริษัท พีทีที โกลบอล เคมิคอล', 'บริษัท แอดวานซ์ อินโฟร์ เซอร์วิส', 'บริษัท ปูนซิเมนต์ไทย',
        'บมจ. ท่าอากาศยานไทย', 'บมจ. ปตท. สำรวจและผลิตปิโตรเลียม', 'บริษัท กัลฟ์ เอ็นเนอร์จี ดีเวลลอปเมนท์',
        'บริษัท เบอร์ลี่ ยุคเกอร์ จำกัด', 'บริษัท พลังงานบริสุทธิ์ จำกัด', 'บมจ. โฮม โปรดักส์ เซ็นเตอร์'
    ];

    const customers = [];
    for (let i = 0; i < 10; i++) {
        const name = customerNames[i] || `Mock Customer ${i + 1}`;
        let customer = await prisma.customer.findFirst({
            where: { companyId: company.id, name: name }
        });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    companyId: company.id,
                    name: name,
                    address: `10${i} Test Ave, Bangkok 10110`,
                    taxId: `01055${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                    createdBy: adminUser.id,
                }
            });
        }
        customers.push(customer);
    }
    console.log(`✅ Seeded 10 Customers`);

    // 5. Create 100 Mock Transactions
    console.log('Seeding 100 mock transactions. This might take a moment...');

    // Always top up to 100 transactions
    const txCount = await prisma.transaction.count({ where: { companyId: company.id } });
    if (txCount < 100) {
        const needed = 100 - txCount;
        const curCodes = ['USD', 'CNY', 'EUR', 'JPY'];
        let created = 0;

        for (let i = 0; i < needed; i++) {
            const customer = customers[Math.floor(Math.random() * customers.length)];
            const currencyCode = curCodes[Math.floor(Math.random() * curCodes.length)];

            // Random dates within the last 30 days
            const pastDays = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(date.getDate() - pastDays);

            let exchangeRate = 1;
            if (currencyCode === 'USD') exchangeRate = 34.5 + Math.random() * 2;
            else if (currencyCode === 'CNY') exchangeRate = 4.8 + Math.random() * 0.5;
            else if (currencyCode === 'EUR') exchangeRate = 38.0 + Math.random() * 2;
            else if (currencyCode === 'JPY') exchangeRate = 0.23 + Math.random() * 0.02;

            const foreignAmount = 1000 + Math.floor(Math.random() * 50000);
            const thbAmount = Math.round(foreignAmount * exchangeRate * 100) / 100;

            const declNum = `A${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
            const invNum = `INV-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            // Create Transaction with 1 Invoice and 1 Item
            await prisma.transaction.create({
                data: {
                    companyId: company.id,
                    customerId: customer.id,
                    createdBy: adminUser.id,
                    declarationNumber: declNum,
                    declarationDate: date,
                    invoiceNumber: invNum,
                    invoiceDate: date,
                    currencyCode: currencyCode,
                    foreignAmount: foreignAmount,
                    exchangeRate: exchangeRate,
                    thbAmount: thbAmount,
                    rateDate: date,
                    rateSource: 'BOT',
                    invoices: {
                        create: [{
                            companyId: company.id,
                            createdBy: adminUser.id,
                            invoiceNumber: invNum,
                            invoiceDate: date,
                            currencyCode: currencyCode,
                            totalForeign: foreignAmount,
                            totalThb: thbAmount,
                            items: {
                                create: [{
                                    itemNo: 1,
                                    goodsName: `Mock Goods ${Math.floor(Math.random() * 1000)}`,
                                    price: foreignAmount,
                                    priceTHB: thbAmount,
                                    totalPrice: foreignAmount,
                                    totalPriceTHB: thbAmount,
                                }]
                            }
                        }]
                    }
                }
            });
            created++;
            if (created % 20 === 0) console.log(`   Created ${created}/${needed} transactions...`);
        }
        console.log(`✅ Seeded ${created} new transactions`);
    } else {
        console.log(`ℹ️  Already have ${txCount} transactions. Skipping mock data generation.`);
    }

    console.log('🎉 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
