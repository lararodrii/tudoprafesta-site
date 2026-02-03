// --- FUNÇÕES DE AJUDA (Baseadas no server.js) ---
const isPrincipal = (txt) => /buffet|essencial|especial|premium|massa|crepe|hot dog|barraquinha/i.test(txt);
const isRental = (txt) => /carrinho|algodão|pipoca|cama elástica|festbar|drinks|bar/i.test(txt);

// 1. Função de Contagem
function contarServicos(servicos) {
    let principais = 0;
    let adicionais = 0; // No server.js chamamos de 'rentals', aqui o teste chama de adicionais

    servicos.forEach(item => {
        if (isPrincipal(item)) principais++;
        else if (isRental(item)) adicionais++;
    });

    return { principais, adicionais };
}

// 2. Função de Validação de Limite
function validarLimiteDiario(servicos) {
    const contagem = contarServicos(servicos);

    // O teste espera erro se passar de 2 principais
    // Nota: O server.js soma com os já existentes. Aqui validamos o array recebido.
    if (contagem.principais > 2) {
        throw new Error('Lotado para festas principais');
    }

    // Opcional: Se quiser validar alugueis também conforme regra 2+2
    if (contagem.adicionais > 2) {
        throw new Error('Lotado para alugueis');
    }
}

// 3. Função de Conflito de Horário
function conflitoHorario(horarioA, horarioB) {
    // Retorna true se houver sobreposição
    // Lógica: (InicioA < FimB) E (FimA > InicioB)
    return (horarioA.inicio < horarioB.fim && horarioA.fim > horarioB.inicio);
}

// Exporta as funções para serem usadas no arquivo de teste
module.exports = {
    contarServicos,
    validarLimiteDiario,
    conflitoHorario
};