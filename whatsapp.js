module.exports = function (io) {
    const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
    const qrcode = require('qrcode-terminal');
    const express = require('express');
    const os = require('os');
    
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });
    
    let qrCode = null;
    const ownerNumber = "94785760531@s.whatsapp.net"; // Your number for startup message
    
    client.on('qr', (qr) => {
        qrCode = qr;
        qrcode.generate(qr, { small: true });
        io.emit('qr', qr);
    });
    
    client.on('authenticated', () => {
        console.log('Authenticated');
        qrCode = null;
        io.emit('authenticated');
    });
    
    client.on('auth_failure', (msg) => {
        console.error('Authentication failure:', msg);
        io.emit('auth_failure', msg);
    });
    
    client.on('ready', async () => {
        console.log('Client is ready!');
        io.emit('ready');
        
        // Send startup message
        try {
            const message =
                "🚀 WhatsApp bot is now connected and ready!\n\n" +
                "Available commands:\n" +
                "!alive - Chech Bot Online\n" +
                "!sys - Show system information";
            await client.sendMessage(ownerNumber, message);
            console.log(`Initial message sent to ${ownerNumber}`);
        } catch (error) {
            console.error('Error sending initial message:', error);
        }
    });
    
    // Listen for messages
    client.on('message_create', async (msg) => {
        console.log(`Received message from ${msg.from}: ${msg.body}`);
        
        if (msg.body === '!alive') {
            await msg.reply('තාම ඉන්නෝ මැරිලා නෑ....😑');
            return;
        }
        
        if (msg.body === '!sys') {
            const systemInfo = 
                `💻 System Information:\n\n` +
                `🖥️ Platform: ${os.platform()}\n` +
                `🏗️ Architecture: ${os.arch()}\n` +
                `🔢 Node Version: ${process.version}\n` +
                `⚡ CPU Cores: ${os.cpus().length}\n` +
                `💾 Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
                `🔓 Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB\n` +
                `⏱️ Uptime: ${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m\n` +
                `📂 Hostname: ${os.hostname()}`;
            
            await msg.reply(systemInfo);
            return;
        }
    });
    
    // HTTP API
    const app = express();
    app.use(express.json());
    
    app.get('/', async (req, res) => {
        const { send, number, photo, doc, au } = req.query;
        
        try {
            if (!send || !number) {
                return res.status(400).send('❌ Missing required parameters. Use ?send=<message>&number=<phone_number>');
            }
            
            // Format phone number to WhatsApp format if not already formatted
            let targetNumber = number;
            if (!targetNumber.includes('@')) {
                // Remove any non-digit characters and add @s.whatsapp.net
                targetNumber = targetNumber.replace(/\D/g, '') + '@s.whatsapp.net';
            }
            
            let mediaAttached = false;
            
            // Handle photo
            if (photo) {
                try {
                    const media = await MessageMedia.fromUrl(photo);
                    await client.sendMessage(targetNumber, media, { caption: send });
                    mediaAttached = true;
                    console.log(`Photo with caption sent to ${targetNumber}`);
                } catch (error) {
                    console.error('Error sending photo:', error);
                    return res.status(500).send(`❌ Error sending photo: ${error.message}`);
                }
            }
            
            // Handle document
            if (doc) {
                try {
                    const docMedia = await MessageMedia.fromUrl(doc);
                    await client.sendMessage(targetNumber, docMedia, { caption: send });
                    mediaAttached = true;
                    console.log(`Document with caption sent to ${targetNumber}`);
                } catch (error) {
                    console.error('Error sending document:', error);
                    return res.status(500).send(`❌ Error sending document: ${error.message}`);
                }
            }
            
            // Handle audio
            if (au) {
                try {
                    const audioMedia = await MessageMedia.fromUrl(au);
                    await client.sendMessage(targetNumber, audioMedia);
                    // Send text message separately for audio
                    if (!mediaAttached) {
                        await client.sendMessage(targetNumber, send);
                    }
                    console.log(`Audio sent to ${targetNumber}`);
                } catch (error) {
                    console.error('Error sending audio:', error);
                    return res.status(500).send(`❌ Error sending audio: ${error.message}`);
                }
            }
            
            // Send text message if no media was attached
            if (!mediaAttached && !au) {
                await client.sendMessage(targetNumber, send);
                console.log(`Text message sent to ${targetNumber}`);
            }
            
            res.send('✅ Message sent successfully!');
            
        } catch (error) {
            console.error('Error sending via HTTP:', error);
            res.status(500).send(`❌ Error: ${error.message}`);
        }
    });
    
    // Start HTTP server
    const PORT = 3031;
    app.listen(PORT, () => {
        console.log(`HTTP API listening on port ${PORT}`);
    });
    
    client.initialize();
    return client;
};
