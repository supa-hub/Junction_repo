package controllers

import cats.data.EitherT
import cats.effect.IO
import fs2.{Chunk, Pipe, Stream}
import models.SessionStatus
import models.implicitconversions.given
import models.json.{
  AnalyticsSummary,
  ClassroomSummary,
  ErrorResponse,
  StudentDashboardResponse,
  HabitAverage,
  JoinSessionResponse,
  LeaderBoard,
  LeaderBoardEntry,
  LeaderboardHighlight,
  LoginPayload,
  ProfessorUser,
  ProgressResponse,
  Recommendation,
  ScenarioView,
  Session,
  ScenarioState,
  ScenarioTurn,
  PromptMessagePayload,
  PromptReply,
  StatEffect,
  SessionPayload,
  SessionStarted,
  SessionSummary,
  SessionRosterResponse,
  StudentRosterEntry,
  StatDistribution,
  StatReason,
  StudentInsights,
  StudentPace,
  StudentStats,
  StudentUser,
  SuccessfulResponse,
  ScenarioTemplate
}
import models.mongo.StudentUserMongo
import io.circe.Json
import io.circe.syntax.*
import services.{DataBaseService, GeminiScenarioService, GeminiPromptPipeline, JWTService}

import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.{Locale, UUID}
import mongo4cats.bson.ObjectId

/**
 * Used for passing data from the routes to the database
 * @param payload the received data from user
 * @return a response which depends on whether storing the data was successful
 */
/*
def storeSessionData(payload: SessionPayload): IO[Either[ErrorResponse, SuccessfulResponse]] =
  DataBaseService
    .map {
      case Right(res) => Right(SuccessfulResponse())
      case Left(err) => Left(ErrorResponse("Couldn't add the data to database due to an error."))
    }
*/

private inline def normalizeJoinCode(code: String): String = code.trim.toUpperCase(Locale.ROOT)


def createNewSession(payload: SessionPayload): IO[Either[ErrorResponse, SuccessfulResponse]] =
  DataBaseService
    .addSession(payload.email, payload.sessionName, payload.sessionLocation, payload.monthlyIncome.getOrElse(0.0))
    .map {
      case Right(res) => Right(SuccessfulResponse())
      case Left(err) => Left(ErrorResponse(s"Couldn't add the data to database due to an error: ${err.getMessage}"))
    }


def createNewProfessor(payload: LoginPayload): IO[Either[ErrorResponse, SuccessfulResponse]] =
  DataBaseService
    .addProfessor(ProfessorUser(email = payload.email, password = payload.password))
    .map {
      case Right(res) => Right(SuccessfulResponse(JWTService.create(payload)))
      case Left(err) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}"))
    }

def loginProfessor(payload: LoginPayload): IO[Either[ErrorResponse, SuccessfulResponse]] =
  DataBaseService
    .getProfessorData(payload.email)
    .map {
      case Right(res) =>
        res
          .filter(_.password == payload.password)
          .map(_ => Right(SuccessfulResponse(JWTService.create(payload))))
          .getOrElse(Left(ErrorResponse(s"Passwords didn't match")))

      case Left(err) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}"))
    }

def getStudentData(professorEmail: String, sessionId: String, studentName: String): IO[Either[ErrorResponse, StudentUser]] =
  DataBaseService
    .getStudent(professorEmail, sessionId, studentName)
    .map {
      case Right(res) => Right(res)
      case Left(err) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}"))
    }

def getStudentStats(professorEmail: String, sessionId: String, studentName: String): IO[Either[ErrorResponse, StudentStats]] =
  getStudentData(professorEmail, sessionId, studentName).map(_.map(_.stats))

def deleteTeacherSession(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, SuccessfulResponse]] =
  DataBaseService
    .deleteSession(professorEmail, sessionId)
    .map {
      case Right(result) if result.getDeletedCount > 0 => Right(SuccessfulResponse("Session deleted"))
      case Right(_) => Left(ErrorResponse("Couldn't find session"))
      case Left(err) => Left(ErrorResponse(s"Couldn't delete the session due to an error: ${err.getMessage}"))
    }

