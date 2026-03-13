const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs'); // Necessário para salvar os vencimentos

// ================= CONFIGURAÇÃO =================
const seuNumero = '553598632886@c.us'; 
const API_TESTE = 'https://atmos.panelbr.site/api/chatbot/VdWXYPj13q/VpKDaPJLRA';
const MINHA_CHAVE_PIX = '35998632886'; 
const NOME_PIX = 'Jose Leandro Silva Cardoso'; 
const BANCO_DADOS = './clientes.json';

//Cria o arquivo de banco de dados se não existir
if (!fs.existsSync(BANCO_DADOS)) {
    fs.writeFileSync(BANCO_DADOS, JSON.stringify({}));
}

// Lista para controlar quem já recebeu boas-vindas na sessão atual
const usuariosSaudados = new Set();
// ================================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablepath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable--gpu',
            '--no-zygote',
            '--disable-extensions',
            '--disable-web-security',
            '--no-first-run'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('✅ QR CODE GERADO! Escaneie agora para ligar o Bot.');
});

client.on('ready', () => {
    console.log('🚀 BOT LEO IPTV ONLINE NO TERMUX!');

    // Verificação automática de vencimento (roda a cada 24 horas)
    setInterval(async () => {
        try {
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const hoje = new Date();

            for (const [id, info] of Object.entries(db)) {
                const vencimento = new Date(info.dataVencimento);
                const diffDias = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

                if (diffDias === 2) {
                    await client.sendMessage(id, `⚠️ *AVISO DE VENCIMENTO*\n\nOlá! Sua assinatura vence em *2 dias*. Não fique sem sinal! Digite *6* para renovar.`);
                } else if (diffDias === 0) {
                    await client.sendMessage(id, `🚫 *VENCIMENTO HOJE*\n\nSua assinatura vence hoje. Para renovar, digite *6* e envie o comprovante!`);
                }
            }
        } catch (e) { console.error("Erro no intervalo:", e.message); }
    }, 1000 * 60 * 60 * 24);
});

