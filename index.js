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

        // --- COMANDO RÁPIDO PARA CHAVE PIX ---
        if (texto === '!chave') {
            await msg.reply(`💰 *MINHA CHAVE PIX*\n\n🔑 \`${MINHA_CHAVE_PIX}\`\n👤 *Nome:* ${NOME_PIX}\n\n*(Toque na chave para copiar)*`);
            return;
        }

        // --- MENU DE ADMINISTRADOR ---
        if (texto === '!adm') {
            if (!msg.fromMe) return;
            const menuAdm = `🛠️ *MENU ADM LEO IPTV*\n\n` +
                `1️⃣ *!pago [dias]* -> Ativa cliente.\n` +
                `2️⃣ *!pago [dias] @numero* -> Ativa e dá bônus.\n` +
                `3️⃣ *!vencimentos* -> Lista Geral.\n` +
                `4️⃣ *!caixa* -> Vendas do mês.\n` +
                `5️⃣ *!manutencao on/off* -> Aviso de queda.\n` +
                `6️⃣ *!remover* -> Exclui cliente.\n` +
                `7️⃣ *!pix* -> minha chave pix.`;
            await client.sendMessage(msg.from, menuAdm);
            return;
        }

        // --- COMANDO !CAIXA (RELATÓRIO FINANCEIRO) ---
        if (texto === '!caixa') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const IDs = Object.keys(db);
            const total = IDs.length;
            await msg.reply(`💰 *RELATÓRIO FINANCEIRO RÁPIDO*\n\n👥 Clientes na base: ${total}\n✅ Total estimado: R$ ${total * 25},00\n\n*(Cálculo baseado no plano mensal de R$ 25)*`);
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

        // --- COMANDO !PAGO COM INDICAÇÃO E PÓS-VENDA ---
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
            if (partes[2]) {
                const idIndicador = partes[2].replace('@', '') + '@c.us';
                if (db[idIndicador]) {
                    let dataBonus = new Date(db[idIndicador].vencimento + 'T00:00:00');
                    dataBonus.setDate(dataBonus.getDate() + 15);
                    db[idIndicador].vencimento = dataBonus.toISOString().split('T')[0];
                    msgBonus = `\n\n🎁 *BÔNUS:* 15 dias creditados ao indicador!`;
                }
            }

            fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));
            await client.sendMessage(msg.to, `✅ *RENOVAÇÃO REGISTRADA!*\n🗓️ Vencimento: ${vencimento.toLocaleDateString('pt-BR')}${msgBonus}\n\n📺 *Obrigado pela confiança! Bom divertimento!*`);
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
                await msg.reply("🗑️Cliente removido do sistema de avisos!");
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

        const MENU_PADRAO = `Olá! Bem-vindo ao suporte *Leo IPTV*. 🚀\nEscolha uma opção abaixo para continuar:\n\n1️⃣ - 🕗 Horário de funcionamento\n2️⃣ - 🤵🏻 Falar com o suporte (Leo)\n3️⃣ - 🏠 Ver o endereço da loja\n4️⃣ - 🔖 Cupom de desconto\n5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS\n6️⃣ - 💳 PAGAR VIA PIX / RENOVAR\n7️⃣ - 📺 VER PLANOS E PREÇOS\n8️⃣ - 📝 LISTA DE CANAIS\n9️⃣ - 🎁 GANHE MESES GRÁTIS`;

        // --- BOAS-VINDAS ---
        if (!usuariosSaudados.has(msgDe)) {
            usuariosSaudados.add(msgDe);
            await responderComDelay(MENU_PADRAO);
            return;
        }

        // --- OPÇÕES DO MENU ---
        if (['menu', 'inicio', 'voltar'].includes(texto)) {
            await responderComDelay(MENU_PADRAO);
        }
        else if (texto === '1') await responderComDelay('1️⃣ 🕒 Atendimento de Segunda a Sexta, das 08h às 23h. Sábados das 09h às 18h.');
        else if (texto === '2') {
            await responderComDelay('2️⃣ 👨‍💻 Um momento! Já avisei o Leo. Ele falará com você em breve.');
            await client.sendMessage(seuNumero, `📢 *ALERTA:* O cliente ${contato.number} solicitou suporte humano.`);
        }
        else if (texto === '3') await responderComDelay('3️⃣ 📍 Loja física: Rua Lazaro Gabriel De Oliveira, nº 1000, Osasco/SP.');
        else if (texto === '4') await responderComDelay('4️⃣ 🎁 Use o cupom *LEOIPTV10* e ganhe 10% de desconto na primeira assinatura!');
        else if (texto === '5' || texto === 'teste') {
            await responderComDelay('⏳ GERANDO SEU TESTE...\nAguarde 10 segundos enquanto preparo seu acesso exclusivo! 🚀');
            try {
                const response = await axios.post(API_TESTE, {}, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (response.data.reply) await client.sendMessage(msg.from, response.data.reply);
            } catch (e) { await msg.reply('❌ Sistema de testes em manutenção. Digite 2 para suporte manual.'); }
        }
        else if (texto === '6' || texto === 'pix') {
            await responderComDelay(`6️⃣ 💰 *PAGAMENTO VIA PIX*\n\n🔑 *CHAVE:* 35998632886\n👤 *NOME:* Jose Leandro Silva Cardoso\n🏦 *BANCO:* Itaú\n\n📸 *Envie o comprovante aqui para liberar seu acesso!*`);
        }
        else if (texto === '7') await responderComDelay(`📺 *NOSSOS PLANOS IPTV* 📺\n\nEscolha seu plano e digita (opção 6) para efetuar o pagamento.\n\n✅ *MENSAL:* R$ 25,00\n✅ *TRIMESTRAL:* R$ 60,00 (Economize R$ 15!)\n✅ *SEMESTRAL:* R$ 110,00\n\n🚀 +40.000 Conteúdos (4K, Full HD e HD)\n🎥 Filmes, Séries e Canais Adultos (Opcional)\n📱 Assista na Smart TV, Celular, TV Box ou PC.`);
        else if (texto === '8') await responderComDelay(`8️⃣ 📺 *NOSSA GRADE DE CONTEÚDO:*\n\n✅ Todos os canais de Esportes (Premiere, DAZN, ESPN)\n✅ Todos os canais de Filmes (HBO, Telecine, Max)\n✅ Canais Abertos e Fechados em 4K e Full HD\n✅ +30.000 Filmes e Séries (Netflix, Disney+, Globoplay)\n✅ Conteúdo Kids completo\n🔞 Canais Adultos (Opcional com senha)\n\n*Peça um teste grátis (opção 5) para ver a qualidade!*`);
        else if (texto === '9') await responderComDelay(`9️⃣ 🎁 *QUER GANHAR MENSALIDADE GRÁTIS?*\n\nIndique um amigo! Se ele assinar qualquer plano, você ganha *15 dias de bônus* na sua assinatura atual.\n\nQuanto mais indicar, mais tempo você assiste de graça! 🚀`);
        else if (texto === '!status') await msg.reply('✅ Bot Leo IPTV está Ativo!');

    } catch (error) { console.error('Erro:', error.message); }
});

client.initialize();
