/**
 * ============================================================================
 * PROJETO: Leitura Bíblica Diária e Devocional Sequencial (Google Tasks)
 * ARQUIVO: Cronograma-Versiculos-Devocional.js
 * VERSÃO: 2.0 (Resiliência Total com Auto-Alinhamento de Vencimento 'due')
 * ============================================================================
 */

/**
 * Configurações globais parametrizáveis
 */
const CONFIG_DEVOCIONAL = {
  TASK_TITLE_KEYWORD: "Leitura Bíblica Diária e Oração (10 min)", // Palavra-chave no título
  TASK_LIST_NAME: null,                                         // Deixe null para varrer TODAS as listas
  SHEET_NAME: null,                                             // Deixe null para usar a aba ativa
  PROP_KEY_DIA_ATUAL: "DIA_DEVOCIONAL_ATUAL",                   // Chave de persistência de estado
  HORA_VENCIMENTO_PADRAO: 8,                                    // 08:30 da manhã
  MINUTO_VENCIMENTO_PADRAO: 30
};

/**
 * Mapeamento de emojis temáticos por dia da semana
 */
const EMOJIS_DEVOCIONAL = {
  "segunda": "🌅",
  "terca": "🎯",
  "quarta": "🕊️",
  "quinta": "💼",
  "sexta": "🌿",
  "sabado": "🛡️",
  "domingo": "👑"
};

/**
 * Obtém a referência do serviço Google Tasks com suporte a fallback
 * @returns {Object} Serviço Tasks ativo
 */
function getTasksService() {
  if (typeof Tasks !== 'undefined') {
    return Tasks;
  } else if (typeof GoogleTasks !== 'undefined') {
    return GoogleTasks;
  } else {
    throw new Error(
      "Serviço Google Tasks Advanced não encontrado. Adicione o serviço 'Tasks API' em Serviços (Services) no Apps Script."
    );
  }
}

/**
 * ============================================================================
 * FUNÇÃO DE PRODUÇÃO (TRIGGER MATINAL DIÁRIO)
 * ============================================================================
 * Executa automaticamente todas as madrugadas (04:00 às 06:00).
 * Lê o dia sequencial atual, atualiza a tarefa no Google Tasks e avança o contador.
 */
function atualizarDevocionalDiario() {
  try {
    Logger.log("[PRODUÇÃO] Iniciando execução diária do Devocional...");
    const atualizadoComSucesso = processarAtualizacaoDevocional({
      autoCriar: true,
      avancarContador: true
    });

    if (!atualizadoComSucesso) {
      Logger.log("[AVISO] A tarefa não pôde ser atualizada. O contador sequencial foi mantido para nova tentativa.");
    }
  } catch (error) {
    Logger.log(`[ERRO CRÍTICO EM PRODUÇÃO] ${error.message}`);
    if (error.stack) Logger.log(`Stack Trace: ${error.stack}`);
  }
}

/**
 * ============================================================================
 * MODO DE TESTE IMEDIATO (COM AUTO-CRIAÇÃO E ALERTA EM +2 MIN)
 * ============================================================================
 * Testa notificação push sem alterar o ponteiro do cronograma.
 */
function executarTesteImediatoAgora() {
  try {
    Logger.log("[TESTE IMEDIATO] Executando teste do devocional com auto-criação ativa (sem avançar contador)...");
    processarAtualizacaoDevocional({
      autoCriar: true,
      avancarContador: false,
      testeImediato2Min: true
    });
  } catch (error) {
    Logger.log(`[ERRO NO TESTE IMEDIATO] ${error.message}`);
    if (error.stack) Logger.log(`Stack Trace: ${error.stack}`);
  }
}

/**
 * Injeta na tarefa os dados de um dia específico para conferência sem alterar o cronograma.
 * Exemplo: testarDiaEspecifico(4)
 * @param {number|string} numeroDia - Número do dia da planilha
 */
function testarDiaEspecifico(numeroDia) {
  const diaAlvo = parseInt(numeroDia || 1, 10);
  Logger.log(`[TESTE MANUAL] Simulando injeção dos dados do Dia ${diaAlvo}...`);
  
  processarAtualizacaoDevocional({
    autoCriar: false,
    avancarContador: false,
    diaForcado: diaAlvo
  });
}

/**
 * Orquestrador principal da leitura do Sheets, montagem do payload e injeção na Tasks API.
 * 
 * @param {Object} opcoes - { autoCriar: boolean, avancarContador: boolean, diaForcado: number|null, testeImediato2Min: boolean }
 * @returns {boolean} true se atualizado/criado com sucesso
 */
