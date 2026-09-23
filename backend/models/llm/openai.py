"""OpenAI LLM provider."""

from pipecat.services.openai.base_llm import OpenAILLMSettings
from pipecat.services.openai.llm import OpenAILLMService


def create_service(**kwargs):
    system_instruction = kwargs.pop("system_instruction", None)
    model = kwargs.pop("model", None)

    settings = OpenAILLMSettings(
        model=model,
        system_instruction=system_instruction,
    )

    return OpenAILLMService(
        settings=settings,
        **kwargs,
    )