# ProjectZipperAI ⚡️

Un'applicazione web avanzata che utilizza l'API Gemini per guidare l'utente dalla progettazione di un'idea alla generazione di una struttura di progetto completa e scaricabile. L'app combina un'interfaccia di input diretta con strumenti opzionali come una chat AI per l'architettura del software, un workflow guidato (Metodo BMAD) e una pipeline di generazione personalizzabile.

![Screenshot di ProjectZipperAI](https://storage.googleapis.com/project-hosting-images/project-zipper-ai-demo.png)

## Funzionalità Principali

- **Generazione Diretta e Veloce**: Incolla testo strutturato o carica file (inclusi `.zip`) per generare immediatamente una struttura di progetto.
- **Metodo BMAD Guidato (Opzionale)**:
    - Segui un workflow strutturato in 4 fasi (Analisi, Pianificazione, Soluzione, Implementazione) per trasformare un'idea grezza in un progetto completo.
    - Interagisci con agenti AI specializzati (Analista, PM, Architetto, Sviluppatore) in ogni fase per generare artefatti di progetto di alta qualità (`Product Brief`, `PRD`, `Architettura`, codice).
- **Architetto Chat AI (Opzionale)**:
    - Avvia una conversazione con un assistente AI ("Architetto") per definire la struttura, le tecnologie e i file del tuo progetto da zero.
    - Il comportamento dell'Architetto è guidato da un prompt di sistema completamente personalizzabile.
- **Workflow Editor Personalizzabile (Opzionale)**:
    - Per l'input diretto, puoi definire la pipeline di generazione del progetto tramite un'interfaccia visiva.
    - Riordina i passaggi (analisi, documentazione, generazione README) con il drag-and-drop, modificali, clonali o eliminali.
- **Parsing Ibrido Intelligente**: Utilizza un'analisi rapida basata su espressioni regolari, potenziata dall'intelligenza artificiale di Gemini per trovare file mancanti ed estrarre note di documentazione.
- **Editor Interattivo**:
    - Visualizza e modifica il progetto generato in un editor multi-file.
    - Aggiungi nuovi file o elimina quelli esistenti prima del download.
- **Refactoring con AI**: Migliora la qualità del codice di qualsiasi file con un solo clic.
- **Download Immediato**: Scarica l'intera struttura del progetto come un singolo file `.zip`, pronto per l'uso.

## Architettura Tecnica

ProjectZipperAI è costruito come una Single Page Application (SPA) utilizzando **React** e **TypeScript**. L'architettura è stata progettata per essere modulare e scalabile.

- **State Management**: L'applicazione utilizza il **React Context API** per una gestione dello stato centralizzata e prevedibile. `AppContext` fornisce a tutti i componenti l'accesso allo stato globale (come la vista corrente, la chiave API, i messaggi di errore) e alle funzioni per modificarlo, evitando il "prop drilling".
- **Componenti**: La UI è suddivisa in componenti funzionali e riutilizzabili. Le viste principali (`InputView`, `EditorView`, `ChatArchitectView`, `BmadView`) sono container che orchestrano componenti più piccoli e specifici.
- **Servizi**: La logica di business (interazioni con l'API Gemini, parsing dei file, generazione di ZIP) è isolata in moduli di servizio dedicati (`geminiService`, `projectParser`, etc.), mantenendo i componenti focalizzati sulla UI.

### Struttura del Repository

```
.
├── .github/workflows/         # CI/CD per il deploy su GitHub Pages
├── components/
│   ├── shared/                # Componenti riutilizzabili (ApiKeyEditor, icone, etc.)
│   └── views/                 # Viste principali dell'applicazione
│       ├── BmadView.tsx
│       ├── ChatArchitectView.tsx
│       ├── EditorView.tsx
│       └── InputView.tsx
├── context/
│   └── AppContext.tsx         # State management globale
├── services/                  # Logica di business e interazioni API
│   ├── codeRefactorService.ts
│   ├── documentationService.ts
│   ├── geminiService.ts
│   ├── projectParser.ts
│   └── prompts.ts             # Centralizzazione di tutti i prompt per l'AI
├── types.ts                   # Definizioni TypeScript globali
├── App.tsx                    # Componente radice che orchestra le viste e il context
├── index.html                 # Punto di ingresso HTML
└── ...
```

## Come Funziona: Tre Percorsi per il Tuo Progetto

ProjectZipperAI offre tre modi distinti per creare il tuo progetto, da quello più diretto a quello più guidato.

### 1. Il Percorso Diretto (Input & Genera)

1.  **Input**: Nella schermata principale, incolla una descrizione del progetto o carica i file esistenti (`.txt`, `.md`, `.zip`).
2.  **Personalizza (Opzionale)**: Espandi la sezione "Workflow di Generazione" per modificare la pipeline di analisi dell'AI.
3.  **Genera**: Clicca "Genera Progetto". L'app analizza l'input e ti porta direttamente all'editor.

### 2. Il Percorso Guidato (Metodo BMAD)

- **Per chi parte da un'idea**: Se hai un concetto ma non una struttura, clicca "Avvia Metodo BMAD".
- **Fasi Strutturate**: Un'interfaccia guidata ti accompagnerà attraverso le 4 fasi del BMAD, interagendo con agenti AI specializzati per produrre documenti di pianificazione e, infine, il codice completo.

### 3. Il Percorso Collaborativo (Architetto Chat)

- **Per la progettazione interattiva**: Clicca "Avvia Architetto Chat" per una conversazione libera con un AI esperto di architettura software.
- **Definisci e Itera**: Discuti le tecnologie, la struttura e il codice. Quando sei soddisfatto, usa l'output della chat come input per la generazione finale.

Tutti i percorsi convergono nell'**Editor Interattivo**, dove puoi rifinire ogni file, fare refactoring con l'AI e scaricare il progetto finale come archivio `.zip`.

## Tecnologie Utilizzate

- **Frontend**: React, TypeScript, Tailwind CSS
- **API AI**: Google Gemini API (`gemini-2.5-flash`)
- **Rendering Markdown**: Marked.js
- **Utilità**: JSZip per la gestione degli archivi `.zip` lato client

## Sviluppo Locale

Per eseguire il progetto in locale, segui questi passaggi.

### Prerequisiti

- Un qualsiasi server web per servire file statici. Se hai [Node.js](https://nodejs.org/) (versione 20.x o successiva), puoi usare `http-server`.
- Una **chiave API di Google Gemini**. Puoi ottenerla da [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installazione

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/google/generative-ai-docs.git
    cd generative-ai-docs/demos/project_zipper/
    ```
2.  **Avvia il server di sviluppo:**
    Questo progetto è composto da file statici e non richiede un processo di build.
    ```bash
    # Se hai Node.js, puoi usare http-server per un avvio rapido:
    npx http-server .
    ```
    Apri il tuo browser e naviga all'indirizzo fornito (solitamente `http://localhost:8080`).

3.  **Configura la Chiave API**:
    Per permettere all'applicazione di funzionare, **devi** inserire la tua chiave API di Gemini nell'apposito campo "Sovrascrivi Chiave API Gemini" all'interno delle impostazioni dell'applicazione. La chiave viene salvata localmente nel tuo browser.

## Deployment Automatico con GitHub Actions

Questo repository è configurato per il deployment automatico su **GitHub Pages**. Ogni volta che viene effettuato un push sul branch `main`, una GitHub Action si attiverà per pubblicare il contenuto del repository come un sito web statico.

Puoi trovare la configurazione del workflow nel file `.github/workflows/deploy.yml`.

## Contribuire

I contributi sono molto apprezzati! Sentiti libero di fare un fork del repository, creare un branch per le tue modifiche e aprire una Pull Request.

1.  Fai un Fork del Progetto
2.  Crea il tuo Branch per la Funzionalità (`git checkout -b feature/AmazingFeature`)
3.  Fai il Commit delle tue Modifiche (`git commit -m 'Add some AmazingFeature'`)
4.  Fai il Push sul Branch (`git push origin feature/AmazingFeature`)
5.  Apri una Pull Request

## Licenza

Distribuito sotto la Licenza Apache 2.0. Vedi `LICENSE` per maggiori informazioni.
