// Testes para contarServicos
test('conta serviços principais e adicionais corretamente', () => {
  const servicos = [
    'Buffet Essencial',     // principal
    'Pipoca Doce Premium',  // adicional
    'Buffet de Massas'      // principal
  ];
  expect(contarServicos(servicos).principais).toBe(2);
  expect(contarServicos(servicos).adicionais).toBe(1);
});

test('conta apenas serviços principais', () => {
  const servicos = [
    'Buffet Essencial',
    'Buffet Premium',
    'Buffet de Massas'
  ];
  expect(contarServicos(servicos).principais).toBe(3);
  expect(contarServicos(servicos).adicionais).toBe(0);
});

test('conta apenas serviço adicional', () => {
  const servicos = ['Pipoca Doce Premium'];
  expect(contarServicos(servicos).principais).toBe(0);
  expect(contarServicos(servicos).adicionais).toBe(1);
});

// Testes para validarLimiteDiario
test('permite 2 serviços principais no mesmo dia', () => {
  const servicos = [
    'Buffet Essencial',
    'Buffet de Massas'
  ];
  expect(() => validarLimiteDiario(servicos)).not.toThrow();
});

test('permite 1 serviço principal no mesmo dia', () => {
  const servicos = ['Buffet Essencial'];
  expect(() => validarLimiteDiario(servicos)).not.toThrow();
});

test('serviço adicional não afeta limite de principais', () => {
  const servicos = [
    'Buffet Essencial',      // 1º principal
    'Buffet de Massas',      // 2º principal
    'Pipoca Doce Premium'    // adicional - não conta para limite
  ];
  expect(() => validarLimiteDiario(servicos)).not.toThrow();
});

test('bloqueia 3 serviços principais mesmo com adicional', () => {
  const servicos = [
    'Buffet Essencial',
    'Buffet Premium',
    'Buffet de Massas',
    'Pipoca Doce Premium'  // adicional
  ];
  expect(() => validarLimiteDiario(servicos))
    .toThrow('Lotado para festas principais');
});

test('permite múltiplos serviços adicionais (se existissem)', () => {
  const servicos = [
    'Buffet Essencial',  // principal
    'Pipoca Doce Premium' // adicional
    // Se houvesse mais adicionais, eles seriam permitidos
  ];
  expect(() => validarLimiteDiario(servicos)).not.toThrow();
});

// Testes para conflitoHorario (permanecem os mesmos - não dependem dos serviços)
test('não detecta conflito quando horários não se sobrepõem', () => {
  expect(conflitoHorario(
    { inicio: 14, fim: 16 },
    { inicio: 17, fim: 19 }
  )).toBe(false);
});

test('detecta conflito quando horário está completamente dentro', () => {
  expect(conflitoHorario(
    { inicio: 15, fim: 16 },
    { inicio: 14, fim: 18 }
  )).toBe(true);
});

test('detecta conflito quando horários se sobrepõem parcialmente', () => {
  expect(conflitoHorario(
    { inicio: 14, fim: 17 },
    { inicio: 16, fim: 19 }
  )).toBe(true);
});

test('não detecta conflito em horários adjacentes', () => {
  expect(conflitoHorario(
    { inicio: 14, fim: 16 },
    { inicio: 16, fim: 18 }
  )).toBe(false);
});

test('detecta conflito quando um horário engloba outro', () => {
  expect(conflitoHorario(
    { inicio: 13, fim: 19 },
    { inicio: 15, fim: 17 }
  )).toBe(true);
});