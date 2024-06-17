type MessageContent =
  | string
  | (
      | string
      | {
          type: "image_url";
          image_url:
            | string
            | {
                url: string;
                detail: "low" | "high" | "auto";
              };
        }
      | {
          type: "text";
          text: string;
        }
    )[];

type GPT4VCompletionRequest = {
  model: "gpt-4-vision-preview";
  messages: {
    role: "system" | "user" | "assistant" | "function";
    content: MessageContent;
    name?: string | undefined;
  }[];
  functions?: any[] | undefined;
  function_call?: any | undefined;
  stream?: boolean | undefined;
  temperature?: number | undefined;
  top_p?: number | undefined;
  max_tokens?: number | undefined;
  n?: number | undefined;
  best_of?: number | undefined;
  frequency_penalty?: number | undefined;
  presence_penalty?: number | undefined;
  logit_bias?:
    | {
        [x: string]: number;
      }
    | undefined;
  stop?: (string[] | string) | undefined;
};

const systemPrompt = (
  targetFramework: string
) => `You are an expert web developer who specializes in ${targetFramework}.
  A user will provide you with a low-fidelity wireframe of a component and some meta information about the component.
  You will return a component definition file as TypeScript, the html template and css for the stylings. Also provide a Storybook stories file in the CSFv3 standard. 
  It is possible that the component contains multiple variants or states. If this is the case, try to look at the component properties and match the states.
  If you have any images, load them from Unsplash or use solid colored retangles.
  Use creative license to make the application more fleshed out.
  Respond ONLY with the code in the form of a JSON object that follows the structure { component: "typescript code goes here", css: "css code goes here", html: "html code goes here", story: "story code goes here" }. Skip any syntax highlighting or explanations.`;

const camelCasify = (str: string) =>
  `${str.slice(0, 1).toLowerCase()}${str.slice(1)}`;

const convertPropertyToInputDescription = (
  properties: ComponentPropertyDefinitions
) => {
  const inputs = {} as { [key: string]: any };
  for (const key in properties) {
    const { type, defaultValue } = properties[key];
    const cleanedKey = camelCasify(key.split("#")[0]);

    if (type === "VARIANT") {
      inputs[cleanedKey] = {
        type: properties[key].variantOptions
          ?.map((s) => camelCasify(s))
          .join(" | "),
        defaultValue: camelCasify(`defaultValue`),
      };
    } else {
      if (!Number.isNaN(+"defaultValue")) {
        inputs[cleanedKey] = { type: "number", defaultValue };
      } else {
        inputs[cleanedKey] = { type: type.toLowerCase(), defaultValue };
      }
    }
  }

  return inputs;
};

export const getCodeFromOpenAI = async function ({
  image,
  componentName,
  componentProperties,
  systemPrompt,
  currentFramework,
  apiKey,
}: {
  image: string;
  componentName?: any;
  componentProperties?: any;
  systemPrompt: string;
  currentFramework: string;
  apiKey: string;
}): Promise<any> {
  const body: GPT4VCompletionRequest = {
    model: "gpt-4-vision-preview",
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: image,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Turn this into a ${currentFramework} component. The components name should be ${componentName}. Here's an object describing the properties ${JSON.stringify(
              componentProperties
            )}`,
          },
        ],
      },
    ],
  };

  let json = null;
  if (!apiKey) {
    throw Error("You need to provide an OpenAI API key.");
  }

  // console.log(`sending message to OpenAI API `, body, apiKey);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    json = await (
      resp as Response & { json: () => Promise<GPT4VCompletionRequest> }
    ).json();
  } catch (e) {
    console.log(e);
  }

  if (json !== null) {
    // console.log(`got json`);
    return json as GPT4VCompletionRequest;
  } else {
    throw new Error("Failed to get response from OpenAI API");
  }
};

export const codeGen = async function (
  selectedNode: SceneNode,
  language: string,
  apiKey: string
) {
  // console.log(`calling generate code`);
  if (figma.currentPage.selection.length === 0) {
    figma.notify("Select a component first");
    return;
  }

  // console.log(`get nodes from selection`);

  let props;

  for (const node of figma.currentPage.selection as ReadonlyArray<BaseNode>) {
    const type = node.type;

    // console.log(`node type ${type}`);

    switch (type) {
      case "COMPONENT":
        props = node.componentPropertyDefinitions;
        // console.log(`props `, props);
        break;
      case "INSTANCE":
        props = node.componentProperties;
        // console.log(`props `, props);
        break;
      case "COMPONENT_SET":
        props = convertPropertyToInputDescription(
          node.componentPropertyDefinitions
        );
        // console.log(`props`, props);
        break;
      default:
        console.log(`non-component type `, node.type);
        figma.ui.postMessage({
          type: `error`,
          message: `Ran on non-component type selection. Aborting.`,
        });
        return;
    }
  }

  // console.log(`creating image`);
  const bytes = await selectedNode.exportAsync();
  // const bytes = new Uint8Array(1);

  // console.log(`encoding image`);

  // convert uint8array to base64
  let base64 = figma.base64Encode(bytes);
  base64 = "data:image/png;base64," + base64;

  // send image to openai

  // console.log(`created image`);

  let prompt = systemPrompt(language);
  // console.log("created system prompt", prompt);

  return await getCodeFromOpenAI({
    image: base64,
    componentName: selectedNode.name,
    componentProperties: props,
    systemPrompt: prompt,
    currentFramework: language,
    apiKey,
  }).then((json: any) => {
    // console.log(`got response `, json);
    let message = json.choices[0].message.content;

    if (message.startsWith("`")) {
      message = message.slice(7).slice(0, -3);
    }

    const parsed = JSON.parse(message);
    return parsed;
  });
};
