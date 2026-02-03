
// Mock of the logic inside server.js to test without Google Credentials
// Logic copied from server.js

// --- HELPER FUNCTIONS ---
const isPrincipal = (txt) => /buffet|essencial|especial|premium|massa|crepe/.test(txt);
const isRental = (txt) => /hot dog|barraquinha|carrinho|algodão|pipoca|cama elástica/.test(txt);
const hasPopcorn = (txt) => /carrinho|algodão|pipoca/.test(txt);
const hasTrampoline = (txt) => /cama elástica/.test(txt);
const hasHotDog = (txt) => /hot dog|barraquinha/.test(txt);

function checkAvailability(dayEvents, newRequest) {
    const servicesStr = (newRequest.services || "").toLowerCase();
    const start = new Date(newRequest.start);
    const end = new Date(newRequest.end);

    // 1. Analisa eventos existentes (Contagem e Conflitos)
    let countPrincipais = 0;
    let countAlugueis = 0; // Contagem de eventos que são APENAS aluguel

    for (const evt of dayEvents) {
        const txt = ((evt.summary || "") + " " + (evt.description || "")).toLowerCase();

        if (isPrincipal(txt)) {
            countPrincipais++;
        } else if (isRental(txt)) {
            countAlugueis++;
        }
    }

    // 2. Analisa o Novo Pedido
    const reqPrincipal = isPrincipal(servicesStr);
    const reqRental = isRental(servicesStr);
    // Se for principal, não conta como "Vaga de Aluguel", mas pode usar equipamento
    const reqIsOnlyRental = reqRental && !reqPrincipal;

    // 3. Validações de LIMITE QUANTITATIVO (Sem checar horário)

    // Regra 1: Limite de Principais (Max 2/dia)
    if (reqPrincipal && countPrincipais >= 2) {
        return { status: 'error', message: 'lotado para festas principais' };
    }

    // Regra 2: Limite de Aluguéis (Max 2/dia - Apenas para pedidos exclusivos de aluguel)
    // Se eu já tenho 2 eventos de aluguel, não posso aceitar um terceiro.
    if (reqIsOnlyRental && countAlugueis >= 2) {
        return { status: 'error', message: 'lotado para alugueis' };
    }

    // 4. Validação de CONFLITO DE EQUIPAMENTO FÍSICO (Com checagem de horário)

    for (const evt of dayEvents) {
        const txt = ((evt.summary || "") + " " + (evt.description || "")).toLowerCase();
        const evtStart = new Date(evt.start);
        const evtEnd = new Date(evt.end);

        // Verifica Sobreposição de Horário
        const overlap = (start < evtEnd && end > evtStart);

        // Debug
        // console.log(`Checking overlap: New(${start.getHours()}-${end.getHours()}) Existing(${evtStart.getHours()}-${evtEnd.getHours()}) -> ${overlap}`);

        if (overlap) {
            // Checa conflitos específicos
            if (hasPopcorn(servicesStr) && hasPopcorn(txt)) {
                return { status: 'error', message: 'popcorn time conflict' };
            }
            if (hasTrampoline(servicesStr) && hasTrampoline(txt)) {
                return { status: 'error', message: 'reservado (cama elástica)' };
            }
            if (hasHotDog(servicesStr) && hasHotDog(txt)) {
                return { status: 'error', message: 'reservado (hot dog)' };
            }
        }
    }

    return { status: 'success' };
}

// --- TESTS ---

const today = new Date();
const baseYear = today.getFullYear();
const baseMonth = today.getMonth();
const baseDay = today.getDate();

const makeEvent = (summary, startH, endH) => ({
    summary: summary,
    description: "",
    start: new Date(baseYear, baseMonth, baseDay, startH, 0, 0),
    end: new Date(baseYear, baseMonth, baseDay, endH, 0, 0)
});

const makeRequest = (services, startH, endH) => ({
    services: services,
    start: new Date(baseYear, baseMonth, baseDay, startH, 0, 0),
    end: new Date(baseYear, baseMonth, baseDay, endH, 0, 0)
});

console.log("--- RUNNING TESTS ---");

// Test 1: Empty Day -> Add Buffet -> Success
let events = [];
let req = makeRequest("Buffet Infantil Essencial", 13, 17);
let res = checkAvailability(events, req);
console.log(`Test 1 (Empty -> Buffet): ${res.status === 'success' ? 'PASS' : 'FAIL ' + res.message}`);

// Test 2: 1 Buffet Existing -> Add Buffet Overlapping -> Success (Max 2 rule, no time blocking)
events = [makeEvent("Festa: Buffet", 13, 17)];
req = makeRequest("Buffet Infantil Especial", 13, 17);
res = checkAvailability(events, req);
console.log(`Test 2 (1 Buffet -> Add 2nd Overlapping): ${res.status === 'success' ? 'PASS' : 'FAIL ' + res.message}`);

// Test 3: 2 Buffets Existing -> Add Buffet -> Fail (Max 2 reached)
events = [makeEvent("Festa: Buffet 1", 10, 14), makeEvent("Festa: Buffet 2", 16, 20)];
req = makeRequest("Buffet Premium", 12, 16);
res = checkAvailability(events, req);
console.log(`Test 3 (2 Buffets -> Add 3rd): ${res.status === 'error' && res.message.includes('lotado para festas principais') ? 'PASS' : 'FAIL ' + res.message}`);
if (res.status !== 'error') console.log(res);

// Test 4: 2 Buffets Existing -> Add Rental -> Success (Rentals have separate limit)
events = [makeEvent("Festa: Buffet 1", 10, 14), makeEvent("Festa: Buffet 2", 16, 20)];
req = makeRequest("Locação: Cama Elástica", 12, 16);
res = checkAvailability(events, req);
console.log(`Test 4 (2 Buffets -> Add Rental): ${res.status === 'success' ? 'PASS' : 'FAIL ' + res.message}`);

// Test 5: 2 Rentals Existing -> Add Rental -> Fail (Max 2 reached)
events = [makeEvent("Locação: Pipoca", 10, 14), makeEvent("Locação: Cama Elástica", 16, 20)];
req = makeRequest("Barraquinha de Hot Dog", 12, 16);
res = checkAvailability(events, req);
console.log(`Test 5 (2 Rentals -> Add 3rd): ${res.status === 'error' && res.message.includes('lotado para alugueis') ? 'PASS' : 'FAIL ' + res.message}`);

// Test 6: Rental Overlap (Pipoca vs Pipoca) -> Fail (Time Conflict)
events = [makeEvent("Locação: Carrinho Pipoca", 13, 17)];
req = makeRequest("Pipoca Gourmet", 14, 18); // Overlaps 14-17
res = checkAvailability(events, req);
console.log(`Test 6 (Pipoca Overlap): ${res.status === 'error' && res.message.includes('popcorn time conflict') ? 'PASS' : 'FAIL ' + res.message}`);

// Test 7: Rental No Overlap (Pipoca vs Pipoca) -> Success
events = [makeEvent("Locação: Carrinho Pipoca", 10, 14)]; // 10-14
req = makeRequest("Pipoca Gourmet", 15, 19); // 15-19
res = checkAvailability(events, req);
console.log(`Test 7 (Pipoca No Overlap): ${res.status === 'success' ? 'PASS' : 'FAIL ' + res.message}`);
