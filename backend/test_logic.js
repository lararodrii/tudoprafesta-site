const isPrincipal = (txt) => /^(buffet|estação de crepe)/i.test(txt);
const isRental = (txt) => /^(carrinho|festbar|hot dog|pipoca gourmet)/i.test(txt);
const isCamaElastica = (txt) => /^cama elástica/i.test(txt);
const isBuffetInfantil = (txt) => /^buffet (essencial|especial|premium)/i.test(txt);

function contarServicos(servicos, isChacara = false) {
    let principais = 0;
    let alugueis = 0;
    let camaElastica = 0;
    let buffetInfantil = 0;

    servicos.forEach(item => {
        if (isPrincipal(item)) {
            principais++;
            if (isBuffetInfantil(item)) buffetInfantil++;
        }
        else if (isRental(item)) {
            if (isChacara && /festbar|drinks|bar/i.test(item)) {
                // IMUNIDADE: Na Chácara, drinks não ocupam cota de aluguel normal
            } else {
                alugueis++;
            }
        }
        else if (isCamaElastica(item)) {
            camaElastica++;
        }
    });

    return { principais, alugueis, camaElastica, buffetInfantil };
}

// 🚦 TRAVAS DE CAPACIDADE DIÁRIA
function validarLimiteDiario(servicos, existentes = { m: 0, r: 0, c: 0 }, isChacara = false) {
    const novos = contarServicos(servicos, isChacara);
    if (novos.principais > 0 && (existentes.m + novos.principais) > 2) {
        throw new Error('Lotado para festas principais');
    }
    if (novos.alugueis > 0 && (existentes.r + novos.alugueis) > 2) {
        throw new Error('Lotado para alugueis');
    }
    if (novos.camaElastica > 0 && ((existentes.c || 0) + novos.camaElastica) > 2) {
        throw new Error('Lotado para camas elásticas');
    }
}

// ⏱️ TRAVAS DE HORÁRIO
function conflitoHorario(horarioA, horarioB) {
    return (horarioA.inicio < horarioB.fim && horarioA.fim > horarioB.inicio);
}

function calcularDuracao(convidados) {
    return convidados <= 30 ? 3 : 4;
}

// 📋 TRAVAS DO FORMULÁRIO (Exclusividade)
function validarFormulario(servicos, isChacara = false) {
    const contagem = contarServicos(servicos, isChacara);

    if (contagem.buffetInfantil > 1) throw new Error('Apenas 1 Buffet Infantil por pedido');
    if (contagem.alugueis > 1) throw new Error('Apenas 1 Aluguel por pedido');
    if (contagem.principais > 2) throw new Error('Máximo de 2 serviços principais permitidos por evento');
    if (contagem.principais === 0 && contagem.alugueis === 0 && contagem.camaElastica === 0) throw new Error('Selecione pelo menos um serviço base');

    // Trava de venda casada (Adicionais repetidos)
    const hasSalgadoExtra = servicos.some(s => /salgado/i.test(s));
    if (hasSalgadoExtra && servicos.some(s => /^(buffet|estação de crepe)/i.test(s))) {
        throw new Error('Salgados já inclusos no pacote principal');
    }

    const hasCasquinha = servicos.some(s => /casquinha/i.test(s));
    if (hasCasquinha && !servicos.some(s => /^(estação de crepe|rodízio de crepe)/i.test(s))) {
        throw new Error('A casquinha de queijo é exclusiva para o serviço de Crepe');
    }
}

// 👥 TRAVAS DE CONVIDADOS
function validarConvidados(servico, convidados) {
    if (convidados < 25) throw new Error('O número mínimo de convidados é 25');
    if (/hot dog/i.test(servico) && convidados > 80) throw new Error('Hot Dog excede limite automático');
    if (/carrinho/i.test(servico) && convidados > 100) throw new Error('Carrinho excede limite automático');
}

// ⏳ TRAVAS DE ANTECEDÊNCIA
function validarAntecedencia(dataEvento) {
    const dataObj = typeof dataEvento === 'string' ? new Date(dataEvento) : dataEvento;
    const dataAtual = new Date();
    dataAtual.setHours(0, 0, 0, 0);
    dataObj.setHours(0, 0, 0, 0);

    const dataCorte = new Date(dataAtual);
    dataCorte.setDate(dataAtual.getDate() + 3);

    if (dataObj < dataCorte) {
        throw new Error('Antecedência mínima de 3 dias não respeitada');
    }
}

module.exports = {
    contarServicos,
    validarLimiteDiario,
    conflitoHorario,
    calcularDuracao,
    validarFormulario,
    validarConvidados,
    validarAntecedencia
};