function processarAtualizacaoDevocional(opcoes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Nenhuma planilha vinculada encontrada. Execute o script a partir do Google Sheets.");
  }

  const sheet = CONFIG_DEVOCIONAL.SHEET_NAME 
    ? ss.getSheetByName(CONFIG_DEVOCIONAL.SHEET_NAME) 
    : ss.getActiveSheet();

  if (!sheet) {
    throw new Error(`Aba não encontrada: ${CONFIG_DEVOCIONAL.SHEET_NAME || 'Aba Ativa'}`);
  }

  const dados = sheet.getDataRange().getValues();
  if (dados.length <= 1) {
    throw new Error("A planilha de devocionais está vazia ou possui apenas o cabeçalho.");
  }

  // 1. Obter número do dia a ser processado
  const props = PropertiesService.getScriptProperties();
  let diaAtual = opcoes.diaForcado 
    ? opcoes.diaForcado 
    : parseInt(props.getProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL) || "1", 10);

  // 2. Localizar registro correspondente na planilha
  let linhaEncontrada = null;
  for (let i = 1; i < dados.length; i++) {
    const diaLinha = parseInt(dados[i][0], 10);
    if (diaLinha === diaAtual) {
      linhaEncontrada = dados[i];
      break;
    }
  }

  // Fallback: se o contador ultrapassou a última linha, faz o loop e reinicia no primeiro dia
  if (!linhaEncontrada) {
    Logger.log(`[AVISO] Dia ${diaAtual} não localizado. Reiniciando ciclo na primeira linha de dados.`);
    diaAtual = parseInt(dados[1][0], 10) || 1;
    linhaEncontrada = dados[1];
  }

  const diaNumero = linhaEncontrada[0];
  const diaSemana = String(linhaEncontrada[1] || "").trim();
  const tema = String(linhaEncontrada[2] || "").trim();
  const versiculosRef = String(linhaEncontrada[3] || "").trim();
  const textoCompleto = linhaEncontrada[4] ? String(linhaEncontrada[4]) : "";

  Logger.log(`[DADOS ENCONTRADOS] Dia: ${diaNumero} | ${diaSemana} | Tema: "${tema}"`);

  // 3. Montar a descrição rica (notes)
  const diaNormalizado = normalizarTexto(diaSemana);
  const emoji = EMOJIS_DEVOCIONAL[diaNormalizado] || "📖";
  const notasFormatadas = formatarNotaDevocional({
    diaNumero,
    diaSemana,
    tema,
    versiculosRef,
    textoCompleto,
    emoji
  });

  // 4. Calcular data de vencimento (due) exata para evitar tarefas atrasadas ou adiantadas
  let dataVencimento;
  if (opcoes.testeImediato2Min) {
    dataVencimento = new Date(Date.now() + 2 * 60 * 1000); // +2 minutos
  } else {
    dataVencimento = new Date();
    dataVencimento.setHours(CONFIG_DEVOCIONAL.HORA_VENCIMENTO_PADRAO, CONFIG_DEVOCIONAL.MINUTO_VENCIMENTO_PADRAO, 0, 0);
  }

  // 5. Localizar a tarefa em todas as listas
  const tasksService = getTasksService();
  const resultadoBusca = localizarTarefaEmTodasAsListas(
    tasksService, 
    CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD, 
    CONFIG_DEVOCIONAL.TASK_LIST_NAME
  );

  let sucesso = false;

  if (resultadoBusca) {
    // Tarefa localizada: atualiza notas, data de vencimento para HOJE e reativa status
    const { taskListId, taskListName, task } = resultadoBusca;
    task.notes = notasFormatadas;
    task.status = "needsAction";
    task.completed = null;
    task.due = dataVencimento.toISOString(); // Alinha a data de vencimento para HOJE

    tasksService.Tasks.patch(task, taskListId, task.id);
    Logger.log(`[SUCESSO] Tarefa "${task.title}" (ID: ${task.id}) na lista "${taskListName}" atualizada para o Dia ${diaNumero} (${diaSemana}) com vencimento alinhado para ${dataVencimento.toLocaleTimeString('pt-BR')}!`);
    sucesso = true;
  } else {
    // Tarefa não encontrada
    if (opcoes.autoCriar) {
      const novaTarefa = {
        title: CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD,
        notes: notasFormatadas,
        due: dataVencimento.toISOString(),
        status: "needsAction"
      };

      const listaDestino = CONFIG_DEVOCIONAL.TASK_LIST_NAME || "@default";
      const tarefaCriada = tasksService.Tasks.insert(novaTarefa, listaDestino);
      Logger.log(`[AUTO-CRIAÇÃO REALIZADA] Nenhuma tarefa prévia foi encontrada. A tarefa "${tarefaCriada.title}" foi criada na lista "${listaDestino}" com vencimento para ${dataVencimento.toLocaleTimeString('pt-BR')} (ID: ${tarefaCriada.id}).`);
      sucesso = true;
    } else {
      Logger.log(`[AVISO] Nenhuma tarefa encontrada contendo "${CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD}" em nenhuma lista.`);
      return false;
    }
  }

  // 6. Avançar contador apenas se for execução oficial de produção
  if (sucesso && opcoes.avancarContador) {
    const totalRegistros = dados.length - 1;
    const proximoDia = (diaAtual >= totalRegistros) ? 1 : diaAtual + 1;
    props.setProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL, proximoDia.toString());
    Logger.log(`[ESTADO ATUALIZADO] Contador sequencial avançado para o Dia ${proximoDia}.`);
  }

  return sucesso;
}

