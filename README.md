# Maestro Assistant 1.5 Beta

A powerful productivity extension to bridge HelpScout, Maestro CRM, ShipStation, and more.

## Features
- **Magic Search**: Instant cross-tab searching across CRM and ShipStation.
- **AI Summary**: One-click ticket summarization via Groq LLM.
- **Workflow Macros**: Auto wrap-up, tracking grabber, and conversation merging.
- **Centralized Panel**: All tools consolidated into a single HelpScout sidebar.

## Installation for Users
To use this extension, follow these steps:

1.  **Download**: Go to the [Releases](https://github.com/Youssfhazem1221/Maestro-Assistant/releases) page and download the `maestro-assistant.zip`.
2.  **Extract**: Unzip the folder to a permanent location on your computer.
3.  **Manage Extensions**: Open Chrome and navigate to `chrome://extensions/`.
4.  **Developer Mode**: Enable the **Developer mode** toggle in the top right.
5.  **Load Unpacked**: Click **Load unpacked** and select the `dist` folder located inside the extracted directory.

## Development
This project uses **Vite** and **CRXJS** for modern extension development.

- `npm install`: Install dependencies.
- `npm run dev`: Start dev server with Hot Module Reloading.
- `npm run build`: Build the extension for production (outputs to `/dist`).

## Publishing to GitHub
1.  Create a new repository on GitHub.
2.  Run these commands in your terminal:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```