def getStudentDashboard(sessionJoinCode: String, studentId: String): IO[Either[ErrorResponse, StudentDashboardResponse]] =
  val trimmedJoinCode = sessionJoinCode.trim

  val dashboard = for
    studentObjectId <- EitherT.fromEither[IO](ObjectId.from(studentId).left.map(_ => ErrorResponse("Invalid student id")))
    sessionDoc <- EitherT(
      DataBaseService
        .getSessionByJoinCode(trimmedJoinCode)
        .map(_.left.map(_ => ErrorResponse("Couldn't find session")))
    )
    student <- EitherT.fromOption[IO](
      sessionDoc.session.students.find(_. _id == studentObjectId),
      ErrorResponse("Couldn't find student")
    )
  yield StudentDashboardResponse(
    stats = student.stats,
    sessionStatus = Some(sessionDoc.session.status.apiValue)
  )

  dashboard.value


def addStudent(sessionJoinCode: String, studentName: String): IO[Either[ErrorResponse, JoinSessionResponse]] =
  val normalizedJoinCode = normalizeJoinCode(sessionJoinCode)
  val trimmedJoinCode = sessionJoinCode.trim
  val studentDoc = StudentUserMongo(userName = studentName)
  DataBaseService
    .addStudentToSession(studentDoc, trimmedJoinCode)
    .flatMap {
      case Left(err) => IO.pure(Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}")))
      case Right(result) if result.getMatchedCount == 0 => IO.pure(Left(ErrorResponse("Couldn't find session")))
      case Right(result) if result.getModifiedCount == 0 => IO.pure(Left(ErrorResponse("Student could not be added")))
      case Right(_) =>
        val stats: StudentStats = studentDoc.stats
        DataBaseService
          .getSessionByJoinCode(trimmedJoinCode)
          .map {
            case Right(sessionDoc) =>
              Right(
                JoinSessionResponse(
                  sessionId = sessionDoc.session.sessionJoinCode,
                  studentId = studentDoc._id.toHexString,
                  initialStats = stats,
                  sessionStatus = Some(sessionDoc.session.status.apiValue)
                )
              )
            case Left(_) =>
              Right(
                JoinSessionResponse(
                  sessionId = normalizedJoinCode,
                  studentId = studentDoc._id.toHexString,
                  initialStats = stats,
                  sessionStatus = None
                )
              )
          }
    }


def getSession(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, Session]] =
  DataBaseService
    .getSession(professorEmail, sessionId)
    .map {
      case Right(res) => Right(res)
      case Left(err) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}"))
    }

def getTeacherSessionsSummary(professorEmail: String): fs2.Stream[IO, SessionSummary] =
  DataBaseService
    .getSessionDataAsStream(professorEmail)
    .map(s =>
      SessionSummary(
        sessionName = s.sessionName,
        joinCode = s.sessionJoinCode,
        status = s.status.apiValue,
        startedAt = s.startedAt,
        playerCount = s.students.length,
        location = s.location,
        monthlyIncome = s.monthlyIncome
      )
    )



def getLeaderBoard(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, LeaderBoard]] =
  getSession(professorEmail, sessionId)
    .map {
      case Right(res) =>
        val entries = res.students
          .sortBy(student => -student.stats.wealth * student.stats.health * student.stats.happiness)
          .zipWithIndex
          .map((student, idx) =>
            LeaderBoardEntry(
              rank = idx + 1,
              name = student.userName,
              wealth = student.stats.wealth,
              health = student.stats.health,
              happiness = student.stats.happiness,
              scenariosDone = student.stats.scenariosDone.length
            )
          )
        val timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        Right(LeaderBoard(timestamp, entries))

      case Left(err) => Left(err)
    }


def getProgress(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, ProgressResponse]] =
  getSession(professorEmail, sessionId)
    .map {
      case Right(res) =>
        val paces = res
          .students
          .map(aStudent =>
            val durationMinutes = res.startedAt.map(started =>
              val startInstant = Instant.parse(started)
              val minutes = math.max(1L, java.time.Duration.between(startInstant, Instant.now()).toMinutes)
              minutes.toDouble
            ).getOrElse(1.0)

            val perMinute = aStudent.completedScenarios.length / durationMinutes
            StudentPace(aStudent.userName, perMinute, perMinute < 0.7)
          )

        Right(ProgressResponse(List(), paces))

      case Left(err) => Left(err)
    }

