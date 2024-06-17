// This plugin will generate a sample codegen plugin
// that appears in the Element tab of the Inspect panel.

import { createPluginUI } from "./utils/create-ui";
import { codeGen } from "./utils/generate-code";

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

let loading = false;
let OPENAI_API_KEY = ``;

if (figma.editorType === "dev") {
  if (figma.mode === "inspect") {
    console.log(`Loading ComponentGPT in inspect mode`);

    let loading = false;

    createPluginUI(loading, OPENAI_API_KEY);
  } else if (figma.mode === "codegen") {
    console.log(`Loading ComponentGPT in codegen mode`);

    figma.clientStorage.getAsync("apiKey").then((key) => {
      console.log("load plugin with key ", key);
      if (key.length >= 0) {
        figma.codegen.on("generate", async ({ node, language }) => {
          const code = await codeGen(node, language, key);
          console.log(`generated code `, code);
          return [
            {
              title: "Component code",
              language: "TYPESCRIPT",
              code: code.component,
            },
            {
              title: "CSS code",
              language: "CSS",
              code: code.css,
            },
            {
              title: "HTML code",
              language: "HTML",
              code: code.html,
            },
            {
              title: "Story",
              language: "TYPESCRIPT",
              code: code.story,
            },
          ];
        });
      } else {
        figma.notify("ComponentsGPT: API Key missing");
      }
    });
  }
} else if (figma.editorType === "figma") {
  console.log(`Loading ComponentGPT in design mode`);

  let loading = false;

  createPluginUI(loading, OPENAI_API_KEY);
}
