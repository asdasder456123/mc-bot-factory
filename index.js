require("dotenv").config();
const { Client, GatewayIntentBits } = require('discord.js');
const mineflayer = require('mineflayer');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeBots = new Map();

// كلمة السر القوية والمحددة
const SAFE_PASS = '0.963852963as';

client.on('clientReady', () => {
    console.log(`تم تسجيل الدخول باسم ${client.user.tag}! البوت جاهز بكلمة السر الجديدة.`);
});

function createMcBot(ip, port, botName, version, channel) {
    console.log(`جاري الاتصال بـ ${ip}:${port} باسم ${botName}...`);
    
    try {
        const botOptions = {
            host: ip,
            port: port,
            username: botName,
            checkTimeoutInterval: 60000
        };

        if (version && version !== 'auto') {
            botOptions.version = version;
        }

        const mcBot = mineflayer.createBot(botOptions);
        activeBots.set(botName, mcBot);

        // إرسال أمر التسجيل والدخول بكلمة السر الجديدة
        const sendAuthCommands = () => {
            mcBot.chat(`/register ${SAFE_PASS} ${SAFE_PASS}`);
            mcBot.chat(`/login ${SAFE_PASS}`);
        };

        mcBot.on('login', () => {
            console.log(`[تسجيل دخول] ${botName} اتصل بالسيرفر!`);
            channel.send(`✅ الروبوت **${botName}** اتصل بالسيرفر بنجاح!`);
            setTimeout(sendAuthCommands, 1000);
        });

        mcBot.on('spawn', () => {
            sendAuthCommands();
        });

        // متابعة شات السيرفر والرد فوراً في حالة طلب التسجيل أو كلمة السر
        mcBot.on('messagestr', (message) => {
            console.log(`[شات ${botName}]: ${message}`);
            const lowerText = message.toLowerCase();

            if (
                lowerText.includes('register') || 
                lowerText.includes('password') || 
                lowerText.includes('login')
            ) {
                sendAuthCommands();
            }
        });

        mcBot.on('end', (reason) => {
            console.log(`[خروج] ${botName}: ${reason}`);
            activeBots.delete(botName);
            channel.send(`❌ الروبوت **${botName}** خرج من السيرفر.`);
        });

        mcBot.on('error', (err) => {
            console.error(`[خطأ] ${botName}:`, err.message);
            activeBots.delete(botName);
            channel.send(`⚠️ حدث خطأ في الروبوت **${botName}**: \`${err.message}\``);
        });

    } catch (err) {
        activeBots.delete(botName);
        channel.send(`❌ فشل تشغيل الروبوت **${botName}**: ${err.message}`);
    }
}

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === '!start') {
        const ip = args[0];
        const port = parseInt(args[1]);
        const botName = args[2];
        const version = args[3] || '1.20.1';

        if (!ip || isNaN(port) || !botName) {
            return message.reply('❌ الصيغة خاطئة! اكتب الأمر كدة:\n`!start <IP> <Port> <BotName> [Version]`');
        }

        if (activeBots.has(botName)) {
            return message.reply(`⚠️ الروبوت **${botName}** شغال بالفعل!`);
        }

        message.reply(`🔄 جاري تشغيل **${botName}**...`);
        createMcBot(ip, port, botName, version, message.channel);
    }
});

client.login(process.env.TOKEN);
