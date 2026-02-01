document.addEventListener('DOMContentLoaded', function () {

    const getEl = (id) => document.getElementById(id);

    // URL do Backend no Render
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
    // 🧮 2. LÓGICA DE CONTROLE
    // ==========================================
    function updateAddonsState() {
        const mainServices = [
            inputs.buffetEssencial, inputs.buffetEspecial, inputs.buffetPremium,
            inputs.massas, inputs.crepe,
            inputs.hotdog, inputs.carts, inputs.popcornPremium, inputs.camaElastica
        ];

        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);
        const addons = [inputs.addonDrinks, inputs.addonSavory, inputs.addonGlass, inputs.addonCutlery, inputs.addonNutella];

        addons.forEach(addon => {
            if (addon) {
                addon.disabled = !isMainOrRentalSelected;
                if (!isMainOrRentalSelected) addon.checked = false;
            }
        });

        if (inputs.massas && inputs.massas.checked) {
            if (inputs.addonCutlery) {
                inputs.addonCutlery.checked = false;
                inputs.addonCutlery.disabled = true;
            }
        }

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

        const getTierPrice = (serviceKey) => {
            const config = PRICES.buffet[serviceKey];
            return (guests <= config.threshold) ? config.tier1 : config.tier2;
        };

        if (inputs.buffetEssencial?.checked) total += guests * getTierPrice('essencial');
        if (inputs.buffetEspecial?.checked) total += guests * getTierPrice('especial');
        if (inputs.buffetPremium?.checked) total += guests * getTierPrice('premium');
        if (inputs.massas?.checked) total += guests * PRICES.services.massas;
        if (inputs.crepe?.checked) total += guests * PRICES.services.crepe;

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

        if (inputs.addonDrinks?.checked) total += guests * PRICES.addons.drinks;
        if (inputs.addonSavory?.checked) total += guests * PRICES.addons.savory;
        if (inputs.addonGlass?.checked) total += guests * PRICES.addons.glass;
        if (inputs.addonCutlery?.checked && !inputs.addonCutlery.disabled) total += guests * PRICES.addons.cutlery;
        if (inputs.popcornPremium?.checked && inputs.addonNutella?.checked) total += PRICES.addons.nutella;

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

    // ==========================================
    // 📅 3. CALENDÁRIO COM VERMELHO E BLOQUEIO
    // ==========================================
    const calendarDays = getEl('calendar-days');
    const monthYear = getEl('month-year');
    let currentDate = new Date();

    async function renderCalendar() {
        if (!calendarDays || !monthYear) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Pega dias cheios do backend (LINK CORRIGIDO)
        let fullDays = [];
        try {
            const res = await fetch(`https://claras-buffet-backend.onrender.com/api/month-availability?month=${month}&year=${year}`);
            const data = await res.json();
            fullDays = data.fullDays || [];
        } catch (e) {
            console.error("Erro ao buscar disponibilidade", e);
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        const today = new Date();

        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        monthYear.textContent = `${monthNames[month]} ${year}`;
        calendarDays.innerHTML = "";

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

            if (isPast) {
                dayDiv.classList.add('past');
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
    }

    getEl('prev-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    getEl('next-month')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // ==========================================
    // ⏰ VALIDAÇÃO DE HORÁRIO
    // ==========================================
    function validateTime() {
        const timeInput = getEl('event-time');
        const selectedDate = window.currentSelectedDateObj;

        if (!timeInput || !selectedDate) return;

        const now = new Date();
        const [h, m] = timeInput.value.split(':').map(Number);

        if (selectedDate.toDateString() === now.toDateString()) {
            const selectedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
            if (selectedTime < now) {
                alert("⚠️ Não é possível agendar um horário que já passou.");
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

    function openBookingModal(date) {
        if (!modal) return;
        window.currentSelectedDateObj = date;

        const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const isoDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');

        getEl('selected-date-display').textContent = dateStr;
        getEl('selected-date-iso').value = isoDate;

        modal.style.display = 'block';

        const mainGuests = getEl('guests').value;
        if (mainGuests && getEl('modal-guests')) {
            getEl('modal-guests').value = mainGuests;
            const event = new Event('input');
            getEl('modal-guests').dispatchEvent(event);
        }

        if (getEl('booking-step-1')) getEl('booking-step-1').style.display = 'block';
        if (getEl('booking-step-2')) getEl('booking-step-2').style.display = 'none';
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target == modal) modal.style.display = 'none';
    });

    getEl('btn-goto-booking')?.addEventListener('click', function () {
        document.getElementById('custom-booking').scrollIntoView({ behavior: 'smooth' });
    });

    const modalGuestsInput = getEl('modal-guests');
    const modalInputs = {
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
            ['buffetEssencial', 'buffetEspecial', 'buffetPremium', 'massas', 'crepe', 'hotdog', 'carts', 'popcornPremium', 'camaElastica'].forEach(k => {
                if (modalInputs[k]) modalInputs[k].disabled = false;
            });
        }

        const mainServices = [
            modalInputs.buffetEssencial, modalInputs.buffetEspecial, modalInputs.buffetPremium,
            modalInputs.massas, modalInputs.crepe,
            modalInputs.hotdog, modalInputs.carts, modalInputs.popcornPremium, modalInputs.camaElastica
        ];
        const isMainOrRentalSelected = mainServices.some(input => input && input.checked);

        ['addonDrinks', 'addonSavory', 'addonGlass', 'addonCutlery', 'addonNutella'].forEach(k => {
            if (modalInputs[k]) {
                modalInputs[k].disabled = !isMainOrRentalSelected;
                if (!isMainOrRentalSelected) modalInputs[k].checked = false;
            }
        });

        if (modalInputs.massas && modalInputs.massas.checked) {
            if (modalInputs.addonCutlery) {
                modalInputs.addonCutlery.checked = false;
                modalInputs.addonCutlery.disabled = true;
            }
        }

        if (modalInputs.popcornPremium && modalInputs.containerNutella) {
            const show = modalInputs.popcornPremium.checked;
            modalInputs.containerNutella.style.display = show ? 'block' : 'none';
            if (!show && modalInputs.addonNutella) modalInputs.addonNutella.checked = false;
        }

        calculateModalTotal();
    }

    function calculateModalTotal() {
        let total = 0;
        let guests = parseInt(modalGuestsInput?.value) || 0;

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

        if (modalInputs.hotdog?.checked) total += PRICES.services.hotdog;
        if (modalInputs.carts?.checked) total += PRICES.services.carts;

        if (modalInputs.addonDrinks?.checked) total += guests * PRICES.addons.drinks;
        if (modalInputs.addonSavory?.checked) total += guests * PRICES.addons.savory;
        if (modalInputs.addonGlass?.checked) total += guests * PRICES.addons.glass;
        if (modalInputs.addonCutlery?.checked && !modalInputs.addonCutlery.disabled) total += guests * PRICES.addons.cutlery;
        if (modalInputs.popcornPremium?.checked && modalInputs.addonNutella?.checked) total += PRICES.addons.nutella;

        const display = getEl('modal-total-display');
        if (display) display.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (modalGuestsInput) modalGuestsInput.addEventListener('input', updateModalState);
    Object.values(modalInputs).forEach(el => {
        if (el) el.addEventListener('change', updateModalState);
    });

    // Review Button
    getEl('review-booking-btn')?.addEventListener('click', () => {
        const guests = getEl('modal-guests').value;
        const name = getEl('client-name').value;
        const time = getEl('event-time').value;
        if (!guests || !name || !time) {
            alert("Preencha todos os campos obrigatórios.");
            return;
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

            const formData = new FormData();
            formData.append('clientName', getEl('client-name').value);
            formData.append('selectedDateISO', getEl('selected-date-iso').value);
            formData.append('eventTime', getEl('event-time').value);
            formData.append('eventDuration', (parseInt(getEl('modal-guests').value) <= 30 ? 3 : 4));
            formData.append('guests', getEl('modal-guests').value);
            formData.append('eventLocation', getEl('event-location').value);
            formData.append('total', getEl('modal-total-display').textContent);

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
                // AGORA SIM: URL CORRETA E SINTAXE LIMPA
                const res = await fetch("https://claras-buffet-backend.onrender.com/api/schedule", {
                    method: 'POST',
                    body: formData
                });

                const data = await res.json();

                if (data.status === 'error') {
                    alert("⚠️ " + data.message);
                    btn.disabled = false;
                    btn.textContent = originalText;
                } else {
                    const msg = `*Novo Agendamento*\n\n*Cliente:* ${getEl('client-name').value}\n*Data:* ${getEl('selected-date-display').textContent}\n*Horário:* ${getEl('event-time').value}\n*Local:* ${getEl('event-location').value}\n*Convidados:* ${getEl('modal-guests').value}\n*Serviços:* ${selectedServices.join(', ')}\n*Total Estimado:* ${getEl('modal-total-display').textContent}\n\n_Aguardo confirmação do contrato._`;
                    const encodedMsg = encodeURIComponent(msg);
                    window.open(`https://api.whatsapp.com/send?phone=5561982605050&text=${encodedMsg}`, '_blank');

                    modal.style.display = 'none';
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
    // 🎨 4. LÓGICA DE UI
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

            dot.addEventListener('click', () => {
                moveToSlide(index);
            });
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

        setInterval(() => {
            moveToSlide(currentSlideIndex + 1);
        }, 5000);

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
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });

});