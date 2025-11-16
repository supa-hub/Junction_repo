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
import services.{DataBaseService, GeminiScenarioService, JWTService}

import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.UUID
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

def getStudentDashboard(sessionJoinCode: String, studentId: String): IO[Either[ErrorResponse, StudentDashboardResponse]] =
  val dashboard = for
    studentObjectId <- EitherT.fromEither[IO](ObjectId.from(studentId).left.map(_ => ErrorResponse("Invalid student id")))
    sessionDoc <- EitherT(
      DataBaseService
        .getSessionByJoinCode(sessionJoinCode)
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
  val studentDoc = StudentUserMongo(userName = studentName)
  DataBaseService
    .addStudentToSession(studentDoc, sessionJoinCode)
    .flatMap {
      case Left(err) => IO.pure(Left(ErrorResponse(s"Couldn't create the user due to an error: ${err.getMessage}")))
      case Right(result) if result.getMatchedCount == 0 => IO.pure(Left(ErrorResponse("Couldn't find session")))
      case Right(result) if result.getModifiedCount == 0 => IO.pure(Left(ErrorResponse("Student could not be added")))
      case Right(_) =>
        val stats: StudentStats = studentDoc.stats
        DataBaseService
          .getSessionByJoinCode(sessionJoinCode)
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
                  sessionId = sessionJoinCode,
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
  val result = for
    sessionDoc <- EitherT(
      DataBaseService
        .getSessionByJoinCode(sessionJoinCode)
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
                scenarioState = ScenarioState(template, 0)
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