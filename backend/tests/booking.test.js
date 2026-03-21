const {
  contarServicos,
  validarLimiteDiario,
  conflitoHorario,
  calcularDuracao,
  validarFormulario,
  validarConvidados,
  validarAntecedencia
} = require('../test_logic');

const { validateAppointment } = require('../server');

describe('🧪 1. Regras de Contagem e Base', () => {
  test('Deve bloquear formulário sem serviços principais ou aluguéis (só adicionais)', () => {
    expect(() => validarFormulario(['Copos de Vidro', 'Bebidas']))
      .toThrow('Selecione pelo menos um serviço base');
  });
});

describe('🛑 2. Regras de Exclusividade do Formulário', () => {
  test('Deve bloquear a escolha de 2 Buffets Infantis simultâneos', () => {
    expect(() => validarFormulario(['Buffet Essencial', 'Buffet Premium']))
      .toThrow('Apenas 1 Buffet Infantil por pedido');
  });

  test('Deve bloquear a escolha de 3 serviços principais', () => {
    expect(() => validarFormulario(['Buffet Essencial', 'Estação de Crepe', 'Buffet de Massas']))
      .toThrow('Máximo de 2 serviços principais permitidos por evento');
  });

  // CORREÇÃO AQUI: Trocamos 'Cama Elástica' por 'Carrinho Pipoca' pois a cama agora é independente!
  test('Deve bloquear a escolha de 2 Aluguéis simultâneos', () => {
    expect(() => validarFormulario(['Hot Dog', 'Carrinho Pipoca']))
      .toThrow('Apenas 1 Aluguel por pedido');
  });

  test('Permite misturar 1 Principal e 1 Aluguel perfeitamente', () => {
    expect(() => validarFormulario(['Estação de Crepe', 'Carrinho de Pipoca'])).not.toThrow();
  });
});

describe('📅 3. Regras de Capacidade Diária (Limites da Empresa)', () => {
  test('Bloqueia se tentar agendar quando a cozinha já tem 2 festas', () => {
    expect(() => validarLimiteDiario(['Buffet Essencial'], { m: 2, r: 0 }))
      .toThrow('Lotado para festas principais');
  });

  test('Bloqueia se tentar alugar quando a montagem já tem 2 equipamentos na rua', () => {
    expect(() => validarLimiteDiario(['FestBar'], { m: 0, r: 2 }))
      .toThrow('Lotado para alugueis');
  });

  test('Permite alugar (Hot Dog) mesmo se a cozinha (Buffet) estiver lotada', () => {
    expect(() => validarLimiteDiario(['Hot Dog'], { m: 2, r: 1 })).not.toThrow();
  });
});

describe('⏱️ 4. Regras de Conflito de Horário', () => {
  test('Bloqueia horários que se cruzam no meio (ex: 14h-18h com 16h-17h)', () => {
    expect(conflitoHorario({ inicio: 16, fim: 17 }, { inicio: 14, fim: 18 })).toBe(true);
  });

  test('Permite eventos colados (termina 14h e o outro começa 14h)', () => {
    expect(conflitoHorario({ inicio: 10, fim: 14 }, { inicio: 14, fim: 18 })).toBe(false);
  });
});

describe('👥 5. Regras de Convidados', () => {
  test('Calcula duração: 30 pessoas = 3 horas', () => {
    expect(calcularDuracao(30)).toBe(3);
  });

  test('Calcula duração: 31 pessoas = 4 horas', () => {
    expect(calcularDuracao(31)).toBe(4);
  });

  test('Bloqueia qualquer evento para menos de 25 convidados', () => {
    expect(() => validarConvidados('Qualquer Serviço', 24))
      .toThrow('O número mínimo de convidados é 25');
  });

  test('Bloqueia Hot Dog para mais de 80 convidados no automático', () => {
    expect(() => validarConvidados('Hot Dog Gourmet', 85))
      .toThrow('Hot Dog excede limite automático');
  });

  test('Bloqueia Carrinho de Pipoca para mais de 100 convidados no automático', () => {
    expect(() => validarConvidados('Carrinho de Pipoca', 101))
      .toThrow('Carrinho excede limite automático');
  });
});

