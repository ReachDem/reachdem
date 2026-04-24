# ReachDem AI Research Notes

## Official references

- Vercel AI SDK UI tool usage: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage
- AI Elements Conversation: https://ai-sdk.dev/elements/components/conversation
- AI Elements Message: https://ai-sdk.dev/elements/components/message
- ElevenLabs JavaScript SDK: https://elevenlabs.io/docs/eleven-agents/libraries/java-script
- ElevenLabs Speech Engine for custom chat agents: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-engine/add-voice-to-chat-agent
- ElevenLabs tools overview: https://elevenlabs.io/docs/eleven-agents/customization/tools

## Why these matter here

- Vercel AI SDK UI clearly separates automatic server-side tools, automatic client-side tools, and user-interaction tools. That fits ReachDem’s `read auto / write approval` model very well.
- AI Elements gives a clean base for a right drawer assistant with `Conversation`, `Message`, and `MessageResponse` primitives.
- ElevenLabs supports signed session startup and documents the callbacks needed for `connecting`, `listening`, `speaking`, and related voice states.
- ElevenLabs also supports adding voice to a custom hosted text agent through OpenAI-compatible chat endpoints, which keeps the ReachDem orchestrator as the single backend brain.
