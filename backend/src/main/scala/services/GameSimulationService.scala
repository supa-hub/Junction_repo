package services

import cats.effect.IO
import models.json.{LoginPayload, ProfessorUser, StudentStats}
import models.json.circecoders.given
import models.Number
import org.http4s.Status
import models.implicitconversions.given

import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.UUID
import scala.collection.concurrent.TrieMap
import scala.util.Random

object GameSimulationService:

  enum SessionStatus(val apiValue: String):
    case Waiting extends SessionStatus("waiting_for_start")
    case InProgress extends SessionStatus("in_progress")
    case Completed extends SessionStatus("completed")

  final case class AuthToken(teacherId: String, token: String, expiresInSeconds: Long)
  final case class SessionCreated(
    sessionId: String,
    sessionName: String,
    joinCode: String,
    status: String,
    location: String,
    monthlyIncome: Number
  )
  final case class SessionSummary(
    sessionId: String,
    sessionName: String,
    joinCode: String,
    status: String,
    startedAt: Option[String],
    playerCount: Int,
    location: String,
    monthlyIncome: Number
  )
  final case class SessionStarted(sessionId: String, status: String, startedAt: String)
  final case class JoinSessionResponse(
    sessionId: String,
    studentId: String,
    seatNumber: Int,
    initialStats: StudentStats
  )
  final case class StudentDashboard(stats: StudentStats)
  final case class ScenarioView(
    scenarioId: String,
    title: String,
    scenarioText: String
  )
  final case class StatEffect(stat: String, delta: Number)
  final case class PromptReply(
    promptId: String,
    aiReply: String,
    status: String,
    accepted: Boolean,
    effects: List[StatEffect],
    effectsSummary: Option[String],
    updatedStats: Option[StudentStats]
  )
  final case class LeaderboardEntry(
    rank: Int,
    studentId: String,
    nickname: String,
    wealth: Number,
    health: Number,
    happiness: Number,
    scenariosDone: Int
  )
  final case class LeaderboardResponse(updatedAt: String, entries: List[LeaderboardEntry])
  final case class CoreScenarioProgress(
    scenarioId: String,
    templateKey: String,
    completed: Int,
    remaining: Int
  )
  final case class StudentPace(studentId: String, scenariosPerMinute: Number, needsSupport: Boolean)
  final case class ProgressResponse(
    coreScenarioCompletion: List[CoreScenarioProgress],
    pace: List[StudentPace]
  )
  final case class ClassroomSummary(students: Int, engagementRate: Number, avgScenariosCompleted: Number)
  final case class StatDistribution(median: Number, p90: Number, min: Number, max: Number)
  final case class HabitAverage(mean: Number, trend: String)
  final case class LeaderboardHighlight(studentId: String, nickname: String, stat: String, value: Number)
  final case class Recommendation(curriculumRef: String, summary: String, rationale: String)
  final case class AnalyticsSummary(
    classroomSummary: ClassroomSummary,
    statDistributions: Map[String, StatDistribution],
    habitAverages: Map[String, HabitAverage],
    leaderboardHighlights: List[LeaderboardHighlight],
    recommendations: List[Recommendation]
  )
  final case class StatReason(stat: String, reason: String)
  final case class StudentInsights(
    studentId: String,
    summary: String,
    weakPoints: List[StatReason],
    strongPoints: List[StatReason],
    trend: Map[String, List[Number]]
  )
  final case class HistoryRun(runId: String, medianWealth: Number, medianHabits: Map[String, Number])
  final case class SessionHistory(sessionId: String, runs: List[HistoryRun])
  final case class PdfReport(bytes: Array[Byte])

  sealed trait ServiceError:
    def message: String
    def status: Status

  case class NotFound(message: String) extends ServiceError:
    val status: Status = Status.NotFound

  case class Conflict(message: String) extends ServiceError:
    val status: Status = Status.Conflict

  case class BadRequest(message: String) extends ServiceError:
    val status: Status = Status.BadRequest

  private case class ScenarioTemplate(key: String, title: String, narrative: String)
  private case class ScenarioState(id: String, template: ScenarioTemplate, turnsTaken: Int)
  private case class StudentState(
    studentId: String,
    userName: String,
    seatNumber: Int,
    stats: StudentStats,
    completedScenarios: Vector[String],
    currentScenario: Option[ScenarioState]
  )
  private case class SessionState(
    sessionId: String,
    teacherId: String,
    sessionName: String,
    location: String,
    monthlyIncome: Number,
    joinCode: String,
    status: SessionStatus,
    startedAt: Option[String],
    students: Map[String, StudentState],
    scenarioCompletions: Map[String, Int],
    historyRuns: Vector[HistoryRun]
  )

  import io.circe.generic.semiauto.*
  import io.circe.{Decoder, Encoder}

  given Encoder[AuthToken] = deriveEncoder
  given Encoder[SessionCreated] = deriveEncoder
  given Encoder[SessionSummary] = deriveEncoder
  given Encoder[SessionStarted] = deriveEncoder
  given Encoder[JoinSessionResponse] = deriveEncoder
  given Encoder[StudentDashboard] = deriveEncoder
  given Encoder[ScenarioView] = deriveEncoder
  given Encoder[StatEffect] = deriveEncoder
  given Encoder[PromptReply] = deriveEncoder
  given Encoder[LeaderboardEntry] = deriveEncoder
  given Encoder[LeaderboardResponse] = deriveEncoder
  given Encoder[CoreScenarioProgress] = deriveEncoder
  given Encoder[StudentPace] = deriveEncoder
  given Encoder[ProgressResponse] = deriveEncoder
  given Encoder[ClassroomSummary] = deriveEncoder
  given Encoder[StatDistribution] = deriveEncoder
  given Encoder[HabitAverage] = deriveEncoder
  given Encoder[LeaderboardHighlight] = deriveEncoder
  given Encoder[Recommendation] = deriveEncoder
  given Encoder[AnalyticsSummary] = deriveEncoder
  given Encoder[StatReason] = deriveEncoder
  given Encoder[StudentInsights] = deriveEncoder
  given Encoder[HistoryRun] = deriveEncoder
  given Encoder[SessionHistory] = deriveEncoder

  private val random = new Random()
  private val sessions = TrieMap.empty[String, SessionState]
  private val joinCodeIndex = TrieMap.empty[String, String]
  private val teacherSessions = TrieMap.empty[String, Set[String]]

  private val templates = Vector(
    ScenarioTemplate(
      key = "apartment_hunt_core",
      title = "Secure Your First Apartment",
      narrative = "You're starting university in a new city and need to find an affordable apartment while keeping savings intact."
    ),
    ScenarioTemplate(
      key = "job_search_core",
      title = "First Job Search",
      narrative = "You're applying for your first job and must evaluate offers with different risk levels."
    )
  )

  def login(payload: LoginPayload): IO[Either[ServiceError, AuthToken]] =
    DataBaseService
      .getProfessorData[ProfessorUser](payload.email)
      .map {
        case Right(Some(professor)) if professor.password == payload.password =>
          val teacherId = teacherIdFromEmail(payload.email)
          val token = UUID.randomUUID().toString
          Right(AuthToken(teacherId, token, expiresInSeconds = 3600))
        case Right(Some(_)) => Left(BadRequest("Invalid email or password"))
        case Right(None) => Left(NotFound("Professor not found"))
        case Left(err) => Left(BadRequest(s"Unable to verify credentials: ${err.getMessage}"))
      }

  def createSession(teacherId: String, sessionName: String, location: String, monthlyIncome: Number): IO[SessionCreated] = IO {
    val sessionId = generateId("sess")
    val joinCode = generateJoinCode()
    val historyRuns = Vector(
      HistoryRun("2024_fall", 22, Map("riskTaking" -> 4)),
      HistoryRun("2025_spring", 35, Map("riskTaking" -> 1))
    )
    val state = SessionState(
      sessionId = sessionId,
      teacherId = teacherId,
      sessionName = sessionName,
      location = location,
      monthlyIncome = monthlyIncome,
      joinCode = joinCode,
      status = SessionStatus.Waiting,
      startedAt = None,
      students = Map.empty,
      scenarioCompletions = Map.empty,
      historyRuns = historyRuns
    )
    sessions.put(sessionId, state)
    joinCodeIndex.put(joinCode, sessionId)
    teacherSessions.updateWith(teacherId) {
      case Some(existing) => Some(existing + sessionId)
      case None => Some(Set(sessionId))
    }
    SessionCreated(
      sessionId = sessionId,
      sessionName = state.sessionName,
      joinCode = joinCode,
      status = state.status.apiValue,
      location = state.location,
      monthlyIncome = state.monthlyIncome
    )
  }

  def startSession(teacherId: String, sessionId: String): IO[Either[ServiceError, SessionStarted]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound(s"Session $sessionId not found"))
      case Some(state) if state.teacherId != teacherId => Left(NotFound(s"Session $sessionId not found for teacher"))
      case Some(state) if state.status == SessionStatus.InProgress => Left(Conflict("Session already started"))
      case Some(state) =>
        val startedAt = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        val updated = state.copy(status = SessionStatus.InProgress, startedAt = Some(startedAt))
        sessions.update(sessionId, updated)
        Right(SessionStarted(sessionId, updated.status.apiValue, startedAt))
  }

  def listTeacherSessions(teacherId: String): IO[List[SessionSummary]] = IO {
    teacherSessions
      .getOrElse(teacherId, Set.empty)
      .flatMap(sessions.get)
      .toList
      .sortBy(_.sessionName)
      .map(s =>
        SessionSummary(
          sessionId = s.sessionId,
          sessionName = s.sessionName,
          joinCode = s.joinCode,
          status = s.status.apiValue,
          startedAt = s.startedAt,
          playerCount = s.students.size,
          location = s.location,
          monthlyIncome = s.monthlyIncome
        )
      )
  }

  def joinSession(joinCode: String, userName: String): IO[Either[ServiceError, JoinSessionResponse]] = IO {
    joinCodeIndex.get(joinCode) match
      case None => Left(NotFound(s"Session with join code $joinCode not found"))
      case Some(sessionId) =>
        sessions.get(sessionId) match
          case None => Left(NotFound("Session not found"))
          case Some(state) if state.status == SessionStatus.Completed => Left(Conflict("Session already completed"))
          case Some(state) =>
            val duplicate = state.students.values.exists(_.userName.equalsIgnoreCase(userName))
            if duplicate then Left(Conflict("Nickname already in use"))
            else
              val studentId = generateId("stud")
              val stats = emptyStats
              val seatNumber = state.students.size + 1
              val studentState = StudentState(studentId, userName, seatNumber, stats, Vector.empty, None)
              val updated = state.copy(students = state.students + (studentId -> studentState))
              sessions.update(sessionId, updated)
              Right(JoinSessionResponse(updated.sessionId, studentId, seatNumber, stats))
  }

  def studentDashboard(sessionId: String, studentId: String): IO[Either[ServiceError, StudentDashboard]] = IO {
    findStudent(sessionId, studentId).map(state => StudentDashboard(state.stats))
  }

  def nextScenario(sessionId: String, studentId: String): IO[Either[ServiceError, ScenarioView]] = IO {
    updateSession(sessionId) { session =>
      session.students.get(studentId) match
        case None => Left(NotFound("Student not found"))
        case Some(student) =>
          student.currentScenario match
            case Some(existing) => Right((session, ScenarioView(existing.id, existing.template.title, existing.template.narrative)))
            case None =>
              val template = templates(random.nextInt(templates.size))
              val scenarioId = generateId("scn")
              val scenario = ScenarioState(scenarioId, template, 0)
              val updatedStudent = student.copy(currentScenario = Some(scenario))
              val updatedSession = session.copy(students = session.students + (studentId -> updatedStudent))
              Right((updatedSession, ScenarioView(scenarioId, template.title, template.narrative)))
    }
  }

  final case class PromptMessage(studentId: String, message: String, scenarioId: String)

  def submitPrompt(sessionId: String, promptId: String, payload: PromptMessage): IO[Either[ServiceError, PromptReply]] = IO {
    updateSession(sessionId) { session =>
      session.students.get(payload.studentId) match
        case None => Left(NotFound("Student not found"))
        case Some(student) =>
          student.currentScenario match
            case None => Left(BadRequest("Student has no active scenario"))
            case Some(scenario) if scenario.id != payload.scenarioId => Left(BadRequest("Scenario mismatch"))
            case Some(scenario) =>
              val turns = scenario.turnsTaken + 1
              val completed = turns >= 2
              val updatedScenario = scenario.copy(turnsTaken = turns)
              if completed then
                val (effects, updatedStats) = applyStatChanges(student.stats, payload.message)
                val newStudent = student.copy(
                  stats = updatedStats,
                  completedScenarios = student.completedScenarios :+ scenario.id,
                  currentScenario = None
                )
                val updatedSession = session.copy(
                  students = session.students + (payload.studentId -> newStudent),
                  scenarioCompletions = incrementScenario(session.scenarioCompletions, scenario.template.key)
                )
                val reply = PromptReply(
                  promptId = promptId,
                  aiReply = s"Great work finishing ${scenario.template.title}!",
                  status = "completed",
                  accepted = true,
                  effects = effects,
                  effectsSummary = Some(s"${scenario.template.title} boosted ${effects.headOption.map(_.stat).getOrElse("overall stats")}"),
                  updatedStats = Some(updatedStats)
                )
                Right((updatedSession, reply))
              else
                val newStudent = student.copy(currentScenario = Some(updatedScenario))
                val updatedSession = session.copy(students = session.students + (payload.studentId -> newStudent))
                val reply = PromptReply(
                  promptId = promptId,
                  aiReply = s"Interesting approach. What would you do next to keep ${scenario.template.title.toLowerCase}?",
                  status = "in_progress",
                  accepted = false,
                  effects = Nil,
                  effectsSummary = None,
                  updatedStats = None
                )
                Right((updatedSession, reply))
    }
  }

  def leaderboard(sessionId: String): IO[Either[ServiceError, LeaderboardResponse]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) =>
        val sorted = session.students.values.toList.sortBy(-_.stats.wealth)
        val entries = sorted.zipWithIndex.map { case (student, idx) =>
          LeaderboardEntry(
            rank = idx + 1,
            studentId = student.studentId,
            nickname = student.userName,
            wealth = student.stats.wealth,
            health = student.stats.health,
            happiness = student.stats.happiness,
            scenariosDone = student.completedScenarios.size
          )
        }
        val timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        Right(LeaderboardResponse(timestamp, entries))
  }

  def progress(sessionId: String): IO[Either[ServiceError, ProgressResponse]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) =>
        val coreProgress = templates.map { template =>
          val completed = session.scenarioCompletions.getOrElse(template.key, 0)
          val remaining = math.max(0, session.students.size - completed)
          CoreScenarioProgress(generateId(template.key.take(3)), template.key, completed, remaining)
        }.toList
        val pace = session.students.values.toList.map { student =>
          val durationMinutes = session.startedAt.map { started =>
            val startInstant = Instant.parse(started)
            val minutes = math.max(1L, java.time.Duration.between(startInstant, Instant.now()).toMinutes)
            minutes.toDouble
          }.getOrElse(1.0)
          val perMinute = student.completedScenarios.size / durationMinutes
          StudentPace(student.studentId, perMinute, perMinute < 0.7)
        }
        Right(ProgressResponse(coreProgress, pace))
  }

  def analytics(sessionId: String): IO[Either[ServiceError, AnalyticsSummary]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) =>
        val students = session.students.values.toList
        val summary = ClassroomSummary(students.size, engagementRate = 0.9, avgScenariosCompleted = avgScenarios(students))
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
          LeaderboardHighlight(student.studentId, student.userName, "wealth", student.stats.wealth)
        }
        val recs = List(Recommendation("OPO-3.1", "Review rental contract clauses", "Majority over-trusted first offers"))
        Right(AnalyticsSummary(summary, statMap, habitMap, highlights, recs))
  }

  def studentInsights(sessionId: String, studentId: String): IO[Either[ServiceError, StudentInsights]] = IO {
    findStudent(sessionId, studentId).map { student =>
      val weak = List(
        StatReason("overTrusting", "Accepted offers without comparing terms"),
        StatReason("wealth", "Savings dipped below target twice")
      )
      val strong = List(
        StatReason("happiness", "Balanced lifestyle choices"),
        StatReason("riskTaking", "Avoided risky credit products")
      )
      val trend = Map(
        "wealth" -> List(20.0, 24.0, 32.0, student.stats.wealth),
        "riskTaking" -> List(0.0, 3.0, 6.0, student.stats.riskTaking)
      )
      StudentInsights(studentId, s"${student.userName} navigated choices thoughtfully.", weak, strong, trend)
    }
  }

  def sessionHistory(teacherId: String, sessionId: String): IO[Either[ServiceError, SessionHistory]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) if session.teacherId != teacherId => Left(NotFound("Session not found for teacher"))
      case Some(session) => Right(SessionHistory(sessionId, session.historyRuns.toList))
  }

  def classroomReport(sessionId: String): IO[Either[ServiceError, Array[Byte]]] = IO {
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) => Right(buildPdf(session))
  }

  private def updateSession[T](sessionId: String)(f: SessionState => Either[ServiceError, (SessionState, T)]): Either[ServiceError, T] =
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(state) =>
        f(state) match
          case Left(err) => Left(err)
          case Right((updatedState, result)) =>
            sessions.update(sessionId, updatedState)
            Right(result)

  private def findStudent(sessionId: String, studentId: String): Either[ServiceError, StudentState] =
    sessions.get(sessionId) match
      case None => Left(NotFound("Session not found"))
      case Some(session) => session.students.get(studentId).toRight(NotFound("Student not found"))

  private def emptyStats: StudentStats =
    StudentStats(
      wealth = 0,
      health = 0,
      happiness = 0,
      riskTaking = 0,
      overTrusting = 0,
      laziness = 0,
      impulsiveness = 0,
      scenariosDone = List.empty,
      longTermEffects = List.empty
    )

  private def generateJoinCode(): String =
    (1 to 6).map(_ => ('A' + random.nextInt(26)).toChar).mkString

  private def generateId(prefix: String): String = s"${prefix}_${UUID.randomUUID().toString}"

  private def teacherIdFromEmail(email: String): String =
    UUID.nameUUIDFromBytes(email.trim.toLowerCase.getBytes).toString

  private def applyStatChanges(stats: StudentStats, message: String): (List[StatEffect], StudentStats) =
    val wealthDelta = ((message.length % 7) - 3).toDouble
    val happinessDelta = ((message.hashCode.abs % 5) - 2).toDouble
    val riskDelta = ((message.count(_.isUpper) % 4) - 1).toDouble
    val effects = List(
      StatEffect("wealth", wealthDelta),
      StatEffect("happiness", happinessDelta),
      StatEffect("riskTaking", riskDelta)
    )
    val updated = stats.copy(
      wealth = stats.wealth + wealthDelta,
      happiness = stats.happiness + happinessDelta,
      riskTaking = stats.riskTaking + riskDelta,
      scenariosDone = stats.scenariosDone :+ generateId("scn")
    )
    (effects, updated)

  private def incrementScenario(map: Map[String, Int], key: String): Map[String, Int] =
    map.updatedWith(key) {
      case Some(value) => Some(value + 1)
      case None => Some(1)
    }

  private def avgScenarios(students: List[StudentState]): Number =
    if students.isEmpty then 0 else students.map(_.completedScenarios.size).sum.toDouble / students.size

  private def distribution(students: List[StudentState])(selector: StudentState => Number): StatDistribution =
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

  private def mean(students: List[StudentState])(selector: StudentState => Number): Number =
    if students.isEmpty then 0 else students.map(selector).sum / students.size

  private def buildPdf(session: SessionState): Array[Byte] =
    val text = s"Classroom report for ${session.sessionName} (${session.students.size} students)"
    val stream = s"BT /F1 14 Tf 50 750 Td ($text) Tj ET"
    val pdf =
      s"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj << /Length ${stream.length} >>
stream
$stream
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer << /Root 1 0 R >>
%%EOF"""
    pdf.getBytes(StandardCharsets.UTF_8)

end GameSimulationService
