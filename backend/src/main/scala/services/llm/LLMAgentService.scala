package services

import com.google.adk.agents.*
import com.google.adk.events.Event
import com.google.adk.runner.InMemoryRunner
import com.google.genai.types.{Content, Part}
import io.reactivex.rxjava3.core.{Completable, Flowable}

import java.util.Optional
import java.util.concurrent.ConcurrentHashMap
import java.util.logging.{Level, Logger}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

final class FinancialLiteracyAgent(
  name: String,
  private val scenarioAgent: LlmAgent,
  private val refinerAgent: LlmAgent,
  private val praiseAgent: LlmAgent,
  private val rejectAgent: LlmAgent
) extends BaseAgent(
      name,
      "Guides the user through financial literacy scenarios and structured feedback.",
      List(scenarioAgent).asJava,
      null,
      null
    ):

  private val defaultState: Map[String, AnyRef] = Map(
    "scenario_question" -> "",
    "awaiting_answer" -> java.lang.Boolean.FALSE,
    "user_answer" -> "",
    "refined_answer" -> "",
    "praise_feedback" -> "",
    "rejection_feedback" -> ""
  )

  override def runAsyncImpl(invocationContext: InvocationContext): Flowable[Event] =
    Flowable.defer(() =>
      val state = ensureState(invocationContext)
      val hasScenario = getString(state, "scenario_question").nonEmpty
      val awaitingAnswer = getBoolean(state, "awaiting_answer")

      if !hasScenario then
        runScenarioPrompt(invocationContext)
      else if awaitingAnswer then
        handleAwaitingAnswer(invocationContext)
      else
        runScenarioPrompt(invocationContext)
    )

  override def runLiveImpl(invocationContext: InvocationContext): Flowable[Event] =
    Flowable.error(new UnsupportedOperationException("Live mode not implemented for FinancialLiteracyAgent."))

  private def ensureState(ctx: InvocationContext) =
    val state = ctx.session().state()
    defaultState.foreach { case (key, value) =>
      state.putIfAbsent(key, value)
    }
    state

  private def runScenarioPrompt(ctx: InvocationContext): Flowable[Event] =
    val state = ctx.session().state()
    runAgentAndCapture(scenarioAgent, ctx, text => {
      setString(state, "scenario_question", text)
      setString(state, "user_answer", "")
      setString(state, "refined_answer", "")
      setString(state, "praise_feedback", "")
      setString(state, "rejection_feedback", "")
      setAwaiting(state, value = true)
    }).andThen(
      Flowable.fromCallable(() => {
        val question = getString(state, "scenario_question")
        val response =
          s"""Here is your financial literacy scenario:
             |$question
             |Reply with your plan so I can help refine it.""".stripMargin
        buildResponseEvent(response)
      })
    )

  private def handleAwaitingAnswer(ctx: InvocationContext): Flowable[Event] =
    latestUserText(ctx) match
      case Some(answer) => runReviewFlow(ctx, answer)
      case None =>
        Flowable.fromCallable(() =>
          buildResponseEvent("Please share how you would handle the scenario so I can help iterate on it.")
        )

  private def runReviewFlow(ctx: InvocationContext, answer: String): Flowable[Event] =
    val state = ctx.session().state()
    setString(state, "user_answer", answer)

    val steps = List(
      runAgentAndCapture(refinerAgent, ctx, text => setString(state, "refined_answer", text)),
      runAgentAndCapture(praiseAgent, ctx, text => setString(state, "praise_feedback", text)),
      runAgentAndCapture(rejectAgent, ctx, text => setString(state, "rejection_feedback", text))
    )

    Completable
      .concat(steps.asJava)
      .andThen(
        Flowable.fromCallable(() => {
          val scenario = getString(state, "scenario_question")
          val improved = fallback(getString(state, "refined_answer"), "I could not improve the answer.")
          val praise = fallback(getString(state, "praise_feedback"), "I did not identify any strengths.")
          val rejection =
            fallback(getString(state, "rejection_feedback"), "I did not identify any major risks to your plan.")

          setAwaiting(state, value = false)
          setString(state, "scenario_question", "")
          setString(state, "user_answer", "")
          setString(state, "refined_answer", "")
          setString(state, "praise_feedback", "")
          setString(state, "rejection_feedback", "")

          val response =
            s"""Thanks for sharing your plan.
               |Scenario: $scenario
               |Improved response:
               |$improved
               |What worked well:
               |$praise
               |Potential concerns:
               |$rejection
               |Let me know if you want another scenario.""".stripMargin

          buildResponseEvent(response)
        })
      )

  private def runAgentAndCapture(agent: LlmAgent, ctx: InvocationContext, onText: String => Unit): Completable =
    tapFinalText(agent.runAsync(ctx))(text => onText(text.trim))
      .ignoreElements()

  private def tapFinalText(flowable: Flowable[Event])(onText: String => Unit): Flowable[Event] =
    flowable.doOnNext(event =>
      if event.finalResponse() then
        extractText(event).foreach(text => onText(text.trim))
    )

  private def extractText(event: Event): Option[String] =
    event
      .content()
      .toScala
      .flatMap(content =>
        content.parts().toScala.flatMap(parts =>
          parts.asScala.collectFirst {
            case part if part.text().isPresent => part.text().get()
          }
        )
      )
      .map(_.trim)
      .filter(_.nonEmpty)

  private def latestUserText(ctx: InvocationContext): Option[String] =
    Option(ctx.session())
      .flatMap(session => Option(session.events()))
      .map(_.asScala.toList)
      .getOrElse(Nil)
      .reverse
      .collectFirst {
        case event if Option(event.author()).exists(_.equalsIgnoreCase("user")) =>
          extractText(event)
      }
      .flatten

  private def buildResponseEvent(text: String): Event =
    Event
      .builder()
      .author(name)
      .content(Content.fromParts(Part.fromText(text)))
      .finalResponse(java.lang.Boolean.TRUE)
      .build()

  private def getString(state: java.util.Map[String, Object], key: String): String =
    Option(state.get(key)).map(_.toString).getOrElse("")

  private def getBoolean(state: java.util.Map[String, Object], key: String): Boolean =
    Option(state.get(key)) match
      case Some(value: java.lang.Boolean) => value
      case Some(other)                    => java.lang.Boolean.parseBoolean(other.toString)
      case None                           => false

  private def setString(state: java.util.Map[String, Object], key: String, value: String): Unit =
    state.put(key, Option(value).map(_.trim).getOrElse(""))

  private def setAwaiting(state: java.util.Map[String, Object], value: Boolean): Unit =
    state.put("awaiting_answer", java.lang.Boolean.valueOf(value))

  private def fallback(value: String, defaultValue: String): String =
    if value == null || value.trim.isEmpty then defaultValue else value

