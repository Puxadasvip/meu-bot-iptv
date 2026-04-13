const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// ================= CONFIGURAÇÃO =================
const seuNumero = '5511925410635@c.us';
const API_TESTE = 'https://atmos.panelbr.site/api/chatbot/VdWXYPj13q/VpKDaPJLRA';
const MINHA_CHAVE_PIX = '35998632886';
const NOME_PIX = 'Jose Leandro Silva Cardoso';
const BANCO_DADOS = './clientes.json';
const LINK_APP = 'https://xciptv.br.uptodown.com/android/download';

let manutencaoAtiva = false;

if (!fs.existsSync(BANCO_DADOS)) {
    fs.writeFileSync(BANCO_DADOS, JSON.stringify({}));
}

const usuariosSaudados = new Set();

function gerarCardVip(nome, vencimento, bonus = '') {
    return `✨ *COMPROVANTE DE ACESSO VIP* ✨\n\n` +
           `👤 *CLIENTE:* ${nome.toUpperCase()}\n` +
           `📆 *VENCIMENTO:* ${vencimento}\n` +
           `🚀 *STATUS:* Ativado com Sucesso\n` +
           `${bonus}\n` +
           `📺 *LEO IPTV - O MELHOR DO STREAMING*\n` +
           `_________________________________\n` +
           `*Obrigado pela confiança! Boa diversão!*`;
}

// ================= CLIENT CONFIG (MODO NÚMERO) =================
const client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 90000,
    puppeteer: {
        headless: true,
        executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-extensions'
        ]
    }
});


client.on('qr', (qr) => {
    console.log('\n=============================================');
    console.log('SCANEE O QR CODE ABAIXO AGORA:');
    console.log('DICA: Se não ler, tire um PRINT e mande para outro celular.');
    console.log('=============================================\n');
    qrcode.generate(qr, {small: false});
});


