import 'dotenv/config'
import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { md5Hash } from '../server/utils/crypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {

    const admin = await prisma.administrator.create({
        data: {
            email: 'operator1@example.com',
            fullname: 'Operator 1',
            password: md5Hash('Password123!'),
            role: 'operator',
            isActive: true
        },
    })

    const admin2 = await prisma.administrator.create({
        data: {
            email: 'operator2@example.com',
            fullname: 'Operator 2',
            password: md5Hash('Password123!'),
            role: 'operator',
            isActive: true
        },
    })

    const eventAdmin = await prisma.eventAdministrator.create({
        data: {
            eventId: '70fecfca-2ea6-4ff0-9ec6-d114c297104a',
            userId: admin.id
        },
    })

    const eventAdmin2 = await prisma.eventAdministrator.create({
        data: {
            eventId: '70fecfca-2ea6-4ff0-9ec6-d114c297104a',
            userId: admin2.id
        },
    })

    console.log('Seed data created successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })