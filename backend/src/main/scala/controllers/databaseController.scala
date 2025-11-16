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
import services.{DataBaseService, JWTService}

import java.time.Instant
import java.time.format.DateTimeFormatter
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
  getSession(professorEmail, sessionId)
    .flatMap {
      case Right(res) if res.status != SessionStatus.Waiting => IO.pure(Left(ErrorResponse("Can't start session as its already in progress or has already completed")))
      case Right(res) =>
        val startedAt = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        val startedSession = res.copy(status = SessionStatus.InProgress, startedAt = Some(startedAt))

        DataBaseService.updateSession(professorEmail, startedSession)
          .map(_.map(_ => SessionStarted(startedSession.sessionJoinCode, startedSession.status.apiValue, startedAt)))
          .map {
            case Right(updated) => Right(updated)
            case Left(e) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${e.getMessage}"))
          }

      case Left(err) => IO.pure(Left(err))
    }


def nextScenario(professorEmail: String, sessionId: String, studentName: String): IO[Either[ErrorResponse, ScenarioView]] =
  getSession(professorEmail, sessionId)
    .flatMap {
      case Right(res) =>
        res.students.find(_.userName == studentName) match
          case Some(aStudent) =>
            aStudent.currentScenario match
              case Some(scenario) => IO.pure(Right(ScenarioView("test", scenario.template.title, scenario.template.narrative)))
              case None =>
                val template = ScenarioTemplate("test", "test", "test")
                val scenario = ScenarioState(template, 0)
                val updatedStudent = aStudent.copy(currentScenario = Some(scenario))
                val newStudents = updatedStudent :: res.students.filter(_.userName != aStudent.userName)
                val updatedSession = res.copy(students = newStudents)

                DataBaseService.updateSession(professorEmail, updatedSession)
                  .map(_.map(_ => ScenarioView("testId", template.title, template.narrative)))
                  .map {
                    case Right(updated) => Right(updated)
                    case Left(e) => Left(ErrorResponse(s"Couldn't create the user due to an error: ${e.getMessage}"))
                  }

          case None => IO.pure(Left(ErrorResponse("Couldn't find user")))
      case Left(err) => IO.pure(Left(err))
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