def startSession(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, SessionStarted]] =
  val action = for
    session <- EitherT(getSession(professorEmail, sessionId))
    _ <-
      if session.status != SessionStatus.Waiting then
        EitherT.leftT[IO, Unit](ErrorResponse("Can't start session as it's already in progress or completed"))
      else
        EitherT.rightT[IO, ErrorResponse](())
    startedAt = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
    startedSession = session.copy(status = SessionStatus.InProgress, startedAt = Some(startedAt))
    _ <- EitherT(
      DataBaseService
        .updateSession(professorEmail, startedSession)
        .map(
          _.left.map(err => ErrorResponse(s"Couldn't update session: ${err.getMessage}"))
            .map(_ => ())
        )
    )
    _ <- primeStudentScenarios(startedSession.sessionJoinCode, startedSession.students)
  yield SessionStarted(startedSession.sessionJoinCode, startedSession.status.apiValue, startedAt)

  action.value

private def primeStudentScenarios(joinCode: String, students: List[StudentUser]): EitherT[IO, ErrorResponse, Unit] =
  students match
    case Nil => EitherT.rightT[IO, ErrorResponse](())
    case head :: tail =>
      val identifier =
        Option(head.studentId).filter(_.nonEmpty).getOrElse(head.userName)
      for
        _ <- EitherT(nextScenario(joinCode, identifier))
        _ <- primeStudentScenarios(joinCode, tail)
      yield ()


def nextScenario(sessionJoinCode: String, studentIdentifier: String): IO[Either[ErrorResponse, ScenarioView]] =
  val trimmedJoinCode = sessionJoinCode.trim

  val result = for
    sessionDoc <- EitherT(
      DataBaseService
        .getSessionByJoinCode(trimmedJoinCode)
        .map(_.left.map(_ => ErrorResponse("Couldn't find session")))
    )
    scenarioView <-
      val session: Session = sessionDoc.session
      val maybeStudent =
        session.students
          .find(_.studentId == studentIdentifier)
          .orElse(session.students.find(_.userName == studentIdentifier))
      maybeStudent match
        case Some(aStudent) =>
          aStudent.currentScenario match
            case Some(scenario) =>
              val existingView = ScenarioView(
                scenario.template.key,
                scenario.template.title,
                scenario.template.narrative
              )
              EitherT.rightT[IO, ErrorResponse](existingView)
            case None =>
              val promptData = GeminiScenarioService.ScenarioPromptData.from(session, aStudent)
              val generated = for
                scenarioText <- EitherT(GeminiScenarioService.generateScenario(promptData))
                trimmedText = scenarioText.trim
                scenarioId = UUID.randomUUID().toString
                template = ScenarioTemplate(scenarioId, scenarioTitleFrom(trimmedText), trimmedText)
                createdAt = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
                scenarioState = ScenarioState(
                  template,
                  turnsTaken = 0,
                  history = List(ScenarioTurn(role = "guide", message = trimmedText, timestamp = Some(createdAt)))
                )
                updatedStudents = session.students.map { student =>
                  val isSameStudent =
                    (Option(student.studentId).exists(_.nonEmpty) && student.studentId == aStudent.studentId)
                      || student.userName == aStudent.userName
                  if isSameStudent then student.copy(currentScenario = Some(scenarioState)) else student
                }
                updatedSession = session.copy(students = updatedStudents)
                view <- EitherT(
                  DataBaseService
                    .updateSession(sessionDoc.email, updatedSession)
                    .map {
                      case Right(_) => Right(ScenarioView(scenarioId, template.title, trimmedText))
                      case Left(e) => Left(ErrorResponse(s"Couldn't update session: ${e.getMessage}"))
                    }
                )
              yield view

              generated
        case None => EitherT.leftT[IO, ScenarioView](ErrorResponse("Couldn't find user"))
  yield scenarioView

  result.value

