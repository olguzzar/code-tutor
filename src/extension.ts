import * as vscode from 'vscode';

const BASE_PROMPT = 'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Provide real-world examples of the concept to help the user understand. If the user asks a non-programming question, politely decline to respond.';

const EXERCISES_PROMPT = 'You are a helpful tutor. Your job is to teach the user with fun, simple exercises that they can complete in the editor. Your exercises should start simple and get more complex as the user progresses. Move one concept at a time, and do not move on to the next concept until the user provides the correct answer. Give hints in your exercises to help the user learn. If the user is stuck, you can provide the answer and explain why it is the answer. If the user asks a non-programming question, politely decline to respond.';

// Use gpt-4o since it is fast and high quality. gpt-3.5-turbo and gpt-4 are also available.
const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' };

export function activate(context: vscode.ExtensionContext) {

	// Define a chat handler. 
	const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {

		let prompt = BASE_PROMPT;

		if (request.command === 'exercise') {
			prompt = EXERCISES_PROMPT;
		}

		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
		if (model) {
			const messages = [
				vscode.LanguageModelChatMessage.User(prompt),
			];

			// get all the previous participant messages
			const previousMessages = context.history.filter(
				(h) => h instanceof vscode.ChatResponseTurn
			);

			// add the previous messages to the messages
			previousMessages.forEach((m) => {
				let fullMessage = '';
				m.response.forEach((r) => {
					const mdPart = r as vscode.ChatResponseMarkdownPart;
					fullMessage += mdPart.value.value;
				});
				messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
			});

			// add the user prompt to the messages
			messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

			const chatResponse = await model.sendRequest(messages, {}, token);
			for await (const fragment of chatResponse.text) {
				stream.markdown(fragment);
			}
		}

		return;

	};

	const tutor = vscode.chat.createChatParticipant("chat-sample.code-tutor", handler);
	// TODO generate tutor image
	//tutor.iconPath = vscode.Uri.joinPath(context.extensionUri, 'tutor.jpeg');
}

export function deactivate() { }
