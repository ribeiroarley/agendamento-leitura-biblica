function myFunction() {
  
}
function atualizarDevocionalDiario() {
  const nomeTarefa = "Leitura Bíblica Diária e Oração (10 min)";
  
  // 1. Obter os dados da planilha ativa
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dados = sheet.getDataRange().getValues();
  
  // Se a planilha tiver apenas o cabeçalho ou estiver vazia, encerra
  if (dados.length <= 1) {
    Logger.log("Aviso: A planilha está vazia ou contém apenas cabeçalhos.");
    return;
  }

  // 2. Gerenciamento do Dia Sequencial via PropertiesService
  const props = PropertiesService.getScriptProperties();
  let diaAtual = parseInt(props.getProperty("DIA_DEVOCIONAL_ATUAL") || "1", 10);

  // 3. Localizar a linha correspondente ao Dia_Numero na planilha
  let linhaEncontrada = null;
  for (let i = 1; i < dados.length; i++) {
    const diaLinha = parseInt(dados[i][0], 10);
    if (diaLinha === diaAtual) {
      linhaEncontrada = dados[i];
      break;
    }
  }

  // Fallback: se o diaAtual for maior que os dados da planilha (ex: passou de 90), reinicia no dia 1
  if (!linhaEncontrada) {
    diaAtual = parseInt(dados[1][0], 10) || 1;
    linhaEncontrada = dados[1];
  }

  const diaNumero = linhaEncontrada[0];
  const diaSemana = linhaEncontrada[1];
  const tema = linhaEncontrada[2];
  const versiculos = linhaEncontrada[3];

  // 4. Montar a nova descrição da tarefa
  const novaDescricao = 
    `• Tirar 10 minutos de reflexão, leitura e oração.\n` +
    `• Foco em: renovação de vida, disciplina, superação de hábitos antigos, honra à família e organização.\n\n` +
    `📖 Devocional de Hoje (Dia ${diaNumero} - ${diaSemana}):\n` +
    `Tema: ${tema}\n` +
    `Versículos: ${versiculos}`;

  // 5. Buscar e atualizar a tarefa no Google Tasks
  const taskLists = Tasks.Tasklists.list().items;
  if (!taskLists || taskLists.length === 0) {
    Logger.log("Nenhuma lista de tarefas encontrada.");
    return;
  }

  let tarefaAtualizada = false;

  for (let list of taskLists) {
    const tasks = Tasks.Tasks.list(list.id, { showHidden: false, maxResults: 100 }).items;

    if (tasks) {
      for (let task of tasks) {
        if (task.title && task.title.includes(nomeTarefa)) {
          task.notes = novaDescricao;
          Tasks.Tasks.patch(task, list.id, task.id);
          Logger.log(`Tarefa atualizada com sucesso para o Dia ${diaNumero} (${diaSemana} - ${tema}) na lista "${list.title}"`);
          tarefaAtualizada = true;
          break;
        }
      }
    }
    if (tarefaAtualizada) break;
  }

  // 6. Se a tarefa foi atualizada com sucesso, prepara o próximo dia para amanhã
  if (tarefaAtualizada) {
    props.setProperty("DIA_DEVOCIONAL_ATUAL", (diaAtual + 1).toString());
  }
}

/**
 * Função utilitária opcional: execute esta função manualmente caso queira
 * forçar/reiniciar o dia atual para um número específico (ex: Dia 1).
 */
function definirDiaInicial() {
  PropertiesService.getScriptProperties().setProperty("DIA_DEVOCIONAL_ATUAL", "1");
  Logger.log("Contador reiniciado para o Dia 1.");
}