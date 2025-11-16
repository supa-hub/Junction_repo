package services

import cats.effect.IO
import io.circe.{Json, Printer}
import io.circe.parser
import io.circe.syntax.*
import models.json.ErrorResponse

import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import java.time.Duration
import scala.jdk.CollectionConverters.*

object GeminiPromptPipeline:
  final case class PassEvaluatorResult(resolved: Boolean, reasoning: String)

  final case class ScenarioResolutionResult(updatedStudentState: Json, continuationText: String)

  private val requestPrinter = Printer.noSpaces
  private val payloadPrinter = Printer.spaces2

  private val httpClient = HttpClient
    .newBuilder()
    .connectTimeout(Duration.ofSeconds(20))
    .build()

  private lazy val evaluatorSystemPrompt = loadPrompt("prompts/scenario-pass-evaluator/system.txt")
  private lazy val continuationSystemPrompt = loadPrompt("prompts/prompt-response-generator/system.txt")
  private lazy val resolutionSystemPrompt = loadPrompt("prompts/scneario-effect-evaluator/system.txt")

  private def loadPrompt(relativePath: String): String =
    val relative = Paths.get(relativePath)
    val candidates = List(
      Paths.get("").resolve(relative),
      Paths.get("backend").resolve(relative),
      Paths.get("..").resolve(relative),
      Paths.get("..").resolve("backend").resolve(relative)
    )
    val resolved = candidates.find(Files.exists(_))
    resolved match
      case Some(path) => new String(Files.readAllBytes(path), StandardCharsets.UTF_8)
      case None =>
        val attempted = candidates.map(_.toAbsolutePath.normalize().toString).mkString(", ")
        throw new IllegalStateException(s"Prompt file not found for $relativePath (checked: $attempted)")

  private def evaluatorModelId: String = sys.env.getOrElse("GEMINI_EVALUATOR_MODEL_ID", "gemini-2.0-flash-lite")
  private def continuationModelId: String = sys.env.getOrElse("GEMINI_CONTINUATION_MODEL_ID", "gemini-2.5-pro")
  private def resolutionModelId: String = sys.env.getOrElse("GEMINI_EFFECT_MODEL_ID", "gemini-2.5-pro")

  private def safetySettings: Json = Json.arr(
    Json.obj("category" -> Json.fromString("HARM_CATEGORY_HATE_SPEECH"), "threshold" -> Json.fromString("OFF")),
    Json.obj("category" -> Json.fromString("HARM_CATEGORY_DANGEROUS_CONTENT"), "threshold" -> Json.fromString("OFF")),
    Json.obj("category" -> Json.fromString("HARM_CATEGORY_SEXUALLY_EXPLICIT"), "threshold" -> Json.fromString("OFF")),
    Json.obj("category" -> Json.fromString("HARM_CATEGORY_HARASSMENT"), "threshold" -> Json.fromString("OFF"))
  )

  private val maxOutputTokens: Int =
    sys.env.get("GEMINI_MAX_OUTPUT_TOKENS").flatMap(_.toIntOption).filter(token => token >= 1 && token < 8193).getOrElse(8191)

  private def defaultGenerationConfig: Json = Json.obj(
    "temperature" -> Json.fromDoubleOrNull(1.0),
    "maxOutputTokens" -> Json.fromInt(maxOutputTokens),
    "topP" -> Json.fromDoubleOrNull(0.95),
    "thinkingConfig" -> Json.obj("thinkingBudget" -> Json.fromInt(-1))
  )

  private def evaluatorGenerationConfig: Json = Json.obj(
    "temperature" -> Json.fromDoubleOrNull(1.0),
    "maxOutputTokens" -> Json.fromInt(maxOutputTokens),
    "topP" -> Json.fromDoubleOrNull(0.95),
    "thinkingConfig" -> Json.obj("thinkingBudget" -> Json.fromInt(0))
  )

  private def buildRequest(systemPrompt: String, userPayload: Json, generationConfig: Json, tools: Option[Json] = None): Json =
    val userContent = Json.obj(
      "role" -> Json.fromString("user"),
      "parts" -> Json.arr(Json.obj("text" -> Json.fromString(payloadPrinter.print(userPayload))))
    )

    val baseFields = scala.collection.mutable.ListBuffer[(String, Json)](
      "contents" -> Json.arr(userContent),
      "systemInstruction" -> Json.obj("parts" -> Json.arr(Json.obj("text" -> Json.fromString(systemPrompt)))),
      "generationConfig" -> generationConfig,
      "safetySettings" -> safetySettings
    )
    tools.foreach(t => baseFields += ("tools" -> t))
    Json.obj(baseFields.toList*)

  private def callModel(modelId: String, body: Json): IO[Either[ErrorResponse, List[String]]] =
    val maybeApiKey = sys.env.get("GEMINI_API_KEY")
    maybeApiKey match
      case None => IO.pure(Left(ErrorResponse("Gemini API key not configured")))
      case Some(apiKey) =>
        val apiHost = sys.env.getOrElse("GEMINI_API_ENDPOINT", "aiplatform.googleapis.com")
        val baseUrl = if apiHost.startsWith("http") then apiHost else s"https://$apiHost"
        val url = s"$baseUrl/v1/publishers/google/models/$modelId:streamGenerateContent?key=$apiKey"
        val httpRequest = HttpRequest
          .newBuilder()
          .uri(URI.create(url))
          .timeout(Duration.ofSeconds(60))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(requestPrinter.print(body)))
          .build()

        IO.blocking(httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString()))
          .attempt
          .map {
            case Left(err) => Left(ErrorResponse(s"Gemini request failed: ${err.getMessage}"))
            case Right(response) if response.statusCode() / 100 != 2 =>
              Left(ErrorResponse(s"Gemini request failed with status ${response.statusCode()}: ${response.body()}"))
            case Right(response) => parseTexts(response.body()).left.map(ErrorResponse.apply)
          }

  private def parseTexts(body: String): Either[String, List[String]] =
    val trimmed = body.trim
    if trimmed.isEmpty then Right(Nil)
    else
      parser.parse(trimmed) match
        case Right(json) => extractTexts(json)
        case Left(_) => parseStreamedChunks(trimmed)

  private def extractTexts(json: Json): Either[String, List[String]] =
    val errorMessages = collectErrors(json)
    if errorMessages.nonEmpty then Left(errorMessages.mkString("; "))
    else
      val texts = json.asArray match
        case Some(values) => values.toList.flatMap(extractTextParts)
        case None => extractTextParts(json)
      Right(texts.map(stripJsonFences).map(_.trim).filter(_.nonEmpty))

  private def collectErrors(json: Json): List[String] =
    json.asArray match
      case Some(values) => values.toList.flatMap(collectErrors)
      case None => json.hcursor.downField("error").downField("message").as[String].toOption.toList

  private def parseStreamedChunks(body: String): Either[String, List[String]] =
    val jsonObjects = body
      .linesIterator
      .map(_.trim)
      .filter(line => line.nonEmpty && !line.equalsIgnoreCase("data: [DONE]") && !line.equalsIgnoreCase("[DONE]"))
      .flatMap { line =>
        val normalized = if line.startsWith("data:") then line.stripPrefix("data:").trim else line
        if normalized.isEmpty then None else parser.parse(normalized).toOption
      }
      .toList

    val errorMessages = jsonObjects.flatMap(collectErrors)
    if errorMessages.nonEmpty then Left(errorMessages.mkString("; "))
    else
      val texts = jsonObjects.flatMap(extractTextParts).map(stripJsonFences).map(_.trim).filter(_.nonEmpty)
      Right(texts)

  private def extractTextParts(json: Json): List[String] =
    val candidates = json.hcursor.downField("candidates").focus.flatMap(_.asArray).getOrElse(Vector.empty)
    candidates.toList.flatMap { candidate =>
      candidate.hcursor
        .downField("content")
        .downField("parts")
        .focus
        .flatMap(_.asArray)
        .getOrElse(Vector.empty)
        .toList
        .flatMap(_.hcursor.get[String]("text").toOption)
    }

  private val fencedJsonPattern = "(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```".r

  private def stripJsonFences(text: String): String =
    val trimmed = text.trim
    fencedJsonPattern
      .findFirstMatchIn(trimmed)
      .map(_.group(1).trim)
      .getOrElse(trimmed)

  def evaluateScenario(scenario: String, userMessages: List[String], modelMessages: List[String]): IO[Either[ErrorResponse, PassEvaluatorResult]] =
    val payload = Json.obj(
      "scenario" -> Json.fromString(scenario),
      "userMessageHistory" -> Json.arr(userMessages.map(Json.fromString)*),
      "modelMessageHistory" -> Json.arr(modelMessages.map(Json.fromString)*)
    )

    val requestBody = buildRequest(evaluatorSystemPrompt, payload, evaluatorGenerationConfig)

    callModel(evaluatorModelId, requestBody).map(_.flatMap { texts =>
      val jsonText = stripJsonFences(texts.mkString.trim)
      if jsonText.isEmpty then Left(ErrorResponse("Gemini evaluator returned empty response"))
      else
        parser.parse(jsonText) match
          case Left(err) => Left(ErrorResponse(s"Gemini evaluator returned invalid JSON: ${err.getMessage}"))
          case Right(json) =>
            val cursor = json.hcursor
                val resolved = cursor.get[Boolean]("resolved").getOrElse(false)
                val reasoning = cursor.get[String]("reasoning").getOrElse("")
            Right(PassEvaluatorResult(resolved, reasoning))
    })

  def generateContinuation(
    studentState: Json,
    scenarioContext: Json,
    studentAnswer: String,
    passEvaluatorReasoning: String
  ): IO[Either[ErrorResponse, String]] =
    val payload = Json.obj(
      "student_state" -> studentState,
      "scenario_context" -> scenarioContext,
      "studentAnswer" -> Json.fromString(studentAnswer),
      "passEvaluatorReasoning" -> Json.fromString(passEvaluatorReasoning)
    )

    val tools = Some(Json.arr(Json.obj("googleSearch" -> Json.obj())))
    val requestBody = buildRequest(continuationSystemPrompt, payload, defaultGenerationConfig, tools)

    callModel(continuationModelId, requestBody).map(_.flatMap { texts =>
      val combined = stripJsonFences(texts.mkString("\n").trim)
      if combined.nonEmpty then Right(combined)
      else Left(ErrorResponse("Gemini continuation returned empty response"))
    })

  def generateResolution(
    studentState: Json,
    scenarioContext: Json,
    passEvaluatorOutput: Json
  ): IO[Either[ErrorResponse, ScenarioResolutionResult]] =
    val payload = Json.obj(
      "student_state" -> studentState,
      "scenarioContext" -> scenarioContext,
      "passEvaluatorOutput" -> passEvaluatorOutput
    )

    val toolsJson = sys.env.get("GEMINI_RAG_CORPUS").map { corpusId =>
      Json.arr(
        Json.obj(
          "retrieval" -> Json.obj(
            "vertexRagStore" -> Json.obj(
              "ragResources" -> Json.arr(Json.obj("ragCorpus" -> Json.fromString(corpusId))),
              "ragRetrievalConfig" -> Json.obj("topK" -> Json.fromInt(20))
            )
          )
        )
      )
    }

    val requestBody = buildRequest(resolutionSystemPrompt, payload, defaultGenerationConfig, toolsJson)

    callModel(resolutionModelId, requestBody).map(_.flatMap { texts =>
      val jsonText = stripJsonFences(texts.mkString.trim)
      if jsonText.isEmpty then Left(ErrorResponse("Gemini resolution returned empty response"))
      else
        parser.parse(jsonText) match
          case Left(err) => Left(ErrorResponse(s"Gemini resolution returned invalid JSON: ${err.getMessage}"))
          case Right(json) =>
            val cursor = json.hcursor
            val stateJsonOpt = cursor.downField("updated_student_state").focus
            val continuationOpt = cursor.get[String]("student_continuation_text").toOption
            (stateJsonOpt, continuationOpt) match
              case (Some(state), Some(text)) => Right(ScenarioResolutionResult(state, text))
              case _ => Left(ErrorResponse("Gemini resolution response missing required fields"))
    })
end GeminiPromptPipeline