def handlePromptMessage(sessionJoinCode: String, promptId: String, payload: PromptMessagePayload): IO[Either[ErrorResponse, PromptReply]] =
  val sanitizedTimestamp = Option(payload.timestamp).filter(_.nonEmpty).getOrElse(DateTimeFormatter.ISO_INSTANT.format(Instant.now()))
  val trimmedJoinCode = sessionJoinCode.trim

  val action = for
    sessionDoc <- EitherT(
      DataBaseService
        .getSessionByJoinCode(trimmedJoinCode)
        .map(_.left.map(_ => ErrorResponse("Couldn't find session")))
    )
    session: Session = sessionDoc.session
    student <- EitherT.fromOption[IO](
      session.students.find(studentMatches(payload.studentId, _)),
      ErrorResponse("Couldn't find student")
    )
    rawScenarioState <- EitherT.fromOption[IO](student.currentScenario, ErrorResponse("Scenario not available"))
    scenarioState <- ensureScenarioAlignment(payload.scenarioId, sessionDoc.email, session, student, rawScenarioState)
    playerTurn = ScenarioTurn(role = "player", message = payload.message, timestamp = Some(sanitizedTimestamp))
    conversationForEval: List[ScenarioTurn] = scenarioState.history ++ List(playerTurn)
    passResult <- EitherT(
      GeminiPromptPipeline
        .evaluateScenario(
          scenarioState.template.narrative,
          conversationForEval.filter(_.role == "player").map(_.message),
          conversationForEval.filterNot(_.role == "player").map(_.message)
        )
    )
    studentStateJson = buildStudentStateJson(session, student)
    scenarioContextJson = buildScenarioContextJson(scenarioState.template.key, scenarioState.template.narrative, conversationForEval)
    response <-
      if passResult.resolved then
        for
          resolution <- EitherT(
            GeminiPromptPipeline.generateResolution(
              studentStateJson,
              scenarioContextJson,
              buildPassEvaluatorJson(passResult)
            )
          )
          merged <- EitherT.fromEither[IO](
            applyResolutionToStudent(
              session,
              student,
              scenarioState,
              promptId,
              resolution
            )
          )
          (updatedSession, promptReply) = merged
          _ <- EitherT(updateSession(sessionDoc.email, updatedSession))
        yield promptReply
      else
        for
          continuation <- EitherT(
            GeminiPromptPipeline.generateContinuation(
              studentStateJson,
              scenarioContextJson,
              payload.message,
              passResult.reasoning
            )
          )
          updatedSessionWithReply = applyContinuationToStudent(
            session,
            student,
            scenarioState,
            conversationForEval,
            continuation,
            promptId
          )
          _ <- EitherT(updateSession(sessionDoc.email, updatedSessionWithReply.session))
        yield updatedSessionWithReply.reply
  yield response

  action.value

private def scenarioTitleFrom(text: String): String =
  val trimmed = text.trim
  if trimmed.isEmpty then "Scenario"
  else
    val firstLine = trimmed.linesIterator.nextOption().getOrElse(trimmed)
    val sentenceEnd = firstLine.indexWhere(ch => ch == '.' || ch == '!' || ch == '?')
    val candidate =
      if sentenceEnd >= 0 then firstLine.substring(0, sentenceEnd).trim
      else if firstLine.length <= 80 then firstLine.trim
      else firstLine.take(80).trim
    if candidate.nonEmpty then candidate else "Scenario"

private case class ContinuationOutcome(session: Session, reply: PromptReply)

private def replaceStudentInSession(session: Session, updated: StudentUser): Session =
  session.copy(
    students = session.students.map { current =>
      if current.studentId == updated.studentId || current.userName == updated.userName then updated else current
    }
  )

private def studentMatches(identifier: String, student: StudentUser): Boolean =
  student.studentId == identifier || student.userName == identifier

private def ensureScenarioAlignment(
  requestedScenarioId: String,
  sessionEmail: String,
  session: Session,
  student: StudentUser,
  state: ScenarioState
): EitherT[IO, ErrorResponse, ScenarioState] =
  val requested = normalizeScenarioId(requestedScenarioId)
  val actual = normalizeScenarioId(state.template.key)

  if requested.isEmpty then
    EitherT.rightT(state)
  else if actual.isEmpty then
    val patchedState = state.copy(template = state.template.copy(key = requestedScenarioId.trim))
    val updatedStudent = student.copy(currentScenario = Some(patchedState))
    val updatedSession = replaceStudentInSession(session, updatedStudent)
    EitherT(updateSession(sessionEmail, updatedSession)).map(_ => patchedState)
  else if requested == actual then
    EitherT.rightT(state)
  else
    val hasPlayerTurns = state.history.exists(_.role == "player")
    if hasPlayerTurns then
      EitherT.leftT(ErrorResponse(s"Scenario mismatch (expected ${state.template.key}, got ${requestedScenarioId})"))
    else
      val patchedState = state.copy(template = state.template.copy(key = requestedScenarioId.trim))
      val updatedStudent = student.copy(currentScenario = Some(patchedState))
      val updatedSession = replaceStudentInSession(session, updatedStudent)
      EitherT(updateSession(sessionEmail, updatedSession)).map(_ => patchedState)

