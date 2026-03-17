const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// ================= CONFIGURAÇÃO =================
const seuNumero = '553598632886@c.us';
const API_TESTE = 'https://atmos.panelbr.site/api/chatbot/VdWXYPj13q/VpKDaPJLRA';
const MINHA_CHAVE_PIX = '35998632886';
const NOME_PIX = 'Jose Leandro Silva Cardoso';
const BANCO_DADOS = './clientes.json';

// Estado do servidor (Manutenção)
let manutencaoAtiva = false;

if (!fs.existsSync(BANCO_DADOS)) {
    fs.writeFileSync(BANCO_DADOS, JSON.stringify({}));
}

const usuariosSaudados = new Set();
// ================================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('✅ QR CODE GERADO! Escaneie agora para ligar o Bot.');
});

client.on('ready', () => {
    console.log('🚀 BOT LEO IPTV ONLINE NO TERMUX!');

    // Verificação programada
    setInterval(async () => {
        const agora = new Date();
        const hora = agora.getHours();
        const minuto = agora.getMinutes();

        // --- DISPARO DAS 09:00 (AVISOS NORMAIS) ---
        if (hora === 9 && minuto === 0) {
            console.log('⏰ Horário de avisos atingido (09:00).');
            try {
                const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
                const hoje = new Date();
                hoje.setHours(0,0,0,0);

                for (const [id, info] of Object.entries(db)) {
                    if (!info.vencimento) continue;
                    const venc = new Date(info.vencimento + 'T00:00:00');
                    const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

                    if (diffDias === 2) {
                        await client.sendMessage(id, `⚠️ *AVISO DE VENCIMENTO*\n\nOlá! Sua assinatura vence em *2 dias*. Não fique sem sinal! Digite *6* para renovar.`);
                    } else if (diffDias === 0) {
                        await client.sendMessage(id, `🚫 *VENCIMENTO HOJE*\n\nSua assinatura vence hoje. Para renovar, digite *6* e envie o comprovante!`);
                    }
                }
            } catch (e) { console.error("Erro nas 09h:", e.message); }
        }

        // --- DISPARO DAS 18:00 (URGÊNCIA/BLOQUEIO SIMULADO) ---
        if (hora === 18 && minuto === 0) {
            console.log('⏰ Horário de urgência atingido (18:00).');
            try {
                const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
                const hoje = new Date();
                hoje.setHours(0,0,0,0);

                for (const [id, info] of Object.entries(db)) {
                    if (!info.vencimento) continue;
                    const venc = new Date(info.vencimento + 'T00:00:00');
                    const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

                    if (diffDias === 0) {
                        await client.sendMessage(id, `⚠️ *ALERTA DE BLOQUEIO*\n\nIdentificamos que sua renovação ainda não foi confirmada. Para evitar o corte automático do sinal às 20h, envie o comprovante agora!`);
                    }
                }
            } catch (e) { console.error("Erro nas 18h:", e.message); }
        }
    }, 60000);
});

