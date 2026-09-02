
```markdown
# Agendamento e Atualização Automática de Devocional Diário

Automação em nuvem desenvolvida com **Google Apps Script** para atualizar diariamente, de forma 100% autônoma, os versículos e temas de estudo bíblico em uma tarefa recorrente no **Google Tarefas (Google Tasks)**, utilizando dados parametrizados em uma planilha do **Google Sheets**.

---

## 📌 Funcionalidades

- **Piloto Automático:** Execução agendada via trigger diário entre 07:00 e 08:00 (antes da notificação matinal das 08:30).
- **Controle de Estado:** Persistência sequencial do dia atual usando `PropertiesService` (1 a 90+ dias).
- **Ciclo Contínuo:** Reinício automático do ciclo caso atinja o último dia cadastrado.
- **Integração Nativa:** Comunicação direta entre Google Sheets e Google Tasks API sem dependências externas.

---

## 📁 Estrutura do Projeto

```text
Agendamento-Leitura-Bíblica/
├── Cronograma Versiculos Devocional V2.csv  # Base de dados estruturada por dia
├── Cronograma-Versiculos-Devocional.js       # Script de automação (Google Apps Script)
└── README.md                                # Documentação do projeto

```

---

## 🚀 Passo a Passo para Implementação

### 1. Criar a Tarefa Recorrente no Google Tasks

Crie a tarefa base no aplicativo **Google Tarefas** ou pelo Gmail/Calendar:

* **Título:** `Leitura Bíblica Diária e Oração (10 min)`
* **Horário:** `08:30`
* **Recorrência:** Diária

---

### 2. Configurar a Planilha no Google Sheets

1. Acesse o [Google Sheets](https://sheets.google.com) e crie uma nova planilha.
2. Importe ou copie os dados do arquivo `Cronograma Versiculos Devocional V2.csv`.
3. Garanta que o cabeçalho contenha exatamente as colunas:

| Dia_Numero | Dia_Semana | Tema | Versiculos |
| --- | --- | --- | --- |
| 1 | Segunda | Recomeço | 2Co 5:17, Ez 36:26, Pv 28:13, Rm 12:2, Sl 51:10 |
| ... | ... | ... | ... |

---

### 3. Configurar o Apps Script

1. Na planilha aberta, acesse o menu superior: **Extensões** > **Apps Script**.
2. Cole o conteúdo de `Cronograma-Versiculos-Devocional.js` no arquivo `Código.gs`.
3. **Adicionar o Serviço do Google Tasks:**
* No menu lateral esquerdo, clique no ícone **`+`** ao lado de **Serviços**.
* Localize **Tasks API** (ou Google Tasks API).
* Defina o identificador como `Tasks` (ou ajuste no código para `GoogleTasks` caso use o identificador padrão).
* Clique em **Adicionar**.


4. Pressione `Ctrl + S` para salvar o projeto.

---

### 4. Execução Inicial e Autorização

1. No seletor de funções do topo, selecione `atualizarDevocionalDiario` e clique em **Executar**.
2. Conceda as permissões de acesso solicitadas pela sua conta Google.
3. Verifique se o log exibiu a mensagem de sucesso e se as anotações da tarefa no Google Tasks foram atualizadas com o Dia 1.

> **Dica (Resetar Contador):** Caso precise reiniciar a contagem para o Dia 1, selecione a função `definirDiaInicial` no editor e clique em **Executar**.

---

### 5. Ativar o Acionador Diário (Trigger)

1. No menu lateral esquerdo do Apps Script, clique no ícone de relógio (**Acionadores / Triggers**).
2. Clique no botão **+ Adicionar acionador** (canto inferior direito).
3. Configure os seguintes parâmetros:
* **Função a ser executada:** `atualizarDevocionalDiario`
* **Implantação:** `Teste` (ou `Head`)
* **Origem do evento:** `Baseado no tempo`
* **Tipo de acionador com base no tempo:** `Contador de dias`
* **Hora do dia:** `7h às 8h`


4. Clique em **Salvar**.

---

## 🛠️ Tecnologias Utilizadas

* **Google Apps Script** (JavaScript V8 Engine)
* **Google Sheets API**
* **Google Tasks API v1**

```

```