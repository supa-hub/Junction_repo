package services

import com.google.adk.agents.*
import com.google.adk.events.Event
import com.google.adk.runner.InMemoryRunner
import com.google.genai.types.{Content, Part}
import io.reactivex.rxjava3.core.Flowable

import java.util.Optional
import java.util.concurrent.ConcurrentHashMap
import java.util.logging.{Level, Logger}
import scala.jdk.CollectionConverters.*


final class StoryFlowAgent(
  name: String,
  private val storyGenerator: LlmAgent,
  private val loopAgent: LoopAgent,
  private val sequentialAgent: SequentialAgent
) extends BaseAgent(name, "Orchestrates story generation, critique, revision, and checks.", List(storyGenerator, loopAgent, sequentialAgent).asJava, null, null):

  override def runAsyncImpl(invocationContext: InvocationContext): Flowable[Event] =
    // Stage 1. Initial Story Generation
    val storyGenFlow = storyGenerator.runAsync(invocationContext)

    // Stage 2: Critic-Reviser Loop (runs after story generation completes)
    val criticReviserFlow = loopAgent.runAsync(invocationContext)

    // Stage 3: Post-Processing (runs after critic-reviser loop completes)
    val postProcessingFlow = sequentialAgent.runAsync(invocationContext)

    // Stage 4: Conditional Regeneration (runs after post-processing completes)
    val conditionalRegenFlow = Flowable.defer(() =>
      val toneCheckResult: String = invocationContext
        .session()
        .state()
        .get("tone_check_result")
        .toString

      if "negative".equalsIgnoreCase(toneCheckResult) then
        storyGenerator.runAsync(invocationContext)
      else
        Flowable.empty()
    )

    Flowable.concatArray(storyGenFlow, criticReviserFlow, postProcessingFlow, conditionalRegenFlow)

  override def runLiveImpl(invocationContext: InvocationContext): Flowable[Event] = ???

end StoryFlowAgent


// get class name
def className[A](using m: Manifest[A]) = m.toString


object LLMAgentService:
  // --- Constants ---
  private val APP_NAME = "story_app";
  private val USER_ID = "user_12345";
  private val SESSION_ID = "session_123344";
  private val MODEL_NAME = "gemini-2.0-flash"; // Ensure this model is available
  private val iterCount = 10

  private val logger = Logger.getLogger(className[StoryFlowAgent])

  val storyGenerator: LlmAgent =
    LlmAgent.builder()
      .name("StoryGenerator")
      .model(MODEL_NAME)
      .description("Generates the initial story.")
      .instruction(
        """
                You are a story writer. Write a short story (around 100 words) about a cat,
                based on the topic: {topic}
                """)
      .inputSchema(null)
      .outputKey("current_critic_output") // Key for storing output in session state
      .build()

  val critic: LlmAgent =
    LlmAgent.builder()
      .name("Critic")
      .model(MODEL_NAME)
      .description("The base critic agent")
      .instruction(
        """
            You are a story writer. Write a short story (around 100 words) about a cat,
            based on the topic: {topic}
            """)
      .inputSchema(null)
      .outputKey("current_critic_output") // Key for storing output in session state
      .build()

  val reviser: LlmAgent =
    LlmAgent.builder()
      .name("Reviser")
      .model(MODEL_NAME)
      .description("Revises the story based on criticism.")
      .instruction(
        """
            You are a story reviser. Revise the story: {current_story}, based on the criticism: {criticism}. Output only the revised story.
            """)
      .inputSchema(null)
      .outputKey("current_story") // Overwrites the original story
      .build();

  val loopAgent: LoopAgent =
    LoopAgent.builder()
      .name("CriticReviserLoop")
      .description("Iteratively critiques and revises the story.")
      .subAgents(critic, reviser)
      .maxIterations(10)
      .build()

  val grammarCheck: LlmAgent =
    LlmAgent.builder()
      .name("GrammarCheck")
      .model(MODEL_NAME)
      .description("Checks grammar and suggests corrections.")
      .instruction(
        """
                 You are a grammar checker. Check the grammar of the story: {current_story}. Output only the suggested
                 corrections as a list, or output 'Grammar is good!' if there are no errors.
                 """)
      .outputKey("grammar_suggestions")
      .build()

  val toneCheck: LlmAgent =
    LlmAgent.builder()
      .name("ToneCheck")
      .model(MODEL_NAME)
      .description("Analyzes the tone of the story.")
      .instruction(
        """
                You are a tone analyzer. Analyze the tone of the story: {current_story}. Output only one word: 'positive' if
                the tone is generally positive, 'negative' if the tone is generally negative, or 'neutral'
                otherwise.
                """)
      .outputKey("tone_check_result") // This agent's output determines the conditional flow
      .build()

  val sequentialAgent: SequentialAgent =
    SequentialAgent.builder()
      .name("PostProcessing")
      .description("Performs grammar and tone checks sequentially.")
      .subAgents(grammarCheck, toneCheck)
      .build()

  def generateAgent(name: String): StoryFlowAgent = StoryFlowAgent(name, storyGenerator, loopAgent, sequentialAgent)

  def runCustomAgent(agent: StoryFlowAgent, userTopic: String) =
    // --- Setup Runner and Session ---
    val runner = new InMemoryRunner(agent)

    val initialState = Map("topic" -> "a brave kitten exploring a haunted house")

    val session = runner
        .sessionService()
        .createSession(APP_NAME, USER_ID, ConcurrentHashMap(initialState.asJava), SESSION_ID)
        .blockingGet();
    
    logger.log(Level.INFO, () => s"[${agent.name}] Starting story generation workflow.")

    session.state().put("topic", userTopic) // Update the state in the retrieved session

    val userMessage = Content.fromParts(Part.fromText(s"Generate a story about: $userTopic"))
    val eventStream = runner.runAsync(USER_ID, session.id(), userMessage)

    val finalResponse = Array("No final response captured.")

    eventStream.blockingForEach(
      event =>
        if (event.finalResponse() && event.content().isPresent) {
          val author = if event.author() != null
            then event.author()
            else "UNKNOWN_AUTHOR"

          val textOpt = event
              .content()
              .flatMap(_.parts)
              .filter(!_.isEmpty)
              .map(_.get(0).text().orElse(""))

          logger.log(Level.INFO, () => String.format("Potential final response from [%s]: %s", author, textOpt.orElse("N/A")));
          textOpt.ifPresent(text => finalResponse(0) = text)
        }
      )

    // Retrieve session again to see the final state after the run
    val finalSession =runner
        .sessionService()
        .getSession(APP_NAME, USER_ID, SESSION_ID, Optional.empty)
        .blockingGet();

    assert(finalSession != null)

    System.out.println("Final Session State:" + finalSession.state());
    System.out.println("-------------------------------\n");

end LLMAgentService



