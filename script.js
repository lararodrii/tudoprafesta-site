document.addEventListener('DOMContentLoaded', function () {

    const getEl = (id) => document.getElementById(id);

    function checkIfWeekendOrHoliday(dateObj) {
        if (!dateObj) return false;
        const day = dateObj.getDay();
        if (day === 0 || day === 5 || day === 6) return true;

        const holidays = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'];
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return holidays.includes(`${m}-${d}`);
    }

    function getMinBookingDate2026() {
        let minDate = new Date();
        minDate.setHours(0, 0, 0, 0);
        minDate.setDate(minDate.getDate() + 3);
        return minDate;
    }

    function checkDate2026(dayVal, monthVal) {
        if (!dayVal || !monthVal) return null;
        let d = parseInt(dayVal);
        let m = parseInt(monthVal);

        let adjusted = false;
        let adjustMsg = "";

        if (m === 2 && d > 28) {
            d = 28;
            adjusted = true;
            adjustMsg = "⚠️ Fevereiro de 2026 tem apenas 28 dias. Ajustamos a data para você.";
        } else {
            const months30 = [4, 6, 9, 11];
            if (months30.includes(m) && d > 30) {
                d = 30;
                adjusted = true;
                adjustMsg = "⚠️ Este mês tem apenas 30 dias. Ajustamos a data para você.";
            }
        }

        const dateObj = new Date(`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00`);
        dateObj.setHours(0, 0, 0, 0);

        const minDate = getMinBookingDate2026();
        const isValid = dateObj.getTime() >= minDate.getTime();

        return {
            day: String(d).padStart(2, '0'),
            month: String(m).padStart(2, '0'),
            adjusted,
            adjustMsg,
            isValid,
            dateObj,
            minDate
        };
    }

    // ==========================================
    // 🔔 0. MODAL DE ALERTA CUSTOMIZADO
    // ==========================================
    window.showCustomAlert = function (message) {
        let alertModal = document.getElementById('custom-alert-modal');
        if (!alertModal) {
            alertModal = document.createElement('div');
            alertModal.id = 'custom-alert-modal';
            alertModal.className = 'custom-alert-modal';

            const modalContent = document.createElement('div');
            modalContent.className = 'custom-alert-content';

            const messageElement = document.createElement('p');
            messageElement.id = 'custom-alert-message';
            // Allow HTML inside the alert as some warnings had HTML in strings originally, though alert() doesn't parse it.
            // Wait, alert() doesn't parse HTML, so just use textContent to be safe.

            const okButton = document.createElement('button');
            okButton.className = 'btn-gold custom-alert-ok-btn';
            okButton.style.marginTop = '20px';
            okButton.textContent = 'OK';
            okButton.onclick = () => {
                alertModal.style.display = 'none';
            };

            modalContent.appendChild(messageElement);
            modalContent.appendChild(okButton);
            alertModal.appendChild(modalContent);
            document.body.appendChild(alertModal);
        }

        const msgBox = document.getElementById('custom-alert-message');
        const okBtn = alertModal.querySelector('.custom-alert-ok-btn');
        msgBox.innerHTML = message.replace(/\n/g, '<br>');

        if (message.includes('✅')) {
            okBtn.style.setProperty('background-color', '#25D366', 'important');
            okBtn.style.setProperty('border-color', '#25D366', 'important');
            okBtn.style.setProperty('color', '#ffffff', 'important');
        } else {
            okBtn.style.removeProperty('background-color');
            okBtn.style.removeProperty('border-color');
            okBtn.style.removeProperty('color');
        }

        alertModal.style.display = 'flex';
    };

    const showCustomAlert = window.showCustomAlert;    // ==========================================
    // ⚙️ 1. CONFIGURAÇÕES E PREÇOS
    // ==========================================
    const PRICES = {
        buffet: {
            essencial: {
                weekday: { tier1: 42.00, tier2: 37.00, threshold: 49 },
                weekend: { tier1: 47.00, tier2: 44.00, threshold: 49 }
            },
            especial: {
                weekday: { tier1: 60.00, tier2: 55.00, threshold: 49 },
                weekend: { tier1: 65.00, tier2: 62.00, threshold: 49 }
            },
            premium: {
                weekday: { tier1: 70.00, tier2: 65.00, threshold: 49 },
                weekend: { tier1: 75.00, tier2: 72.00, threshold: 49 }
            }
        },
        services: {
            massas: 39.99,
            crepe: 38.90,
            crepe_premium: 46.90,
            festbar: 40.00,
            hotdog: 750.00,
            carts: 300.00,
            popcorn_premium: 600.00
        },
        addons: {
            drinks: 9.90,
            savory: 8.90,
            cone_descartavel: 1.50,
            prato_descartavel: 1.50,
            copo_descartavel: 1.00,
            copeiro: 150.00,
            casquinha_queijo: 6.00,
            nutella: 120.00
        },
        cama_elastica: 250.00,
        chacara: {
            weekday: 1400.00,
            weekend: 1800.00
        }
    };

    let globalGuests = 50;

    const inputs = {
        buffetEssencial: getEl('service-buffet-essencial'),
        buffetEspecial: getEl('service-buffet-especial'),
        buffetPremium: getEl('service-buffet-premium'),
        massas: getEl('service-massas'),
        crepe: getEl('service-crepe'),
        crepePremium: getEl('service-crepe-premium'),
        hotdog: getEl('service-hotdog'),
        festbar: getEl('service-festbar'),
        carts: getEl('service-carts'),
        popcornPremium: getEl('service-popcorn-premium'),
        camaElastica: getEl('service-cama-elastica'),
        addonDrinks: getEl('addon-drinks'),
        addonSavory: getEl('addon-savory'),
        addonConeDescartavel: getEl('addon-cone-descartavel'),
        addonPratoDescartavel: getEl('addon-prato-descartavel'),
        addonCopoDescartavel: getEl('addon-copo-descartavel'),
        addonCasquinha: getEl('addon-casquinha'),
        addonCopeiro: getEl('addon-copeiro'),
        addonNutella: getEl('addon-nutella'),
        containerNutella: getEl('container-addon-nutella')
    };

    const guestsInput = getEl('guests');
    const totalPriceElement = getEl('total-price');
    const dynamicWarnings = getEl('dynamic-warnings');

    // ==========================================
    // 🧮 2. LÓGICA DE CONTROLE E DEPENDÊNCIAS
    // ==========================================
    function updateAddonsState() {
        const mainServices = [
            inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium,
            inputs.massas, inputs.crepe, inputs.crepePremium, inputs.hotdog, inputs.festbar,
            inputs.carts, inputs.popcornPremium, inputs.camaElastica
        ];

        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);
        const addons = [inputs.addonDrinks, inputs.addonSavory, inputs.addonConeDescartavel, inputs.addonPratoDescartavel, inputs.addonCopoDescartavel, inputs.addonCasquinha, inputs.addonCopeiro, inputs.addonNutella];

        addons.forEach(addon => {
            if (addon) {
                addon.disabled = false;
                if (!isMainOrRentalSelected) addon.checked = false;
            }
        });

        if (inputs.addonCasquinha) {
            inputs.addonCasquinha.disabled = !(inputs.crepe?.checked || inputs.crepePremium?.checked);
            if (inputs.addonCasquinha.disabled) {
                inputs.addonCasquinha.checked = false;
            }
        }

        let guests = parseInt(guestsInput?.value) || 0;
        let qtdCopeiros = Math.ceil(guests / 100);

        if (inputs.popcornPremium && inputs.containerNutella) {
            const showNutella = inputs.popcornPremium.checked;
            inputs.containerNutella.style.display = showNutella ? 'flex' : 'none';
            if (!showNutella && inputs.addonNutella) inputs.addonNutella.checked = false;
        }

        calculateTotal();
    }

    function calculateTotal() {
        let total = 0;
        let guests = parseInt(guestsInput?.value) || 0;
        if (guests < 0) guests = 0;

        let warnings = [];
        let isOverflow = false;

        let dateType = 'weekend';
        const calcDayEl = getEl('calc-day');
        const calcMonthEl = getEl('calc-month');

        if (calcDayEl && calcMonthEl && calcDayEl.value && calcMonthEl.value) {
            const dateObj = new Date(`2026-${calcMonthEl.value}-${calcDayEl.value}T12:00:00`);
            dateType = checkIfWeekendOrHoliday(dateObj) ? 'weekend' : 'weekday';
        }
        const isChacara = getEl('calc-location-chacara') && getEl('calc-location-chacara').checked;

        const getTierPrice = (serviceKey) => {
            const config = PRICES.buffet[serviceKey][dateType];
            return (guests <= config.threshold) ? config.tier1 : config.tier2;
        };

        if (inputs.buffetEssencial?.checked) total += guests * getTierPrice('essencial');
        if (inputs.buffetEspecial?.checked) total += guests * getTierPrice('especial');
        if (inputs.buffetPremium?.checked) total += guests * getTierPrice('premium');
        if (inputs.massas?.checked) total += guests * PRICES.services.massas;
        if (inputs.crepe?.checked) total += guests * PRICES.services.crepe;
        if (inputs.crepePremium?.checked) total += guests * PRICES.services.crepe_premium;
        if (inputs.festbar?.checked) total += guests * PRICES.services.festbar;
        if (inputs.popcornPremium?.checked) total += PRICES.services.popcorn_premium;
        if (inputs.camaElastica?.checked) total += PRICES.cama_elastica;
        if (isChacara) total += PRICES.chacara[dateType];

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

        if (inputs.addonDrinks?.checked) total += guests * PRICES.addons.drinks;
        if (inputs.addonSavory?.checked) total += guests * PRICES.addons.savory;
        if (inputs.addonConeDescartavel?.checked) total += guests * PRICES.addons.cone_descartavel;
        if (inputs.addonPratoDescartavel?.checked) total += guests * PRICES.addons.prato_descartavel;
        if (inputs.addonCopoDescartavel?.checked) total += guests * PRICES.addons.copo_descartavel;
        if (inputs.addonCasquinha?.checked) total += guests * PRICES.addons.casquinha_queijo;
        
        let qtdCopeiros = Math.ceil(guests / 100);
        if (inputs.addonCopeiro?.checked) total += qtdCopeiros * PRICES.addons.copeiro;
        
        const hasBuffetOuMassa = (inputs.buffetEssencial?.checked || inputs.buffetEspecial?.checked || inputs.buffetPremium?.checked || inputs.massas?.checked);
        const hasCrepe = inputs.crepe?.checked || inputs.crepePremium?.checked;
        const hasAnyMainService = hasBuffetOuMassa || hasCrepe;

        if (hasAnyMainService && !inputs.addonCopeiro?.checked) {
            warnings.push('<span style="color:#f39c12; font-weight:bold;">⚠️ Aviso: O serviço de copeiro é opcional, mas altamente recomendável, pois sem a contratação desse profissional não haverá reposição de pratos, talheres e copos durante o evento.</span>');
        }

        if (inputs.popcornPremium?.checked && inputs.addonNutella?.checked) total += PRICES.addons.nutella;

        globalGuests = guests;

        if (totalPriceElement) {
            const btnBooking = getEl('btn-goto-booking');
            const btnWhats = getEl('btn-whatsapp-fallback');

            if (isOverflow) {
                totalPriceElement.textContent = "Sob Consulta";
                if (btnBooking) btnBooking.style.display = 'none';
                if (btnWhats) {
                    btnWhats.style.display = 'block';

                    const selectedServices = [];
                    if (inputs.buffetEssencial?.checked) selectedServices.push('Buffet Essencial');
                    if (inputs.buffetEspecial?.checked) selectedServices.push('Buffet Especial');
                    if (inputs.buffetPremium?.checked) selectedServices.push('Buffet Premium');
                    if (inputs.massas?.checked) selectedServices.push('Estação de Massas');
                    if (inputs.crepe?.checked) selectedServices.push('Rodízio de Crepe');
                    if (inputs.crepePremium?.checked) selectedServices.push('Rodízio de Crepe Premium');
                    if (inputs.festbar?.checked) selectedServices.push('FestBar Drinks');
                    if (inputs.hotdog?.checked) selectedServices.push('Hot Dog Gourmet');
                    if (inputs.carts?.checked) selectedServices.push('Carrinho de Pipoca / Algodão');
                    if (inputs.popcornPremium?.checked) selectedServices.push('Carrinho Premium (Gourmet)');
                    if (inputs.camaElastica?.checked) selectedServices.push('Cama Elástica');

                    const d = calcDayEl && calcDayEl.value ? calcDayEl.value : '??';
                    const m = calcMonthEl && calcMonthEl.value ? calcMonthEl.value : '??';
                    const s = selectedServices.length > 0 ? selectedServices.join(', ') : 'Nenhum serviço base selecionado';

                    const msg = `*Orçamento Especial (Sob Consulta)*\n\n*Data:* ${d}/${m}/2026\n*Convidados:* ${guests}\n*Serviços:* ${s}\n\n_Gostaria de consultar as condições para este evento!_`;
                    btnWhats.href = 'https://api.whatsapp.com/send?phone=5561982605050&text=' + encodeURIComponent(msg);
                }
            } else {
                totalPriceElement.textContent = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (btnBooking) btnBooking.style.display = 'block';
                if (btnWhats) btnWhats.style.display = 'none';
            }
        }
        if (dynamicWarnings) dynamicWarnings.innerHTML = warnings.join('<br>');
    }

    if (guestsInput) {
        guestsInput.addEventListener('change', () => {
            let guests = parseInt(guestsInput.value) || 0;
            if (guests < 25) {
                guestsInput.value = 25;
                showCustomAlert("⚠️ O número mínimo para realização de eventos é de 25 convidados.");
            }
            calculateTotal();
            updateAddonsState();
        });
    }
    Object.values(inputs).forEach(input => {
        if (input) input.addEventListener('change', updateAddonsState);
    });

    const calcDayInput = getEl('calc-day');
    const calcMonthInput = getEl('calc-month');

    if (calcDayInput && calcMonthInput && !calcDayInput.value && !calcMonthInput.value) {
        const initialDate = getMinBookingDate2026();
        calcDayInput.value = String(initialDate.getDate()).padStart(2, '0');
        calcMonthInput.value = String(initialDate.getMonth() + 1).padStart(2, '0');
    }

    // ---- CUSTOM SELECTS LOGIC ----
    function initializeCustomSelect(selectId, wrapperId, triggerId, optionsId) {
        const selectEl = getEl(selectId);
        const wrapperEl = getEl(wrapperId);
        const triggerEl = getEl(triggerId);
        const optionsContainer = getEl(optionsId);

        if (!selectEl || !wrapperEl || !triggerEl || !optionsContainer) return;

        optionsContainer.innerHTML = '';

        Array.from(selectEl.options).forEach(option => {
            if (option.disabled && option.value === "") {
                if (!selectEl.value) triggerEl.textContent = option.text;
                return;
            }
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.textContent = option.text;
            customOption.dataset.value = option.value;

            if (selectEl.value === option.value) {
                triggerEl.textContent = option.text;
                customOption.classList.add('selected');
            }

            customOption.addEventListener('click', function (e) {
                e.stopPropagation();
                triggerEl.textContent = this.textContent;
                selectEl.value = this.dataset.value;

                Array.from(optionsContainer.children).forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');

                wrapperEl.classList.remove('open');

                selectEl.dispatchEvent(new Event('change'));
            });

            optionsContainer.appendChild(customOption);
        });

        triggerEl.addEventListener('click', function (e) {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(w => {
                if (w !== wrapperEl) w.classList.remove('open');
            });
            wrapperEl.classList.toggle('open');
        });
    }

    initializeCustomSelect('calc-day', 'custom-calc-day-wrapper', 'custom-calc-day-trigger', 'custom-calc-day-options');
    initializeCustomSelect('calc-month', 'custom-calc-month-wrapper', 'custom-calc-month-trigger', 'custom-calc-month-options');

    document.addEventListener('click', function () {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });

    function syncSelectVisuals() {
        ['calc-day', 'calc-month'].forEach(id => {
            const selectEl = getEl(id);
            const triggerEl = getEl(`custom-${id}-trigger`);
            const optionsContainer = getEl(`custom-${id}-options`);
            if (selectEl && triggerEl && optionsContainer) {
                const selectedOpt = Array.from(selectEl.options).find(opt => opt.value === selectEl.value);
                if (selectedOpt) {
                    triggerEl.textContent = selectedOpt.text;
                    Array.from(optionsContainer.children).forEach(opt => {
                        opt.classList.toggle('selected', opt.dataset.value === selectEl.value);
                    });
                } else {
                    triggerEl.textContent = selectEl.options[0].text;
                }
            }
        });
    }

    function validateCustomDate() {
        if (!calcDayInput || !calcMonthInput || !calcDayInput.value || !calcMonthInput.value) return;

        const check = checkDate2026(calcDayInput.value, calcMonthInput.value);
        if (!check) return;

        if (check.adjusted) {
            calcDayInput.value = check.day;
            calcMonthInput.value = check.month;
            syncSelectVisuals();
            showCustomAlert(check.adjustMsg);
        }

        if (!check.isValid) {
            showCustomAlert("⚠️ Precisamos de pelo menos 3 dias de antecedência para organizar sua festa!");
            calcDayInput.value = String(check.minDate.getDate()).padStart(2, '0');
            calcMonthInput.value = String(check.minDate.getMonth() + 1).padStart(2, '0');
            syncSelectVisuals();
        }
        calculateTotal();
    }

    calcDayInput?.addEventListener('change', validateCustomDate);
    calcMonthInput?.addEventListener('change', validateCustomDate);
    getEl('calc-location-proprio')?.addEventListener('change', () => { calculateTotal(); updateAddonsState(); });
    getEl('calc-location-chacara')?.addEventListener('change', () => { calculateTotal(); updateAddonsState(); });

    // Validar exclusividade de Buffets (Calculadora)
    const buffetInputs = [inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium];
    buffetInputs.forEach(buffet => {
        if (buffet) {
            buffet.addEventListener('click', function (e) {
                if (this.checked) {
                    const otherSelected = buffetInputs.find(b => b !== this && b.checked);
                    if (otherSelected) {
                        e.preventDefault();
                        this.checked = false;
                        showCustomAlert("⚠️ Atenção: Você só pode selecionar um tipo de Buffet Infantil por vez.");
                    }
                }
            });
        }
    });

    // Validar Limite de Serviços Principais (Máximo 2 por evento - Calculadora)
    const mainServiceInputs = [inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium, inputs.massas, inputs.crepe, inputs.crepePremium];
    mainServiceInputs.forEach(service => {
        if (service) {
            service.addEventListener('click', function (e) {
                if (this.checked) {
                    const selectedCount = mainServiceInputs.filter(s => s && s.checked).length;
                    if (selectedCount > 2) {
                        e.preventDefault();
                        this.checked = false;
                        showCustomAlert("🛑 Limite Excedido: Aceitamos no máximo 2 serviços principais por evento.");
                    }
                }
            });
        }
    });

    // Validar Exclusividade de Aluguéis (1 por evento - Calculadora)
    const rentalInputs = [inputs.hotdog, inputs.festbar, inputs.carts, inputs.popcornPremium];
    rentalInputs.forEach(rental => {
        if (rental) {
            rental.addEventListener('click', function (e) {
                if (this.checked) {
                    const isChacara = getEl('calc-location-chacara') && getEl('calc-location-chacara').checked;
                    const otherSelected = rentalInputs.filter(r => r !== this && r.checked);

                    if (otherSelected.length > 0) {
                        if (isChacara && otherSelected.length === 1 && (this === inputs.festbar || otherSelected[0] === inputs.festbar)) {
                            // Imunidade da Chácara: FestBar não bloqueia 1 Aluguel normal
                        } else {
                            e.preventDefault();
                            this.checked = false;
                            showCustomAlert("⚠️ Limite de Logística: Nossa equipe só consegue montar 1 (uma) estrutura de aluguel/barraquinha por evento. Por favor, escolha apenas uma opção.");
                        }
                    }
                }
            });
        }
    });

    function checkDependencyAndAlert(e, contextInputs) {
        const mainServicesKeys = ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'massas', 'crepe', 'crepePremium', 'hotdog', 'festbar', 'carts', 'popcornPremium', 'camaElastica'];
        const isMainSelected = mainServicesKeys.some(k => contextInputs[k] && contextInputs[k].checked);

        if (!isMainSelected) {
            e.preventDefault();
            e.stopPropagation();
            showCustomAlert("🛑 Selecione um Principal ou Aluguel primeiro para liberar este adicional.");
            return;
        }

        if (e.target.id === 'addon-savory' || e.target.id === 'modal-addon-savory') {
            checkSavoryRestriction(e, contextInputs);
        }
    }

    function checkSavoryRestriction(e, contextInputs) {
        const servicesWithSavory = ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'crepe', 'crepePremium'];
        const hasSavoryService = servicesWithSavory.some(k => contextInputs[k] && contextInputs[k].checked);

        if (hasSavoryService) {
            e.preventDefault();
            e.stopPropagation();
            e.target.checked = false;
            showCustomAlert("🚫 Item Já Incluso: O pacote principal selecionado já inclui salgados à vontade!");
        }
    }



    ['addonDrinks', 'addonSavory', 'addonConeDescartavel', 'addonPratoDescartavel', 'addonCopoDescartavel', 'addonCasquinha', 'addonCopeiro', 'addonNutella'].forEach(key => {
        if (inputs[key]) {
            inputs[key].addEventListener('click', (e) => checkDependencyAndAlert(e, inputs));
        }
    });

    // ==========================================
    // 📅 3. CALENDÁRIO COM VERMELHO E BLOQUEIO VISUAL
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

        const drawDays = (fullDays = []) => {
            calendarDays.innerHTML = "";
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDay = firstDay.getDay();

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

                const minDate = getMinBookingDate2026();
                const isBlockedDate = thisDate.getTime() < minDate.getTime();

                if (isBlockedDate) {
                    dayDiv.classList.add('past');
                    dayDiv.title = "Antecedência mínima de 3 dias requerida";
                }
                else if (fullDays.includes(i)) {
                    dayDiv.classList.add('full');
                    dayDiv.title = "Dia Lotado";
                }
                else {
                    dayDiv.addEventListener('click', () => {
                        openBookingModal(thisDate);
                    });
                }

                calendarDays.appendChild(dayDiv);
            }
        };

        drawDays([]);

        try {
            const res = await fetch(`https://claras-buffet-backend.onrender.com/api/month-availability?month=${month}&year=${year}`);
            const data = await res.json();
            const fullDays = data.fullDays || [];

            if (currentDate.getFullYear() === year && currentDate.getMonth() === month) {
                drawDays(fullDays);
            }
        } catch (e) {
            console.error("Erro ao buscar disponibilidade", e);
        }
    }

    getEl('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    getEl('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    function validateTime() {
        const timeInput = getEl('event-time');
        const selectedDate = window.currentSelectedDateObj;

        if (!timeInput || !selectedDate) return;

        const now = new Date();
        const [h, m] = timeInput.value.split(':').map(Number);

        if (selectedDate.toDateString() === now.toDateString()) {
            const selectedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
            if (selectedTime < now) {
                showCustomAlert("⚠️ Não é possível agendar um horário que já passou.");
                timeInput.value = "";
                return;
            }
        }
        calculateEndTime();
    }

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

        if (endHours >= 24) endHours -= 24;

        const formattedEnd = String(endHours).padStart(2, '0') + ':' + String(endMinutes).padStart(2, '0');
        endInput.value = formattedEnd;
    }

    // ==========================================
    // 🚀 ENVIO E MODAL
    // ==========================================
    const modal = getEl('booking-modal');
    const closeBtn = getEl('close-booking-modal');

    function openBookingModal(date) {
        if (!modal) return;

        const check = checkDate2026(date.getDate(), date.getMonth() + 1);
        if (check && !check.isValid) {
            showCustomAlert("⚠️ Precisamos de pelo menos 3 dias de antecedência para organizar sua festa!");
            return;
        }

        window.currentSelectedDateObj = date;

        const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

        getEl('selected-date-display').textContent = dateStr;
        getEl('selected-date-iso').value = isoDate;
        modal.style.display = 'block';

        // LIMPEZA DA UI AO ABRIR MODAL
        if (dynamicWarnings) dynamicWarnings.innerHTML = '';
        if (getEl('booking-disclaimer')) getEl('booking-disclaimer').checked = false;

        const mainGuests = getEl('guests').value;
        if (mainGuests && getEl('modal-guests')) {
            getEl('modal-guests').value = mainGuests;
            const event = new Event('input');
            getEl('modal-guests').dispatchEvent(event);
        }

        const syncMap = {
            'service-buffet-essencial': 'modal-service-buffet-essencial',
            'service-buffet-especial': 'modal-service-buffet-especial',
            'service-buffet-premium': 'modal-service-buffet-premium',
            'service-massas': 'modal-service-massas',
            'service-crepe': 'modal-service-crepe',
            'service-crepe-premium': 'modal-service-crepe-premium',
            'service-hotdog': 'modal-service-hotdog',
            'service-festbar': 'modal-service-festbar',
            'service-carts': 'modal-service-carts',
            'service-popcorn-premium': 'modal-service-popcorn-premium',
            'service-cama-elastica': 'modal-service-cama-elastica',
            'addon-drinks': 'modal-addon-drinks',
            'addon-savory': 'modal-addon-savory',
            'addon-cone-descartavel': 'modal-addon-cone-descartavel',
            'addon-prato-descartavel': 'modal-addon-prato-descartavel',
            'addon-copo-descartavel': 'modal-addon-copo-descartavel',
            'addon-casquinha': 'modal-addon-casquinha',
            'addon-copeiro': 'modal-addon-copeiro',
            'addon-nutella': 'modal-addon-nutella'
        };

        Object.keys(syncMap).forEach(sourceId => {
            const source = getEl(sourceId);
            const target = getEl(syncMap[sourceId]);
            if (source && target) {
                target.checked = source.checked;
            }
        });

        const calcChacara = getEl('calc-location-chacara');
        if (calcChacara && calcChacara.checked) {
            if (getEl('modal-location-chacara')) getEl('modal-location-chacara').checked = true;
        } else {
            if (getEl('modal-location-proprio')) getEl('modal-location-proprio').checked = true;
        }

        updateModalState();

        if (getEl('booking-step-1')) getEl('booking-step-1').style.display = 'block';
        if (getEl('booking-step-2')) getEl('booking-step-2').style.display = 'none';

        calculateModalTotal();
    }

    if (closeBtn) closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (dynamicWarnings) dynamicWarnings.innerHTML = '';
    });
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
            if (dynamicWarnings) dynamicWarnings.innerHTML = '';
        }
    });

    getEl('btn-goto-booking')?.addEventListener('click', function () {
        const calcDayValue = getEl('calc-day')?.value;
        const calcMonthValue = getEl('calc-month')?.value;
        let dateToPass = new Date();
        if (calcDayValue && calcMonthValue) {
            dateToPass = new Date(`2026-${calcMonthValue}-${calcDayValue}T12:00:00`);
        }
        openBookingModal(dateToPass);
    });

    const modalGuestsInput = getEl('modal-guests');
    const modalInputs = {
        buffetEssencial: getEl('modal-service-buffet-essencial'),
        buffetEspecial: getEl('modal-service-buffet-especial'),
        buffetPremium: getEl('modal-service-buffet-premium'),
        massas: getEl('modal-service-massas'),
        crepe: getEl('modal-service-crepe'),
        crepePremium: getEl('modal-service-crepe-premium'),
        hotdog: getEl('modal-service-hotdog'),
        festbar: getEl('modal-service-festbar'),
        carts: getEl('modal-service-carts'),
        popcornPremium: getEl('modal-service-popcorn-premium'),
        camaElastica: getEl('modal-service-cama-elastica'),
        addonDrinks: getEl('modal-addon-drinks'),
        addonSavory: getEl('modal-addon-savory'),
        addonConeDescartavel: getEl('modal-addon-cone-descartavel'),
        addonPratoDescartavel: getEl('modal-addon-prato-descartavel'),
        addonCopoDescartavel: getEl('modal-addon-copo-descartavel'),
        addonCasquinha: getEl('modal-addon-casquinha'),
        addonCopeiro: getEl('modal-addon-copeiro'),
        addonNutella: getEl('modal-addon-nutella'),
        containerNutella: getEl('modal-container-addon-nutella')
    };

    ['addonDrinks', 'addonSavory', 'addonConeDescartavel', 'addonPratoDescartavel', 'addonCopoDescartavel', 'addonCasquinha', 'addonCopeiro', 'addonNutella'].forEach(key => {
        if (modalInputs[key]) {
            modalInputs[key].addEventListener('click', (e) => checkDependencyAndAlert(e, modalInputs));
        }
    });



    const modalBuffetInputs = [modalInputs.buffetEssencial, modalInputs.buffetEspecial, modalInputs.buffetPremium];
    modalBuffetInputs.forEach(buffet => {
        if (buffet) {
            buffet.addEventListener('click', function (e) {
                if (this.checked) {
                    const otherSelected = modalBuffetInputs.find(b => b !== this && b.checked);
                    if (otherSelected) {
                        e.preventDefault();
                        this.checked = false;
                        showCustomAlert("⚠️ Atenção: Você só pode selecionar um tipo de Buffet Infantil por vez.");
                    }
                }
            });
        }
    });

    // Validar Limite de Serviços Principais (Máximo 2 por evento - Modal)
    const modalMainServiceInputs = [modalInputs.buffetEssencial, modalInputs.buffetEspecial, modalInputs.buffetPremium, modalInputs.massas, modalInputs.crepe, modalInputs.crepePremium];
    modalMainServiceInputs.forEach(service => {
        if (service) {
            service.addEventListener('click', function (e) {
                if (this.checked) {
                    const selectedCount = modalMainServiceInputs.filter(s => s && s.checked).length;
                    if (selectedCount > 2) {
                        e.preventDefault();
                        this.checked = false;
                        showCustomAlert("🛑 Limite Excedido: Aceitamos no máximo 2 serviços principais por evento.");
                    }
                }
            });
        }
    });

    const modalRentalInputs = [modalInputs.hotdog, modalInputs.festbar, modalInputs.carts, modalInputs.popcornPremium];
    modalRentalInputs.forEach(rental => {
        if (rental) {
            rental.addEventListener('click', function (e) {
                if (this.checked) {
                    const isChacara = getEl('modal-location-chacara') && getEl('modal-location-chacara').checked;
                    const otherSelected = modalRentalInputs.filter(r => r !== this && r.checked);

                    if (otherSelected.length > 0) {
                        if (isChacara && otherSelected.length === 1 && (this === modalInputs.festbar || otherSelected[0] === modalInputs.festbar)) {
                            // Imunidade da Chácara: FestBar não bloqueia 1 Aluguel normal
                        } else {
                            e.preventDefault();
                            this.checked = false;
                            showCustomAlert("⚠️ Limite de Logística: Nossa equipe só consegue montar 1 (uma) estrutura de aluguel/barraquinha por evento. Por favor, escolha apenas uma opção.");
                        }
                    }
                }
            });
        }
    });

    function updateModalState() {
        const guests = parseInt(modalGuestsInput.value) || 0;
        const warning = getEl('modal-guest-warning');

        if (warning) warning.style.display = 'none';

        Object.values(modalInputs).forEach(el => {
            if (el) el.disabled = false;
        });

        if (modalInputs.carts && modalInputs.popcornPremium) {
            modalInputs.carts.addEventListener('click', function () {
                if (this.checked && modalInputs.popcornPremium.checked) {
                    modalInputs.popcornPremium.checked = false;
                    showCustomAlert("⚠️ Atenção: Estas duas opções utilizam a mesma máquina física. O sistema selecionou apenas o último tipo de pipoca escolhido.");
                }
                updateModalState();
            });
            modalInputs.popcornPremium.addEventListener('click', function () {
                if (this.checked && modalInputs.carts.checked) {
                    modalInputs.carts.checked = false;
                    showCustomAlert("⚠️ Atenção: Estas duas opções utilizam a mesma máquina física. O sistema selecionou apenas o último tipo de pipoca escolhido.");
                }
                updateModalState();
            });
        }

        const mainServices = [
            modalInputs.buffetEssencial, modalInputs.buffetEspecial, modalInputs.buffetPremium,
            modalInputs.massas, modalInputs.crepe, modalInputs.crepePremium, modalInputs.hotdog, modalInputs.festbar,
            modalInputs.carts, modalInputs.popcornPremium, modalInputs.camaElastica
        ];
        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);

        ['addonDrinks', 'addonSavory', 'addonConeDescartavel', 'addonPratoDescartavel', 'addonCopoDescartavel', 'addonCasquinha', 'addonCopeiro', 'addonNutella'].forEach(k => {
            if (modalInputs[k]) {
                if (!isMainOrRentalSelected) modalInputs[k].checked = false;
            }
        });

        if (modalInputs.addonCasquinha) {
            modalInputs.addonCasquinha.disabled = !(modalInputs.crepe?.checked || modalInputs.crepePremium?.checked);
            if (modalInputs.addonCasquinha.disabled) {
                modalInputs.addonCasquinha.checked = false;
            }
        }

        // guests was already parsed above

        if (modalInputs.popcornPremium && modalInputs.containerNutella) {
            const show = modalInputs.popcornPremium.checked;
            modalInputs.containerNutella.style.display = show ? 'block' : 'none';
            if (!show && modalInputs.addonNutella) modalInputs.addonNutella.checked = false;
        }

        const locationInput = getEl('event-location');
        if (locationInput) {
            const isChacara = getEl('modal-location-chacara')?.checked;
            locationInput.required = !isChacara;

            if (isChacara) {
                locationInput.value = 'Chácara Parceira (Império da Natureza)';
                locationInput.readOnly = true;
            } else {
                if (locationInput.value === 'Chácara Parceira (Império da Natureza)') {
                    locationInput.value = '';
                }
                locationInput.readOnly = false;
            }
        }

        calculateModalTotal();
    }

    function calculateModalTotal() {
        let total = 0;
        let guests = parseInt(modalGuestsInput?.value) || 0;
        let isOverflow = false;

        let dateType = 'weekend';
        if (window.currentSelectedDateObj) {
            dateType = checkIfWeekendOrHoliday(window.currentSelectedDateObj) ? 'weekend' : 'weekday';
        }

        const isChacara = getEl('modal-location-chacara') && getEl('modal-location-chacara').checked;

        const getTierPrice = (serviceKey) => {
            const config = PRICES.buffet[serviceKey][dateType];
            return (guests <= config.threshold) ? config.tier1 : config.tier2;
        };

        if (modalInputs.buffetEssencial?.checked) total += guests * getTierPrice('essencial');
        if (modalInputs.buffetEspecial?.checked) total += guests * getTierPrice('especial');
        if (modalInputs.buffetPremium?.checked) total += guests * getTierPrice('premium');
        if (modalInputs.massas?.checked) total += guests * PRICES.services.massas;
        if (modalInputs.crepe?.checked) total += guests * PRICES.services.crepe;
        if (modalInputs.crepePremium?.checked) total += guests * PRICES.services.crepe_premium;
        if (modalInputs.festbar?.checked) total += guests * PRICES.services.festbar;
        if (modalInputs.popcornPremium?.checked) total += PRICES.services.popcorn_premium;
        if (modalInputs.camaElastica?.checked) total += PRICES.cama_elastica;
        if (isChacara) total += PRICES.chacara[dateType];

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
        if (modalInputs.addonConeDescartavel?.checked) total += guests * PRICES.addons.cone_descartavel;
        if (modalInputs.addonPratoDescartavel?.checked) total += guests * PRICES.addons.prato_descartavel;
        if (modalInputs.addonCopoDescartavel?.checked) total += guests * PRICES.addons.copo_descartavel;
        if (modalInputs.addonCasquinha?.checked) total += guests * PRICES.addons.casquinha_queijo;

        let qtdCopeiros = Math.ceil(guests / 100);
        if (modalInputs.addonCopeiro?.checked) total += qtdCopeiros * PRICES.addons.copeiro;

        const hasBuffetOuMassa = (modalInputs.buffetEssencial?.checked || modalInputs.buffetEspecial?.checked || modalInputs.buffetPremium?.checked || modalInputs.massas?.checked);
        const hasCrepe = modalInputs.crepe?.checked || modalInputs.crepePremium?.checked;
        const hasAnyMainService = hasBuffetOuMassa || hasCrepe;

        if (hasAnyMainService && !modalInputs.addonCopeiro?.checked) {
            const displayWarning = getEl('modal-guest-warning');
            if (displayWarning) {
                displayWarning.style.display = 'block';
                displayWarning.innerHTML = '<span style="color:#f39c12; font-weight:bold;">⚠️ Aviso: O serviço de copeiro é opcional, mas altamente recomendável, pois sem a contratação desse profissional não haverá reposição de pratos, talheres e copos durante o evento.</span>';
                displayWarning.style.color = '#f39c12';
            }
        }

        if (modalInputs.popcornPremium?.checked && modalInputs.addonNutella?.checked) total += PRICES.addons.nutella;

        const display = getEl('modal-total-display');
        const btnReview = getEl('review-booking-btn');
        const btnWhats = getEl('modal-btn-whatsapp-fallback');

        if (display) {
            if (isOverflow) {
                display.textContent = "Sob Consulta";
                display.style.fontSize = "1.5em";
                if (btnReview) btnReview.style.display = 'none';
                if (btnWhats) {
                    btnWhats.style.display = 'block';

                    const selectedServices = [];
                    if (modalInputs.buffetEssencial?.checked) selectedServices.push('Buffet Essencial');
                    if (modalInputs.buffetEspecial?.checked) selectedServices.push('Buffet Especial');
                    if (modalInputs.buffetPremium?.checked) selectedServices.push('Buffet Premium');
                    if (modalInputs.massas?.checked) selectedServices.push('Estação de Massas');
                    if (modalInputs.crepe?.checked) selectedServices.push('Rodízio de Crepe');
                    if (modalInputs.crepePremium?.checked) selectedServices.push('Rodízio de Crepe Premium');
                    if (modalInputs.festbar?.checked) selectedServices.push('FestBar Drinks');
                    if (modalInputs.hotdog?.checked) selectedServices.push('Hot Dog Gourmet');
                    if (modalInputs.carts?.checked) selectedServices.push('Carrinho de Pipoca / Algodão');
                    if (modalInputs.popcornPremium?.checked) selectedServices.push('Carrinho Premium (Gourmet)');
                    if (modalInputs.camaElastica?.checked) selectedServices.push('Cama Elástica');

                    let dateStr = '??/??/2026';
                    if (window.currentSelectedDateObj) {
                        const d = String(window.currentSelectedDateObj.getDate()).padStart(2, '0');
                        const m = String(window.currentSelectedDateObj.getMonth() + 1).padStart(2, '0');
                        dateStr = `${d}/${m}/2026`;
                    } else if (getEl('selected-date-display')) {
                        const txt = getEl('selected-date-display').textContent;
                        if (txt && txt.includes('/')) dateStr = txt;
                    }

                    const s = selectedServices.length > 0 ? selectedServices.join(', ') : 'Nenhum serviço base selecionado';
                    const msg = `*Orçamento Especial (Sob Consulta)*\n\n*Data:* ${dateStr}\n*Convidados:* ${guests}\n*Serviços:* ${s}\n\n_Gostaria de consultar as condições para este evento!_`;
                    btnWhats.href = 'https://api.whatsapp.com/send?phone=5561982605050&text=' + encodeURIComponent(msg);
                }
            } else {
                display.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                display.style.fontSize = "1.8em";
                if (btnReview) btnReview.style.display = 'block';
                if (btnWhats) btnWhats.style.display = 'none';
            }
        }
    }

    if (modalGuestsInput) {
        modalGuestsInput.addEventListener('change', () => {
            let guests = parseInt(modalGuestsInput.value) || 0;
            if (guests < 25) {
                modalGuestsInput.value = 25;
                showCustomAlert("⚠️ O número mínimo para realização de eventos é de 25 convidados.");
            }
            updateModalState();
        });
    }
    Object.values(modalInputs).forEach(el => {
        if (el) el.addEventListener('change', updateModalState);
    });

    getEl('modal-location-proprio')?.addEventListener('change', () => { calculateModalTotal(); updateModalState(); });
    getEl('modal-location-chacara')?.addEventListener('change', () => { calculateModalTotal(); updateModalState(); });

    getEl('review-booking-btn')?.addEventListener('click', () => {
        const guests = getEl('modal-guests').value;
        const name = getEl('client-name').value;
        const time = getEl('event-time').value;
        const locationInput = getEl('event-location');
        const isChacara = getEl('modal-location-chacara')?.checked;

        if (!guests || !name || !time || (!isChacara && locationInput && !locationInput.value.trim())) {
            showCustomAlert("Preencha todos os campos obrigatórios.");
            return;
        }

        let countPrincipals = 0;
        let countRentals = 0;
        let hasFestBar = false;

        if (getEl('modal-service-buffet-essencial')?.checked) countPrincipals++;
        if (getEl('modal-service-buffet-especial')?.checked) countPrincipals++;
        if (getEl('modal-service-buffet-premium')?.checked) countPrincipals++;
        if (getEl('modal-service-massas')?.checked) countPrincipals++;
        if (getEl('modal-service-crepe')?.checked) countPrincipals++;
        if (getEl('modal-service-crepe-premium')?.checked) countPrincipals++;

        if (getEl('modal-service-hotdog')?.checked) countRentals++;
        if (getEl('modal-service-festbar')?.checked) { countRentals++; hasFestBar = true; }
        if (getEl('modal-service-carts')?.checked) countRentals++;
        if (getEl('modal-service-popcorn-premium')?.checked) countRentals++;

        if (countPrincipals > 2) {
            showCustomAlert("🛑 Limite Excedido: Aceitamos no máximo 2 serviços principais por evento.");
            return;
        }

        if (countRentals > 1) {
            if (isChacara && countRentals === 2 && hasFestBar) {
                // Allowed!
            } else {
                showCustomAlert("🛑 Limite Excedido: Só é permitido 1 serviço de aluguel/barraquinha por evento devido à logística de montagem.");
                return;
            }
        }

        const selectedServices = [];
        const check = (id, label) => {
            const el = document.getElementById(id);
            if (el && el.checked) selectedServices.push(label);
        };

        check('modal-service-buffet-essencial', 'Buffet Essencial');
        check('modal-service-buffet-especial', 'Buffet Especial');
        check('modal-service-buffet-premium', 'Buffet Premium');
        check('modal-service-massas', 'Buffet de Massas');
        check('modal-service-crepe', 'Rodízio de Crepe');
        check('modal-service-crepe-premium', 'Rodízio de Crepe Premium');
        check('modal-service-hotdog', 'Hot Dog Gourmet');
        check('modal-service-festbar', 'FestBar Drinks');
        check('modal-service-carts', 'Carrinho Pipoca/Algodão');
        check('modal-service-popcorn-premium', 'Pipoca Gourmet');
        check('modal-service-cama-elastica', 'Cama Elástica');
        check('modal-addon-drinks', 'Bebidas');
        check('modal-addon-savory', 'Salgados + Churros');
        if (getEl('modal-addon-cone-descartavel')?.checked) selectedServices.push(`Cone Descartável: R$ ${(guests * 1.5).toFixed(2)} (${guests} pessoas)`);
        if (getEl('modal-addon-prato-descartavel')?.checked) selectedServices.push(`Pratos/Talheres Descartáveis: R$ ${(guests * 1.5).toFixed(2)} (${guests} pessoas)`);
        if (getEl('modal-addon-copo-descartavel')?.checked) selectedServices.push(`Copos Descartáveis: R$ ${(guests * 1.0).toFixed(2)} (${guests} pessoas)`);
        if (getEl('modal-addon-casquinha')?.checked) selectedServices.push(`Crepe com casquinha de queijo: R$ ${(guests * 6).toFixed(2)} (${guests} pessoas)`);
        check('modal-addon-nutella', 'Calda de Nutella');

        let qCopeiros = Math.ceil(guests / 100);
        if (getEl('modal-addon-copeiro')?.checked) {
            selectedServices.push(`Copeiro: Sim (${qCopeiros} profissional(is))`);
        } else if (getEl('modal-service-crepe')?.checked || getEl('modal-service-crepe-premium')?.checked) {
            selectedServices.push('Copeiro: Não (Sem copeiro - Cliente ciente da recomendação)');
        }

        const summaryHtml = `
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Data:</strong> ${getEl('selected-date-display').textContent}</p>
            <p><strong>Horário:</strong> ${time} às ${getEl('event-end-time').value}</p>
            <p><strong>Local:</strong> ${isChacara ? 'Chácara Parceira (Império da Natureza)' : getEl('event-location').value}</p>
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

    const bookingForm = getEl('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Verificando disponibilidade...";

            const formData = new FormData();
            formData.append('clientName', getEl('client-name').value);
            formData.append('selectedDateISO', getEl('selected-date-iso').value);
            formData.append('eventTime', getEl('event-time').value);
            formData.append('eventDuration', (parseInt(getEl('modal-guests').value) <= 30 ? 3 : 4));
            formData.append('guests', getEl('modal-guests').value);
            const isChacara = getEl('modal-location-chacara')?.checked;
            let finalLocation = getEl('event-location').value;
            if (isChacara) finalLocation = 'Chácara Parceira (Império da Natureza)';

            formData.append('eventLocation', finalLocation);
            formData.append('total', getEl('modal-total-display').textContent);
            formData.append('isChacara', getEl('modal-location-chacara')?.checked ? 'true' : 'false');

            const selectedServices = [];
            const check = (id, label) => {
                const el = document.getElementById(id);
                if (el && el.checked) selectedServices.push(label);
            };
            check('modal-service-buffet-essencial', 'Buffet Essencial');
            check('modal-service-buffet-especial', 'Buffet Especial');
            check('modal-service-buffet-premium', 'Buffet Premium');
            check('modal-service-massas', 'Buffet de Massas');
            check('modal-service-crepe', 'Rodízio de Crepe');
            check('modal-service-crepe-premium', 'Rodízio de Crepe Premium');
            check('modal-service-hotdog', 'Hot Dog Gourmet');
            check('modal-service-festbar', 'FestBar Drinks');
            check('modal-service-carts', 'Carrinho Pipoca/Algodão');
            check('modal-service-popcorn-premium', 'Pipoca Gourmet');
            check('modal-service-cama-elastica', 'Cama Elástica');
            check('modal-addon-drinks', 'Bebidas');
            check('modal-addon-savory', 'Salgados + Churros');
            const guestsNum = parseInt(getEl('modal-guests').value) || 0;
            if (getEl('modal-addon-cone-descartavel')?.checked) selectedServices.push(`Cone Descartável: R$ ${(guestsNum * 1.5).toFixed(2)} (${guestsNum} pessoas)`);
            if (getEl('modal-addon-prato-descartavel')?.checked) selectedServices.push(`Pratos/Talheres Descartáveis: R$ ${(guestsNum * 1.5).toFixed(2)} (${guestsNum} pessoas)`);
            if (getEl('modal-addon-copo-descartavel')?.checked) selectedServices.push(`Copos Descartáveis: R$ ${(guestsNum * 1.0).toFixed(2)} (${guestsNum} pessoas)`);
            if (getEl('modal-addon-casquinha')?.checked) selectedServices.push(`Crepe com casquinha de queijo: R$ ${(guestsNum * 6).toFixed(2)} (${guestsNum} pessoas)`);
            check('modal-addon-nutella', 'Calda de Nutella');

            let g = parseInt(getEl('modal-guests').value) || 0;
            let qCopeiros2 = Math.ceil(g / 100);
            if (getEl('modal-addon-copeiro')?.checked) {
                selectedServices.push(`Copeiro: Sim (${qCopeiros2} profissional(is))`);
            } else if (getEl('modal-service-crepe')?.checked || getEl('modal-service-crepe-premium')?.checked) {
                selectedServices.push('Copeiro: Não (Sem copeiro - Cliente ciente da recomendação)');
            }

            formData.append('services', selectedServices.join(', '));

            try {
                const res = await fetch("https://claras-buffet-backend.onrender.com/api/schedule", {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();

                if (data.status === 'error') {
                    const errorMsg = data.message.toLowerCase();
                    let warningText = "⚠️ " + data.message;
                    let removedItems = [];

                    getEl('booking-step-1').style.display = 'block';
                    getEl('booking-step-2').style.display = 'none';

                    if (errorMsg.includes('lotado para festas principais') || errorMsg.includes('principais')) {
                        ['modal-service-buffet-essencial', 'modal-service-buffet-especial', 'modal-service-buffet-premium', 'modal-service-massas', 'modal-service-crepe', 'modal-service-crepe-premium'].forEach(id => {
                            const el = getEl(id);
                            if (el && el.checked) {
                                el.checked = false;
                                removedItems.push('Um ou mais serviços principais');
                            }
                        });
                        warningText += "\n\nRemovemos os serviços principais conflitantes.";
                    }
                    else if (errorMsg.includes('lotado para alugueis') || errorMsg.includes('1 serviço de aluguel')) {
                        ['modal-service-hotdog', 'modal-service-festbar', 'modal-service-carts', 'modal-service-popcorn-premium', 'modal-service-cama-elastica'].forEach(id => {
                            const el = getEl(id);
                            if (el && el.checked) el.checked = false;
                        });
                        warningText = "🛑 " + data.message;
                    }
                    else if (errorMsg.includes('logística') || errorMsg.includes('conflito')) {
                        ['modal-service-hotdog', 'modal-service-festbar', 'modal-service-carts', 'modal-service-popcorn-premium', 'modal-service-cama-elastica'].forEach(id => {
                            const el = getEl(id);
                            if (el && el.checked) el.checked = false;
                        });
                        warningText = "⏱️ Conflito de Horário: Já temos um aluguel agendado neste horário. Por favor, escolha um horário diferente ou remova os aluguéis.";
                    }

                    showCustomAlert(warningText);
                    calculateModalTotal();

                    btn.disabled = false;
                    btn.textContent = originalText;
                } else {
                    const finalMsgLocation = isChacara ? 'Chácara Parceira (Império da Natureza)' : getEl('event-location').value;
                    const msg = `*Novo Agendamento*\n\n*Cliente:* ${getEl('client-name').value}\n*Data:* ${getEl('selected-date-display').textContent}\n*Horário:* ${getEl('event-time').value}\n*Local:* ${finalMsgLocation}\n*Convidados:* ${getEl('modal-guests').value}\n*Serviços:* ${selectedServices.join(', ')}\n*Total Estimado:* ${getEl('modal-total-display').textContent}\n\n_Aguardo confirmação do contrato._`;
                    const encodedMsg = encodeURIComponent(msg);
                    window.open(`https://api.whatsapp.com/send?phone=5561982605050&text=${encodedMsg}`, '_blank');

                    modal.style.display = 'none';
                    bookingForm.reset();
                    if (dynamicWarnings) dynamicWarnings.innerHTML = '';
                    showCustomAlert("✅ Pré-reserva enviada com sucesso!\n\nPara concluir, agora você só precisa enviar a mensagem que abriu no seu WhatsApp. Nossa equipe entrará em contato em breve para confirmar os detalhes!");

                    // Retorna para aba 1 após reset para um novo agendamento, preservando a navegação
                    getEl('booking-step-1').style.display = 'block';
                    getEl('booking-step-2').style.display = 'none';
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
            } catch (err) {
                console.error(err);
                showCustomAlert("Erro ao conectar com servidor. Tente novamente.");
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
    // 🎨 4. LÓGICA DE UI (CARROSSEL, MENU MOBILE)
    // ==========================================
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(track ? track.children : []);
    const nextButton = document.querySelector('.next-btn');
    const prevButton = document.querySelector('.prev-btn');
    const dotsNav = document.querySelector('.carousel-dots');

    if (track && slides.length > 0) {
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (index === 0) dot.classList.add('active');
            dotsNav.appendChild(dot);
            dot.addEventListener('click', () => moveToSlide(index));
        });

        const dots = Array.from(dotsNav.children);
        let currentSlideIndex = 0;

        function moveToSlide(targetIndex) {
            if (targetIndex < 0) targetIndex = slides.length - 1;
            if (targetIndex >= slides.length) targetIndex = 0;

            const currentSlide = slides[currentSlideIndex];
            const targetSlide = slides[targetIndex];

            currentSlide.classList.remove('active');
            targetSlide.classList.add('active');

            dots[currentSlideIndex].classList.remove('active');
            dots[targetIndex].classList.add('active');

            const slideWidth = slides[0].getBoundingClientRect().width;
            track.style.transform = 'translateX(-' + (slideWidth * targetIndex) + 'px)';

            currentSlideIndex = targetIndex;
        }

        if (nextButton) nextButton.addEventListener('click', () => moveToSlide(currentSlideIndex + 1));
        if (prevButton) prevButton.addEventListener('click', () => moveToSlide(currentSlideIndex - 1));

        setInterval(() => moveToSlide(currentSlideIndex + 1), 5000);

        window.addEventListener('resize', () => {
            const slideWidth = slides[0].getBoundingClientRect().width;
            track.style.transform = 'translateX(-' + (slideWidth * currentSlideIndex) + 'px)';
        });
    }

    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.main-nav');
    const header = document.querySelector('header');

    if (mobileBtn && nav) {
        mobileBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            if (header) header.classList.toggle('menu-open');

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

        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(drop => {
            const btn = drop.querySelector('.dropbtn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        drop.classList.toggle('active');
                        const content = drop.querySelector('.dropdown-content');
                        if (content) {
                            content.style.position = (content.style.position === 'static') ? 'absolute' : 'static';
                            content.style.display = (content.style.display === 'block') ? 'none' : 'block';
                        }
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', () => {
        if (header) {
            if (window.scrollY > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        }
    });

    // ==========================================
    // 💡 FAQ LÓGICA (ACCORDION)
    // ==========================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            // Fecha os outros (opcional)
            faqQuestions.forEach(q => {
                if (q !== question) {
                    q.classList.remove('active');
                    if (q.nextElementSibling) {
                        q.nextElementSibling.style.maxHeight = null;
                    }
                }
            });

            // Abre/Fecha o clicado
            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            if (answer) {
                if (question.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                } else {
                    answer.style.maxHeight = null;
                }
            }
        });
    });

});