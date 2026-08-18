/**
 * Script de Backend - Clara's Buffet
 * VERSÃO: CORREÇÃO DEFINITIVA (TRAVA SEPARADA) + CAPTURA DE LEADS (CARRINHO ABANDONADO)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return sendResponse({ status: 'error', message: 'Servidor ocupado.' }); }

  try {
    var p = e.parameter;

    // --- NOVO: CAPTURA SILENCIOSA DE LEADS ---
    if (p.action === 'lead_capture') {
      var sheet = SpreadsheetApp.openById('19edjUQP-3MflYE4szV7ZIm6HGCyVKcDkswNqmrA3hjI').getActiveSheet();
      var dataAtual = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
      sheet.appendRow([dataAtual, p.clientName, p.eventLocation, p.guests, p.total, 'Abandono (Não foi pro Zap)']);
      return sendResponse({ status: 'success' });
    }
    // -----------------------------------------

    var calendar = CalendarApp.getDefaultCalendar();
    
    // --- 1. DATAS ---
    var dateParts = p.selectedDateISO.split('-'); 
    var timeParts = p.eventTime.split(':');       
    var start = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    var duration = parseInt(p.eventDuration) || 4;
    var end = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    var dayStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    
    var servicesStr = (p.services || "").toLowerCase();

    // --- 2. QUEM É QUEM? ---
    var reqPrincipal = /buffet|essencial|especial|premium|massa|crepe/.test(servicesStr);
    
    var reqHotDog = /hot dog|barraquinha/.test(servicesStr);
    var reqCarts  = /carrinho|algodão|pipoca/.test(servicesStr);
    var reqTrampo = /cama elástica/.test(servicesStr);
    var reqAluguel = reqHotDog || reqCarts || reqTrampo;

    // --- 3. CONTAGEM ---
    var dayEvents = calendar.getEventsForDay(dayStart);
    
    var countPrincipais = 0;
    var countAlugueis = 0;
    var conflitoItemIgual = false;

    for (var i = 0; i < dayEvents.length; i++) {
      var evt = dayEvents[i];
      var txt = (evt.getTitle() + " " + evt.getDescription()).toLowerCase();
      var evtStart = evt.getStartTime();
      var evtEnd = evt.getEndTime();

      // É PRINCIPAL?
      var isEvtPrincipal = /buffet|essencial|especial|premium|massa|crepe/.test(txt);
      
      if (isEvtPrincipal) {
        countPrincipais++; 
      } 
      else {
        // É ALUGUEL? (Só conta se não for principal)
        var isEvtHotDog = /hot dog|barraquinha/.test(txt);
        var isEvtCarts  = /carrinho|algodão|pipoca/.test(txt);
        var isEvtTrampo = /cama elástica/.test(txt);

        if (isEvtHotDog || isEvtCarts || isEvtTrampo) {
          countAlugueis++; 

          // CHECA HORÁRIO (Apenas se for o MESMO item)
          var overlap = (start < evtEnd && end > evtStart);
          
          if (overlap) {
            if (reqHotDog && isEvtHotDog) conflitoItemIgual = true;
            if (reqCarts && isEvtCarts) conflitoItemIgual = true;
            if (reqTrampo && isEvtTrampo) conflitoItemIgual = true;
          }
        }
      }
    }

    // --- 4. REGRAS ---

    // Regra 1: Principais (Máx 2). Horário livre.
    if (reqPrincipal && countPrincipais >= 2) {
      return sendResponse({ 
        status: 'error', 
        message: 'ERRO: Dia lotado para Festas Principais (Buffet/Crepe/Massa).' 
      });
    }

    // Regra 2: Alugueis (Máx 2 no total).
    if (reqAluguel && !reqPrincipal) { 
      if (countAlugueis >= 2) {
        return sendResponse({ 
          status: 'error', 
          message: 'ERRO: Dia lotado para Alugueis Avulsos.' 
        });
      }
      // Regra 3: Conflito de Horário (Mesmo item)
      if (conflitoItemIgual) {
        return sendResponse({ 
          status: 'error', 
          message: 'ERRO: Este item (ex: Hot Dog) já está reservado neste horário.' 
        });
      }
    }

    // --- 5. SALVAR ---
    var title = reqPrincipal ? ('Festa: ' + p.clientName) : ('Locação: ' + p.clientName);
    var desc = 'Serviços: ' + p.services + '\n' +
               'Convidados: ' + p.guests + '\n' +
               'Total: ' + p.total + '\n' + 
               'Local: ' + p.eventLocation;

    calendar.createEvent(title, start, end, {
      location: p.eventLocation,
      description: desc
    });

    return sendResponse({ status: 'success' });

  } catch (err) {
    return sendResponse({ status: 'error', message: 'Erro no servidor: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function sendResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
