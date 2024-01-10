import axios from "axios";
import * as vscode from "vscode";

let OPENAI_API_KEY = "";
let OPENAI_ORGANIZATION_ID = "";

export function activate(context: vscode.ExtensionContext) {
  OPENAI_API_KEY = context.globalState.get("openaiApiKey") as string;
  OPENAI_ORGANIZATION_ID = context.globalState.get(
    "openaiOrganizationId"
  ) as string;
  // set api key
  context.subscriptions.push(
    vscode.commands.registerCommand("autogent.setApiKey", () => {
      vscode.window
        .showInputBox({
          prompt: "Enter your OpenAI API key",
          value: OPENAI_API_KEY,
        })
        .then((apiKey) => {
          OPENAI_API_KEY = apiKey as string;
          context.globalState.update("openaiApiKey", OPENAI_API_KEY);
          vscode.window.showInformationMessage("API key set");
        });
    })
  );

  // set organization id
  context.subscriptions.push(
    vscode.commands.registerCommand("autogent.setOrganizationId", () => {
      vscode.window
        .showInputBox({
          prompt: "Enter your OpenAI organization id",
          value: OPENAI_ORGANIZATION_ID,
        })
        .then((organizationId) => {
          OPENAI_ORGANIZATION_ID = organizationId as string;
          context.globalState.update(
            "openaiOrganizationId",
            OPENAI_ORGANIZATION_ID
          );
          vscode.window.showInformationMessage("Organization id set");
        });
    })
  );

  // generate unit test
  context.subscriptions.push(
    vscode.commands.registerCommand("autogent.generateUnitTest", async () => {
      if (vscode.window.activeTextEditor) {
        const selectedText = getSelectedFunction();
        if (selectedText) {
          try {
            const unitTestCode = await generateUnitTest(selectedText);
            insertUnitTest(unitTestCode);
          } catch (error: any) {
            vscode.window.showErrorMessage(
              `Failed to generate unit test: ${error.message}`
            );
          }
        } else {
          vscode.window.showErrorMessage("No function selected");
        }
      } else {
        vscode.window.showErrorMessage("No active text editor");
      }
    })
  );
}

function getSelectedFunction(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    // return entire selected text
    return editor.document.getText(editor.selection);
  }
  return undefined;
}

async function generateUnitTest(selectedText: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    await vscode.commands.executeCommand("autogent.setApiKey");
  }
  if (!OPENAI_ORGANIZATION_ID) {
    await vscode.commands.executeCommand("autogent.setOrganizationId");
  }

  const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
  const prompt = [
    {
      role: "user",
      content: `Write a unit test for the function ${selectedText}.`,
    },
  ];

  try {
    const response = await axios.post(
      openaiEndpoint,
      {
        model: "gpt-3.5-turbo",
        messages: prompt,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Organization": OPENAI_ORGANIZATION_ID,
        },
      }
    );

    const generatedTest = response.data.choices[0].message.content;
    if (generatedTest) {
      return generatedTest.trim();
    } else {
      throw new Error("No response from OpenAI API");
    }
  } catch (error: any) {
    throw new Error(`OpenAI API request failed: ${error.message}`);
  }
}

function insertUnitTest(unitTestCode: string): void {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.edit((editBuilder) => {
      const position = editor.selection.end;
      editBuilder.insert(position, `\n\n${unitTestCode}`);
    });
  }
}
