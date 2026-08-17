const { validateAppointment } = require('./server');

const today = new Date();
const baseYear = today.getFullYear();
const baseMonth = today.getMonth();
const baseDay = today.getDate();

const makeEvent = (summary, services, startH, endH) => ({
    summary: summary,
    description: `Serviços: ${services}`,
    start: { dateTime: new Date(baseYear, baseMonth, baseDay, startH, 0, 0).toISOString() },
    end: { dateTime: new Date(baseYear, baseMonth, baseDay, endH, 0, 0).toISOString() }
});

const makeRequest = (services, startH, duration = 4) => ({
    services: services,
    start: new Date(baseYear, baseMonth, baseDay, startH, 0, 0),
    end: new Date(baseYear, baseMonth, baseDay, startH + duration, 0, 0)
});

console.log("\n🛑 --- INICIANDO TESTE DE ESTRESSE DE DISPONIBILIDADE --- 🛑\n");

let dailyEvents = [];

// Cenário 1: Agendar um Principal (Buffet) às 10h
console.log("👉 1. Tentando: Buffet Essencial @ 10h (Principal)");
let req1 = makeRequest("Buffet Infantil Essencial", 10);
let res1 = validateAppointment(dailyEvents, req1);

if (res1.status === 'success') {
    console.log("   ✅ SUCESSO");
    dailyEvents.push(makeEvent("Festa 1", req1.services, 10, 14));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res1.message);
}

// Cenário 2: Agendar um Aluguel (Cama Elástica) às 10h (Pode sobrepor com Principal)
console.log("\n👉 2. Tentando: Cama Elástica @ 10h (Aluguel 1)");
let req2 = makeRequest("Locação: Cama Elástica", 10);
let res2 = validateAppointment(dailyEvents, req2);

if (res2.status === 'success') {
    console.log("   ✅ SUCESSO");
    dailyEvents.push(makeEvent("Locação 1", req2.services, 10, 14));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res2.message);
}

// Cenário 3: TENTATIVA DE QUEBRA - Outro Aluguel (Pipoca) no MESMO horário da Cama Elástica
console.log("\n👉 3. [TESTE DE QUEBRA] Tentando: Pipoca Gourmet @ 12h (Sobrepõe Cama Elástica)");
let req3 = makeRequest("Pipoca Gourmet", 12);
let res3 = validateAppointment(dailyEvents, req3);

if (res3.status === 'error' && res3.message.includes('Conflito')) {
    console.log("   ✅ BLOQUEADO COM SUCESSO: " + res3.message);
} else {
    console.log("   ❌ ERRO DE LÓGICA: O sistema permitiu aluguéis diferentes no mesmo horário!");
}

// Cenário 4: Agendar segundo Aluguel em horário DIFERENTE
console.log("\n👉 4. Tentando: Carrinho Pipoca @ 16h (Horário Livre)");
let req4 = makeRequest("Carrinho Pipoca", 16);
let res4 = validateAppointment(dailyEvents, req4);

if (res4.status === 'success') {
    console.log("   ✅ SUCESSO (Segundo aluguel aceito)");
    dailyEvents.push(makeEvent("Locação 2", req4.services, 16, 20));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res4.message);
}

// Cenário 5: Tentar agendar terceiro Aluguel (Estoura o limite de 2/dia)
console.log("\n👉 5. Tentando: FestBar @ 21h (Estoura limite diário)");
let req5 = makeRequest("Festbar", 21);
let res5 = validateAppointment(dailyEvents, req5);

if (res5.status === 'error' && res5.message.includes('lotado')) {
    console.log("   ✅ BLOQUEADO COM SUCESSO: Limite de 2 aluguéis respeitado.");
} else {
    console.log("   ❌ ERRO DE LÓGICA: Permitiu 3 aluguéis no mesmo dia!");
}
