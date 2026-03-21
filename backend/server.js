const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const { Mutex } = require('async-mutex');

const app = express();
const upload = multer();
const mutex = new Mutex();

app.use(cors());
app.use(express.json());

// --- ROTA PARA O UPTIMEROBOT (RESOLVE O CANNOT GET) ---
app.get('/', (req, res) => {
    res.status(200).send('Servidor Tudo Pra Festa: Ativo e Operante! 🚀');
});

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const CALENDAR_ID = 'clarassbuffet@gmail.com';

async function getCalendarService() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
}

// --- REGRAS DE CLASSIFICAÇÃO ---
const isPrincipal = (txt) => /buffet|essencial|especial|premium|massa|crepe/i.test(txt);
const isRental = (txt) => /carrinho|algodão|pipoca|festbar|drinks|bar|hot dog|barraquinha/i.test(txt);
const isCamaElastica = (txt) => /cama elástica/i.test(txt);
const isBuffetInfantil = (txt) => /essencial|especial|premium/i.test(txt);

function validateAppointment(dayEvents, newRequest) {
    const reqServicesStr = (newRequest.services || "").toLowerCase();
    const reqItems = reqServicesStr.split(',').map(s => s.trim());
    const start = new Date(newRequest.start);
    const end = new Date(newRequest.end);
    const isChacara = newRequest.isChacara;

    let existingMains = 0; let existingNormalRentals = 0;
    let existingFestBars = 0; let existingCama = 0;

    for (const evt of dayEvents) {
        const rawDesc = evt.description || "";
        const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '');
        const servicesMatch = cleanDesc.match(/Serviços:\s*([^\n\r]+)/i);
        const evtServicesStr = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();
        const items = evtServicesStr.split(',').map(s => s.trim());

        for (const item of items) {
            if (isPrincipal(item)) existingMains++;
            if (isCamaElastica(item)) existingCama++;
            if (isRental(item)) {
                if (/festbar|drinks|bar/i.test(item)) existingFestBars++;
                else existingNormalRentals++;
            }
        }
    }

    let newMains = 0; let newNormalRentals = 0;
    let newFestBars = 0; let newCama = 0; let buffetInfantilCount = 0;

    for (const item of reqItems) {
        if (isPrincipal(item)) {
            newMains++;
            if (isBuffetInfantil(item)) buffetInfantilCount++;
        }
        if (isCamaElastica(item)) newCama++;
        if (isRental(item)) {
            if (/festbar|drinks|bar/i.test(item)) newFestBars++;
            else newNormalRentals++;
        }
    }

    if (buffetInfantilCount > 1) return { status: 'error', message: 'Não é permitido selecionar mais de um Buffet Infantil no mesmo pedido.' };

    // Regra de Exclusividade do Formulário (Permite 1 de cada na Chácara)
    if (newNormalRentals > 1 || newFestBars > 1 || (!isChacara && (newNormalRentals + newFestBars) > 1)) {
        return { status: 'error', message: 'Só é permitido 1 serviço de aluguel por formulário (exceto Drinks na Chácara).' };
    }
    if (newMains === 0 && newNormalRentals === 0 && newFestBars === 0 && newCama === 0) return { status: 'error', message: 'Selecione um serviço válido.' };

    // Limites Diários Globais
    if (newMains > 0 && (existingMains + newMains) > 2) return { status: 'error', message: 'Lotado para festas principais nesta data.' };
    if (newCama > 0 && (existingCama + newCama) > 2) return { status: 'error', message: 'Lotado para camas elásticas nesta data.' };
    if (newNormalRentals > 0 && (existingNormalRentals + newNormalRentals) > 2) return { status: 'error', message: 'Lotado para carrinhos/hot dog nesta data.' };
    if (newFestBars > 0 && (existingFestBars + newFestBars) > 2) return { status: 'error', message: 'Lotado para FestBar nesta data.' };

    // Conflito de Horário
    for (const evt of dayEvents) {
        const evtStart = new Date(evt.start.dateTime || evt.start.date);
        const evtEnd = new Date(evt.end.dateTime || evt.end.date);

        if (start < evtEnd && end > evtStart) {
            const evtDesc = (evt.description || "");
            const evtItems = evtDesc.toLowerCase().split(',');
            const existingIsChacara = /Chácara Parceira/i.test(evtDesc);

            let evtHasNormalRental = false;
            let evtHasFestBar = false;
            let evtHasCama = false;

            for (const item of evtItems) {
                if (isCamaElastica(item.trim())) evtHasCama = true;
                if (isRental(item.trim())) {
                    if (/festbar|drinks|bar/i.test(item.trim())) evtHasFestBar = true;
                    else evtHasNormalRental = true;
                }
            }

            if (newNormalRentals > 0 && evtHasNormalRental) {
                return { status: 'error', message: 'Conflito de Logística: Já existe um carrinho/hot dog neste horário.' };
            }
            if (newCama > 0 && evtHasCama) {
                return { status: 'error', message: 'Conflito de Logística: Já existe uma cama elástica neste horário.' };
            }
            if (newFestBars > 0 && evtHasFestBar) {
                if (isChacara !== existingIsChacara) {
                    // IMUNIDADE: Se um for chácara e o outro domicílio, permite o choque de horário.
                } else {
                    return { status: 'error', message: 'Conflito de Logística: Já existe um FestBar neste horário e no mesmo tipo de local.' };
                }
            }
        }
    }
    return { status: 'success' };
}