// Usamos message_create para capturar suas mensagens e evitar erros de ID indefinido
client.on('message_create', async (msg) => {
    try {
        // Filtro para evitar erros com mensagens de sistema do WhatsApp
        if (msg.from === 'status@broadcast') return; // Ignora postagens no Status
        if (!msg.body && !msg.type) return;

        const chat = await msg.getChat();
        
        // Ignora grupos para o bot não ficar doido
        if (chat.isGroup) return;

        const texto = msg.body ? msg.body.toLowerCase() : '';
        const msgDe = msg.from;

        // --- COMANDO PARA VOCÊ REGISTRAR O PAGAMENTO ---
        if (texto.startsWith('!pago ')) {
            if (!msg.fromMe) return; 

            const dias = parseInt(texto.split(' ')[1]);
            if (isNaN(dias)) return;

            const vencimento = new Date();
            vencimento.setDate(vencimento.getDate() + dias);

            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            db[msg.to] = { dataVencimento: vencimento.toISOString(), nome: 'Cliente' };
            fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));

            await client.sendMessage(msg.to, `✅ *RENOVAÇÃO REGISTRADA!*\n🗓️ Vencimento: ${vencimento.toLocaleDateString('pt-BR')}\nO bot avisará o cliente automaticamente.`);
            return;
        }

        // --- COMANDO PARA LISTAR VENCIMENTOS PRÓXIMOS (7 DIAS) ---
        if (texto === '!lista') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            let lista = "*📋 CLIENTES PRÓXIMOS DO VENCIMENTO:*\n\n";
            const hoje = new Date();
            let temCliente = false;
            
            for (const [id, info] of Object.entries(db)) {
                const venc = new Date(info.dataVencimento);
                const dias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
                if (dias <= 7 && dias >= 0) {
                    lista += `👤 Contato: ${id.replace('@c.us', '')}\n🗓️ Data: ${venc.toLocaleDateString('pt-BR')}\n⏳ Faltam: ${dias} dias\n\n`;
                    temCliente = true;
                }
            }
            await msg.reply(temCliente ? lista : "✅ Ninguém vence nos próximos 7 dias!");
            return;
        }

        // --- COMANDO PARA REMOVER CLIENTE DO SISTEMA ---
        if (texto === '!remover') {
            if (!msg.fromMe) return;
            const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
            if (db[msg.to]) {
                delete db[msg.to];
                fs.writeFileSync(BANCO_DADOS, JSON.stringify(db, null, 2));
                await msg.reply("🗑️ Cliente removido do sistema de avisos!");
            } else {
                await msg.reply("❌ Este cliente não está cadastrado no sistema.");
            }
            return;
        }

        // Se a mensagem for sua e não for o comando, para aqui
        if (msg.fromMe) return;

        // Só busca contato se for mensagem de terceiros (evita o erro que você teve)
        const contato = await msg.getContact();

        // Função simples para simular "Digitando..." e dar um delay
        const responderComDelay = async (mensagem) => {
            await chat.sendStateTyping();
            setTimeout(async () => {
                await msg.reply(mensagem);
            }, 2000); // 2 segundos de espera
        };

        // --- ADICIONADO: BOAS-VINDAS AUTOMÁTICA ---
        if (!usuariosSaudados.has(msgDe)) {
            usuariosSaudados.add(msgDe);
            await responderComDelay(`Olá! Bem-vindo ao suporte *Leo IPTV*. 🚀
Escolha uma opção abaixo para continuar:

1️⃣ - Horário de funcionamento
2️⃣ - Falar com o suporte (Leo)
3️⃣ - Ver o endereço da loja
4️⃣ - Cupom de desconto
5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS
6️⃣ - 💳 PAGAR VIA PIX / RENOVAR
7️⃣ - 📺 VER PLANOS E PREÇOS
8️⃣ - 📝 LISTA DE CANAIS
9️⃣ - 🎁 GANHE MESES GRÁTIS`);
            return; // Interrompe aqui para não repetir o menu se o texto for "Oi"
        }
        // ------------------------------------------

        // 1. MENU PRINCIPAL (Caso o cliente peça o menu novamente)
        if (['menu', 'inicio', 'opções', 'voltar'].includes(texto)) {
            await responderComDelay(`Escolha uma opção abaixo:

1️⃣ - Horário de funcionamento
2️⃣ - Falar com o suporte (Leo)
3️⃣ - Ver o endereço da loja
4️⃣ - Cupom de desconto
5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS
6️⃣ - 💳 PAGAR VIA PIX / RENOVAR
7️⃣ - 📺 VER PLANOS E PREÇOS
8️⃣ - 📝 LISTA DE CANAIS
9️⃣ - 🎁 GANHE MESES GRÁTIS`);
        }

        // 2. HORÁRIO
        else if (texto === '1') {
            await responderComDelay('🕒 Atendimento de Segunda a Sexta, das 08h às 23h. Sábados das 09h às 18h.');
        }

        // 3. SUPORTE (NOTIFICA VOCÊ)
        else if (texto === '2') {
            await responderComDelay('👨‍💻 Um momento! Já avisei o Leo. Ele falará com você em breve.');
            await client.sendMessage(seuNumero, `📢 *ALERTA:* O cliente ${contato.number} solicitou suporte humano.`);
        }

        // 4. ENDEREÇO
        else if (texto === '3') {
            await responderComDelay('📍 Loja física: Rua Lazaro Gabriel De Oliveira, nº 1000, Osasco/SP.');
        }

        // 5. CUPOM
        else if (texto === '4') {
            await responderComDelay('🎁 Use o cupom *LEOIPTV10* e ganhe 10% de desconto na primeira assinatura!');
        }

        // 6. TESTE GRÁTIS (AUTOMÁTICO)
        else if (texto === '5' || texto === 'teste') {
            await responderComDelay('⏳ *GERANDO SEU TESTE...*\nAguarde 10 segundos enquanto preparo seu acesso exclusivo! 🚀');
            try {
                const response = await axios.post(API_TESTE, {}, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (response.data.reply) {
                    await client.sendMessage(msg.from, response.data.reply);
                }
            } catch (e) {
                await msg.reply('❌ Sistema de testes em manutenção. Digite *2* para suporte manual.');
            }
        }

        // 7. PIX
        else if (texto === '6' || texto === 'pix' || texto === 'pagar' || texto === 'renovar') {
            await responderComDelay(`💰 *PAGAMENTO VIA PIX*\n\n🔑 *CHAVE:* ${MINHA_CHAVE_PIX}\n👤 *NOME:* ${NOME_PIX}\n🏦 *BANCO:* Itaú\n\n📸 *Envie o comprovante aqui para liberar seu acesso!*`);
        }

        // 8. PLANOS E VALORES
        else if (texto === '7' || texto === 'planos' || texto === 'valores') {
            await responderComDelay(`📺 *NOSSOS PLANOS IPTV* 📺

Escolha seu plano e digita (opção 6) para efetuar o pagamento.

✅ *MENSAL:* R$ 25,00
✅ *TRIMESTRAL:* R$ 60,00 (Economize R$ 15!)
✅ *SEMESTRAL:* R$ 110,00

🚀 +40.000 Conteúdos (4K, Full HD e HD)
🎥 Filmes, Séries e Canais Adultos (Opcional)
📱 Assista na Smart TV, Celular, TV Box ou PC.`);
        }

        // 9. LISTA DE CANAIS
        else if (texto === '8' || texto === 'canais') {
            await responderComDelay(`📺 *NOSSA GRADE DE CONTEÚDO:*

✅ Todos os canais de Esportes (Premiere, DAZN, ESPN)
✅ Todos os canais de Filmes (HBO, Telecine, Max)
✅ Canais Abertos e Fechados em 4K e Full HD
✅ +30.000 Filmes e Séries (Netflix, Disney+, Globoplay)
✅ Conteúdo Kids completo
🔞 Canais Adultos (Opcional com senha)

*Peça um teste grátis (opção 5) para ver a qualidade!*`);
        }

        // 10. INDICAÇÃO
        else if (texto === '9' || texto === 'indicação') {
            await responderComDelay(`🎁 *QUER GANHAR MENSALIDADE GRÁTIS?*

Indique um amigo! Se ele assinar qualquer plano, você ganha *15 dias de bônus* na sua assinatura atual.

Quanto mais indicar, mais tempo você assiste de graça! 🚀`);
        }

        // 11. COMANDO DE STATUS
        else if (texto === '!status') {
            await msg.reply('✅ Bot Leo IPTV está Ativo e Operante!');
        }

    } catch (error) {
        console.error('Erro no processamento:', error.message);
    }
});

client.initialize();


