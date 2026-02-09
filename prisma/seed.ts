import 'dotenv/config'
import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {

    const group = await prisma.eventGroup.create({
        data: {
            groupName: 'Sahur Bareng Ramadhan 1447H',
            slug: 'sahur-2026',
            lockToSingleEvent: true,
        },
    })

    const event = await prisma.event.create({
        data: {
            id: '70fecfca-2ea6-4ff0-9ec6-d114c297104a',
            group: {
                connect: {
                    id: group.id
                }
            },
            title: 'Sahur Bareng Puri Asthagina',
            slug: 'sahur-puri-asthagina',
            description: '<p>Hai, Penghuni Puri Asthagina! 🤩👋<p>Di bulan Ramadhan ini, Puri Asthagina kembali mengajak kamu untuk bergabung dalam event *<strong><strong>“SABAR: Sahur Bareng Puri Asthagina”</strong></strong>* , program sahur gratis yang bisa kamu nikmati selama bulan Ramadhan, khusus untuk seluruh penghuni kos Puri Asthagina 🍱<p>Syarat dan ketentuannya gampang banget! Kamu hanya perlu data diri pada form ini dengan lengkap dan benar melalui link Google Form ini. Lalu, setelah data berhasil diproses kamu akan menerima kupon digital berupa QRIS 📲<p>QRIS ini digunakan untuk mengambil 1 porsi sahur gratis per hari selama Ramadhan. _<em><em>Notes: QRIS hanya bisa di-scan 1 kali dalam sehari dan baru bisa digunakan kembali keesokan harinya. Jadi, mohon digunakan dengan bijak sesuai ketentuan yaa</em></em>_ 🙏<p>Jika mengalami kendala atau ada pertanyaan saat mengisi form, silakan hubungi kami melalui WhatsApp: <strong>0822 2444 3643 (Asthagina Creative)</strong>.<p><strong>Selamat menjalankan ibadah puasa & selamat menikmati Sahur Bersama Puri Asthagina✨🌙</strong>',
            bannerPath: 'events/70fecfca-2ea6-4ff0-9ec6-d114c297104a.png',
            startAt: new Date('2026-02-19T02:00:00Z'),
            endAt: new Date('2026-03-20T04:30:00Z'),
            successGreeting: 'Registrasi Berhasil!',
            successPrimaryBtnText: 'Kembali ke Beranda',
            successPrimaryBtnUrl: '/',
            isActive: true,
        },
    })

    const stepClaim = await prisma.registrationStep.create({
        data: {
            eventId: event.id,
            title: 'Informasi Penghuni Kos Puri Asthagina',
            description: '<p><strong>Petunjuk Pengisian Informasi:</strong><ul><li>Masukkan Nama Blok, Nomor Blok, dan Nomor Kamar pada form.<li><strong>Contoh:</strong> Saya tinggal di Blok CC7 Kamar No. 3.<br>Jadi pada Nama Blok pilih "CC", pada Nomor blok isi "CC7", dan pada Nomor Kamar pilih "Kamar 3".</ul>',
            stepType: 'claim_seat',
            orderPriority: 1,
        },
    })

    await prisma.claimSeatConfig.createMany({
        data: [
            {
                stepId: stepClaim.id,
                label: 'Nama Blok Kos Yang Dihuni',
                inputType: 'select',
                options: '["AA","BB","CC","DD","EE","FF"]',
                description: ''
            },
            {
                stepId: stepClaim.id,
                label: 'Nomor Blok Kos Yang Dihuni',
                inputType: 'text',
                placeholder: 'Contoh: CC7',
                description: ''
            },
            {
                stepId: stepClaim.id,
                label: 'Nomor Kamar Yang Dihuni',
                inputType: 'select',
                options: '["Kamar 1","Kamar 2","Kamar 3","Kamar 4","Kamar 5","Kamar 6","Kamar 7","Kamar 8"]',
                description: ''
            },
        ]
    })

    const stepLandLady = await prisma.registrationStep.create({
        data: {
            eventId: event.id,
            title: 'Identitas Pemilik Kos/Pengelola Kos',
            description: 'Masukkan nama pemilik kos atau pengelola kos dengan benar.',
            stepType: 'questionnaire',
            orderPriority: 2,
        },
    })

    await prisma.questionnaireQuestion.createMany({
        data: [
            {
                stepId: stepLandLady.id,
                label: 'Nama Pemilik Kos/Pengelola Kos',
                inputType: 'text',
                isRequired: true,
                orderPriority: 1,
                description: ''
            },
            {
                stepId: stepLandLady.id,
                label: 'Nomor Telepon Pemilik Kos/Pengelola Kos',
                inputType: 'phone',
                isRequired: true,
                orderPriority: 2,
                description: ''
            },
        ],
    })

    const stepOrigin = await prisma.registrationStep.create({
        data: {
            eventId: event.id,
            title: 'Informasi Asal Penghuni Kos',
            description: 'Masukkan alamat asal secara lengkap sesuai KTP/KTM/KIM.',
            stepType: 'questionnaire',
            orderPriority: 3,
        },
    })

    await prisma.questionnaireQuestion.createMany({
        data: [
            {
                stepId: stepOrigin.id,
                label: 'Provinsi',
                inputType: 'text',
                isRequired: true,
                orderPriority: 1,
                description: ''
            },
            {
                stepId: stepOrigin.id,
                label: 'Kota/Kabupaten',
                inputType: 'text',
                isRequired: true,
                orderPriority: 2,
                description: ''
            },
            {
                stepId: stepOrigin.id,
                label: 'Alamat',
                description: 'Masukan alamat lengkap berupa kecamatan, kelurahan, nama jalan, dan sebagainya.',
                inputType: 'text',
                isRequired: true,
                orderPriority: 3,
            },
            {
                stepId: stepOrigin.id,
                label: 'Nama Universitas/Perguruan Tinggi/Tempat Kerja',
                description: 'Masukan nama universitas atau perguruan tinggi. Jika tidak sedang dalam pendidikan silahkan isi nama tempat bekerja.',
                inputType: 'text',
                isRequired: true,
                orderPriority: 4,
            },
        ],
    })

    const stepReview = await prisma.registrationStep.create({
        data: {
            eventId: event.id,
            title: 'Bantu Kami Dengan Memberikan Rating, Review & Follow',
            description: '<p><strong>Petunjuk Pengisian:</strong><ol><li>Berikan rating dan review di Google Maps <strong>Puri Asthagina</strong> (link tersedia di bawah).<li>Follow akun Instagram, Tiktok, serta subscribe channel Youtube <strong>Puri Asthagina</strong>.<li>Cantumkan bukti review, follow, dan subscribe dalam bentuk <em>screenshot</em> pada form yang tersedia.</ol>',
            stepType: 'questionnaire',
            orderPriority: 4,
        },
    })

    await prisma.questionnaireQuestion.createMany({
        data: [
            {
                stepId: stepReview.id,
                label: 'Bukti Rating & Review Google Maps Graha Asthagina',
                inputType: 'file',
                isRequired: true,
                orderPriority: 1,
                description: '<strong>Link Rating dan Review: <a class="text-blue-500" href="https://www.google.com/search?hl=id-ID&gl=id&q=Graha+Asthagina,+Jl.+Sasando,+Tunggulwulung,+Kec.+Lowokwaru,+Kota+Malang,+Jawa+Timur+65143&ludocid=521856171723763008&lsig=AB86z5WHVdyf7wLBdC4Y6z0fmfBo#lrd=0x2e78836899b6319b:0x73e016c5b70ad40,3"rel="noopener noreferrer"target=_blank>Klik di sini</a></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Follow Instagram : @asthagina_id',
                inputType: 'file',
                isRequired: true,
                orderPriority: 2,
                description: '<strong>Link Instagram: <a class="text-blue-500" href="https://www.instagram.com/asthagina_id?igsh=MzE2M3Z1ZzQ5M3F6" target=_blank>@asthagina_id<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Follow Instagram : @puriasthagina',
                inputType: 'file',
                isRequired: true,
                orderPriority: 3,
                description: '<strong>Link Instagram: <a class="text-blue-500" href="https://www.instagram.com/puriasthagina?igsh=MTQwNjRyNjE5NGQzYw%3D%3D" target=_blank>@puriasthagina<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Follow Tiktok : @puriasthagina',
                inputType: 'file',
                isRequired: true,
                orderPriority: 4,
                description: '<strong>Link Tiktok: <a class="text-blue-500" href="https://www.tiktok.com/@puriasthagina.id?_r=1&_t=ZS-93J3jy3RAxB" target=_blank>@puriasthagina.id<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Subscribe Youtube : @puriasthagina_id',
                inputType: 'file',
                isRequired: true,
                orderPriority: 5,
                description: '<strong>Subscribe Youtube: <a href="https://www.youtube.com/@puriasthagina_id" target=_blank>@puriasthagina_id<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Follow Instagram : @aksarakost',
                inputType: 'file',
                isRequired: true,
                orderPriority: 6,
                description: '<strong>Link Instagram: <a class="text-blue-500" href="https://www.instagram.com/aksarakost.id?igsh=N2N1dmV1MWY2NWZt" target=_blank>@aksarakost.id<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Follow Tiktok : @aksarakost',
                inputType: 'file',
                isRequired: true,
                orderPriority: 7,
                description: '<strong>Link Tiktok: <a class="text-blue-500" href="https://www.tiktok.com/@aksarakost.id?_r=1&_t=ZS-93J64cLqYlx" target=_blank>@aksarakost.id<a/></strong>'
            },
            {
                stepId: stepReview.id,
                label: 'Bukti Subscribe Youtube : @aksarakost',
                inputType: 'file',
                isRequired: true,
                orderPriority: 8,
                description: '<strong>Link Youtube: <a class="text-blue-500" href="https://www.youtube.com/@aksarakost" target=_blank>@aksarakost<a/></strong>'
            },
        ],
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