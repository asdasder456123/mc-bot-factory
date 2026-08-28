require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const mineflayer = require("mineflayer");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const activeBots = new Map();

const AUTH_PASS = "0.963852963";


function normalizeBotName(name) {
    return name.toUpperCase();
}

function createMcBot(ip, port, botName, version, channel) {
    botName = normalizeBotName(botName);

    if (activeBots.has(botName)) {
        channel.send(`⚠️ الروبوت **${botName}** شغال بالفعل!`);
        return;
    }

    let reconnectTimer = null;
    let stopped = false;
    let currentBot = null;

    const connect = () => {
        if (stopped || currentBot) return;

        console.log(`جاري الاتصال بـ ${ip}:${port} باسم ${botName}...`);

        const botOptions = {
            host: ip,
            port: port,
            username: botName,
            version: version && version !== "auto" ? version : undefined,
            checkTimeoutInterval: 60000
        };

        const mcBot = mineflayer.createBot(botOptions);
        currentBot = mcBot;

        activeBots.set(botName, {
            bot: mcBot,
            stop: () => {
                stopped = true;
                if (reconnectTimer) clearTimeout(reconnectTimer);
                try {
                    mcBot.quit();
                } catch {}
            }
        });

        let authDone = false;
        let authTimer = null;
        let reconnecting = false;

        const scheduleAuth = (type) => {
            if (authDone) return;

            if (authTimer) clearTimeout(authTimer);

            authTimer = setTimeout(() => {
                if (authDone || !mcBot.entity) return;

                if (type === "register") {
                    mcBot.chat(`/register ${AUTH_PASS} ${AUTH_PASS}`);
                    console.log(`[AuthMe] ${botName}: register`);
                } else if (type === "login") {
                    mcBot.chat(`/login ${AUTH_PASS}`);
                    console.log(`[AuthMe] ${botName}: login`);
                }
            }, 300);
        };

        mcBot.on("login", () => {
            console.log(`[تسجيل دخول] ${botName} اتصل بالسيرفر!`);

            if (reconnecting) {
                channel.send(`🔄 الروبوت **${botName}** عاد إلى السيرفر بنجاح!`);
                reconnecting = false;
            } else {
                channel.send(`✅ الروبوت **${botName}** اتصل بالسيرفر!`);
            }
        });

        mcBot.on("messagestr", (message) => {
            console.log(`[شات ${botName}]: ${message}`);

            const text = message.toLowerCase();

            // AuthMe طلب التسجيل
            if (
                !authDone &&
                (
                    text.includes("please register") ||
                    text.includes("register") && text.includes("password")
                )
            ) {
                scheduleAuth("register");
                return;
            }

            // AuthMe طلب تسجيل الدخول
            if (
                !authDone &&
                (
                    text.includes("please login") ||
                    text.includes("login") && text.includes("password")
                )
            ) {
                scheduleAuth("login");
                return;
            }

            // تم الدخول بالفعل
            if (
                text.includes("already logged in") ||
                text.includes("you are logged in") ||
                text.includes("successfully logged in")
            ) {
                authDone = true;
                if (authTimer) clearTimeout(authTimer);
                console.log(`[AuthMe] ${botName}: تم تسجيل الدخول.`);
            }

            // تم التسجيل بنجاح
            if (
                text.includes("successfully registered") ||
                text.includes("registration successful")
            ) {
                authDone = true;
                if (authTimer) clearTimeout(authTimer);
                console.log(`[AuthMe] ${botName}: تم التسجيل.`);
            }
        });

        mcBot.on("spawn", () => {
            console.log(`[Spawn] ${botName} دخل العالم.`);
        });

        mcBot.on("end", (reason) => {
            console.log(`[خروج] ${botName}: ${reason || "socket closed"}`);

            if (currentBot === mcBot) {
                currentBot = null;
            }

            if (reconnectTimer) clearTimeout(reconnectTimer);

            if (!stopped) {
                console.log(`[إعادة اتصال] ${botName} سيحاول الدخول مرة أخرى خلال 5 ثوانٍ...`);

                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;

                    if (stopped) return;

                    reconnecting = true;
                    connect();
                }, 5000);
            }
        });

        mcBot.on("error", (err) => {
            console.error(`[خطأ] ${botName}: ${err.message}`);

            // أخطاء الشبكة لا توقف الروبوت؛ حدث end سيبدأ إعادة الاتصال.
            if (!stopped) {
                console.log(`[مراقبة] ${botName} سيستمر في محاولة الاتصال إذا انقطع الاتصال.`);
            }
        });

        mcBot.on("kicked", (reason) => {
            console.log(`[طرد] ${botName}: ${reason}`);
        });
    };

    connect();
}

client.once("ready", () => {
    console.log(`تم تسجيل الدخول باسم روبوت Discord: ${client.user.tag}`);
    console.log("البوت جاهز.");
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command !== "!start") return;

    const ip = args[0];
    const port = Number(args[1]);
    const requestedName = args[2];
    const version = args[3] || "auto";

    if (!ip || !Number.isInteger(port) || !requestedName) {
        return message.reply(
            "❌ الاستخدام الصحيح:\n`!start <IP> <PORT> <BOT_NAME> [VERSION]`"
        );
    }

    const botName = normalizeBotName(requestedName);

    if (activeBots.has(botName)) {
        return message.reply(`⚠️ الروبوت **${botName}** شغال بالفعل!`);
    }

    message.reply(
        `🔄 جاري تشغيل **${botName}** على \`${ip}:${port}\` بإصدار \`${version}\`...`
    );

    createMcBot(
        ip,
        port,
        botName,
        version,
        message.channel
    );
});

client.login(process.env.TOKEN);