client.on('ready', () => {
    console.log('🚀 BOT LEO IPTV ONLINE NO TERMUX (MODO TEXTO ESTÁVEL)!');

    setInterval(async () => {
        const agora = new Date();
        const hora = agora.getHours();
        const minuto = agora.getMinutes();

        if (hora === 9 && minuto === 1) {
            try {
                const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
                const hoje = new Date();
                hoje.setHours(0,0,0,0);

                for (const [id, info] of Object.entries(db)) {
                    if (!info.vencimento) continue;
                    const nomeCliente = info.nome || 'Amigo(a)';
                    const venc = new Date(info.vencimento + 'T00:00:00');
                    const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

                    if (diffDias === 2) {
                        await client.sendMessage(id, `⚠️ *AVISO DE VENCIMENTO*\n\nOlá, *${nomeCliente}*! Passando para lembrar que sua assinatura vence em *2 dias*. Não fique sem sinal! Digite *6* para renovar. 📺`);
                    } else if (diffDias === 0) {
                        await client.sendMessage(id, `🚫 *VENCIMENTO HOJE*\n\nOi, *${nomeCliente}*! Sua assinatura vence hoje. Para renovar, digite *6* e envie o comprovante! 💸`);
                    }
                }
            } catch (e) { console.error("Erro nas 09h:", e.message); }
        }

        if (hora === 18 && minuto === 1) {
            try {
                const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
                const hoje = new Date();
                hoje.setHours(0,0,0,0);

                for (const [id, info] of Object.entries(db)) {
                    if (!info.vencimento) continue;
                    const nomeCliente = info.nome || 'Amigo(a)';
                    const venc = new Date(info.vencimento + 'T00:00:00');
                    const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));

                    if (diffDias === 0) {
                        await client.sendMessage(id, `⚠️ *ALERTA DE BLOQUEIO*\n\n*${nomeCliente}*, identificamos que sua renovação ainda não foi confirmada. Para evitar o corte automático do sinal às 20h, envie o comprovante agora! 🏃💨`);
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

        // ================= NOVAS FUNÇÕES DE ALUGUEL =================
        const db = JSON.parse(fs.readFileSync(BANCO_DADOS));
        const hojeIso = new Date().toISOString().split('T')[0];
        const clienteAtivo = db[msgDe];
        const ehDono = msg.fromMe;

        // TRAVA DE SEGURANÇA CORRIGIDA: Bloqueia comandos EXCETO !planos e !meuplano
        if (texto.startsWith('!') && !ehDono && texto !== '!planos' && texto !== '!meuplano') {
            if (!clienteAtivo || clienteAtivo.vencimento < hojeIso) {
                return msg.reply("⚠️ *ACESSO RESTRITO*\n\nSeu plano expirou ou você ainda não possui uma assinatura ativa.\n\nPara renovar ou assinar, digite *!planos*");
            }
        }

        // COMANDO DE PLANOS (Aberto para todos consultarem)
        if (texto === '!planos') {
            const mensagemPlanos = `🚀 *PLANOS LEO IPTV* 🚀\nEscolha o plano que melhor se adapta a você:\n\n🗓️ *DIÁRIO:* R$ 5,00 (24h de acesso)\n📅 *SEMANAL:* R$ 15,00 (7 dias)\n 💳 *MENSAL:* R$ 30,00 (30 dias)\n🌟 *ANUAL:* R$ 200,00 (1 ano)\n\n📌 *Como contratar?*\nDigite *6* para ver os dados do Pix e envie o comprovante após o pagamento!`;
            await msg.reply(mensagemPlanos);
            return;
        }

        // COMANDO MEU PLANO (Para o cliente consultar sozinho)
        if (texto === '!meuplano') {
            if (!clienteAtivo) {
                return msg.reply("❌ Você ainda não possui um plano cadastrado em nosso sistema.");
            }
            
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const venc = new Date(clienteAtivo.vencimento + 'T00:00:00');
            const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
            const dataFmt = venc.toLocaleDateString('pt-BR');

            let respostaPlano = `👤 *CLIENTE:* ${clienteAtivo.nome}\n📆 *VENCIMENTO:* ${dataFmt}\n`;
            
            if (diffDias > 0) {
                respostaPlano += `🚀 *STATUS:* Ativo\n⏳ *FALTAM:* ${diffDias} dias`;
            } else if (diffDias === 0) {
                respostaPlano += `🟡 *STATUS:* Vence Hoje!\n⚠️ Renove para não perder o sinal.`;
            } else {
                respostaPlano += `🔴 *STATUS:* Vencido\n❌ Seu acesso está bloqueado.`;
            }

            await msg.reply(respostaPlano);
            return;
        }
        // ============================================================

        if (manutencaoAtiva && !msg.fromMe && !usuariosSaudados.has(msgDe)) {
            await msg.reply('⚠️ COMUNICADO LEO IPTV\n\nNosso servidor principal está em manutenção programada para melhorias. Previsão de retorno em 30-60 min. Agradecemos a paciência!');
            return;
        }

        if (texto === '!chave') {
            await msg.reply(`💰 *MINHA CHAVE PIX*\n\n 🔑 \`${MINHA_CHAVE_PIX}\`\n👤 *Nome:* ${NOME_PIX}\n\n*(Toque na chave para copiar)*`);
            return;
        }

        if (texto === '!adm') {
            if (!msg.fromMe) return;
            const menuAdm = `🛠️ *MENU ADM LEO IPTV*\n\n` +
                `1️⃣ *!pago [dias]* -> Ativa e envia Card.\n` +
                `2️⃣ *!pago [dias] @numero* -> Ativa e dá bônus.\n` +
                `3️⃣ *!vencimentos* -> Lista Geral.\n` +
                `4️⃣ *!caixa* -> Vendas do mês.\n` +
                `5️⃣ *!aviso [mensagem]* -> Transmissão p/ todos.\n` +
                `6️⃣ *!manutencao on/off* -> Aviso de queda.\n` +
                `7️⃣ *!remover* -> Exclui cliente.\n` +
                `8️⃣ *!pix* -> Minha chave pix.\n` +
                `9️⃣ *!tutorial* -> Envia guia de instalação.\n` +
                `🔟 *!planos* -> Tabela de preços.`;
            await client.sendMessage(msg.from, menuAdm);
            return;
        }

        if (texto === '!tutorial') {
            const guiaSuporte = `📖 *GUIA DE INSTALAÇÃO - LEO IPTV* 📺\n\n` +
                `Siga os passos abaixo para configurar seu acesso:\n\n` +
                `1️⃣ *BAIXE O APP:* Procure por "IPTV Smarters" ou "XCIPTV" na sua loja de aplicativos.\n\n` +
                `2️⃣ *DADOS DE ACESSO:* Use o Usuário e Senha que o bot enviou no seu teste.\n\n` +
                `3️⃣ *DNS / URL:* Se o app pedir, use esta:\n` +
                `🌐 \`http://yuzantor.online:80\`\n\n` +
                `⚠️ *DICA:* Se travar, reinicie seu modem. Recomendamos internet acima de 20 Mega.\n\n` +
                `🎥 *VÍDEO PASSO A PASSO:* Solicite ao Leo o link do vídeo!`;
            await client.sendMessage(msg.from, guiaSuporte);
            return;
        }

        if (texto.startsWith('!aviso ')) {
            if (!msg.fromMe) return;
            const comunicado = msg.body.slice(7);
            const dbAviso = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const clientes = Object.keys(dbAviso);

            if (clientes.length === 0) return msg.reply('❌ Nenhum cliente na base.');

            await msg.reply(`📢 Iniciando envio para ${clientes.length} clientes...`);

            for (const id of clientes) {
                try {
                    await client.sendMessage(id, `📢 *COMUNICADO IMPORTANTE*\n\n${comunicado}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (e) { console.log(`Erro ao enviar para ${id}`); }
            }
            await msg.reply('✅ Envio concluído!');
            return;
        }

        if (texto === '!caixa') {
            if (!msg.fromMe) return;
            const dbCaixa = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const IDs = Object.keys(dbCaixa);
            const total = IDs.length;
            await msg.reply(`💰 *RELATÓRIO FINANCEIRO RÁPIDO*\n\n👥 Clientes na base: ${total}\n✅ Total estimado: R$ ${total * 25},00\n\n*(Cálculo baseado no plano mensal de R$ 25)*`);
            return;
        }

        if (texto.startsWith('!manutencao ')) {
            if (!msg.fromMe) return;
            const status = texto.split(' ')[1];
            manutencaoAtiva = (status === 'on');
            await msg.reply(`🔧 Modo manutenção: *${manutencaoAtiva ? 'ATIVADO' : 'DESATIVADO'}*`);
            return;
        }

        if (texto.startsWith('!pago ')) {
            if (!msg.fromMe) return;
            const partes = texto.split(' ');
            const dias = parseInt(partes[1]);
            if (isNaN(dias)) return;

            const dbPago = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const contatoAlvo = await chat.getContact();
            const nomeReal = contatoAlvo.pushname || 'Cliente';

            const vencDate = new Date();
            vencDate.setDate(vencDate.getDate() + dias);
            const vencFormatado = vencDate.toLocaleDateString('pt-BR');

            dbPago[msg.to] = { vencimento: vencDate.toISOString().split('T')[0], nome: nomeReal };

            let msgBonusTxt = '';
            if (partes[2]) {
                const idIndicador = partes[2].replace('@', '') + '@c.us';
                if (dbPago[idIndicador]) {
                    let dataBonus = new Date(dbPago[idIndicador].vencimento + 'T00:00:00');
                    dataBonus.setDate(dataBonus.getDate() + 15);
                    dbPago[idIndicador].vencimento = dataBonus.toISOString().split('T')[0];
                    msgBonusTxt = `🎁 *BÔNUS:* 15 dias creditados ao indicador!`;
                }
            }

            fs.writeFileSync(BANCO_DADOS, JSON.stringify(dbPago, null, 2));

            const card = gerarCardVip(nomeReal, vencFormatado, msgBonusTxt);
            await client.sendMessage(msg.to, card);
            return;
        }

        if (texto === '!vencimentos') {
            if (!msg.fromMe) return;
            const dbVenc = JSON.parse(fs.readFileSync(BANCO_DADOS));
            const hojeVenc = new Date();
            hojeVenc.setHours(0, 0, 0, 0);
            let lista = '📊 *GESTÃO DE CLIENTES*\n\n';
            const IDs = Object.keys(dbVenc);

            if (IDs.length === 0) return msg.reply('❌ NENHUM CLIENTE CADASTRADO.');

            await msg.reply('⏳ *Processando lista, aguarde...*');

            for (const id of IDs) {
                try {
                    const clienteV = dbVenc[id];
                    const dataVenc = new Date(clienteV.vencimento + 'T00:00:00');
                    const contatoInfo = await client.getContactById(id);
                    const numeroReal = contatoInfo.number;

                    if (numeroReal.length > 15) continue;

                    let status = (dataVenc < hojeVenc) ? '🔴 VENCIDO' : (dataVenc.getTime() === hojeVenc.getTime() ? '🟡 HOJE' : '🟢 ATIVO');

                    lista += `👤 *Nome:* ${clienteV.nome}\n`;
                    lista += `📱 *Número:* ${numeroReal}\n`;
                    lista += `📆 *Vencimento:* ${dataVenc.toLocaleDateString('pt-BR')}\n`;
                    lista += `📌 *Status:* ${status}\n`;
                    lista += `__________________________\n`;
                } catch (e) { console.log(`Erro ao processar ID: ${id}`); }
            }
            await client.sendMessage(msg.from, lista);
            return;
        }

        if (texto === '!remover') {
            if (!msg.fromMe) return;
            const dbRem = JSON.parse(fs.readFileSync(BANCO_DADOS));
            if (dbRem[msg.to]) {
                delete dbRem[msg.to];
                fs.writeFileSync(BANCO_DADOS, JSON.stringify(dbRem, null, 2));
                await msg.reply("🗑️ Cliente removido do sistema de avisos!");
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

        const MENU_PADRAO = `Olá! Bem-vindo ao suporte *Leo IPTV*. 🚀\nSe Quiser Alugar Nosso Bot de Atendimentos Para O Seu Negocio Digita !PLANOS para continuar com seu atendimento escolha uma Das opcões abaixo:\n\n1️⃣ -  🕗 Horário de funcionamento\n2️⃣ - 🤵🏻 Falar com o suporte (Leo)\n3️⃣ - 🏠 Ver o endereço da loja\n4️⃣ - 🔖 Cupom de desconto\n5️⃣ - 🚀 SOLICITAR TESTE GRÁTIS\n6️⃣ - 💳 PAGAR VIA PIX / RENOVAR\n7️⃣ - 📺 VER PLANOS E PREÇOS\n8️⃣ - 📝 LISTA DE CANAIS\n9️⃣ - 🎁 GANHE MESES GRÁTIS\n🔟 - 📖 TUTORIAL DE INSTALAÇÃO\n1️⃣1️⃣ - 📥 BAIXAR NOSSO APLICATIVO`;

        if (!usuariosSaudados.has(msgDe)) {
            usuariosSaudados.add(msgDe);
            await responderComDelay(MENU_PADRAO);
            return;
        }

        if (['menu', 'inicio', 'voltar'].includes(texto)) {
            await responderComDelay(MENU_PADRAO);
        }
        else if (texto === '1') await responderComDelay('1️⃣  🕒 Atendimento de Segunda a Sexta, das 08h às 23h. Sábados das 09h às 18h.');
        else if (texto === '2') {
            await responderComDelay('2️⃣ 👨‍💻 Um momento! Já avisei o Leo. Ele falará com você em breve.');
            await client.sendMessage(seuNumero, `📢 *ALERTA:* O cliente ${contato.number} solicitou suporte.`);
        }
        else if (texto === '3') await responderComDelay('3️⃣  📍 Loja física: Rua Lazaro Gabriel De Oliveira, nº 1000, Osasco/SP.');
        else if (texto === '4') await responderComDelay('4️⃣  🎁 Use o cupom LEOIPTV10 e ganhe 10% de desconto!');
        else if (texto === '5' || texto === 'teste') {
            await responderComDelay('⏳ *GERANDO SEU TESTE GRÁTIS...*');
            try {
                const response = await axios.post(API_TESTE, {}, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (response.data.reply) {
                    await client.sendMessage(msg.from, response.data.reply);
                    await client.sendMessage(msg.from, '✅ *Teste gerado com sucesso!* Você tem 1 hora para aproveitar o melhor conteúdo.\n\nAssista no celular, TV ou PC! 🚀');
                    setTimeout(async () => {
                        try {
                            const mensagemPosTeste = `👋 Olá! Vi aqui que o seu teste de 1 hora já expirou.\n\n*Gostou da qualidade?*\n\nNão fique sem sinal! Digite *6* para escolher um plano e ativar o seu acesso VIP agora mesmo e ganhe 5 dias a mais Extra na sua assinatura! 💎`;
                            await client.sendMessage(msg.from, mensagemPosTeste);
                        } catch (err) { console.error('Erro no contador:', err.message); }
                    }, 3600000);
                }
            } catch (e) { await msg.reply('❌ Sistema de testes em manutenção.'); }
        }
        else if (texto === '6' || texto === 'pix') {
            await responderComDelay(`6️⃣ 💰 *PAGAMENTO VIA PIX*\n\n🔑 *CHAVE:* ${MINHA_CHAVE_PIX}\n👤 *NOME:* ${NOME_PIX}\n🏦 *BANCO:* Itaú\n\n📸 *Envie o comprovante aqui para liberar seu acesso!*`);
        }
        else if (texto === '7') await responderComDelay(`📺 *NOSSOS PLANOS IPTV* 📺\n\nEscolha seu plano e digita (opção 6) para efetuar o pagamento.\n\n✅ *MENSAL:* R$ 25,00\n✅ *TRIMESTRAL:* R$ 60,00 (Economize R$ 15!)\n✅ *SEMESTRAL:* R$ 110,00\n\n🚀 +40.000 Conteúdos (4K, Full HD e HD)\n🎥 Filmes, Séries e Canais Adultos (Opcional)\n📱 Assista na Smart TV, Celular, TV Box ou PC.`);
        else if (texto === '8') await responderComDelay(`8️⃣  📺 *NOSSA GRADE DE CONTEÚDO:*\n\n✅ Todos os canais de Esportes (Premiere, DAZN, ESPN)\n✅ Todos os canais de Filmes (HBO, Telecine, Max)\n✅ Canais Abertos e Fechados em 4K e Full HD\n✅ +30.000 Filmes e Séries (Netflix, Disney+, Globoplay)\n✅ Conteúdo Kids completo\n🔞 Canais Adultos (Opcional com senha)\n\n*Peça um teste grátis (opção 5) para ver a qualidade!*`);
        else if (texto === '9') await responderComDelay(`9️⃣  🎁 *QUER GANHAR MENSALIDADE GRÁTIS?*\n\nIndique um amigo! Se ele assinar qualquer plano, você ganha *15 dias de bônus* na sua assinatura atual.\n\nQuanto mais indicar, mais tempo você assiste de graça! 🚀`);
        else if (texto === '10') {
            const guiaCliente = `📖 *COMO CONFIGURAR SEU ACESSO*\n\nPara instalar o nosso sistema no seu app, basta digitar o comando *!tutorial* que eu te envio o passo a passo agora mesmo! 📺`;
            await responderComDelay(guiaCliente);
        }
        else if (texto === '11' || texto === 'app' || texto === 'baixar') {
            await responderComDelay(`📲 *DOWNLOAD DO APLICATIVO LEO IPTV*\n\nClique no link abaixo para baixar o instalador oficial:\n\n🔗 ${LINK_APP}\n\n*Dica:* Após baixar, clique em "Instalar" e autorize "Fontes Desconhecidas" se o seu Android solicitar. 📺`);
        }
        else if (texto === '!status') await msg.reply('✅ Bot Leo IPTV está Ativo!');

    } catch (error) { console.error('Erro:', error.message); }
});

client.initialize();