describe('🔗 6. Regras de Venda Casada e Dependências', () => {
  test('Bloqueia adicional de Salgados se o cliente escolheu Buffet', () => {
    expect(() => validarFormulario(['Buffet Premium', 'Salgados Extras']))
      .toThrow('Salgados já inclusos no pacote principal');
  });

  test('Bloqueia adicional de Salgados se o cliente escolheu Crepe', () => {
    expect(() => validarFormulario(['Estação de Crepe', 'Salgados Extras']))
      .toThrow('Salgados já inclusos no pacote principal');
  });

  test('Deve permitir a inclusão do Copeiro sem barrar o fluxo', () => {
    expect(() => validarFormulario(['Buffet Essencial', 'Copeiro: Sim (1 profissional(is))'])).not.toThrow();
  });

  test('Deve permitir Crepe com recusa do Copeiro', () => {
    expect(() => validarFormulario(['Estação de Crepe', 'Copeiro: Não (Sem copeiro - Cliente ciente da recomendação)'])).not.toThrow();
  });

  test('Deve bloquear a adição de Casquinha sem Crepe', () => {
    expect(() => validarFormulario(['Buffet Essencial', 'Crepe com casquinha de queijo']))
      .toThrow('A casquinha de queijo é exclusiva para o serviço de Crepe');
  });

  test('Deve permitir Casquinha se o cliente escolher Crepe', () => {
    expect(() => validarFormulario(['Estação de Crepe', 'Crepe com casquinha de queijo'])).not.toThrow();
  });

  test('Permite Casquinha de Queijo com Crepe Premium', () => {
      expect(() => validarFormulario(['Rodízio de Crepe Premium', 'Casquinha de Queijo'])).not.toThrow();
  });
});

describe('🧪 7. Novas Regras (Cama Elástica e Chácara)', () => {
  test('Permite choque de horário para FestBar se um for na Chácara e outro em domicílio', () => {
    const dayEvents = [{
      summary: 'Locação',
      description: 'Serviços: FestBar Drinks\n(Local: Chácara Parceira - Espaço 12h)',
      start: { dateTime: '2026-10-10T14:00:00Z' },
      end: { dateTime: '2026-10-10T18:00:00Z' }
    }];
    const newRequest = { services: 'FestBar Drinks', start: '2026-10-10T15:00:00Z', end: '2026-10-10T19:00:00Z', isChacara: false };
    const validation = validateAppointment(dayEvents, newRequest);
    expect(validation.status).toBe('success');
  });
  test('O sistema permite agendar 2 Camas Elásticas e 2 Aluguéis Normais no mesmo dia (Verifica Limite Diário)', () => {
    // 2 Alugueis já existem, adiciona 2 Camas
    expect(() => validarLimiteDiario(['Cama Elástica', 'Cama Elástica'], { m: 0, r: 2, c: 0 })).not.toThrow();
  });

  test('Cama Elástica não dá conflito de horário com Carrinho de Pipoca', () => {
    const dayEvents = [
      {
        summary: 'Locação',
        description: 'Serviços: Carrinho de Pipoca',
        start: { dateTime: '2026-10-10T14:00:00Z' },
        end: { dateTime: '2026-10-10T18:00:00Z' }
      }
    ];
    const newRequest = {
      services: 'Cama Elástica',
      start: '2026-10-10T15:00:00Z',
      end: '2026-10-10T19:00:00Z',
      isChacara: false
    };
    const validation = validateAppointment(dayEvents, newRequest);
    expect(validation.status).toBe('success');
  });

  test('FestBar com isChacara = true é aprovado mesmo se existentes.r = 2 (imunidade de local)', () => {
    expect(() => validarLimiteDiario(['FestBar Drinks'], { m: 0, r: 2, c: 0 }, true)).not.toThrow();
  });
});

describe('⏳ 8. Regra de Antecedência', () => {
  test('Bloqueia agendamento com menos de 3 dias de antecedência', () => {
    const dataAmanha = new Date();
    dataAmanha.setDate(dataAmanha.getDate() + 1);
    expect(() => validarAntecedencia(dataAmanha))
      .toThrow('Antecedência mínima de 3 dias não respeitada');
  });

  test('Permite agendamento com antecedência de 5 dias', () => {
    const dataSegura = new Date();
    dataSegura.setDate(dataSegura.getDate() + 5);
    expect(() => validarAntecedencia(dataSegura))
      .not.toThrow();
  });
});