app.post('/api/schedule', upload.none(), async (req, res) => {
    const release = await mutex.acquire();
    try {
        const p = req.body;
        if (parseInt(p.guests) < 25) return res.json({ status: 'error', message: 'O número mínimo para qualquer evento é de 25 convidados.' });

        // Travas de Convidados e Aluguéis (Segurança Server-Side)
        const servicesStr = (p.services || "").toLowerCase();
        if (servicesStr.includes('hot dog') && parseInt(p.guests) > 80) {
            return res.json({ status: 'error', message: 'O limite máximo para o Carrinho de Hot Dog é de 80 convidados.' });
        }
        if (servicesStr.includes('carrinho') && parseInt(p.guests) > 100) {
            return res.json({ status: 'error', message: 'O limite máximo para Carrinhos de Pipoca/Algodão é de 100 convidados.' });
        }

        const dateParts = p.selectedDateISO.split('-');
        const timeParts = p.eventTime.split(':');

        const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);

        // Cálculo Forçado de Duração (Ignorando payload do frontend)
        const calculatedDuration = parseInt(p.guests) <= 30 ? 3 : 4;
        const end = new Date(start.getTime() + (calculatedDuration * 60 * 60 * 1000));

        const dayStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
        const dayEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59);

        const isChacara = p.isChacara === 'true' || p.isChacara === true;

        const calendar = await getCalendarService();
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
        });

        const validation = validateAppointment(response.data.items || [], { services: p.services, start, end, isChacara });
        if (validation.status === 'error') return res.json(validation);

        await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: {
                summary: isPrincipal(p.services) ? 'Festa: ' + p.clientName : 'Locação: ' + p.clientName,
                description: `Serviços: ${p.services}\nConvidados: ${p.guests}\nTotal: ${p.total}\nLocal: ${p.eventLocation}${isChacara ? '\n(Local: Chácara Parceira - Espaço 12h)' : ''}`,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            },
        });
        res.json({ status: 'success' });
    } catch (error) {
        res.json({ status: 'error', message: error.message });
    }
    finally { release(); }
});

app.get('/api/month-availability', async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month, 1, 0, 0, 0).toISOString();
        const endDate = new Date(year, parseInt(month) + 1, 0, 23, 59, 59).toISOString();

        const calendar = await getCalendarService();
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startDate,
            timeMax: endDate,
            singleEvents: true
        });

        const daysMap = {};
        (response.data.items || []).forEach(evt => {
            // Força a leitura da data no fuso horário do Brasil para não pular de dia
            const evtDateStr = evt.start.dateTime || evt.start.date;
            const dateInBrazil = new Date(evtDateStr).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
            const day = new Date(dateInBrazil).getDate();

            if (!daysMap[day]) daysMap[day] = { m: 0, r: 0, c: 0 };

            const rawDesc = evt.description || "";
            const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '');
            const servicesMatch = cleanDesc.match(/Serviços:\s*([^\n\r]+)/i);
            const evtServicesStr = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();
            const items = evtServicesStr.split(',').map(s => s.trim());

            for (const item of items) {
                if (isPrincipal(item)) daysMap[day].m++;
                if (isRental(item)) daysMap[day].r++;
                if (isCamaElastica(item)) daysMap[day].c++;
            }
        });

        // O DIA SÓ FICA VERMELHO SE: 2 Principais + 2 Aluguéis Normais + 2 Camas Elásticas estiverem esgotados
        const fullDays = Object.keys(daysMap).filter(d => daysMap[d].m >= 2 && daysMap[d].r >= 2 && daysMap[d].c >= 2).map(Number);
        res.json({ fullDays });
    } catch (e) { res.json({ fullDays: [] }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
module.exports = { validateAppointment };