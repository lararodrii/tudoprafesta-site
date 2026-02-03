const {
  contarServicos,
  validarLimiteDiario,
  conflitoHorario
} = require('../test_logic');

test('bloqueia 3 serviços principais no mesmo dia', () => {
  const servicos = [
    'Buffet Essencial',
    'Buffet Premium',
    'Buffet de Massas'
  ];
  expect(() => validarLimiteDiario(servicos))
    .toThrow('Lotado para festas principais');
});

test('bloqueia conflito de horário da pipoca', () => {
  expect(conflitoHorario(
    { inicio: 16, fim: 17 },
    { inicio: 14, fim: 18 }
  )).toBe(true);
});