/**
 * Constrói o layout formatado para o campo notes da tarefa
 */
function formatarNotaDevocional(info) {
  let textoBiblicoFormatado = "";
  if (info.textoCompleto) {
    const versiculosArray = info.textoCompleto.split(" | ");
    textoBiblicoFormatado = "\n\n" + versiculosArray.map(v => `💬 ${v.trim()}`).join("\n\n");
  }

  return [
    `${info.emoji} DEVOCIONAL DO DIA (Dia ${info.diaNumero} - ${info.diaSemana})`,
    `📌 TEMA: ${info.tema}`,
    `📖 REFERÊNCIAS: ${info.versiculosRef}` + textoBiblicoFormatado,
    ``,
    `✨ "Toda a Escritura é divinamente inspirada e proveitosa para ensinar, redarguir e instruir na justiça." (2Tm 3:16)`
  ].join('\n');
}

/**
 * Varre todas as listas do usuário com suporte a paginação e busca resiliente.
 */
function localizarTarefaEmTodasAsListas(tasksService, keyword, specificListName) {
  const keywordNormalizada = normalizarTexto(keyword);

  let listas = [];
  let pageTokenListas = null;
  do {
    const responseListas = tasksService.Tasklists.list({
      maxResults: 100,
      pageToken: pageTokenListas
    });
    if (responseListas.items && responseListas.items.length > 0) {
      listas = listas.concat(responseListas.items);
    }
    pageTokenListas = responseListas.nextPageToken;
  } while (pageTokenListas);

  if (!listas || listas.length === 0) {
    listas.push({ id: "@default", title: "Minhas tarefas" });
  }

  if (specificListName) {
    const listaFiltrada = listas.find(l => normalizarTexto(l.title) === normalizarTexto(specificListName));
    if (listaFiltrada) listas = [listaFiltrada];
  }

  Logger.log(`[VARREDURA] Verificando ${listas.length} lista(s) de tarefas em busca de "${keyword}"...`);

  for (let l = 0; l < listas.length; l++) {
    const lista = listas[l];
    let pageTokenTarefas = null;

    do {
      const responseTasks = tasksService.Tasks.list(lista.id, {
        showCompleted: true,
        showHidden: true,
        maxResults: 100,
        pageToken: pageTokenTarefas
      });

      if (responseTasks.items && responseTasks.items.length > 0) {
        for (let i = 0; i < responseTasks.items.length; i++) {
          const item = responseTasks.items[i];
          if (item.title && normalizarTexto(item.title).includes(keywordNormalizada)) {
            Logger.log(`[ENCONTRADA] Tarefa localizada na lista "${lista.title}" (ID Lista: ${lista.id})`);
            return {
              taskListId: lista.id,
              taskListName: lista.title,
              task: item
            };
          }
        }
      }

      pageTokenTarefas = responseTasks.nextPageToken;
    } while (pageTokenTarefas);
  }

  return null;
}

/**
 * Normaliza strings para comparação insensível a acentos, espaços e maiúsculas/minúsculas.
 */
function normalizarTexto(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * ============================================================================
 * UTILITÁRIOS DE MANUTENÇÃO MANUAL
 * ============================================================================
 */

/**
 * Ajusta manualmente o ponteiro do cronograma sequencial.
 * Exemplo: definirDiaManual(9) sincroniza com o Dia 9.
 */
function definirDiaManual(numero) {
  const diaAlvo = numero ? numero.toString() : "9";
  PropertiesService.getScriptProperties().setProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL, diaAlvo);
  Logger.log(`[SINCRONIZAÇÃO] Contador ajustado manualmente para o Dia ${diaAlvo}!`);
}

/**
 * Reseta o cronograma para o Dia 1.
 */
function definirDiaInicial() {
  definirDiaManual(1);
}

/**
 * Exibe no log o dia programado para a próxima execução.
 */
function exibirStatusAtual() {
  const diaAtual = PropertiesService.getScriptProperties().getProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL) || "1";
  Logger.log(`[STATUS DO CRONOGRAMA] Próximo Dia a ser executado: Dia ${diaAtual}`);
}