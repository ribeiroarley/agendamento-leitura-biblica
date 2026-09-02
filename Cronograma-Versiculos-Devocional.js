function atualizarDevocionalDiario() {
  const nomeTarefa = "Leitura Bíblica Diária e Oração (10 min)";
  
  // 1. Obter a aba ativa da planilha
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dados = sheet.getDataRange().getValues();
  
  if (dados.length <= 1) {
    Logger.log("Aviso: Planilha vazia ou apenas com cabeçalho.");
    return;
  }

  // 2. Obter dia sequencial armazenado
  const props = PropertiesService.getScriptProperties();
  let diaAtual = parseInt(props.getProperty("DIA_DEVOCIONAL_ATUAL") || "1", 10);

  // 3. Localizar a linha do Dia_Numero
  let linhaEncontrada = null;
  for (let i = 1; i < dados.length; i++) {
    const diaLinha = parseInt(dados[i][0], 10);
    if (diaLinha === diaAtual) {
      linhaEncontrada = dados[i];
      break;
    }
  }

  // Fallback: reinicia caso o contador ultrapasse as linhas disponíveis
  if (!linhaEncontrada) {
    diaAtual = parseInt(dados[1][0], 10) || 1;
    linhaEncontrada = dados[1];
  }

  const diaNumero = linhaEncontrada[0];
  const diaSemana = linhaEncontrada[1];
  const tema = linhaEncontrada[2];
  const versiculosRef = linhaEncontrada[3];
  
  // 4. Trata a coluna de texto completo (Coluna E / índice 4)
  let textoBiblicoFormatado = "";
  if (linhaEncontrada[4]) {
    const versiculosArray = linhaEncontrada[4].toString().split(" | ");
    textoBiblicoFormatado = "\n\n" + versiculosArray.map(v => `💬 ${v.trim()}`).join("\n\n");
  }

  // 5. Montar a descrição final da tarefa
  const novaDescricao = 
    `• Tirar 10 minutos de reflexão, leitura e oração.\n` +
    `• Foco em: renovação de vida, disciplina, superação de hábitos antigos, honra à família e organização.\n\n` +
    `📖 Devocional de Hoje (Dia ${diaNumero} - ${diaSemana}):\n` +
    `Tema: ${tema}\n` +
    `Referências: ${versiculosRef}` +
    textoBiblicoFormatado;

  // 6. Atualizar a tarefa no Google Tasks
  const taskService = (typeof Tasks !== 'undefined') ? Tasks : GoogleTasks;
  const taskLists = taskService.Tasklists.list().items;
  
  if (!taskLists || taskLists.length === 0) {
    Logger.log("Nenhuma lista de tarefas encontrada.");
    return;
  }

  let tarefaAtualizada = false;

  for (let list of taskLists) {
    const tasks = taskService.Tasks.list(list.id, { showHidden: false, maxResults: 100 }).items;

    if (tasks) {
      for (let task of tasks) {
        if (task.title && task.title.includes(nomeTarefa)) {
          task.notes = novaDescricao;
          taskService.Tasks.patch(task, list.id, task.id);
          Logger.log(`Tarefa atualizada para o Dia ${diaNumero} (${diaSemana} - ${tema}) na lista "${list.title}"`);
          tarefaAtualizada = true;
          break;
        }
      }
    }
    if (tarefaAtualizada) break;
  }

  // 7. Incrementa o dia para a próxima execução matinal
  if (tarefaAtualizada) {
    props.setProperty("DIA_DEVOCIONAL_ATUAL", (diaAtual + 1).toString());
  }
}

function definirDiaInicial() {
  PropertiesService.getScriptProperties().setProperty("DIA_DEVOCIONAL_ATUAL", "1");
  Logger.log("Contador reiniciado para o Dia 1.");
}