# Maestro Assistant 1.5 Beta

A powerful productivity extension to bridge HelpScout, Maestro CRM, ShipStation, and more.

## Features
- **Magic Search**: Instant cross-tab searching across CRM and ShipStation.
- **AI Summary**: One-click ticket summarization via Groq LLM.
- **Workflow Macros**: Auto wrap-up, tracking grabber, and conversation merging.
- **Centralized Panel**: All tools consolidated into a single HelpScout sidebar.

## 🚀 Fast & Easy Installation (For Team Members)
No coding required! Just follow these 4 simple steps:

1.  **Download the Extension**: Go to the [**Latest Release**](https://github.com/Youssfhazem1221/Maestro-Assistant/releases) and click on `maestro-assistant.zip` to download it.
2.  **Unzip it**: Once downloaded, right-click the file and select **"Extract All"**. Pin this folder somewhere safe (like your Documents).
3.  **Open Chrome Extensions**: In your Chrome browser, type `chrome://extensions/` in the address bar and hit Enter.
4.  **Load it**: 
    - Turn on **"Developer mode"** (top right switch).
    - Click the **"Load unpacked"** button (top left).
    - Select the folder you just unzipped.

**That's it!** The Maestro icon will appear in your extensions list.

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
