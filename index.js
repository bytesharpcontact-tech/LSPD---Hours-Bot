const { Client, GatewayIntentBits } = require('discord.js');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

const firebaseConfig = {
    apiKey: "AIzaSyAruzqGnmeVafp0qiwNvrZ6WCHRk3TRFx8",
    authDomain: "lspd-panel-1a2ad.firebaseapp.com",
    databaseURL: "https://lspd-panel-1a2ad-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "lspd-panel-1a2ad"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const db = ref(database, 'lspd');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const CHANNEL_ID = '1440449638216892508';
let lastMessageId = null;

client.once('ready', () => {
    console.log(`Bot online jako ${client.user.tag} – sprawdzam godziny co 5 minut`);
    checkHours();
    setInterval(checkHours, 5 * 60 * 1000);
});

async function checkHours() {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const messages = await channel.messages.fetch({ limit: 15 });
        const latest = messages.find(m => m.author.bot && m.content.includes('┃'));

        if (latest && latest.id !== lastMessageId) {
            lastMessageId = latest.id;
            const lines = latest.content.split('\n').filter(l => l.includes('–') && l.includes('h'));

            let officers = [];
            try {
                const snapshot = await get(db);
                officers = snapshot.val() ? Object.values(snapshot.val()) : [];
            } catch(e) { console.error(e); }

            const today = new Date();
            const end = new Date(today);
            end.setDate(today.getDate() + 6);
            const week = `${today.toLocaleDateString('pl-PL')} - ${end.toLocaleDateString('pl-PL')}`;

            lines.forEach(line => {
                const match = line.match(/^\d+\s*-\s*(.+?)\s*-\s*.+?\s*-\s*(.+)$/);
                if (!match) return;
                const name = match[1].trim();
                const hoursStr = match[2].trim();

                const officer = officers.find(o => 
                    o.name.toLowerCase() === name.toLowerCase() || 
                    o.name.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(o.name.toLowerCase())
                );

                if (officer) {
                    if (!officer.hours) officer.hours = {};
                    officer.hours[week] = `${week} - ${hoursStr}`;
                }
            });

            await set(db, officers);
            console.log(`Godziny zaktualizowane! ${new Date().toLocaleString('pl-PL')}`);
        }
    } catch (err) {
        console.error('Błąd:', err.message);
    }
}

client.login(process.env.DISCORD_TOKEN);