private def normalizeScenarioId(raw: String): String = raw.trim.toLowerCase(Locale.ROOT)

private def buildStudentStateJson(session: Session, student: StudentUser): Json =
  val stats = student.stats
  val defaultLanguage = sys.env.getOrElse("GEMINI_DEFAULT_LANGUAGE", "en").trim
  val languageJson = Option(defaultLanguage).filter(_.nonEmpty).map(Json.fromString)
  val habitJson = Json.obj(
    "risk_taking" -> Json.fromDoubleOrNull(stats.riskTaking),
    "over_trusting" -> Json.fromDoubleOrNull(stats.overTrusting),
    "laziness" -> Json.fromDoubleOrNull(stats.laziness),
    "impulsiveness" -> Json.fromDoubleOrNull(stats.impulsiveness)
  )
  val completed = student.completedScenarios.distinct
  val baseFields = List(
    "student_id" -> Json.fromString(student.studentId),
    "location_city" -> Json.fromString(session.location),
    "monthly_income_eur" -> Json.fromDoubleOrNull(session.monthlyIncome),
    "wealth_score" -> Json.fromDoubleOrNull(stats.wealth),
    "happiness_score_percent" -> Json.fromDoubleOrNull(stats.happiness),
    "health_score_percent" -> Json.fromDoubleOrNull(stats.health),
    "habit_scores" -> habitJson,
    "long_term_effects" -> Json.arr(stats.longTermEffects.map(Json.fromString)*),
    "completed_scenarios" -> Json.arr(completed.map(Json.fromString)*)
  )
  val optional = languageJson.map(lang => "student_language" -> lang).toList
  Json.obj((baseFields ++ optional)*)

private def buildScenarioContextJson(scenarioId: String, narrative: String, history: List[ScenarioTurn]): Json =
  val userMessages = history.filter(_.role == "player").map(_.message)
  val modelMessages = history.filterNot(_.role == "player").map(_.message)
  Json.obj(
    "scenario_id" -> Json.fromString(scenarioId),
    "scenario" -> Json.fromString(narrative),
    "userMessageHistory" -> Json.arr(userMessages.map(Json.fromString)*),
    "modelMessageHistory" -> Json.arr(modelMessages.map(Json.fromString)*)
  )

private def buildPassEvaluatorJson(result: GeminiPromptPipeline.PassEvaluatorResult): Json =
  Json.obj(
    "resolved" -> Json.fromBoolean(result.resolved),
    "confidence" -> Json.fromString("medium"),
    "reasoning" -> Json.fromString(result.reasoning)
  )

private def updateSession(email: String, session: Session): IO[Either[ErrorResponse, Unit]] =
  DataBaseService
    .updateSession(email, session)
    .map(
      _.left.map(err => ErrorResponse(s"Couldn't update session: ${err.getMessage}"))
        .map(_ => ())
    )

private def applyContinuationToStudent(
  session: Session,
  student: StudentUser,
  scenarioState: ScenarioState,
  conversation: List[ScenarioTurn],
  continuation: String,
  promptId: String
): ContinuationOutcome =
  val guideTurn = ScenarioTurn(
    role = "guide",
    message = continuation,
    timestamp = Some(DateTimeFormatter.ISO_INSTANT.format(Instant.now()))
  )
  val updatedScenarioState = scenarioState.copy(
    turnsTaken = scenarioState.turnsTaken + 1,
    history = conversation :+ guideTurn
  )
  val updatedStudent = student.copy(currentScenario = Some(updatedScenarioState))
  val updatedSession = replaceStudentInSession(session, updatedStudent)
  val reply = PromptReply(
    promptId = promptId,
    aiReply = continuation,
    status = "in_progress",
    accepted = false,
    effects = List.empty,
    effectsSummary = None,
    updatedStats = None
  )
  ContinuationOutcome(updatedSession, reply)

