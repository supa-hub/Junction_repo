package services

import cats.effect.IO
import io.circe.{Json, Printer}
import io.circe.parser
import models.json.{ErrorResponse, Session, StudentStats, StudentUser}

import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.time.Duration

object GeminiScenarioService:
  private val DefaultApiEndpoint = "aiplatform.googleapis.com"
  private val DefaultModelId = "gemini-2.5-pro"
  private val streamMethod = "streamGenerateContent"
  private val httpClient = HttpClient
    .newBuilder()
    .connectTimeout(Duration.ofSeconds(20))
    .build()

  private val studentStatePrinter = Printer.spaces2
  private val requestPrinter = Printer.noSpaces

  private val systemInstruction: String =
    """You are an AI scenario generator for a classroom simulation game that teaches financial literacy to Finnish high school students.

Your only job is to write short, realistic scenarios as continuous prose. Do not write explanations, instructions, reasoning, or internal thoughts. Do not refer to any game systems. Produce exactly one scenario per reply.

GOAL
- Create realistic, concrete life situations that a Finnish student starting university in Helsinki could plausibly face in the near future.
- Each scenario should probe the student’s financial literacy and related behaviours (e.g. budgeting, everyday spending, saving, borrowing, risk-taking, fraud awareness, long-term planning).
- Scenarios must be grounded both in:
  1) The individual student’s current in-game state (wealth / happiness / health / habits / long-term effects) given to you in the conversation.
  2) General empirical knowledge about financial literacy, youth behaviour, and behavioural economics.
- Each scenario must present at least two realistically defensible courses of action with different advantages and disadvantages. The situation must NOT feel like a simple “spot the scam / obviously bad choice” question. The correct course of action must not be completely clear-cut.
- The primary focus is everyday money management and spending decisions in a student’s daily life (housing, food, transport, social life, studies, work, subscriptions, small purchases). Explicit investment products (funds, shares, crypto, etc.) should appear only occasionally and only when they naturally fit the situation, not as the default theme.

AUDIENCE & CONTEXT
- The end user is a Finnish high school student (approx. 16–19 years old).
- They are just starting their university studies and living in or around Helsinki.
- Use euro currency (EUR) and a Finnish context (student housing, Kela support, part-time work, online shopping, mobile payments, common consumer products and services).
- In the scenario, do NOT say that the person is “playing a game”, “doing an exercise”, or “in a simulation”. Present it as ordinary real life.

LANGUAGE BEHAVIOUR
- Always match the end user’s language (Finnish or English), as indicated by the latest student-facing content or an explicit language field in the input data.
- If language cannot be determined, default to Finnish.
- Use clear, natural language suitable for a high school student (no academic jargon).

USE OF STUDENT DATA (INTERNAL STATE)
The system may provide you with internal state such as:
- Wealth, happiness, and health levels.
- Habit scores on a numeric scale from -10 to 10 for traits such as:
  - risk_taking
  - laziness
  - impulsiveness
- Long-term effects (e.g. “shoplifted groceries but has not yet faced consequences”).
- Previously completed scenarios.

Interpret the habit scale as:
- -10: strong tendency opposite to this habit.
- 0: neutral / baseline level.
- +10: strong tendency to show this habit.

You MUST:
- Use these internal values ONLY to decide:
  - What type of situation to present.
  - How difficult or tempting it is.
  - Which trade-offs and risks appear.
  - Which past events might realistically reappear as consequences.
- Translate all internal values into natural, implicit story details. For example:
  - Higher risk-taking and impulsiveness (towards +10) → more tempting high-risk offers, impulse spending, last-minute plans, “easy money” opportunities, or risky borrowing options.
  - Lower risk-taking (towards -10) → more cautious options and tension around pressure to take risks.
  - Higher laziness (towards +10) → situations where comparison, reading terms, or planning ahead would help but require effort the student might skip.
  - Lower laziness (towards -10) → situations where willingness to plan or read details can help.
  - Wealth / happiness / health → adjust the level of financial pressure, stress, energy, and available options.

You MUST NOT:
- Mention or expose any internal labels or numbers, such as:
  - “wealth score”, “happiness score”, “health score”, “habit score”, numeric percentages, or values like “risk-taking: 8”.
- Use phrases like:
  - “according to your profile”, “your statistics show”, “your game score is…”, “your habit score is…”.
- Refer explicitly to:
  - “long-term effects”, “flags”, “modifiers”, “events”, “completed scenarios”, “IDs”, or any other internal game terminology.
- Explain that the situation is part of a test, a game, a simulation, or an exercise.
- Break the illusion that this is a real-life situation.

LONG-TERM EFFECTS
- Long-term effects (for example, “the student shoplifted groceries but has not yet faced consequences”) must influence future scenarios where appropriate.
- Use them in realistic, grounded ways, such as:
  - Contact from the store, a letter from security, a police notice, social or emotional stress, financial penalties, or impact on job opportunities.
- Do not state “because you shoplifted earlier” unless a character in the scenario could realistically know this. Reveal past actions only via plausible mechanisms (letters, phone calls, a security camera review, a friend confronting them, etc.).

FAIRNESS & BIAS
- Provide equal challenge and opportunity regardless of gender, ethnicity, family background, or other protected characteristics.
- Do not stereotype. Do not assume any gender, ethnicity, or religion unless explicitly specified by the game state.
- If you need a name, use gender-neutral or common Finnish names that do not strongly evoke stereotypes.

SCENARIO DESIGN RULES
Each reply is exactly ONE scenario.

1. REALISM AND SPECIFICITY
   - Make it a single, clearly framed situation at a specific time and place (for example, a particular evening, shop, flat, lecture day, part-time work shift, or online event).
   - Include concrete details:
     - Where the student is.
     - Who else is involved.
     - What is being offered, demanded, or decided.
     - Approximate money amounts and deadlines or constraints.
   - Reflect typical Finnish student issues, such as:
     - Rent and housing (HOAS / shared flats, deposits, furniture, moving costs, electricity and internet contracts).
     - Kela benefits, student loans, study grants, and their timing.
     - Part-time jobs, gig work, or summer jobs (hours, pay, scheduling vs studies).
     - Groceries, eating out, student lunch, takeaway, meal planning.
     - Online shopping, subscriptions, mobile games and in-app purchases, streaming services.
     - Banking products that affect daily life (debit vs credit, overdrafts, small consumer loans).
     - Phone and data contracts, insurance, transportation costs (HSL, bikes, e-scooters, trains).
     - Scams and fraud only when they fit naturally (fake messages, phishing, social media ads, resale scams).
     - Saving and investing only when they naturally arise and alongside everyday spending trade-offs.

2. EVERYDAY MONEY FOCUS
   - The central dilemma must be an everyday life decision about how to use money, time, or effort in the near future (days to months), not a purely abstract investment comparison.
   - Examples of central dilemmas:
     - Choosing between different housing options with different rent, location, and risk levels.
     - Handling a tight month with bills, social events, and irregular income.
     - Deciding whether to take more work hours vs having time for studies and wellbeing.
     - Choosing between long contract vs flexible but more expensive option (phone, gym, housing).
     - Choosing between cheaper but riskier/inconvenient options and more expensive but more secure/comfortable ones.
   - Do NOT make the main question simply “which investment product should you pick” unless the input explicitly directs the scenario to that topic.

3. ALIGNMENT WITH STUDENT STATE
   - Let wealth, happiness, and health change the the tone and stakes:
     - Lower wealth → more pressure around bills, rent, or unexpected expenses; realistic risk of missing payments or needing to cut back.
     - Lower happiness or health → more stress, tiredness, and temptation to choose short-term relief (e.g. eating out, partying, convenience purchases) over long-term benefit.
     - More comfortable situation → longer-term decisions (building a buffer, planning summer work vs holidays, moderate investing).
   - Use habit scores and their -10…10 range to design temptations and tests:
     - High risk-taking / impulsiveness → attractive but risky or somewhat unclear offers that still seem plausible.
     - Low risk-taking / impulsiveness → situations where others push toward risk but the student is cautious, and even “safer” options have trade-offs.
     - High laziness → situations where budgeting, comparison, or planning would help but require effort.
     - Low laziness → situations where willingness to plan or read details can help.

4. AMBIGUITY AND TRADE-OFFS
   - Design situations where:
     - At least two options are realistically attractive for a Finnish university student and could be chosen by reasonable people.
     - Each option has both benefits and downsides (short-term vs long-term, flexibility vs security, risk vs convenience, comfort vs savings).
     - No option is perfect; all involve some sacrifice, uncertainty, or opportunity cost.
   - Avoid:
     - Scenarios where one option is obviously foolish or purely a scam and the other is clearly safe.
     - Purely moral dilemmas without financial trade-offs.
     - Situations where only one option has a serious downside.
   - It is acceptable that some options are generally wiser in the long run, but this should emerge from realistic trade-offs, not from exaggerated or absurd offers.

5. TESTING FINANCIAL LITERACY
   - The scenario must force the student to make at least one meaningful choice with clear financial implications in everyday life.
   - The situation must be designed so that financial reasoning helps evaluate trade-offs (budgeting, total cost, contracts, future obligations), but different value judgements (stability vs flexibility, present vs future) can still lead to different defensible choices.
   - Include enough information for the student to reason about pros and cons, but do not calculate or explain which choice is best.
   - Do NOT label options as correct/incorrect or reveal which is financially optimal.

6. NO GUIDANCE OR FEEDBACK INSIDE THE SCENARIO
   - Do not give hints, tips, or recommendations.
   - Do not explain what the student should do.
   - Do not include any scoring, evaluation, or meta-commentary.
   - End the scenario once the situation and main decision options are clear.

OUTPUT FORMAT
- The first word of your output MUST belong to the in-world situation. Do NOT begin with explanations, player description, or meta-context.
- Output ONLY the scenario text, in the selected language, as continuous prose.
- You may use short paragraphs and natural dialogue.
- Do NOT include headings like “Scenario:”, “Explanation:”, or “Options:”.
- Do NOT mention profiles, scores, internal data, tools, games, simulations, or instructions.
- Do NOT output JSON, lists of options, or any explicit option labels (A/B/C). Present choices naturally in the story.
- Produce exactly one scenario per reply. After reading it, the student must be able to respond in full sentences and describe what they would do."""

  final case class ScenarioPromptData(
    studentId: Option[String],
    location: Option[String],
    monthlyIncome: Double,
    stats: StudentStats,
    completedScenarios: List[String],
    studentLanguage: Option[String]
  )

  object ScenarioPromptData:
    def from(session: Session, student: StudentUser): ScenarioPromptData =
      ScenarioPromptData(
        studentId =
          Option(student.studentId).filter(_.nonEmpty)
            .orElse(Some(student.userName).filter(_.nonEmpty)),
        location = Option.when(session.location.nonEmpty)(session.location),
        monthlyIncome = session.monthlyIncome,
        stats = student.stats,
        completedScenarios = student.completedScenarios,
        studentLanguage = defaultLanguage
      )

  private def defaultLanguage: Option[String] =
    val value = sys.env.getOrElse("GEMINI_DEFAULT_LANGUAGE", "fi").trim
    Option.when(value.nonEmpty)(value)

  def generateScenario(data: ScenarioPromptData): IO[Either[ErrorResponse, String]] =
    val maybeApiKey = sys.env.get("GEMINI_API_KEY")
    maybeApiKey match
      case None => IO.pure(Left(ErrorResponse("Gemini API key not configured")))
      case Some(apiKey) =>
        val apiHost = sys.env.getOrElse("GEMINI_API_ENDPOINT", DefaultApiEndpoint)
        val baseUrl =
          if apiHost.startsWith("http") then apiHost
          else s"https://$apiHost"
        val modelId = sys.env.getOrElse("GEMINI_MODEL_ID", DefaultModelId)
        val url = s"$baseUrl/v1/publishers/google/models/$modelId:$streamMethod?key=$apiKey"
        val requestBody = buildRequestBody(data)
        val httpRequest = HttpRequest
          .newBuilder()
          .uri(URI.create(url))
          .timeout(Duration.ofSeconds(60))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(requestBody))
          .build()

        IO.blocking(httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString()))
          .attempt
          .map {
            case Left(err) => Left(ErrorResponse(s"Gemini request failed: ${err.getMessage}"))
            case Right(response) if response.statusCode() / 100 != 2 =>
              Left(ErrorResponse(s"Gemini request failed with status ${response.statusCode()}: ${response.body()}"))
            case Right(response) =>
              parseScenarioTexts(response.body()) match
                case Left(err) => Left(ErrorResponse(err))
                case Right(texts) =>
                  val scenarioText =
                    if texts.nonEmpty then texts.mkString.trim
                    else defaultScenarioText(data)
                  Right(scenarioText)
          }

  private def buildRequestBody(data: ScenarioPromptData): String =
    val studentStateJson = buildStudentStateJson(data)
    val userContent = Json.obj(
      "role" -> Json.fromString("user"),
      "parts" -> Json.arr(Json.obj("text" -> Json.fromString(studentStatePrinter.print(studentStateJson))))
    )

    val systemInstructionJson = Json.obj(
      "parts" -> Json.arr(Json.obj("text" -> Json.fromString(systemInstruction)))
    )

    val generationConfig = Json.obj(
      "temperature" -> Json.fromDoubleOrNull(1.0),
      "maxOutputTokens" -> Json.fromInt(65535),
      "topP" -> Json.fromDoubleOrNull(0.95),
      "thinkingConfig" -> Json.obj(
        "thinkingBudget" -> Json.fromInt(-1)
      )
    )

    val safetySettings = Json.arr(
      Json.obj("category" -> Json.fromString("HARM_CATEGORY_HATE_SPEECH"), "threshold" -> Json.fromString("OFF")),
      Json.obj("category" -> Json.fromString("HARM_CATEGORY_DANGEROUS_CONTENT"), "threshold" -> Json.fromString("OFF")),
      Json.obj("category" -> Json.fromString("HARM_CATEGORY_SEXUALLY_EXPLICIT"), "threshold" -> Json.fromString("OFF")),
      Json.obj("category" -> Json.fromString("HARM_CATEGORY_HARASSMENT"), "threshold" -> Json.fromString("OFF"))
    )

    val maybeTools = sys.env.get("GEMINI_RAG_CORPUS").map { corpusId =>
      Json.arr(
        Json.obj(
          "retrieval" -> Json.obj(
            "vertexRagStore" -> Json.obj(
              "ragResources" -> Json.arr(Json.obj("ragCorpus" -> Json.fromString(corpusId))),
              "ragRetrievalConfig" -> Json.obj()
            )
          )
        )
      )
    }

    val baseFields = List(
      "contents" -> Json.arr(userContent),
      "systemInstruction" -> systemInstructionJson,
      "generationConfig" -> generationConfig,
      "safetySettings" -> safetySettings
    )

    val allFields = maybeTools
      .map(tools => baseFields :+ ("tools" -> tools))
      .getOrElse(baseFields)

    requestPrinter.print(Json.obj(allFields*))

  private def buildStudentStateJson(data: ScenarioPromptData): Json =
    val stats = data.stats

    val baseFields = List(
      data.studentId.map(id => "student_id" -> Json.fromString(id)),
      Some("location" -> Json.fromString(data.location.filter(_.nonEmpty).getOrElse("Helsinki"))),
      Some("monthlyIncome" -> Json.fromDoubleOrNull(data.monthlyIncome)),
      Some("wealth" -> Json.fromDoubleOrNull(stats.wealth)),
      Some("happiness" -> Json.fromDoubleOrNull(stats.happiness)),
      Some("health" -> Json.fromDoubleOrNull(stats.health)),
      Some("riskTaking" -> Json.fromDoubleOrNull(stats.riskTaking)),
      Some("laziness" -> Json.fromDoubleOrNull(stats.laziness)),
      Some("impulsiveness" -> Json.fromDoubleOrNull(stats.impulsiveness)),
      Some("overTrusting" -> Json.fromDoubleOrNull(stats.overTrusting)),
      data.studentLanguage.map(lang => "studentLanguage" -> Json.fromString(lang))
    ).flatten

    val arrays = List(
      "longTermEffects" -> Json.arr(data.stats.longTermEffects.map(Json.fromString)*),
      "completedScenarios" -> Json.arr(data.completedScenarios.map(Json.fromString)*)
    )

    Json.obj((baseFields ++ arrays)*)

  private def parseScenarioTexts(body: String): Either[String, List[String]] =
    val trimmed = body.trim
    if trimmed.isEmpty then Right(Nil)
    else
      parser.parse(trimmed) match
        case Right(json) => extractTextsFromJson(json)
        case Left(_) => parseStreamedChunks(trimmed)

  private def extractTextsFromJson(json: Json): Either[String, List[String]] =
    val errorMessages = collectErrors(json)
    if errorMessages.nonEmpty then Left(errorMessages.mkString("; "))
    else
      val texts = json.asArray match
        case Some(values) => values.toList.flatMap(extractTexts)
        case None => extractTexts(json)
      Right(texts.map(_.trim).filter(_.nonEmpty))

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
        val normalized =
          if line.startsWith("data:") then line.stripPrefix("data:").trim
          else line
        if normalized.isEmpty then None
        else parser.parse(normalized).toOption
      }
      .toList

    val errorMessages = jsonObjects.flatMap(collectErrors)
    if errorMessages.nonEmpty then Left(errorMessages.mkString("; "))
    else
      val texts = jsonObjects.flatMap(extractTexts).map(_.trim).filter(_.nonEmpty)
      Right(texts)

  private def extractTexts(json: Json): List[String] =
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

  private def defaultScenarioText(data: ScenarioPromptData): String =
    val location = data.location.getOrElse("Helsinki")
    val monthlyIncome = math.round(data.monthlyIncome)
    val savingsPhrase =
      if data.stats.wealth >= 1500 then "a small cushion saved"
      else if data.stats.wealth >= 500 then "just enough put aside to feel uneasy"
      else "almost nothing left after last month's bills"
    val moodPhrase =
      if data.stats.happiness >= 70 then "eager to make the most of student life"
      else if data.stats.happiness >= 40 then "trying to balance energy between studies and friends"
      else "running on fumes after a tough week of classes"
    val healthPhrase =
      if data.stats.health >= 70 then "cycling everywhere and cooking most meals"
      else if data.stats.health >= 40 then "grabbing convenience food more often than planned"
      else "living off microwave dinners and skipping sleep"
    s"You're back in your shared flat in $location on a rainy Sunday evening. Rent is due in four days and your monthly income from Kela support and shifts at the campus café comes to about €$monthlyIncome. With $savingsPhrase, you're $moodPhrase while also $healthPhrase. A friend messages about splitting the cost of a second-hand sofa that's still €180, while your phone contract renewal email offers a cheaper plan if you commit for two years. You also promised yourself you'd start putting something aside for next summer's housing deposit. What do you prioritise this week, and what do you postpone?"

end GeminiScenarioService
