module.exports = async (devvx, m) => {
    // Pesan masuk dapat diproses di sini
    const msg = m.messages[0];
    const body =
        msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    // Tidak ada respons atau aksi apapun ketika menerima pesan .ping
    if (body.startsWith(".ping")) {
        // Tidak ada kode yang dijalankan untuk .ping
    }
};
