const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DO GOOGLE CALENDAR
// SUBSTITUA PELO SEU ID REAL AQUI SE AINDA NÃO TIVER FEITO
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const CALENDAR_ID = 'rodrigueslarab@gmail.com'; // <--- COLOQUE SEU EMAIL AQUI

async function getCalendarService() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
}

// --- FUNÇÃO AUXILIAR DE CONTAGEM ---
function analyzeEvents(dayEvents) {
    let countPrincipais = 0;
    let countAlugueis = 0;

    for (const evt of dayEvents) {
        const txt = ((evt.summary || "") + " " + (evt.description || "")).toLowerCase();
        const isPrincipal = /buffet|essencial|especial|premium|massa|crepe/.test(txt);

        if (isPrincipal) {
            countPrincipais++;
        } else {
            // Só conta aluguel se não for principal
            if (/hot dog|barraquinha|carrinho|algodão|pipoca|cama elástica/.test(txt)) {
                countAlugueis++;
            }
        }
    }
    // Retorna se o dia está "Cheio" (Regra: 2 principais E 2 alugueis)
    // Se quiser bloquear o dia apenas se TUDO estiver cheio, use a lógica abaixo.
    // Se quiser pintar de vermelho se NÃO COUBER MAIS PRINCIPAIS, ajuste conforme preferência.
    // Aqui vou considerar dia "Cheio" se não couber mais NADA (2 princ + 2 alugueis).
    // Mas para facilitar visualização, vamos retornar o status detalhado.
    return { countPrincipais, countAlugueis };
}

// --- ROTA NOVA: VERIFICAR DISPONIBILIDADE DO MÊS ---
app.get('/api/month-availability', async (req, res) => {
    try {
        const { month, year } = req.query;
        const calendar = await getCalendarService();

        // Pega do dia 1 até o último dia do mês
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items || [];
        const fullDays = [];

        // Agrupa eventos por dia
        const eventsByDay = {};
        events.forEach(evt => {
            const start = evt.start.dateTime || evt.start.date;
            const dayKey = new Date(start).getDate(); // Pega o dia (1, 2, 3...)

            if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
            eventsByDay[dayKey].push(evt);
        });

        // Analisa cada dia
        for (const [day, dayEvents] of Object.entries(eventsByDay)) {
            const { countPrincipais, countAlugueis } = analyzeEvents(dayEvents);

            // Lógica: Se tem 2 principais E 2 alugueis, o dia está TOTALMENTE lotado.
            // Se você quiser pintar de vermelho quando não cabe mais FESTA (Principal), mude para: countPrincipais >= 2
            if (countPrincipais >= 2 && countAlugueis >= 2) {
                fullDays.push(parseInt(day));
            }
        }

        res.json({ fullDays });

    } catch (error) {
        console.error(error);
        res.json({ fullDays: [] }); // Em caso de erro, não bloqueia nada visualmente
    }
});

// --- ROTA DE AGENDAMENTO (POST) ---
app.post('/api/schedule', upload.none(), async (req, res) => {
    // ... (Mantenha o código do post anterior ou copie abaixo se quiser garantir)
    // Vou resumir a parte crucial de validação aqui:

    try {
        const p = req.body;
        const calendar = await getCalendarService();

        // ... (Parsing de datas igual ao anterior) ...
        const dateParts = p.selectedDateISO.split('-');
        const timeParts = p.eventTime.split(':');
        const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        const duration = parseInt(p.eventDuration) || 4;
        const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));

        // Validação de Passado (Item 2 - Segurança Backend)
        if (start < new Date()) {
            return res.json({ status: 'error', message: 'Não é possível agendar em datas ou horários passados.' });
        }

        const dayStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
        const dayEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59);

        // ... (Lógica de Regex Principal/Aluguel igual ao anterior) ...
        const servicesStr = (p.services || "").toLowerCase();
        const reqPrincipal = /buffet|essencial|especial|premium|massa|crepe/.test(servicesStr);
        const reqHotDog = /hot dog|barraquinha/.test(servicesStr);
        const reqCarts = /carrinho|algodão|pipoca/.test(servicesStr);
        const reqTrampo = /cama elástica/.test(servicesStr);
        const reqAluguel = reqHotDog || reqCarts || reqTrampo;

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
        });

        // ... (Lógica de Loop e Validação igual ao anterior) ...
        // (Copie a lógica do loop do server.js anterior aqui para verificar conflitos)
        // Se precisar do código completo dessa parte novamente, me avise, mas é o mesmo do passo anterior.

        // RESUMO DA LÓGICA DE LOOP PARA INSERIR AQUI:
        let countPrincipais = 0;
        let countAlugueis = 0;
        let conflitoHorarioAluguel = false;

        const dayEvents = response.data.items || [];
        for (const evt of dayEvents) {
            const txt = ((evt.summary || "") + " " + (evt.description || "")).toLowerCase();
            const evtStart = new Date(evt.start.dateTime || evt.start.date);
            const evtEnd = new Date(evt.end.dateTime || evt.end.date);
            const isEvtPrincipal = /buffet|essencial|especial|premium|massa|crepe/.test(txt);

            if (isEvtPrincipal) countPrincipais++;
            else {
                const isEvtAluguel = /hot dog|barraquinha|carrinho|algodão|pipoca|cama elástica/.test(txt);
                if (isEvtAluguel) {
                    countAlugueis++;
                    const overlap = (start < evtEnd && end > evtStart);
                    if (overlap) {
                        if (reqHotDog && /hot dog|barraquinha/.test(txt)) conflitoHorarioAluguel = true;
                        if (reqCarts && /carrinho|algodão|pipoca/.test(txt)) conflitoHorarioAluguel = true;
                        if (reqTrampo && /cama elástica/.test(txt)) conflitoHorarioAluguel = true;
                    }
                }
            }
        }

        if (reqPrincipal && countPrincipais >= 2) return res.json({ status: 'error', message: 'Dia lotado para Festas Principais.' });
        if (reqAluguel && !reqPrincipal) {
            if (countAlugueis >= 2) return res.json({ status: 'error', message: 'Dia lotado para Alugueis.' });
            if (conflitoHorarioAluguel) return res.json({ status: 'error', message: 'Item já reservado neste horário.' });
        }

        // Criar Evento
        const finalTitle = reqPrincipal ? ('Festa: ' + p.clientName) : ('Locação: ' + p.clientName);
        const finalDesc = `Serviços: ${p.services}\nConvidados: ${p.guests}\nTotal: ${p.total}\nLocal: ${p.eventLocation}`;
        await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: {
                summary: finalTitle,
                description: finalDesc,
                location: p.eventLocation,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            },
        });

        return res.json({ status: 'success' });

    } catch (error) {
        console.error(error);
        return res.json({ status: 'error', message: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));