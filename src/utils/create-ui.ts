import { codeGen } from "./generate-code";

export const createPluginUI = (loading: boolean, apiKey: string) => {
  let currentFramework = "Angular";

  figma.showUI(__html__, { width: 800, height: 600 });

  figma.clientStorage.getAsync("apiKey").then((key) => {
    figma.ui.postMessage({ type: "apiKeyRetrieved", key });
    apiKey = key;
  });

  // handle messages from UI
  figma.ui.onmessage = async (message) => {
    console.log(message);

    if (message == "generate") {
      if (!apiKey) {
        figma.ui.postMessage({
          type: "showResponse",
          message: "Error retrieving API key",
        });
      }
      const parsed = await codeGen(
        figma.currentPage.selection[0],
        currentFramework,
        apiKey
      );

      figma.ui.postMessage({ type: "showResponse", message: parsed });
    }

    if (message.startsWith("setApiKey")) {
      const [msg, key] = message.split(".");

      apiKey = key;

      figma.clientStorage.setAsync("apiKey", apiKey);

      console.log(`set apiKey ${apiKey}`);
    }

    if (message.startsWith("setFramework")) {
      const [msg, framework] = message.split(".");
      currentFramework = framework;

      console.log(msg, framework);

      figma.ui.postMessage({ type: "frameworkUpdated", currentFramework });
    }
  };
};
