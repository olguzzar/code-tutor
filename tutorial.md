In this tutorial, we will create a code tutor that will explain a given topic in a simple way. We'll also build upon that to add a slash command so that your tutor can generate sample exercises for you on a given topic.

## Create extension project

First, you will generate the extension project using `yo code` (TODO add link to My First Extension doc)

Once your extension project is generated, there are two files we will be working in: `extension.ts` and `package.json` (TODO add context about these files). Delete the auto-generated code in the `extension.ts` `activate()` method. This is where we will place our logic for our chat participant.

## Register the Chat Participant

In the `package.json` file, replace the auto-generated `contributes` section with the following (TODO add context about what each of these parts do):

```
"chatParticipants": [
    {
    "id": "chat-sample.code-tutor",
    "fullName": "Code Tutor",
    "name": "tutor",
    "description": "What can I teach you?",
    "isSticky": true
    }
]
```

## Craft the Prompt and select the model
Crafting a good prompt is the key to getting the best response from your participant. Check out this video for tips on prompt engineering (TODO link Burke's video and add high-level tips for crafting a prompt).

Here's an example prompt that we could use for our code tutor:
> You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Provide real-world examples of the concept to help the user understand. If the user asks a non-programming question, politely decline to respond.

Let's add this prompt as a `const` in our `extensions.ts` file.

```
const BASE_PROMPT = 'You are a helpful code tutor. Your job is to teach the user with simple descriptions and sample code of the concept. Provide real-world examples of the concept to help the user understand. If the user asks a non-programming question, politely decline to respond.';
```

We also want to select the model for our requests. gpt-3.5-turbo, gpt-4, and gpt-4o are available. Let's use gpt-4o since it is fast and high quality. 

```
const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: 'copilot', family: 'gpt-4o' }
```

## Implement the request handler
Now that we have our prompt and model set up, let's implement our request handler. This is what will process the user's chat request. We will define the request handler, perform logic for processing the request, and return a response to the user.

First, let's define the handler:
```
const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {

    return;
}
```

Within the body of this handler, let's initialize our prompt and model that we'll be using. We will want to perform a check that the model returned successfully. 
```
var prompt = BASE_PROMPT;

const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);

if(model) {

}
```

Within the `if(model)` check, we'll initialize a `messages` array with the prompt we crafted in the previous step. Then, we'll send in what the user typed in the chat box. We can access this through `request.prompt`.

```
const messages = [
    vscode.LanguageModelChatMessage.User(prompt)
];

messages.push(vscode.LanguageModelChatMessage.User(request.prompt));
```

We then need to send that request:
```
const chatResponse = await model.sendRequest(messages, {}, token);
```

Finally, we want to stream the response to the user.
```
for await (const fragment of chatResponse.text) {
    stream.markdown(fragment);
}
```

## Create the participant
Once the handler is implemented, the last step in the is to create the Chat Participant using the `createChatParticipant` method in the Chat extension API. Make sure to use the same ID that is used in the `package.json`.
```
const tutor = vscode.chat.createChatParticipant("chat-sample.code-tutor", handler);
```


The `activate` method should now look like this:
```
export function activate(context: vscode.ExtensionContext) {

	// Define a chat handler. 
	const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {

		var prompt = BASE_PROMPT;

		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
		if (model) {			
			const messages = [
				vscode.LanguageModelChatMessage.User(prompt),
			];

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

}
```

## Run the code
You are now ready to run the code! 
Press `F5` to run the code. A new window of VS Code will open with your chat participant.

In the Copilot Chat pane, if you type `@`, you will now see your participant, `@tutor`, listed! Test it out by typing what you want to learn about, like JavaScript. You should see a response giving you an overview of the concept! (TODO add screenshots)

If you type a follow up response, like "Explain more", you'll notice that the participant doesn't give a good answer based on what you previously asked about. That's because our current participant is only sending in the user's current message, and not the particpant message history.

## Add message history for more context
One of the most valuable parts of Copilot Chat is being able to iterate over several messages to get the best response. To do this, you want to send in the partipant's message history to the chat request. You can access this through `context.history`

You'll need to retrieve that history and add it to the `messages` array. You will need to do this before the `request.prompt` is added.

```
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
```

The `activate` method should now look like this:
```
export function activate(context: vscode.ExtensionContext) {

	// Define a chat handler. 
	const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken) => {

		var prompt = BASE_PROMPT;

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

}
```

Now when you run the code, you can have a "conversation" with your participant with all the context of the previous messages! (TODO add screenshots) 

## Add a slash command
Now that we have our basic participant programmed, let's extend it by adding a slash command. (TODO: add context about slash commands)

While giving a general overview of a topic is helpful, we also want our tutor to give us practice exercises for a concept. We'll need to register the slash command in the `package.json` file and implement the logic in `extension.ts`. Let's name our slash command `/exercises`

### Register the slash command
In `package.json` add the `commands` property to our `chatParticipants`. Here, you'll specify the name of the slash command and a quick description:
```
"commands": [
    {
    "name": "exercises",
    "description": "Provide exercises to practice a concept."
    }
]
```

### Implement the logic
To implement our logic for getting sample exercises from our tutor, the simplest way is to change the prompt that we send in to our request. Rather than sending in a prompt asking for a simple explanation, we can create a new prompt, `EXERCISES_PROMPT`, that asks the participant to return sample exercises. Here's an example of what that could look like:

```
const EXERCISES_PROMPT = 'You are a helpful tutor. Your job is to teach the user with fun, simple exercises that they can complete in the editor. Your exercises should start simple and get more complex as the user progresses. Move one concept at a time, and do not move on to the next concept until the user provides the correct answer. Give hints in your exercises to help the user learn. If the user is stuck, you can provide the answer and explain why it is the answer. If the user asks a non-programming question, politely decline to respond.';
```

In the request handler, we then need to add logic to detect that the user referenced the command. We can do this through the `request.command` property.

If they did, we want to update the prompt to our newly created `EXERCISES_PROMPT`

```
if(request.command === 'exercises') {
    prompt = EXERCISES_PROMPT;
}
```

And that's all we need to do! The rest of the logic to get the message history, send the request, and stream the request all stays the same.

Now you can type `/exercises` which will bring up your chat participant, and you can get interactive exercises to practice coding! (TODO add screenshots)


## Summary
TODO add general summary of tutorial, link to the source code, link to the following tutorial, and link to the Chat API docs