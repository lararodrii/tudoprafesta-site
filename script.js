document.addEventListener('DOMContentLoaded', function () {

    const getEl = (id) => document.getElementById(id);
    const scriptURL = "https://claras-buffet-backend.onrender.com/api/schedule";

    // ==========================================
    // ⚙️ 1. CONFIGURAÇÕES
    // ==========================================
    const PRICES = {
        buffet: {
            essencial: { tier1: 47.00, tier2: 44.00, threshold: 49 },
            especial: { tier1: 65.00, tier2: 62.00, threshold: 49 },
            premium: { tier1: 75.00, tier2: 72.00, threshold: 49 }
        },
        services: {
            massas: 39.99,
            crepe: 37.90,
            hotdog: 750.00,
            carts: 300.00,
            popcorn_premium: 600.00
        },
        addons: {
            drinks: 9.90,
            savory: 8.90,
            glass: 1.00,
            cutlery: 2.50,
            nutella: 120.00
        },
        cama_elastica: 250.00
    };

    let globalGuests = 50;

    const inputs = {
        // Principais
        buffetEssencial: getEl('service-buffet-essencial'),
        buffetEspecial: getEl('service-buffet-especial'),
        buffetPremium: getEl('service-buffet-premium'),
        massas: getEl('service-massas'),
        crepe: getEl('service-crepe'),
        // Alugueis
        hotdog: getEl('service-hotdog'),
        carts: getEl('service-carts'),
        popcornPremium: getEl('service-popcorn-premium'),
        camaElastica: getEl('service-cama-elastica'),
        // Adicionais
        addonDrinks: getEl('addon-drinks'),
        addonSavory: getEl('addon-savory'),
        addonGlass: getEl('addon-glass'),
        addonCutlery: getEl('addon-cutlery'),
        addonNutella: getEl('addon-nutella'),
        containerNutella: getEl('container-addon-nutella')
    };

    const guestsInput = getEl('guests');
    const totalPriceElement = getEl('total-price');
    const dynamicWarnings = getEl('dynamic-warnings');

    // ==========================================
    // 🧮 2. LÓGICA DE CONTROLE (ITENS 6, 7 e 8)
    // ==========================================
    function updateAddonsState() {
        const mainServices = [
            inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium,
            inputs.massas, inputs.crepe,
            // ITEM 6: Alugueis também liberam adicionais agora
            inputs.hotdog, inputs.carts, inputs.popcornPremium, inputs.camaElastica
        ];

        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);
        const addons = [inputs.addonDrinks, inputs.addonSavory, inputs.addonGlass, inputs.addonCutlery, inputs.addonNutella];

        addons.forEach(addon => {
            if (addon) {
                // ITEM 6: Só verifica e desmarca, validação de clique é feita no eventListener
                // addon.disabled = !isMainOrRentalSelected; // REMOVIDO PARA PERMITIR CLIQUE E ALERTA
                addon.disabled = false; // Garante que esteja habilitado
                if (!isMainOrRentalSelected) addon.checked = false;
            }
        });


        // ITEM 7: Se Massas for selecionado, desabilita e desmarca Pratos/Talheres
        if (inputs.massas && inputs.massas.checked) {
            if (inputs.addonCutlery) {
                inputs.addonCutlery.checked = false;
                inputs.addonCutlery.disabled = true;
            }
        }

        // Lógica Nutella
        if (inputs.popcornPremium && inputs.containerNutella) {
            const showNutella = inputs.popcornPremium.checked;
            inputs.containerNutella.style.display = showNutella ? 'flex' : 'none';
            if (!showNutella && inputs.addonNutella) inputs.addonNutella.checked = false;
        }

        calculateTotal();
    }

    // ITEM 8: Teste de Preços
    function calculateTotal() {
        let total = 0;
        let guests = parseInt(guestsInput?.value) || 0;
        if (guests < 0) guests = 0;

        let warnings = [];
        let isOverflow = false;

        const getTierPrice = (serviceKey) => {
            const config = PRICES.buffet[serviceKey];
            return (guests <= config.threshold) ? config.tier1 : config.tier2;
        };

        // Principais
        if (inputs.buffetEssencial?.checked) total += guests * getTierPrice('essencial');
        if (inputs.buffetEspecial?.checked) total += guests * getTierPrice('especial');
        if (inputs.buffetPremium?.checked) total += guests * getTierPrice('premium');
        if (inputs.massas?.checked) total += guests * PRICES.services.massas;
        if (inputs.crepe?.checked) total += guests * PRICES.services.crepe;

        // Alugueis (Fixos)
        if (inputs.popcornPremium?.checked) total += PRICES.services.popcorn_premium;
        if (inputs.camaElastica?.checked) total += PRICES.cama_elastica;

        if (inputs.hotdog?.checked) {
            if (guests > 80) {
                isOverflow = true;
                warnings.push('<span style="color:red; font-weight:bold;">⚠️ Limite excedido para Hot Dog (Máx 80).</span>');
            } else {
                total += PRICES.services.hotdog;
            }
        }
        if (inputs.carts?.checked) {
            if (guests > 100) {
                isOverflow = true;
                warnings.push('<span style="color:red; font-weight:bold;">⚠️ Limite excedido para Carrinho (Máx 100).</span>');
            } else {
                total += PRICES.services.carts;
            }
        }

        // Adicionais (Multiplicados por convidado)
        if (inputs.addonDrinks?.checked) total += guests * PRICES.addons.drinks;
        if (inputs.addonSavory?.checked) total += guests * PRICES.addons.savory;
        if (inputs.addonGlass?.checked) total += guests * PRICES.addons.glass;
        if (inputs.addonCutlery?.checked && !inputs.addonCutlery.disabled) total += guests * PRICES.addons.cutlery;
        if (inputs.popcornPremium?.checked && inputs.addonNutella?.checked) total += PRICES.addons.nutella; // Nutella é fixo

        globalGuests = guests;

        if (totalPriceElement) {
            const btnBooking = getEl('btn-goto-booking');
            const btnWhats = getEl('btn-whatsapp-fallback');

            if (isOverflow) {
                totalPriceElement.textContent = "Sob Consulta";
                if (btnBooking) btnBooking.style.display = 'none';
                if (btnWhats) btnWhats.style.display = 'block';
            } else {
                totalPriceElement.textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (btnBooking) btnBooking.style.display = 'block';
                if (btnWhats) btnWhats.style.display = 'none';
            }
        }
        if (dynamicWarnings) dynamicWarnings.innerHTML = warnings.join('<br>');
    }

    if (guestsInput) guestsInput.addEventListener('input', calculateTotal);
    Object.values(inputs).forEach(input => {
        if (input) {
            input.addEventListener('change', updateAddonsState);
        }
    });

    // Validar exclusividade dos Buffets (Essencial, Especial, Premium)
    const buffetInputs = [inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium];
    buffetInputs.forEach(buffet => {
        if (buffet) {
            buffet.addEventListener('click', function (e) {
                // Se o usuário está tentando marcar este buffet
                if (this.checked) {
                    // Verifica se já existe outro marcado
                    const otherSelected = buffetInputs.find(b => b !== this && b.checked);
                    if (otherSelected) {
                        e.preventDefault(); // Impede a marcação visual
                        this.checked = false; // Garante o estado lógico
                        alert("⚠️ Atenção: Você só pode selecionar um tipo de Buffet por vez. Caso queira personalizar ou adicionar itens extras, selecione o pacote principal agora e combine os detalhes em nosso WhatsApp após gerar o orçamento!");
                    }
                }
            });
        }
    });



    // ==========================================
    // 🛑 VALIDAÇÃO DE DEPENDÊNCIA (ITEM 4)
    // ==========================================
    function checkDependencyAndAlert(e, contextInputs) {
        // Serviços que contam como "Principal"
        const mainServicesKeys = ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'massas', 'crepe', 'hotdog', 'carts', 'popcornPremium', 'camaElastica'];
        const isMainSelected = mainServicesKeys.some(k => contextInputs[k] && contextInputs[k].checked);

        // Se clicar e não tiver principal, bloqueia e avisa
        if (!isMainSelected) {
            e.preventDefault();
            e.stopPropagation(); // Garante que não marque visualmente
            alert("🛑 Selecione um Principal: Para contratar este item adicional, você precisa selecionar primeiro um serviço principal (Buffet, Massas, Crepe ou Barraquinhas).");
            return; // Impede validações subsequentes
        }

        // Se passou, verifica a restrição específica de Salgados (apenas se for o addon de salgados)
        if (e.target.id === 'addon-savory' || e.target.id === 'modal-addon-savory') {
            checkSavoryRestriction(e, contextInputs);
        }
    }

    // NOVA VALIDAÇÃO ESTRITA PARA SALGADOS
    function checkSavoryRestriction(e, contextInputs) {
        // Serviços que JÁ INCLUEM salgados
        const servicesWithSavory = ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'crepe'];
        // Nota: Boteco não está nos inputs principais e Massas foi removido da restrição.

        const hasSavoryService = servicesWithSavory.some(k => contextInputs[k] && contextInputs[k].checked);

        if (hasSavoryService) {
            e.preventDefault();
            e.stopPropagation();
            e.target.checked = false;
            alert("🚫 Item Já Incluso: O pacote principal selecionado já inclui salgados à vontade! Por isso, o sistema não permite marcar este item para evitar duplicidade.\n\nCaso você queira contratar uma quantidade extra (ex: para viagem ou separar), feche o orçamento normalmente e combine esse detalhe extra diretamente com nosso consultor no WhatsApp.");
        }
    }

    // Adiciona Listeners no PRINCIPAL
    ['addonDrinks', 'addonSavory', 'addonGlass', 'addonCutlery', 'addonNutella'].forEach(key => {
        if (inputs[key]) {
            inputs[key].addEventListener('click', (e) => checkDependencyAndAlert(e, inputs));
        }
    });

    // Adiciona Listeners no MODAL


    // ==========================================
    // 📅 3. CALENDÁRIO COM VERMELHO E BLOQUEIO (ITENS 1 e 2)
    // ==========================================
    const calendarDays = getEl('calendar-days');
    const monthYear = getEl('month-year');
    let currentDate = new Date();

    async function renderCalendar() {
        if (!calendarDays || !monthYear) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        monthYear.textContent = `${monthNames[month]} ${year}`;

        // Função interna para desenhar os dias
        const drawDays = (fullDays = []) => {
            calendarDays.innerHTML = "";
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDay = firstDay.getDay();
            const today = new Date();

            // Dias vazios do inicio
            for (let i = 0; i < startingDay; i++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.classList.add('calendar-day', 'empty');
                calendarDays.appendChild(emptyDiv);
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('calendar-day');
                dayDiv.textContent = i;

                const thisDate = new Date(year, month, i);
                const isPast = thisDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0);

                // ITEM 2: Bloqueia passado
                if (isPast) {
                    dayDiv.classList.add('past');
                }
                // ITEM 1: Bloqueia dias cheios (Vermelho)
                else if (fullDays.includes(i)) {
                    dayDiv.classList.add('full');
                    dayDiv.title = "Dia Lotado";
                }
                else {
                    // Clique só funciona se não for passado nem cheio
                    dayDiv.addEventListener('click', () => {
                        // Validação de 3 dias de antecedência
                        const todayForCheck = new Date();
                        todayForCheck.setHours(0, 0, 0, 0);

                        const minDate = new Date(todayForCheck);
                        minDate.setDate(todayForCheck.getDate() + 3);

                        if (thisDate < minDate) {
                            alert("📅 Antecedência Mínima: Aceitamos reservas apenas com no mínimo 3 dias de antecedência para garantir a qualidade do serviço.");
                            return; // Impede abrir o modal
                        }

                        openBookingModal(thisDate);
                    });
                }

                calendarDays.appendChild(dayDiv);
            }
        };

        // 1. Renderiza IMEDIATAMENTE (sem esperar backend)
        drawDays([]);

        // 2. Busca disponibilidade em segundo plano
        try {
            const res = await fetch(`https://claras-buffet-backend.onrender.com/api/month-availability?month=${month}&year=${year}`);
            const data = await res.json();
            const fullDays = data.fullDays || [];

            // Só atualiza se o usuário ainda estiver no mesmo mês/ano
            if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                drawDays(fullDays);
            }
        } catch (e) {
            console.error("Erro ao buscar disponibilidade", e);
        }
    }

    // Navegação Mês
    getEl('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    getEl('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });


    // ==========================================
    // ⏰ VALIDAÇÃO DE HORÁRIO PASSADO (ITEM 2)
    // ==========================================
    function validateTime() {
        const timeInput = getEl('event-time');
        const selectedDate = window.currentSelectedDateObj; // Definido no openBookingModal

        if (!timeInput || !selectedDate) return;

        const now = new Date();
        const [h, m] = timeInput.value.split(':').map(Number);

        // Se a data selecionada for HOJE
        if (selectedDate.toDateString() === now.toDateString()) {
            const selectedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
            if (selectedTime < now) {
                alert("⚠️ Não é possível agendar um horário que já passou.");
                timeInput.value = ""; // Limpa o campo
                return;
            }
        }
        calculateEndTime(); // Se passou, calcula o fim
    }

    // Calcula fim baseado na duração
    function calculateEndTime() {
        const startInput = getEl('event-time');
        const endInput = getEl('event-end-time');
        if (!startInput || !endInput) return;

        const startTime = startInput.value;
        if (!startTime) return;

        const [hours, minutes] = startTime.split(':').map(Number);
        const duration = (globalGuests <= 30) ? 3 : 4;

        let endHours = hours + duration;
        let endMinutes = minutes;

        if (endHours >= 24) endHours -= 24; // Ajuste simples para virada de dia

        const formattedEnd =
            String(endHours).padStart(2, '0') + ':' +
            String(endMinutes).padStart(2, '0');

        endInput.value = formattedEnd;
    }


    // ==========================================
    // 🚀 ENVIO E MODAL
    // ==========================================

    const modal = getEl('booking-modal');
    const closeBtn = getEl('close-booking-modal');

    // Abre Modal
    function openBookingModal(date) {
        if (!modal) return;
        window.currentSelectedDateObj = date; // Guarda data objeto globalmente

        const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

        getEl('selected-date-display').textContent = dateStr;
        getEl('selected-date-iso').value = isoDate;

        modal.style.display = 'block';

        // 🔄 SINCRONIZAÇÃO: Orçamento -> Modal
        const mainGuests = getEl('guests').value;
        if (mainGuests && getEl('modal-guests')) {
            getEl('modal-guests').value = mainGuests;
            // Dispara evento para liberar checkboxes do modal
            const event = new Event('input');
            getEl('modal-guests').dispatchEvent(event);
        }

        // Mapeamento de IDs do Orçamento para o Modal
        const syncMap = {
            'service-buffet-essencial': 'modal-service-buffet-essencial',
            'service-buffet-especial': 'modal-service-buffet-especial',
            'service-buffet-premium': 'modal-service-buffet-premium',
            'service-massas': 'modal-service-massas',
            'service-crepe': 'modal-service-crepe',
            'service-hotdog': 'modal-service-hotdog',
            'service-carts': 'modal-service-carts',
            'service-popcorn-premium': 'modal-service-popcorn-premium',
            'service-cama-elastica': 'modal-service-cama-elastica',
            'addon-drinks': 'modal-addon-drinks',
            'addon-savory': 'modal-addon-savory',
            'addon-glass': 'modal-addon-glass',
            'addon-cutlery': 'modal-addon-cutlery',
            'addon-nutella': 'modal-addon-nutella'
        };

        // Copia estado checked
        Object.keys(syncMap).forEach(sourceId => {
            const source = getEl(sourceId);
            const target = getEl(syncMap[sourceId]);
            if (source && target && !target.disabled) {
                target.checked = source.checked;
            }
        });

        // Atualiza estado visual dependente (ex: Nutella Container)
        updateModalState();

        // Reseta passos
        if (getEl('booking-step-1')) getEl('booking-step-1').style.display = 'block';
        if (getEl('booking-step-2')) getEl('booking-step-2').style.display = 'none';

        // Atualiza total do modal logo de cara
        calculateModalTotal();
    }

    // Fecha Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Fecha clicando fora
    window.addEventListener('click', (e) => {
        if (e.target == modal) modal.style.display = 'none';
    });

    // Botão Principal "Solicitar Reserva" (apenas rola para calendário)
    getEl('btn-goto-booking')?.addEventListener('click', function () {
        document.getElementById('custom-booking').scrollIntoView({ behavior: 'smooth' });
    });


    // Lógica do Modal (Cópia simplificada da lógica principal para reatividade dentro do modal)
    // Para simplificar, vamos assumir que o usuário deve preencher convidados no modal para liberar checkboxes
    const modalGuestsInput = getEl('modal-guests');
    const modalInputs = {
        // Mapeie os IDs do modal aqui
        buffetEssencial: getEl('modal-service-buffet-essencial'),
        buffetEspecial: getEl('modal-service-buffet-especial'),
        buffetPremium: getEl('modal-service-buffet-premium'),
        massas: getEl('modal-service-massas'),
        crepe: getEl('modal-service-crepe'),
        hotdog: getEl('modal-service-hotdog'),
        carts: getEl('modal-service-carts'),
        popcornPremium: getEl('modal-service-popcorn-premium'),
        camaElastica: getEl('modal-service-cama-elastica'),
        addonDrinks: getEl('modal-addon-drinks'),
        addonSavory: getEl('modal-addon-savory'),
        addonGlass: getEl('modal-addon-glass'),
        addonCutlery: getEl('modal-addon-cutlery'),
        addonNutella: getEl('modal-addon-nutella'),
        containerNutella: getEl('modal-container-addon-nutella')
    };

    // Adiciona Listeners no MODAL (Movidode cima para evitar ReferenceError)
    ['addonDrinks', 'addonSavory', 'addonGlass', 'addonCutlery', 'addonNutella'].forEach(key => {
        if (modalInputs[key]) {
            modalInputs[key].addEventListener('click', (e) => checkDependencyAndAlert(e, modalInputs));
        }
    });

    function updateModalState() {
        const guests = parseInt(modalGuestsInput.value) || 0;
        const warning = getEl('modal-guest-warning');

        if (guests < 10) {
            if (warning) warning.style.display = 'block';
            Object.values(modalInputs).forEach(el => {
                if (el) el.disabled = true;
            });
            return;
        } else {
            if (warning) warning.style.display = 'none';
            // Libera principais e alugueis
            ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'massas', 'crepe', 'hotdog', 'carts', 'popcornPremium', 'camaElastica'].forEach(k => {
                if (modalInputs[k]) modalInputs[k].disabled = false;
            });
        }

        // Lógica de Adicionais no Modal (Item 6)
        const mainServices = [
            modalInputs.buffetEssencial, modalInputs.buffetEspecial, modalInputs.buffetPremium,
            modalInputs.massas, modalInputs.crepe,
            modalInputs.hotdog, modalInputs.carts, modalInputs.popcornPremium, modalInputs.camaElastica
        ];
        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);

        ['addonDrinks', 'addonSavory', 'addonGlass', 'addonCutlery', 'addonNutella'].forEach(k => {
            if (modalInputs[k]) {
                // Lógica de alerta ao clicar agora
                // modalInputs[k].disabled = !isMainOrRentalSelected; // REMOVIDO
                if (!isMainOrRentalSelected) modalInputs[k].checked = false;
            }
        });

        // Item 7 (Massas bloqueia pratos)
        if (modalInputs.massas && modalInputs.massas.checked) {
            if (modalInputs.addonCutlery) {
                modalInputs.addonCutlery.checked = false;
                modalInputs.addonCutlery.disabled = true;
            }
        }

        // Nutella
        if (modalInputs.popcornPremium && modalInputs.containerNutella) {
            const show = modalInputs.popcornPremium.checked;
            modalInputs.containerNutella.style.display = show ? 'block' : 'none'; // block pq esta dentro de div
            if (!show && modalInputs.addonNutella) modalInputs.addonNutella.checked = false;
        }

        calculateModalTotal();
    }

    function calculateModalTotal() {
        let total = 0;
        let guests = parseInt(modalGuestsInput?.value) || 0;
        let isOverflow = false;

        const getTierPrice = (serviceKey) => {
            const config = PRICES.buffet[serviceKey];
            return (guests <= config.threshold) ? config.tier1 : config.tier2;
        };

        if (modalInputs.buffetEssencial?.checked) total += guests * getTierPrice('essencial');
        if (modalInputs.buffetEspecial?.checked) total += guests * getTierPrice('especial');
        if (modalInputs.buffetPremium?.checked) total += guests * getTierPrice('premium');
        if (modalInputs.massas?.checked) total += guests * PRICES.services.massas;
        if (modalInputs.crepe?.checked) total += guests * PRICES.services.crepe;

        if (modalInputs.popcornPremium?.checked) total += PRICES.services.popcorn_premium;
        if (modalInputs.camaElastica?.checked) total += PRICES.cama_elastica;

        if (modalInputs.hotdog?.checked) {
            if (guests > 80) isOverflow = true;
            else total += PRICES.services.hotdog;
        }
        if (modalInputs.carts?.checked) {
            if (guests > 100) isOverflow = true;
            else total += PRICES.services.carts;
        }

        if (modalInputs.addonDrinks?.checked) total += guests * PRICES.addons.drinks;
        if (modalInputs.addonSavory?.checked) total += guests * PRICES.addons.savory;
        if (modalInputs.addonGlass?.checked) total += guests * PRICES.addons.glass;
        if (modalInputs.addonCutlery?.checked && !modalInputs.addonCutlery.disabled) total += guests * PRICES.addons.cutlery;
        if (modalInputs.popcornPremium?.checked && modalInputs.addonNutella?.checked) total += PRICES.addons.nutella;

        const display = getEl('modal-total-display');
        const btnReview = getEl('review-booking-btn');
        const btnWhats = getEl('modal-btn-whatsapp-fallback');

        if (display) {
            if (isOverflow) {
                display.textContent = "Sob Consulta";
                display.style.fontSize = "1.5em"; // Ajuste visual opcional
                if (btnReview) btnReview.style.display = 'none';
                if (btnWhats) btnWhats.style.display = 'block';
            } else {
                display.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                display.style.fontSize = "1.8em";
                if (btnReview) btnReview.style.display = 'block';
                if (btnWhats) btnWhats.style.display = 'none';
            }
        }
    }

    if (modalGuestsInput) modalGuestsInput.addEventListener('input', updateModalState);
    Object.values(modalInputs).forEach(el => {
        if (el) el.addEventListener('change', updateModalState);
    });

    // Review Button
    getEl('review-booking-btn')?.addEventListener('click', () => {
        // Coleta dados e mostra resumo
        const guests = getEl('modal-guests').value;
        const name = getEl('client-name').value;
        const time = getEl('event-time').value;
        if (!guests || !name || !time) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        const selectedServices = [];
        // Helper para checar checkbox do modal
        const check = (id, label) => {
            const el = document.getElementById(id);
            if (el && el.checked) selectedServices.push(label);
        };

        check('modal-service-buffet-essencial', 'Buffet Essencial');
        check('modal-service-buffet-especial', 'Buffet Especial');
        check('modal-service-buffet-premium', 'Buffet Premium');
        check('modal-service-massas', 'Buffet de Massas');
        check('modal-service-crepe', 'Estação de Crepe');
        check('modal-service-hotdog', 'Barraquinha Hot Dog');
        check('modal-service-carts', 'Carrinho Pipoca/Algodão');
        check('modal-service-popcorn-premium', 'Pipoca Gourmet');
        check('modal-service-cama-elastica', 'Cama Elástica');

        check('modal-addon-drinks', 'Bebidas');
        check('modal-addon-savory', 'Salgados + Churros');
        check('modal-addon-glass', 'Copos de Vidro');
        check('modal-addon-cutlery', 'Pratos/Talheres');
        check('modal-addon-nutella', 'Calda de Nutella');

        const summaryHtml = `
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Data:</strong> ${getEl('selected-date-display').textContent}</p>
            <p><strong>Horário:</strong> ${time} às ${getEl('event-end-time').value}</p>
            <p><strong>Local:</strong> ${getEl('event-location').value}</p>
            <p><strong>Convidados:</strong> ${guests}</p>
            <p><strong>Serviços:</strong> ${selectedServices.join(', ') || 'Nenhum'}</p>
            <p><strong>Total Estimado:</strong> ${getEl('modal-total-display').textContent}</p>
        `;

        getEl('summary-content').innerHTML = summaryHtml;
        getEl('booking-step-1').style.display = 'none';
        getEl('booking-step-2').style.display = 'block';
    });

    getEl('back-booking-btn')?.addEventListener('click', () => {
        getEl('booking-step-1').style.display = 'block';
        getEl('booking-step-2').style.display = 'none';
    });


    // ENVIO DO FORMULÁRIO (ITEM 3: Verificação Backend)
    const bookingForm = getEl('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Verificando disponibilidade...";

            // Coleta dados manualmente para montar objeto ou FormData
            const formData = new FormData();
            formData.append('clientName', getEl('client-name').value);
            formData.append('selectedDateISO', getEl('selected-date-iso').value);
            formData.append('eventTime', getEl('event-time').value);
            formData.append('eventDuration', (parseInt(getEl('modal-guests').value) <= 30 ? 3 : 4));
            formData.append('guests', getEl('modal-guests').value);
            formData.append('eventLocation', getEl('event-location').value);
            formData.append('total', getEl('modal-total-display').textContent);

            // Recoleta serviços para string
            const selectedServices = [];
            const check = (id, label) => {
                const el = document.getElementById(id);
                if (el && el.checked) selectedServices.push(label);
            };
            check('modal-service-buffet-essencial', 'Buffet Essencial');
            check('modal-service-buffet-especial', 'Buffet Especial');
            check('modal-service-buffet-premium', 'Buffet Premium');
            check('modal-service-massas', 'Buffet de Massas');
            check('modal-service-crepe', 'Estação de Crepe');
            check('modal-service-hotdog', 'Barraquinha Hot Dog');
            check('modal-service-carts', 'Carrinho Pipoca/Algodão');
            check('modal-service-popcorn-premium', 'Pipoca Gourmet');
            check('modal-service-cama-elastica', 'Cama Elástica');
            check('modal-addon-drinks', 'Bebidas');
            check('modal-addon-savory', 'Salgados + Churros');
            check('modal-addon-glass', 'Copos de Vidro');
            check('modal-addon-cutlery', 'Pratos/Talheres');
            check('modal-addon-nutella', 'Calda de Nutella');

            formData.append('services', selectedServices.join(', '));

            try {
                // Tenta agendar no backend (que vai verificar se pode)
                // CORRIGIDO: Link do Render e removido o "});" extra
                const res = await fetch("https://claras-buffet-backend.onrender.com/api/schedule", {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();

                if (data.status === 'error') {
                    // TRATAMENTO DE ERRO INTELIGENTE
                    const errorMsg = data.message.toLowerCase();
                    let warningText = "⚠️ " + data.message;
                    let removedItems = [];

                    // Voltar para tela de seleção
                    getEl('booking-step-1').style.display = 'block';
                    getEl('booking-step-2').style.display = 'none';

                    if (errorMsg.includes('lotado para festas principais') || errorMsg.includes('principais')) {
                        // Desmarca serviços principais
                        ['modal-service-buffet-essencial', 'modal-service-buffet-especial', 'modal-service-buffet-premium', 'modal-service-massas', 'modal-service-crepe'].forEach(id => {
                            const el = getEl(id);
                            if (el && el.checked) {
                                el.checked = false;
                                removedItems.push('Um ou mais serviços principais');
                            }
                        });
                        warningText += "\n\nRemovemos os serviços principais conflitantes. Você pode selecionar serviços de aluguel ou tentar outra data.";
                    }
                    else if (errorMsg.includes('lotado para alugueis') || errorMsg.includes('reservado')) {
                        // Desmarca alugueis
                        ['modal-service-hotdog', 'modal-service-carts', 'modal-service-popcorn-premium', 'modal-service-cama-elastica'].forEach(id => {
                            const el = getEl(id);
                            if (el && el.checked) {
                                el.checked = false;
                                removedItems.push('Um ou mais serviços de aluguel');
                            }
                        });
                        warningText += "\n\nRemovemos os itens de aluguel conflitantes para esse horário.";
                    }

                    alert(warningText);
                    calculateModalTotal(); // Recalcula total sem os itens removidos

                    btn.disabled = false;
                    btn.textContent = originalText;
                } else {
                    // Sucesso! Redireciona WhatsApp
                    const msg = `*Novo Agendamento*\n\n*Cliente:* ${getEl('client-name').value}\n*Data:* ${getEl('selected-date-display').textContent}\n*Horário:* ${getEl('event-time').value}\n*Local:* ${getEl('event-location').value}\n*Convidados:* ${getEl('modal-guests').value}\n*Serviços:* ${selectedServices.join(', ')}\n*Total Estimado:* ${getEl('modal-total-display').textContent}\n\n_Aguardo confirmação do contrato._`;
                    const encodedMsg = encodeURIComponent(msg);
                    window.open(`https://api.whatsapp.com/send?phone=5561982605050&text=${encodedMsg}`, '_blank');

                    modal.style.display = 'none';
                    // Reset form...
                    alert("Pré-reserva enviada! Verifique seu WhatsApp.");
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao conectar com servidor. Tente novamente.");
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Inicialização
    updateAddonsState();
    calculateTotal();
    renderCalendar();

    getEl('event-time')?.addEventListener('change', validateTime);

    // ==========================================
    // 🎨 4. LÓGICA DE UI (RECUPERADA)
    // ==========================================

    // --- CARROSSEL DE DEPOIMENTOS ---
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(track ? track.children : []);
    const nextButton = document.querySelector('.next-btn');
    const prevButton = document.querySelector('.prev-btn');
    const dotsNav = document.querySelector('.carousel-dots');

    if (track && slides.length > 0) {
        // Criar bolinhas
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dotsNav.appendChild(dot);

            dot.addEventListener('click', () => {
                moveToSlide(index);
            });
        });

        const dots = Array.from(dotsNav.children);
        let currentSlideIndex = 0;

        function moveToSlide(targetIndex) {
            // Loop Infinito
            if (targetIndex < 0) targetIndex = slides.length - 1;
            if (targetIndex >= slides.length) targetIndex = 0;

            const currentSlide = slides[currentSlideIndex];
            const targetSlide = slides[targetIndex];

            currentSlide.classList.remove('active');
            targetSlide.classList.add('active');

            // Atualiza Dots
            dots[currentSlideIndex].classList.remove('active');
            dots[targetIndex].classList.add('active');

            // Move Track (Assumindo CSS de transform se necessário, mas o CSS original usa display: none/flex com active. 
            // O código CSS mostra .carousel-track com display: flex e transition transform, e slide min-width 100%.
            // Vamos usar translateX para corresponder ao CSS .carousel-track)
            const slideWidth = slides[0].getBoundingClientRect().width;
            track.style.transform = 'translateX(-' + (slideWidth * targetIndex) + 'px)';

            currentSlideIndex = targetIndex;
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                moveToSlide(currentSlideIndex + 1);
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                moveToSlide(currentSlideIndex - 1);
            });
        }

        // Auto Play
        setInterval(() => {
            moveToSlide(currentSlideIndex + 1);
        }, 5000);

        // Ajuste de resize
        window.addEventListener('resize', () => {
            const slideWidth = slides[0].getBoundingClientRect().width;
            track.style.transform = 'translateX(-' + (slideWidth * currentSlideIndex) + 'px)';
        });
    }

    // --- MENU MOBILE ---
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.main-nav');
    const header = document.querySelector('header');

    if (mobileBtn && nav) {
        mobileBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            if (header) header.classList.toggle('menu-open');

            // Ícone
            const icon = mobileBtn.querySelector('i');
            if (icon) {
                if (nav.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Fechar ao clicar em link
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                if (header) header.classList.remove('menu-open');
                const icon = mobileBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });

        // Dropdown Mobile (Accordion)
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(drop => {
            const btn = drop.querySelector('.dropbtn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    // Se for mobile (checar largura ou se nav tem active/estilo mobile)
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        drop.classList.toggle('active'); // O CSS deve ter .dropdown.active .dropdown-content {display:block}
                        // Se não tiver, precisamos adicionar inline ou garantir CSS
                        const content = drop.querySelector('.dropdown-content');
                        if (content) {
                            content.style.position = (content.style.position === 'static') ? 'absolute' : 'static'; // Truque comum
                            content.style.display = (content.style.display === 'block') ? 'none' : 'block';
                        }
                    }
                });
            }
        });
    }

    // --- HEADER SCROLL ---
    window.addEventListener('scroll', () => {
        if (header) {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });

});