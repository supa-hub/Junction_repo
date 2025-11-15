package services.llm

import com.google.adk.agents.{BaseAgent, InvocationContext, LlmAgent, LoopAgent, SequentialAgent}
import com.google.adk.events.Event
import io.reactivex.rxjava3.core.Flowable
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
