
const { validateAppointment } = require('./server'); // Import logic from server.js

// --- HELPER TO MOCK EVENTS ---
const today = new Date();
const baseYear = today.getFullYear();
const baseMonth = today.getMonth();
const baseDay = today.getDate();

// Helper to create a Mock Event Object (as if returned by Google Calendar)
const makeEvent = (summary, services, startH, endH) => ({
    summary: summary,
    description: `Serviços: ${services}`,
    start: { dateTime: new Date(baseYear, baseMonth, baseDay, startH, 0, 0).toISOString() },
    end: { dateTime: new Date(baseYear, baseMonth, baseDay, endH, 0, 0).toISOString() }
});

// Helper to create a Request Object
const makeRequest = (services, startH, duration = 4) => ({
    services: services,
    start: new Date(baseYear, baseMonth, baseDay, startH, 0, 0),
    end: new Date(baseYear, baseMonth, baseDay, startH + duration, 0, 0) // Simple duration logic
});

console.log("\n🛑 --- INICIANDO TESTE DE ESTRESSE DE DISPONIBILIDADE --- 🛑\n");

// --- SIMULAÇÃO DA SEQUÊNCIA DE CONTECIMENTOS NO MUNDO REAL ---
let dailyEvents = []; // Database/Calendar State starts empty

// Cenário 1: Agendar "Buffet Essencial" às 10h.
console.log("👉 1. Tentando: Buffet Essencial @ 10h");
let req1 = makeRequest("Buffet Infantil Essencial", 10);
let res1 = validateAppointment(dailyEvents, req1);

if (res1.status === 'success') {
    console.log("   ✅ SUCESSO (Como esperado)");
    // Commit to 'database'
    dailyEvents.push(makeEvent("Festa: Cliente 1", req1.services, 10, 14));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res1.message);
}

// Cenário 2: Agendar "Buffet Especial" às 10h.
console.log("\n👉 2. Tentando: Buffet Especial @ 10h");
let req2 = makeRequest("Buffet Infantil Especial", 10);
let res2 = validateAppointment(dailyEvents, req2);

if (res2.status === 'success') {
    console.log("   ✅ SUCESSO (Como esperado - Limite agora é 2/2)");
    // Commit to 'database'
    dailyEvents.push(makeEvent("Festa: Cliente 2", req2.services, 10, 14));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res2.message);
}

// Cenário 3: TENTAR agendar "Estação de Crepe" às 15h.
console.log("\n👉 3. Tentando: Estação de Crepe @ 15h (Principal)");
let req3 = makeRequest("Estação de Crepe Suíço", 15);
let res3 = validateAppointment(dailyEvents, req3);

if (res3.status === 'error' && res3.message.includes('lotado para festas principais')) {
    console.log("   ✅ BLOQUEADO COM SUCESSO: " + res3.message);
} else {
    console.log("   ❌ ERRO: Deveria ter bloqueado! Status: " + res3.status);
}

// Cenário 4: Agendar "Carrinho Pipoca" e depois "Pipoca Gourmet" (Mesmo horário)
console.log("\n👉 4. Preparação: Agendar Carrinho Pipoca @ 10h (Aluguel 1)");
let req4a = makeRequest("Locação: Carrinho Pipoca", 10);
let res4a = validateAppointment(dailyEvents, req4a);

if (res4a.status === 'success') {
    console.log("   ✅ SUCESSO (Adicionado Aluguel 1)");
    dailyEvents.push(makeEvent("Locação: Cliente 3", req4a.services, 10, 14));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res4a.message);
}

console.log("   👉 4. (Teste Real) Tentando: Pipoca Gourmet @ 10h (Mesmo horário)");
let req4b = makeRequest("Pipoca Gourmet", 10);
let res4b = validateAppointment(dailyEvents, req4b);

if (res4b.status === 'error' && res4b.message.includes('popcorn time conflict')) {
    console.log("   ✅ BLOQUEADO COM SUCESSO: " + res4b.message);
} else {
    console.log("   ❌ ERRO: Deveria ter bloqueado por conflito! Status: " + res4b.status + " Msg: " + res4b.message);
}

// Cenário 5: Pipoca Gourmet às 18h (Mesma máquina, horário diferente)
console.log("\n👉 5. Tentando: Pipoca Gourmet @ 18h (Horário Livre)");
let req5 = makeRequest("Pipoca Gourmet", 18);
let res5 = validateAppointment(dailyEvents, req5);

if (res5.status === 'success') {
    console.log("   ✅ SUCESSO (Equipamento livre neste horário)");
    dailyEvents.push(makeEvent("Locação: Cliente 4", req5.services, 18, 22));
} else {
    console.log("   ❌ FALHA INESPERADA: " + res5.message);
}

console.log("\n📊 ESTADO FINAL DO DIA:");
console.log(`   Eventos Totais: ${dailyEvents.length}`);
console.log("   (Deve ter 2 Festas Principais + 2 Locações de Pipoca em horários diferentes)");
