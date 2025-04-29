// Import Modul
const express = require('express');
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const { resolve } = require("path");

const app = express();
const port = process.env.PORT || 4000;

// Metode Pairing
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
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        version: [2, 3000, 1015901307],
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
        const { connection } = update;
        if (connection === "close") {
            console.log(chalk.red("❌  Koneksi Terputus, Mencoba Menyambung Ulang"));
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
    });
}

// Jalankan Koneksi WhatsApp
connectToWhatsApp();

// Endpoint Express untuk root ("/")
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const data = {
        status: 'true',
        message: 'Bot Successfully Activated!',
        author: 'SATRIADEV'
    };
    const result = {
        response: data
    };
    res.send(JSON.stringify(result, null, 2));
});

// Fungsi untuk mendengarkan pada port
function listenOnPort(port) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    app.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Trying another port...`);
            listenOnPort(port + 1);
        } else {
            console.error(err);
        }
    });
}

// Mulai server Express pada port yang tersedia
listenOnPort(port);
