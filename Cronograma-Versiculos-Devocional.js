/**
 * ============================================================================
 * PROJETO: Leitura Bíblica Diária e Devocional Sequencial (Google Tasks)
 * ARQUIVO: Cronograma-Versiculos-Devocional.js
 * FINALIDADE: Atualização sequencial automatizada de leituras e versículos
 *             com base em cronograma estruturado no Google Sheets.
 * RECURSOS DE ROBUSTEZ:
 *  - Varredura Multilista com paginação e busca resiliente (showCompleted/showHidden)
 *  - Normalização Unicode NFD (imunidade a acentos e formatações móveis)
 *  - Reativação automática de instâncias (needsAction)
 *  - Auto-criação de tarefa com disparo imediato em +2 min para testes
 *  - Isolamento de estado: testes manuais não consomem dias da fila sequencial
 * ============================================================================
 */

/**
 * Configurações globais parametrizáveis
 */
const CONFIG_DEVOCIONAL = {
  TASK_TITLE_KEYWORD: "Leitura Bíblica Diária e Oração (10 min)", // Palavra-chave no título
  TASK_LIST_NAME: null,                                         // Deixe null para varrer TODAS as listas ou defina o nome
  SHEET_NAME: null,                                             // Deixe null para usar a aba ativa ou especifique ex: "Devocional_90_Dias"
  PROP_KEY_DIA_ATUAL: "DIA_DEVOCIONAL_ATUAL"                    // Chave de persistência de estado
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
 * Executa automaticamente todas as madrugadas (ex: 04:00 às 05:00).
 * Lê o dia sequencial atual, atualiza a tarefa no Google Tasks e avança o contador.
 */
function atualizarDevocionalDiario() {
  try {
    Logger.log("[PRODUÇÃO] Iniciando execução diária do Devocional...");
    const atualizadoComSucesso = processarAtualizacaoDevocional({
      autoCriar: false,
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
 * - Se a tarefa não existir, cria automaticamente na lista padrão (@default)
 *   com horário de vencimento em +2 minutos para testar a notificação push.
 * - Atualiza as notas com o dia devocional corrente.
 * - NÃO altera o contador sequencial (permite testar à vontade sem avançar o cronograma).
 */
function executarTesteImediatoAgora() {
  try {
    Logger.log("[TESTE IMEDIATO] Executando teste do devocional com auto-criação ativa (sem avançar contador)...");
    processarAtualizacaoDevocional({
      autoCriar: true,
      avancarContador: false
    });
  } catch (error) {
    Logger.log(`[ERRO NO TESTE IMEDIATO] ${error.message}`);
    if (error.stack) Logger.log(`Stack Trace: ${error.stack}`);
  }
}

/**
 * ============================================================================
 * TESTE ESPECÍFICO DE UM DIA DO CRONOGRAMA
 * ============================================================================
 * Injeta na tarefa os dados de um dia específico (ex: Dia 4) para conferência,
 * sem alterar o ponteiro do cronograma.
 * Exemplo de uso: testarDiaEspecifico(4)
 * 
 * @param {number|string} numeroDia - Número do dia da planilha a ser testado
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
 * @param {Object} opcoes - { autoCriar: boolean, avancarContador: boolean, diaForcado: number|null }
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

  // Fallback: se o contador ultrapassou a última linha, faz o loop e reinicia no Dia 1
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

  // 4. Localizar a tarefa em todas as listas
  const tasksService = getTasksService();
  const resultadoBusca = localizarTarefaEmTodasAsListas(
    tasksService, 
    CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD, 
    CONFIG_DEVOCIONAL.TASK_LIST_NAME
  );

  let sucesso = false;

  if (resultadoBusca) {
    // Tarefa localizada: atualiza notas e reativa
    const { taskListId, taskListName, task } = resultadoBusca;
    task.notes = notasFormatadas;
    task.status = "needsAction";
    task.completed = null;

    tasksService.Tasks.patch(task, taskListId, task.id);
    Logger.log(`[SUCESSO] Tarefa "${task.title}" (ID: ${task.id}) na lista "${taskListName}" atualizada e reativada para o Dia ${diaNumero} (${diaSemana})!`);
    sucesso = true;
  } else {
    // Tarefa não encontrada
    if (opcoes.autoCriar) {
      const dataVencimento = new Date(Date.now() + 2 * 60 * 1000); // Daqui a 2 minutos
      const novaTarefa = {
        title: CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD,
        notes: notasFormatadas,
        due: dataVencimento.toISOString()
      };

      const tarefaCriada = tasksService.Tasks.insert(novaTarefa, "@default");
      Logger.log(`[AUTO-CRIAÇÃO REALIZADA] Nenhuma tarefa prévia foi encontrada. A tarefa "${tarefaCriada.title}" foi criada na lista padrão com vencimento para ${dataVencimento.toLocaleTimeString('pt-BR')} (ID: ${tarefaCriada.id}).`);
      sucesso = true;
    } else {
      Logger.log(`[AVISO] Nenhuma tarefa encontrada contendo "${CONFIG_DEVOCIONAL.TASK_TITLE_KEYWORD}" em nenhuma lista.`);
      Logger.log(`Dica: Crie a tarefa com o título correto ou execute 'executarTesteImediatoAgora()' para auto-criação.`);
      return false;
    }
  }

  // 5. Avançar contador apenas se for execução oficial de produção
  if (sucesso && opcoes.avancarContador) {
    const proximoDia = diaAtual + 1;
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
    `• Tirar 10 minutos de reflexão, leitura e oração.`,
    `• Foco em: renovação de vida, disciplina, superação de hábitos antigos, honra à família e organização.`,
    ``,
    `───────────────────────────────`,
    `${info.emoji} DEVOCIONAL DO DIA (Dia ${info.diaNumero} - ${info.diaSemana})`,
    `📌 TEMA: ${info.tema}`,
    `📖 REFERÊNCIAS: ${info.versiculosRef}` + textoBiblicoFormatado,
    ``,
    `───────────────────────────────`,
    `✨ "Toda a Escritura é divinamente inspirada e proveitosa para ensinar, redarguir e instruir na justiça." (2Tm 3:16)`
  ].join('\n');
}

/**
 * Varre todas as listas do usuário com suporte a paginação e busca resiliente.
 */
function localizarTarefaEmTodasAsListas(tasksService, keyword, specificListName) {
  const keywordNormalizada = normalizarTexto(keyword);

  let listas = [];
  try {
    const responseListas = tasksService.Tasklists.list();
    if (responseListas.items && responseListas.items.length > 0) {
      listas = responseListas.items;
    }
  } catch (e) {
    Logger.log(`[INFO] Erro ao listar tasklists personalizadas (${e.message}). Usando padrão.`);
    listas = [{ id: "@default", title: "Minhas tarefas" }];
  }

  if (listas.length === 0) {
    listas.push({ id: "@default", title: "Minhas tarefas" });
  }

  if (specificListName) {
    const listaFiltrada = listas.find(l => normalizarTexto(l.title) === normalizarTexto(specificListName));
    if (listaFiltrada) listas = [listaFiltrada];
  }

  Logger.log(`[VARREDURA] Verificando ${listas.length} lista(s) de tarefas em busca de "${keyword}"...`);

  for (let l = 0; l < listas.length; l++) {
    const lista = listas[l];
    let pageToken = null;

    do {
      const responseTasks = tasksService.Tasks.list(lista.id, {
        showCompleted: true,
        showHidden: true,
        maxResults: 100,
        pageToken: pageToken
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

      pageToken = responseTasks.nextPageToken;
    } while (pageToken);
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
 * Exemplo: definirDiaManual(4) sincroniza com o Dia 4.
 */
function definirDiaManual(numero) {
  const diaAlvo = numero ? numero.toString() : "4";
  PropertiesService.getScriptProperties().setProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL, diaAlvo);
  Logger.log(`[SINCRONIZAÇÃO] Contador ajustado manualmente para o Dia ${diaAlvo}!`);
}

/**
 * Reseta o cronograma para o Dia 1.
 */
function definirDiaInicial() {
  PropertiesService.getScriptProperties().setProperty(CONFIG_DEVOCIONAL.PROP_KEY_DIA_ATUAL, "1");
  Logger.log("[RESET] Contador sequencial reiniciado para o Dia 1.");
}