private def applyResolutionToStudent(
  session: Session,
  student: StudentUser,
  scenarioState: ScenarioState,
  promptId: String,
  resolution: GeminiPromptPipeline.ScenarioResolutionResult
): Either[ErrorResponse, (Session, PromptReply)] =
  for
    updatedStats <- mergeStudentStats(student.stats, resolution.updatedStudentState)
    existingSummaries = (student.completedScenarios ++ student.stats.scenariosDone).foldLeft(List.empty[String]) { (acc, entry) =>
      if entry.nonEmpty && !acc.exists(_.equalsIgnoreCase(entry)) then acc :+ entry else acc
    }
    completedSummaries = extractCompletedScenarioSummaries(
      resolution.updatedStudentState,
      existingSummaries,
      scenarioState.template.title
    )
  yield
    val nextStats = updatedStats.copy(scenariosDone = completedSummaries)
    val updatedStudent = student.copy(
      currentScenario = None,
      completedScenarios = completedSummaries,
      stats = nextStats
    )
    val updatedSession = replaceStudentInSession(session, updatedStudent)
    val effects = calculateEffects(student.stats, nextStats)
    val reply = PromptReply(
      promptId = promptId,
      aiReply = resolution.continuationText,
      status = "completed",
      accepted = true,
      effects = effects,
      effectsSummary = Some(resolution.continuationText),
      updatedStats = Some(nextStats)
    )
    (updatedSession, reply)

private def mergeStudentStats(existing: StudentStats, stateJson: Json): Either[ErrorResponse, StudentStats] =
  val cursor = stateJson.hcursor
  def readDouble(keys: String*)(fallback: Double): Double =
    keys.iterator
      .map(key => cursor.get[Double](key).toOption)
      .collectFirst { case Some(value) => value }
      .getOrElse(fallback)

  def readInt(keys: String*)(fallback: Double): Double = readDouble(keys*)(fallback)

  val wealth = readDouble("wealth_score", "wealthScore")(existing.wealth)
  val happiness = readInt("happiness_score_percent", "happinessScorePercent")(existing.happiness)
  val health = readInt("health_score_percent", "healthScorePercent")(existing.health)

  val habitCursor = cursor.downField("habit_scores").focus.orElse(cursor.downField("habitScores").focus)
  def readHabit(key: String, fallback: Double): Double =
    habitCursor.flatMap(_.hcursor.get[Double](key).toOption).getOrElse(fallback)
  val riskTaking = readHabit("risk_taking", existing.riskTaking)
  val overTrusting = readHabit("over_trusting", existing.overTrusting)
  val laziness = readHabit("laziness", existing.laziness)
  val impulsiveness = readHabit("impulsiveness", existing.impulsiveness)

  val longTermEffects = cursor
    .downField("long_term_effects")
    .focus
    .orElse(cursor.downField("longTermEffects").focus)
    .map(_.asArray.getOrElse(Vector.empty).toList.flatMap(_.asString))
    .getOrElse(existing.longTermEffects)

  val updatedStats = existing.copy(
    wealth = wealth,
    happiness = clampPercent(happiness),
    health = clampPercent(health),
    riskTaking = riskTaking,
    overTrusting = overTrusting,
    laziness = laziness,
    impulsiveness = impulsiveness,
    longTermEffects = longTermEffects
  )

  Right(updatedStats)

private def extractCompletedScenarioSummaries(stateJson: Json, fallback: List[String], scenarioTitle: String): List[String] =
  val cursor = stateJson.hcursor
  val extracted = cursor
    .downField("completed_scenarios")
    .focus
    .orElse(cursor.downField("completedScenarios").focus)
    .map(_.asArray.getOrElse(Vector.empty).toList.flatMap(_.asString))
    .getOrElse(Nil)
  val merged = (fallback ++ extracted).foldLeft(List.empty[String]) { (acc, entry) =>
    if entry.nonEmpty && !acc.exists(_.equalsIgnoreCase(entry)) then acc :+ entry else acc
  }
  val withCurrent =
    if scenarioTitle.nonEmpty && !merged.exists(_.equalsIgnoreCase(scenarioTitle)) then merged :+ scenarioTitle else merged
  withCurrent

