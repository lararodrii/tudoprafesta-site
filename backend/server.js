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

// --- HELPER FUNCTIONS & LOGIC ---

// Hot Dog = Principal. Festbar = Aluguel.
const isPrincipal = (txt) => /buffet|essencial|especial|premium|massa|crepe|hot dog|barraquinha/.test(txt);
const isRental = (txt) => /carrinho|algodão|pipoca|cama elástica|festbar|drinks|bar/.test(txt);

// Travas de equipamento único (O Hot Dog não tem mais trava de horário)
const hasPopcorn = (txt) => /carrinho|algodão|pipoca/.test(txt);
const hasTrampoline = (txt) => /cama elástica/.test(txt);

// Core validation logic isolated for testing
function validateAppointment(dayEvents, newRequest) {
    const reqServicesStr = (newRequest.services || "").toLowerCase();
    const start = new Date(newRequest.start);
    const end = new Date(newRequest.end);

    // 1. Analyze Existing Events on this Day (Contagem Desmembrada)
    let existingMains = 0;
    let existingRentals = 0;

    for (const evt of dayEvents) {
        // Pega apenas a linha de "Serviços:" da descrição do calendário
        const desc = evt.description || "";
        const servicesMatch = desc.match(/Serviços:\s*(.*)/i);
        const evtServicesStr = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();

        // Quebra a string (ex: "Buffet, Crepe, Pipoca") em itens individuais
        const items = evtServicesStr.split(',').map(s => s.trim());
        
        for (const item of items) {
            if (isPrincipal(item)) existingMains++;
            else if (isRental(item)) existingRentals++;
        }
    }

    // 2. Analyze New Request (Contagem Desmembrada)
    let newMains = 0;
    let newRentals = 0;
    const reqItems = reqServicesStr.split(',').map(s => s.trim());

    for (const item of reqItems) {
        if (isPrincipal(item)) newMains++;
        else if (isRental(item)) newRentals++;
    }

    // 3. Validation: Main Services Limit (Max 2/day)
    // Soma o que já tem no dia + o que o cliente está pedindo agora
    if ((existingMains + newMains) > 2) {
        return { status: 'error', message: 'lotado para festas principais' };
    }

    // 4. Validation: Rentals Limit (Max 2/day)
    // Soma o que já tem no dia + o que o cliente está pedindo agora
    if ((existingRentals + newRentals) > 2) {
        return { status: 'error', message: 'lotado para alugueis' };
    }

    // 5. Validation: Equipment Conflict (Time Overlap)
    // ONLY check if the specific equipment matches AND time overlaps
    for (const evt of dayEvents) {
        const desc = evt.description || "";
        const servicesMatch = desc.match(/Serviços:\s*(.*)/i);
        const txt = servicesMatch ? servicesMatch[1].toLowerCase() : (evt.summary || "").toLowerCase();

        // Parse event times correctly whether they are ISO strings or Date objects
        const evtStartRaw = evt.start.dateTime || evt.start.date || evt.start;
        const evtEndRaw = evt.end.dateTime || evt.end.date || evt.end;
        const evtStart = new Date(evtStartRaw);
        const evtEnd = new Date(evtEndRaw);

        // Check Time Overlap
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

// --- ROTA DE AGENDAMENTO (POST) ---
app.post('/api/schedule', upload.none(), async (req, res) => {
    try {
        const p = req.body;

        // Parse inputs
        const dateParts = p.selectedDateISO.split('-');
        const timeParts = p.eventTime.split(':');
        const start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
        const duration = parseInt(p.eventDuration) || 4;
        const end = new Date(start.getTime() + (duration * 60 * 60 * 1000));

        // Basic Validation
        if (start < new Date()) {
            return res.json({ status: 'error', message: 'Não é possível agendar em datas ou horários passados.' });
        }

        const calendar = await getCalendarService();
        const dayStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
        const dayEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59);

        // Fetch existing events for the day
        const response = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
        });

        const dayEvents = response.data.items || [];

        // Prepare request object for validation function
        const newRequest = {
            services: p.services,
            start: start,
            end: end
        };

        // RUN LOGIC
        const validation = validateAppointment(dayEvents, newRequest);
        if (validation.status === 'error') {
            return res.json(validation);
        }

        // Create Event if Success
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

// Export logic for testing
module.exports = { validateAppointment, app }; // Export app for usage if needed, but mainly validateAppointment

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));