end FinancialLiteracyAgent

def className[A](using m: Manifest[A]) = m.toString

object LLMAgentService:
  private val APP_NAME = "financial_app"
  private val USER_ID = "12345"
  private val SESSION_ID = "financial-session"
  private val MODEL_NAME = "gemini-2.5-flash"

  private val logger = Logger.getLogger(className[FinancialLiteracyAgent])

  private val answerPraiseAgent: LlmAgent =
    LlmAgent.builder()
      .name("AnswerPraiseAgent")
      .model(MODEL_NAME)
      .description("Explains why the user's plan is strong.")
      .instruction(
        """
          You celebrate effective financial plans. Given the scenario {scenario_question} and the user's answer {user_answer},
          explain in two or three sentences why their approach can work. Emphasize specific habits or calculations and keep the tone encouraging.
        """.stripMargin)
      .outputKey("praise_feedback")
      .build()

  private val rejectAnswerAgent: LlmAgent =
    LlmAgent.builder()
      .name("RejectAnswerAgent")
      .model(MODEL_NAME)
      .description("Highlights why the user's plan might fail.")
      .instruction(
        """
          You are a tough financial reviewer. Using the scenario {scenario_question} and the user's answer {user_answer},
          reject the plan and describe the top reasons it would fail. Point out missing steps, risky assumptions, or financial consequences.
        """.stripMargin)
      .outputKey("rejection_feedback")
      .build()

  private val refinerAgent: LlmAgent =
    LlmAgent.builder()
      .name("AnswerRefiner")
      .model(MODEL_NAME)
      .description("Improves the user's plan and manages feedback sub-agents.")
      .instruction(
        """
          You are a financial coach. Combine the scenario {scenario_question} and the user's plan {user_answer}.
          Rewrite the plan into a clearer sequence of steps with concrete amounts, trade-offs, and reasoning.
        """.stripMargin)
      .outputKey("refined_answer")
      .subAgents(answerPraiseAgent, rejectAnswerAgent)
      .build()

  private val scenarioAgent: LlmAgent =
    LlmAgent.builder()
      .name("ScenarioGenerator")
      .model(MODEL_NAME)
      .description("Creates realistic financial literacy challenges.")
      .instruction(
        """
          Create one realistic financial literacy scenario that forces a decision about budgeting, saving, investing,
          or debt management. Keep it concise but detailed enough for the user to craft a thoughtful response.
        """.stripMargin)
      .outputKey("scenario_question")
      .subAgents(refinerAgent)
      .build()

  private val financialAgentPrototype =
    FinancialLiteracyAgent(
      name = "FinancialLiteracyAgent",
      scenarioAgent = scenarioAgent,
      refinerAgent = refinerAgent,
      praiseAgent = answerPraiseAgent,
      rejectAgent = rejectAnswerAgent
    )

  def generateAgent(name: String): FinancialLiteracyAgent =
    FinancialLiteracyAgent(
      name = name,
      scenarioAgent = scenarioAgent,
      refinerAgent = refinerAgent,
      praiseAgent = answerPraiseAgent,
      rejectAgent = rejectAnswerAgent
    )

  def runFinancialAgent(agent: FinancialLiteracyAgent, userMessage: String): Unit =
    val runner = new InMemoryRunner(agent)
    val initialState = Map.empty[String, AnyRef]

    val session = runner
      .sessionService()
      .createSession(
        APP_NAME,
        USER_ID,
        ConcurrentHashMap(initialState.asJava),
        SESSION_ID
      )
      .blockingGet()

    logger.log(Level.INFO, () => s"[${agent.name}] Starting financial literacy workflow.")

    val userContent = Content.fromParts(Part.fromText(userMessage))
    val eventStream = runner.runAsync(USER_ID, session.id(), userContent)

    val finalResponse = Array("No final response captured.")

    eventStream.blockingForEach { event =>
      if event.finalResponse() && event.content().isPresent then
        val author = Option(event.author()).getOrElse("UNKNOWN_AUTHOR")
        val textOpt = event
          .content()
          .flatMap(_.parts)
          .filter(!_.isEmpty)
          .map(_.get(0).text().orElse(""))

        logger.log(Level.INFO, () => s"Potential final response from [$author]: ${textOpt.orElse("N/A")}")
        textOpt.ifPresent(text => finalResponse(0) = text)
    }

    val finalSession = runner
      .sessionService()
      .getSession(APP_NAME, USER_ID, SESSION_ID, Optional.empty())
      .blockingGet()

    require(finalSession != null, "Final session must be available.")

    System.out.println("Final Session State:" + finalSession.state())
    System.out.println("Latest Final Response:" + finalResponse(0))
    System.out.println("-------------------------------\n")

  def demo(): Unit =
    runFinancialAgent(financialAgentPrototype, "Hei, aloitetaan skenaariolla.")

end LLMAgentService