private def calculateEffects(previous: StudentStats, updated: StudentStats): List[StatEffect] =
  val comparisons = List(
    ("wealth", updated.wealth - previous.wealth),
    ("health", updated.health - previous.health),
    ("happiness", updated.happiness - previous.happiness),
    ("riskTaking", updated.riskTaking - previous.riskTaking),
    ("overTrusting", updated.overTrusting - previous.overTrusting),
    ("laziness", updated.laziness - previous.laziness),
    ("impulsiveness", updated.impulsiveness - previous.impulsiveness)
  )
  comparisons.collect {
    case (stat, delta) if math.abs(delta) >= 0.01 => StatEffect(stat, math.round(delta * 100.0) / 100.0)
  }

private def clampPercent(value: Double): Double =
  math.max(0.0, math.min(100.0, value))

def getSessionRoster(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, SessionRosterResponse]] =
  getSession(professorEmail, sessionId)
    .map {
      case Right(res) =>
        val roster = res.students.map { student =>
          StudentRosterEntry(
            studentName = student.userName,
            wealth = student.stats.wealth,
            health = student.stats.health,
            happiness = student.stats.happiness,
            currentScenarioTitle = student.currentScenario.map(_.template.title),
            completedScenarioCount = student.completedScenarios.length
          )
        }
        Right(SessionRosterResponse(roster))
      case Left(err) => Left(err)
    }

def getAnalytics(professorEmail: String, sessionId: String): IO[Either[ErrorResponse, AnalyticsSummary]] =
  getSession(professorEmail, sessionId)
    .map {
      case Right(res) =>
        val students = res.students
        val summary = ClassroomSummary(
          students.length,
          engagementRate = 0.9,
          avgScenariosCompleted = if students.isEmpty
            then 0.0
            else students.map(_.completedScenarios.length).sum.toDouble / students.length
        )

        val statMap = Map(
          "wealth" -> distribution(students)(_.stats.wealth),
          "happiness" -> distribution(students)(_.stats.happiness)
        )
        val habitMap = Map(
          "riskTaking" -> HabitAverage(mean(students)(_.stats.riskTaking), "rising"),
          "overTrusting" -> HabitAverage(mean(students)(_.stats.overTrusting), "stable"),
          "laziness" -> HabitAverage(mean(students)(_.stats.laziness), "falling"),
          "impulsiveness" -> HabitAverage(mean(students)(_.stats.impulsiveness), "rising")
        )
        val highlights = students.take(2).map { student =>
          LeaderboardHighlight(student.userName, student.userName, "wealth", student.stats.wealth)
        }
        val recs = List(Recommendation("OPO-3.1", "Review rental contract clauses", "Majority over-trusted first offers"))
        Right(AnalyticsSummary(summary, statMap, habitMap, highlights, recs))

      case Left(err) => Left(err)
    }


def getStudentInsights(professorEmail: String, sessionId: String, studentName: String): IO[Either[ErrorResponse, StudentInsights]] =
  DataBaseService
    .getStudent(professorEmail, sessionId, studentName)
    .map {
      case Right(res) =>
        val weak = List(
          StatReason("overTrusting", "Accepted offers without comparing terms"),
          StatReason("wealth", "Savings dipped below target twice")
        )
        val strong = List(
          StatReason("happiness", "Balanced lifestyle choices"),
          StatReason("riskTaking", "Avoided risky credit products")
        )
        val trend = Map(
          "wealth" -> List(20.0, 24.0, 32.0, res.stats.wealth),
          "riskTaking" -> List(0.0, 3.0, 6.0, res.stats.riskTaking)
        )
        Right(StudentInsights(res.userName, s"${res.userName} navigated choices thoughtfully.", weak, strong, trend))

      case Left(err) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}"))
    }


private def distribution(students: List[StudentUser])(selector: StudentUser => models.Number): StatDistribution =
  val values = students.map(selector)
  if values.isEmpty then StatDistribution(0, 0, 0, 0)
  else
    val sorted = values.sorted
    val median = sorted(sorted.size / 2)
    val p90Index = math.min(sorted.size - 1, (sorted.size * 0.9).toInt)
    StatDistribution(
      median = median,
      p90 = sorted(p90Index),
      min = sorted.head,
      max = sorted.last
    )

private def mean(students: List[StudentUser])(selector: StudentUser => models.Number): models.Number =
  if students.isEmpty then 0 else students.map(selector).sum / students.size