client.on('message_create', async (msg) => {
    try {
        if (msg.from === 'status@broadcast') return;
        if (!msg.body && !msg.type) return;

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const texto = msg.body ? msg.body.toLowerCase() : '';
        const msgDe = msg.from;

        // Se o servidor estiver em manutenção, avisa o cliente (exceto se for o ADM)
        if (manutencaoAtiva && !msg.fromMe && !usuariosSaudados.has(msgDe)) {
            await msg.reply('⚠️ *COMUNICADO LEO IPTV*\n\nNosso servidor principal está em manutenção programada para melhorias. Previsão de retorno em 30-60 min. Agradecemos a paciência!');
            return;
        }

        // --- MENU DE ADMINISTRADOR ---
        if (texto === '!adm') {
            if (!msg.fromMe) return;
            const menuAdm = `🛠️ *MENU ADM LEO IPTV*\n\n` +
                `1️⃣ *!pago [dias]* -> Ativa cliente.\n` +
                `2️⃣ *!pago [dias] @numero* -> Ativa e dá +15 dias pro amigo.\n` +
                `3️⃣ *!vencimentos* -> Relatório geral.\n` +
                `4️⃣ *!manutencao on/off* -> Ativa aviso de queda.\n` +
                `5️⃣ *!remover* -> Exclui cliente.`;
            await client.sendMessage(msg.from, menuAdm);
            return;
        }

        // --- COMANDO MANUTENÇÃO ---
        if (texto.startsWith('!manutencao ')) {
            if (!msg.fromMe) return;
            const status = texto.split(' ')[1];
            manutencaoAtiva = (status === 'on');
            await msg.reply(`🔧 Modo manutenção: *${manutencaoAtiva ? 'ATIVADO' : 'DESATIVADO'}*`);
            return;
        }

        // --- COMANDO !PAGO COM INDICAÇÃO ---
        if (texto.startsWith('!pago ')) {
            if (!msg.fromMe) return;
            const partes = texto.split(' ');
            const dias = parseInt(partes[1]);
            if (isNaN(dias)) return;

            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const contatoAlvo = await chat.getContact();
            const nomeReal = contatoAlvo.pushname || 'Cliente';

            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + dias);
            db[msg.to] = { vencimento: vencimento.toISOString().split('T')[0], nome: nomeReal };

            let msgBonus = '';
            // Se tiver indicação (ex: !pago 30 5535...)
            if (partes[2]) {
                const idIndicador = partes[2].replace('@', '') + '@c.us';
                if (db[idIndicador]) {
                    let dataBonus = new Date(db[idIndicador].vencimento + 'T00:00:00');
                    dataBonus.setDate(dataBonus.getDate() + 15);
                    db[idIndicador].vencimento = dataBonus.toISOString().split('T')[0];
                    msgBonus = `\n\n🎁 *BÔNUS:* 15 dias de bônus creditados ao indicador!`;
                }
            }

            fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));
            await client.sendMessage(msg.to, `✅ *RENOVAÇÃO REGISTRADA!*\n🗓️ Vencimento: ${vencimento.toLocaleDateString('pt-BR')}${msgBonus}`);
            return;
        }

        // --- COMANDO !VENCIMENTOS ---
        if (texto === '!vencimentos') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            let lista = '*📊 GESTÃO DE CLIENTES*\n\n';
            const IDs = Object.keys(db);
            if (IDs.length === 0) return msg.reply('❌ Vazio.');

            IDs.forEach(id => {
                const cliente = db[id];
                const dataVenc = new Date(cliente.vencimento + 'T00:00:00');
                let status = (dataVenc < hoje) ? '🔴 *VENCIDO*' : (dataVenc.getTime() === hoje.getTime() ? '🟡 *HOJE*' : '🟢 *ATIVO*');
                lista += `👤 ${cliente.nome}\n📱 ${id.split('@')[0]}\n📆 ${dataVenc.toLocaleDateString('pt-BR')}\n📌 ${status}\n---\n`;
            });
            await client.sendMessage(msg.from, lista);
            return;
        }

        // --- COMANDO !REMOVER ---
        if (texto === '!remover') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            if (db[msg.to]) {
                delete db[msg.to];
                fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));
                await msg.reply("🗑️ Removido!");
            }
            return;
        }

        if (msg.fromMe) return;
        const contato = await msg.getContact();

        const responderComDelay = async (mensagem) => {
            await chat.sendStateTyping();
            return new Promise(resolve => {
                setTimeout(async () => {
                    await client.sendMessage(msg.from, mensagem);
                    resolve();
                }, 2000);
            });
        };

        // --- BOAS-VINDAS ---
        if (!usuariosSaudados.has(msgDe)) {
            usuariosSaudados.add(msgDe);
            await responderComDelay(`Olá! Bem-vindo ao suporte Leo IPTV. 🚀\nEscolha uma opção:\n\n1️⃣ - Horário\n2️⃣ - Suporte\n3️⃣ - Endereço\n4️⃣ - Cupom\n5️⃣ - 🚀 TESTE GRÁTIS\n6️⃣ - 💳 RENOVAR/PIX\n7️⃣ - 📺 PLANOS\n8️⃣ - 📝 CANAIS\n9️⃣ - 🎁 GANHE BÔNUS`);
            return;
        }

        // --- OPÇÕES DO MENU ---
        if (['menu', 'inicio', 'voltar'].includes(texto)) {
            await responderComDelay(`Escolha uma opção:\n\n1️⃣ a 9️⃣`);
        }
        else if (texto === '1') await responderComDelay('🕒 Seg a Sex: 08h-23h.');
        else if (texto === '2') {
            await responderComDelay('👨‍💻 Leo avisado!');
            await client.sendMessage(seuNumero, `📢 Suporte: ${contato.number}`);
        }
        else if (texto === '3') await responderComDelay('📍 Osasco/SP.');
        else if (texto === '4') await responderComDelay('🎁 LEOIPTV10');
        else if (texto === '5' || texto === 'teste') {
            await responderComDelay('⏳ GERANDO TESTE...');
            try {
                const response = await axios.post(API_TESTE, {}, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (response.data.reply) await client.sendMessage(msg.from, response.data.reply);
            } catch (e) { await msg.reply('❌ Erro no teste.'); }
        }
        else if (texto === '6' || texto === 'pix') {
            await responderComDelay(`💰 *PIX:* ${MINHA_CHAVE_PIX}\n${NOME_PIX}`);
        }
        else if (texto === '7') await responderComDelay(`📺 PLANOS: Mensal R$25, Trimestral R$60.`);
        else if (texto === '8') await responderComDelay(`📺 +40 mil conteúdos liberados!`);
        else if (texto === '9') await responderComDelay(`🎁 Indique um amigo e ganhe 15 dias de bônus quando ele assinar!`);
        else if (texto === '!status') await msg.reply('✅ On!');

    } catch (error) { console.error('Erro:', error.message); }
});

client.initialize();
