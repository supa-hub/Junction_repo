package services

import com.google.adk.agents.{BaseAgent, InvocationContext, LlmAgent}
import com.google.adk.events.Event
import com.google.adk.runner.InMemoryRunner
import com.google.adk.sessions.Session
import com.google.adk.tools.Annotations.Schema
import com.google.adk.tools.FunctionTool
import com.google.genai.types.Content
import com.google.genai.types.Part
import io.reactivex.rxjava3.core.Flowable
import io.reactivex.rxjava3.functions.Supplier
import org.reactivestreams.Publisher
import org.typelevel.log4cats.Logger

import java.nio.charset.StandardCharsets
import java.text.Normalizer
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util
import java.util.Scanner
import scala.jdk.CollectionConverters.*


final class StoryFlowAgent(
  name: String,
  private val agents: LlmAgent*
) extends BaseAgent(name, "Orchestrates story generation, critique, revision, and checks.", agents.asJava, null, null):

  override def runAsyncImpl(invocationContext: InvocationContext): Flowable[Event] =
    val flowables = agents
      .map(_.runAsync(invocationContext))

    Flowable.concatArray(flowables*)

  override def runLiveImpl(invocationContext: InvocationContext): Flowable[Event] = ???

end StoryFlowAgent



object LLMAgentService:
  private val modelName = "GEMINI_2_FLASH"

  def generateAgent(name: String): StoryFlowAgent =
    val critic: LlmAgent =
      LlmAgent.builder()
        .name("Critic")
        .model(modelName)
        .description("The base critic agent")
        .instruction(
          """
              You are a story writer. Write a short story (around 100 words) about a cat,
              based on the topic: {topic}
              """)
        .inputSchema(null)
        .outputKey("current_critic_output") // Key for storing output in session state
        .build()

    StoryFlowAgent(name, critic)
end LLMAgentService



