// Import Module
const {
    makeWASocket,
    useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const { resolve } = require("path");
const port = process.env.PORT || 4000

// Metode Pairing
// True = Pairing Code || False = Scan QR
const usePairingCode = false;

// Fungsi untuk prompt input dari terminal
async function question(prompt) {
    process.stdout.write(prompt);
    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) =>
        r1.question("", (ans) => {
            r1.close();
            resolve(ans);
        }),
    );
}

// Fungsi untuk menghubungkan ke WhatsApp
async function connectToWhatsApp() {
    console.log(chalk.blue("Memulai Koneksi Ke WhatsApp"));

    // Menyimpan sesi login
    const { state, saveCreds } = await useMultiFileAuthState(
        resolve(__dirname, "SessionX"),
    );

    // Membuat Koneksi WhatsApp
    const devvx = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode, // Menampilkan QR jika tidak menggunakan pairing code
        auth: state, // Pakai sesi yang ada
        browser: ["Ubuntu", "Chrome", "20.0.04"], // Simulasi Browser
        version: [2, 3000, 1015901307], // Versi WhatsApp
    });

    // Periksa jika `creds` belum ada atau sesi belum terdaftar
    if (usePairingCode && !devvx.authState.creds) {
        console.log(chalk.green("☘  Masukkan Nomor Dengan Awal 62"));
        const phoneNumber = await question("> ");
        const code = await devvx.requestPairingCode(phoneNumber.trim());
        console.log(chalk.cyan(`🎁  Pairing Code : ${code}`));
    }

    // Menyimpan Sesi Login
    devvx.ev.on("creds.update", saveCreds);

    // Menyimpan waktu koneksi pertama kali
    const startTime = Date.now();

    // Informasi Koneksi
    devvx.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            console.log(
                chalk.red("❌  Koneksi Terputus, Mencoba Menyambung Ulang"),
            );
            connectToWhatsApp();
        } else if (connection === "open") {
            console.log(chalk.green("✔  Bot Berhasil Terhubung Ke WhatsApp"));
        }
    });

    // Respon Pesan Masuk
    devvx.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];

        if (!msg.message) return;

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";
        const sender = msg.key.remoteJid;
        const pushname = msg.pushName || "Devvx";

        // Log Pesan Masuk di Terminal
        const listColor = [
            "red",
            "green",
            "yellow",
            "magenta",
            "cyan",
            "white",
            "blue",
        ];
        const randomColor =
            listColor[Math.floor(Math.random() * listColor.length)];

        console.log(
            chalk.yellow.bold("Credit : Devvx"),
            chalk.green.bold("[ WhatsApp ]"),
            chalk[randomColor](pushname),
            chalk[randomColor](" : "),
            chalk.white(body),
        );

        // Tangani respons jika pesan adalah '.ping'
        if (body.startsWith(".ping")) {
            // Menghitung durasi aktif
            const uptime = Math.floor((Date.now() - startTime) / 1000); // Durasi dalam detik
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;

            // Membuat format output tanpa pluralisasi dan tanpa (s)
            let reply = `Active: ${hours} hour ${minutes} minute ${seconds} second`;

            // Mengirim balasan
            await devvx.sendMessage(msg.key.remoteJid, { text: reply });
        }

        // Menggunakan eksternal file untuk memproses pesan masuk
        require("./devvx")(devvx, m);
    });
}

// Jalankan Koneksi WhatsApp
connectToWhatsApp();
