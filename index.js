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

    // Verificação programada para as 09:00 da manhã
    setInterval(async () => {
        const agora = new Date();
        const hora = agora.getHours();
        const minuto = agora.getMinutes();

        // Dispara exatamente às 09:00
        if (hora === 9 && minuto === 0) {
            console.log('⏰ Horário de avisos atingido (09:00). Verificando vencimentos...');
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
                        console.log(`✅ Aviso de 2 dias enviado para: ${info.nome}`);
                    } else if (diffDias === 0) {
                        await client.sendMessage(id, `🚫 *VENCIMENTO HOJE*\n\nSua assinatura vence hoje. Para renovar, digite *6* e envie o comprovante!`);
                        console.log(`✅ Aviso de vencimento hoje enviado para: ${info.nome}`);
                    }
                }
            } catch (e) { console.error("Erro no processamento das 09h:", e.message); }
        }
    }, 60000); // Checa o relógio a cada 1 minuto
});

client.on('message_create', async (msg) => {
    try {
        if (msg.from === 'status@broadcast') return;
        if (!msg.body && !msg.type) return;

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const texto = msg.body ? msg.body.toLowerCase() : '';
        const msgDe = msg.from;

        // --- NOVO: MENU DE ADMINISTRADOR ---
        if (texto === '!adm') {
            if (!msg.fromMe) return;
            const menuAdm = `🛠️ *MENU ADMINISTRADOR LEO IPTV*\n\n` +
                `1️⃣ *!pago [dias]*\nEx: !pago 30 (Registra 30 dias de acesso no contato atual).\n\n` +
                `2️⃣ *!vencimentos*\nLista todos os clientes e status (Ativo/Vencido).\n\n` +
                `3️⃣ *!remover*\nRemove o cliente atual do sistema de avisos.\n\n` +
                `4️⃣ *!status*\nTesta se o bot está respondendo.`;
            await client.sendMessage(msg.from, menuAdm);
            return;
        }

        // --- COMANDO PARA REGISTRAR PAGAMENTO (NOME REAL E NÚMERO LIMPO) ---
        if (texto.startsWith('!pago ')) {
            if (!msg.fromMe) return;
            const dias = parseInt(texto.split(' ')[1]);
            if (isNaN(dias)) return;

            const contatoAlvo = await chat.getContact();
            const nomeReal = contatoAlvo.pushname || 'Cliente';

            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + dias);
            const dataFormatada = vencimento.toISOString().split('T')[0];

            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            db[msg.to] = { 
                vencimento: dataFormatada, 
                nome: nomeReal 
            };
            fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));

            await client.sendMessage(msg.to, `✅ *RENOVAÇÃO REGISTRADA!*\n👤 *Cliente:* ${nomeReal}\n🗓️ *Vencimento:* ${vencimento.toLocaleDateString('pt-BR')}\nO bot avisará o cliente automaticamente.`);
            return;
        }

        // --- COMANDO !VENCIMENTOS (LISTA COM STATUS E NÚMEROS LIMPOS) ---
        if (texto === '!vencimentos') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            let lista = '*📊 GESTÃO DE CLIENTES IPTV*\n\n';
            const IDs = Object.keys(db);

            if (IDs.length === 0) return msg.reply('❌ Nenhum cliente cadastrado.');

            IDs.forEach(id => {
                const cliente = db[id];
                if (!cliente.vencimento) return;
                
                const dataVenc = new Date(cliente.vencimento + 'T00:00:00');
                let status = '';

                if (dataVenc < hoje) {
                    status = '🔴 *VENCIDO*';
                } else if (dataVenc.getTime() === hoje.getTime()) {
                    status = '🟡 *VENCE HOJE*';
                } else {
                    status = '🟢 *ATIVO*';
                }

                const numeroExibir = id.split('@')[0].replace(/[^0-9]/g, '');

                lista += `👤 *Nome:* ${cliente.nome}\n`;
                lista += `📱 *Zap:* ${numeroExibir}\n`;
                lista += `📆 *Vencimento:* ${dataVenc.toLocaleDateString('pt-BR')}\n`;
                lista += `📌 *Status:* ${status}\n`;
                lista += `----------------------------\n`;
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
                await msg.reply("🗑️ Cliente removido do sistema!");
            } else {
                await msg.reply("❌ Cliente não encontrado.");
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
            await responderComDelay(`Olá! Bem-vindo ao suporte Leo IPTV. 🚀\nEscolha uma opção abaixo:\n\n1️⃣ - Horário de funcionamento\n2️⃣ - Falar com o suporte (Leo)\n3️⃣ - Ver o endereço da loja\n4️⃣ - Cupom de desconto\n5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS\n6️⃣ - 💳 PAGAR VIA PIX / RENOVAR\n7️⃣ - 📺 VER PLANOS E PREÇOS\n8️⃣ - 📝 LISTA DE CANAIS\n9️⃣ - 🎁 GANHE MESES GRÁTIS`);
            return;
        }

        // --- MENU E OPÇÕES ---
        if (['menu', 'inicio', 'opções', 'voltar'].includes(texto)) {
            await responderComDelay(`Escolha uma opção abaixo:\n\n1️⃣ - Horário de funcionamento\n2️⃣ - Falar com o suporte (Leo)\n3️⃣ - Ver o endereço da loja\n4️⃣ - Cupom de desconto\n5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS\n6️⃣ - 💳 PAGAR VIA PIX / RENOVAR\n7️⃣ - 📺 VER PLANOS E PREÇOS\n8️⃣ - 📝 LISTA DE CANAIS\n9️⃣ - 🎁 GANHE MESES GRÁTIS`);
        }
        else if (texto === '1') await responderComDelay('🕒 Atendimento de Segunda a Sexta, das 08h às 23h. Sábados das 09h às 18h.');
        else if (texto === '2') {
            await responderComDelay('👨‍💻 Um momento! Já avisei o Leo. Ele falará com você em breve.');
            await client.sendMessage(seuNumero, `📢 *ALERTA:* O cliente ${contato.number} solicitou suporte humano.`);
        }
        else if (texto === '3') await responderComDelay('📍 Loja física: Rua Lazaro Gabriel De Oliveira, nº 1000, Osasco/SP.');
        else if (texto === '4') await responderComDelay('🎁 Use o cupom LEOIPTV10 e ganhe 10% de desconto na primeira assinatura!');
        else if (texto === '5' || texto === 'teste') {
            await responderComDelay('⏳ GERANDO SEU TESTE...\nAguarde 10 segundos enquanto preparo seu acesso exclusivo! 🚀');
            try {
                const response = await axios.post(API_TESTE, {}, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (response.data.reply) await client.sendMessage(msg.from, response.data.reply);
            } catch (e) { await msg.reply('❌ Sistema de testes em manutenção. Digite 2 para suporte manual.'); }
        }
        else if (texto === '6' || texto === 'pix' || texto === 'pagar' || texto === 'renovar') {
            await responderComDelay(`💰 *PAGAMENTO VIA PIX*\n\n🔑 *CHAVE:* ${MINHA_CHAVE_PIX}\n👤 *NOME:* ${NOME_PIX}\n🏦 *BANCO:* Itaú\n\n📸 *Envie o comprovante aqui para liberar seu acesso!*`);
        }
        else if (texto === '7' || texto === 'planos') {
            await responderComDelay(`📺 NOSSOS PLANOS IPTV 📺\n\n✅ MENSAL: R$ 25,00\n✅ TRIMESTRAL: R$ 60,00\n✅ SEMESTRAL: R$ 110,00\n\n🚀 +40.000 Conteúdos\n🎥 Filmes e Séries\nOpção 6 para pagar.`);
        }
        else if (texto === '8' || texto === 'canais') {
            await responderComDelay(`📺 TODOS OS CANAIS LIBERADOS!\nEsportes, Filmes, HBO, Premiere e muito mais. Peça um teste (opção 5).`);
        }
        else if (texto === '9') await responderComDelay(`🎁 INDIQUE UM AMIGO!\nSe ele assinar, você ganha 15 dias de bônus.`);
        else if (texto === '!status') await msg.reply('✅ Bot Leo IPTV está Ativo!');

    } catch (error) { console.error('Erro no processamento:', error.message); }
});

client.initialize();

