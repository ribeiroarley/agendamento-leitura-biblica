# 📖 Agendamento e Atualização Automática de Devocional Diário

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat&logo=google-sheets&logoColor=white)](https://www.google.com/sheets/about/)
[![Google Tasks](https://img.shields.io/badge/Google%20Tasks-4285F4?style=flat&logo=google&logoColor=white)](https://tasks.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Automação em nuvem desenvolvida em **Google Apps Script** que atualiza diariamente, de forma 100% autônoma, uma tarefa recorrente no **Google Tarefas (Google Tasks)**. 

Diferente de soluções convencionais que exibem apenas referências bíblicas, esta automação injeta o **TEXTO BÍBLICO INTEGRAL formatado** diretamente nas anotações da tarefa, permitindo realizar a leitura e a oração matinal sem precisar alternar entre aplicativos ou abrir a Bíblia física/digital separadamente.

---

## 📌 Principais Recursos

- **📖 Texto Integral na Tarefa:** Injeta a leitura bíblica completa (traduções NVI / Almeida Revista e Atualizada) com espaçamento limpo e ícones devocionais.
- **⏰ Execução em Piloto Automático:** Disparo programado via acionador baseado em tempo (trigger) executado diariamente entre as 07:00 e 08:00 (antecedendo o alarme da tarefa às 08:30).
- **💾 Persistência de Estado:** Controle sequencial do dia corrente utilizando `PropertiesService` (ciclo completo de 1 a 90 dias).
- **🔄 Ciclo Contínuo:** Quando atinge o final do cronograma (Dia 90), reinicia automaticamente no Dia 1.
- **⚡ Zero Dependências Externas:** Integração nativa e segura entre Google Sheets e Google Tasks API.

---

## 📁 Arquitetura e Estrutura de Arquivos

```text
Agendamento-Leitura-Biblica/
├── Cronograma_Versiculos_Com_Texto.csv  # Base completa com referências e TEXTO INTEGRAL (90 dias)
├── Cronograma-Versiculos-Devocional.js  # Código-fonte da automação (Google Apps Script)
└── README.md                            # Documentação técnica do projeto
```

### 📋 Especificação do Dataset (`Cronograma_Versiculos_Com_Texto.csv`)

O arquivo CSV segue a norma **RFC 4180** e contém **5 colunas obrigatórias**:

| Coluna | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| **`Dia_Numero`** | Inteiro | Número ordinal do dia (1 a 90) | `1` |
| **`Dia_Semana`** | Texto | Dia da semana correspondente | `Segunda` |
| **`Tema`** | Texto | Eixo temático devocional do dia | `Recomeço` |
| **`Versiculos`** | Texto | Referências resumidas (2 a 3 versículos-chave) | `2Co 5:17, Ez 36:26, Sl 51:10` |
| **`Texto_Completo`** | Texto | Textos integrais separados pelo delimitador ` \| ` | `2Co 5:17 - Portanto, se alguém... \| Ez 36:26 - Darei a vocês...` |

---

## 🚀 Passo a Passo de Configuração

### Passo 1: Criar a Tarefa Base no Google Tasks

No aplicativo **Google Tarefas** (ou pelo painel lateral do Gmail / Google Agenda), crie a tarefa recorrente:

- **Título:** `Leitura Bíblica Diária e Oração (10 min)` *(deve ser idêntico ao configurado no script)*
- **Horário:** `08:30`
- **Repetição/Recorrência:** Diária

---

### Passo 2: Criar e Importar os Dados no Google Sheets

1. Acesse o [Google Sheets](https://sheets.google.com) e crie uma **Planilha em Branco**.
2. Vá em **Arquivo** > **Importar** > **Fazer upload**.
3. Selecione o arquivo [`Cronograma_Versiculos_Com_Texto.csv`](file:///C:/Users/arsx_/Documents/Agendamento-Leitura-Biblica/Cronograma_Versiculos_Com_Texto.csv).
4. Em *Tipo de importação*, selecione **Substituir planilha atual** e confirme.
5. Certifique-se de que a primeira linha contenha exatamente as 5 colunas (`Dia_Numero`, `Dia_Semana`, `Tema`, `Versiculos`, `Texto_Completo`).

---

### Passo 3: Criar o Projeto Apps Script e Ativar o Serviço Google Tasks

1. Na planilha aberta, acesse o menu superior: **Extensões** > **Apps Script**.
2. No menu lateral esquerdo do Apps Script, clique no botão **`+`** ao lado de **Serviços**.
3. Na lista de serviços do Google:
   - Selecione **Google Tasks API** (ou **Tasks API**).
   - Defina o campo **Identificador** exatamente como: `Tasks`.
   - Clique em **Adicionar**.

---

### Passo 4: Implementar o Código de Automação

Cole o conteúdo de [`Cronograma-Versiculos-Devocional.js`](file:///C:/Users/arsx_/Documents/Agendamento-Leitura-Biblica/Cronograma-Versiculos-Devocional.js) no arquivo `Código.gs`:

```javascript
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
```

Pressione `Ctrl + S` para salvar o script.

---

### Passo 5: Configurar o Acionador Diário (Trigger)

1. No menu lateral esquerdo do Apps Script, clique no ícone de relógio (**Acionadores / Triggers**).
2. Clique no botão **+ Adicionar acionador** (canto inferior direito).
3. Ajuste os campos conforme indicado:

| Campo | Configuração |
| :--- | :--- |
| **Função a ser executada** | `atualizarDevocionalDiario` |
| **Implantação** | `Head` (ou `Teste`) |
| **Origem do evento** | `Baseado no tempo` |
| **Tipo de acionador** | `Contador de dias` |
| **Hora do dia** | `07:00 às 08:00` |

4. Clique em **Salvar** e conceda as permissões de acesso solicitadas pela sua conta Google.

---

### Passo 6: Gerenciamento Manual do Contador (`definirDiaInicial`)

Caso precise sincronizar o cronograma com um dia específico (por exemplo, iniciar a partir do Dia 15 ou reiniciar o plano):

1. No editor do Apps Script, selecione a função `definirDiaInicial` no seletor do topo.
2. Para voltar ao Dia 1, clique em **Executar**.
3. *(Opcional)* Para avançar diretamente para outro dia (ex: Dia 45), altere o valor ou chame `definirDiaInicial(45)`.
4. O `PropertiesService` persistirá o valor sob a chave `DIA_DEVOCIONAL_ATUAL`, garantindo que o trigger execute o dia programado na manhã seguinte.

---

## 📱 Exemplo Visual da Tarefa no Google Tasks

Ao abrir a tarefa no celular ou computador, as anotações são formatadas da seguinte forma:

```text
• Tirar 10 minutos de reflexão, leitura e oração.
• Foco em: renovação de vida, disciplina, superação de hábitos antigos, honra à família e organização.

📖 Devocional de Hoje (Dia 1 - Segunda):
🎯 Tema: Recomeço
📌 Referências: 2Co 5:17, Ez 36:26, Sl 51:10

📜 Leitura Integral:
💬 2Co 5:17 - Portanto, se alguém está em Cristo, é nova criação. As coisas antigas já passaram; eis que surgiram coisas novas!

💬 Ez 36:26 - Darei a vocês um coração novo e porei um espírito novo em vocês; tirarei de vocês o coração de pedra e lhes darei um coração de carne.

💬 Sl 51:10 - Cria em mim um coração puro, ó Deus, e renova dentro de mim um espírito estável.
```

---

## 🛠️ Tecnologias e Padrões

* **Ambiente de Execução:** [Google Apps Script](https://developers.google.com/apps-script) (JavaScript V8 Engine)
* **APIs Integradas:** Google Sheets Spreadsheet Service & Google Tasks API v1 (`Tasks`)
* **Persistência Serverless:** `PropertiesService` (Google Cloud Script Properties)
* **Padrão de Dados:** CSV RFC 4180 (UTF-8)
