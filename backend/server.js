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
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const CALENDAR_ID = 'rodrigueslarab@gmail.com'; 

async function getCalendarService() {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
}

// --- REGRAS DE CLASSIFICAÇÃO ---
const isPrincipal = (txt) => /buffet|essencial|especial|premium|massa|crepe|hot dog|barraquinha/.test(txt);
const isRental = (txt) => /carrinho|algodão|pipoca|cama elástica|festbar|drinks|bar/.test(txt);

const hasPopcorn = (txt) => /carrinho|algodão|pipoca/.test(txt);
const hasTrampoline = (txt) => /cama elástica/.test(txt);

// --- LÓGICA DE VALIDAÇÃO (JÁ ESTAVA BLINDADA) ---
function validateAppointment(dayEvents, newRequest) {
    const reqServicesStr = (newRequest.services || "").toLowerCase();
    const start = new Date(newRequest.start);
    const end = new Date(newRequest.end);

    let existingMains = 0;
    let existingRentals = 0;

    for (const evt of dayEvents) {
        const rawDesc = evt.description || "";
        const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, ''); // Limpa HTML
        const servicesMatch = cleanDesc.match(/Serviços:\s*([^\n\r]+)/i);
        const evtServicesStr = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();

        const items = evtServicesStr.split(',').map(s => s.trim());
        
        for (const item of items) {
            if (isPrincipal(item)) existingMains++;
            else if (isRental(item)) existingRentals++;
        }
    }

    let newMains = 0;
    let newRentals = 0;
    const reqItems = reqServicesStr.split(',').map(s => s.trim());

    for (const item of reqItems) {
        if (isPrincipal(item)) newMains++;
        else if (isRental(item)) newRentals++;
    }

    if ((existingMains + newMains) > 2) {
        return { status: 'error', message: 'lotado para festas principais' };
    }

    if ((existingRentals + newRentals) > 2) {
        return { status: 'error', message: 'lotado para alugueis' };
    }

    for (const evt of dayEvents) {
        const rawDesc = evt.description || "";
        const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '');
        const servicesMatch = cleanDesc.match(/Serviços:\s*([^\n\r]+)/i);
        const txt = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();

        const evtStartRaw = evt.start.dateTime || evt.start.date || evt.start;
        const evtEndRaw = evt.end.dateTime || evt.end.date || evt.end;
        const evtStart = new Date(evtStartRaw);
        const evtEnd = new Date(evtEndRaw);

        const overlap = (start < evtEnd && end > evtStart);

        if (overlap) {
            if (hasPopcorn(reqServicesStr) && hasPopcorn(txt)) {
                return { status: 'error', message: 'popcorn time conflict' };
            }
            if (hasTrampoline(reqServicesStr) && hasTrampoline(txt)) {
                return { status: 'error', message: 'reservado (cama elástica)' };
            }
        }
    }

    return { status: 'success' };
}

// --- ROTA DE AGENDAMENTO ---
app.post('/api/schedule', upload.none(), async (req, res) => {
    try {
        const p = req.body;
        const dateParts = p.selectedDateISO.split('-');
        const timeParts = p.eventTime.split(':');
        const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        const duration = parseInt(p.eventDuration) || 4;
        const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));

        if (start < new Date()) {
            return res.json({ status: 'error', message: 'Não é possível agendar datas passadas.' });
        }

        const calendar = await getCalendarService();
        const dayStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
        const dayEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59);

        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
        });

        const dayEvents = response.data.items || [];
        const newRequest = { services: p.services, start: start, end: end };

        const validation = validateAppointment(dayEvents, newRequest);
        if (validation.status === 'error') {
            return res.json(validation);
        }

        const finalTitle = isPrincipal((p.services || "").toLowerCase()) ? ('Festa: ' + p.clientName) : ('Locação: ' + p.clientName);
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

// --- ROTA DE DISPONIBILIDADE (CORRIGIDA COM BLINDAGEM HTML) ---
app.get('/api/month-availability', async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.json({ fullDays: [] });

        const startDate = new Date(year, month, 1, 0, 0, 0);
        const endDate = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

        const calendar = await getCalendarService();
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
        });

        const events = response.data.items || [];
        const daysMap = {}; 

        for (const evt of events) {
            const evtDate = new Date(evt.start.dateTime || evt.start.date);
            const day = evtDate.getDate();

            // AQUI ESTAVA O PROBLEMA: AGORA TEM LIMPEZA DE HTML IGUAL AO AGENDAMENTO
            const rawDesc = evt.description || "";
            const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, ''); 
            const servicesMatch = cleanDesc.match(/Serviços:\s*([^\n\r]+)/i);
            const evtServicesStr = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();

            const items = evtServicesStr.split(',').map(s => s.trim());

            if (!daysMap[day]) daysMap[day] = { mains: 0, rentals: 0 };

            for (const item of items) {
                if (isPrincipal(item)) daysMap[day].mains++;
                else if (isRental(item)) daysMap[day].rentals++;
            }
        }

        const fullDays = [];
        for (const day in daysMap) {
            // REGRA: SÓ FICA VERMELHO SE LOTAR TUDO (2 PRINCIPAIS + 2 ALUGUÉIS)
            if (daysMap[day].mains >= 2 && daysMap[day].rentals >= 2) {
                fullDays.push(parseInt(day));
            }
        }

        res.json({ fullDays });

    } catch (error) {
        console.error(error);
        res.json({ fullDays: [] });
    }
});

module.exports = { validateAppointment, app };
const PORT = 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));