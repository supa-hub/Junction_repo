package routes

import cats.Monad
import cats.data.EitherT
import cats.effect.*
import cats.syntax.all.*
import controllers.{createNewProfessor, createNewSession, loginProfessor}
import models.json.{CreateTeacherSessionPayload, ErrorResponse, JoinSessionPayload, LoginPayload, PromptMessagePayload, SessionPayload, SuccessfulResponse}
import models.json.circecoders.given
import org.http4s.*
import org.http4s.circe.CirceEntityCodec.*
import org.http4s.dsl.io.*
import org.typelevel.ci.CIString
import services.GameSimulationService

/*
 * if you don't want to define http4s EntityEncoder/EntityDecoder for every
 * case class, abd only want to define the circe encoder/decoders, then uncomment the below line
*/
// import org.http4s.circe.CirceEntityCodec.*


extension [A, B](x: EitherT[IO, A, B])
  def toResponse(using EntityEncoder[IO, A], EntityEncoder[IO, B]): IO[Response[IO]] =
    x.foldF(
        badReq => BadRequest(badReq),
        successful => Ok(successful)
      )
      .handleErrorWith(_ => BadRequest(ErrorResponse("Request could not be processed")))

/**
 * This object is used for handling the API endpoints that utilise json and returns the responses in json format.
 * All the necessary Encoder/Decoder implicits are defined in the models.json package
 * which is located in models/json/
 */
object JsonRoutes:
  object StudentIdParam extends QueryParamDecoderMatcher[String]("studentId")

  private def handleServiceEither[T](result: Either[GameSimulationService.ServiceError, T], successStatus: Status = Status.Ok)(using EntityEncoder[IO, T]): IO[Response[IO]] =
    result match
      case Right(value) => Response[IO](status = successStatus).withEntity(value).pure[IO]
      case Left(err) => Response[IO](status = err.status).withEntity(ErrorResponse(err.message)).pure[IO]

  val route = HttpRoutes.of[IO] {
    case req @ POST -> Root / "api" / "auth" / "login" =>
      req.attemptAs[LoginPayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload =>
            GameSimulationService
              .login(payload)
              .flatMap(result => handleServiceEither(result))
        )

    case req @ POST -> Root / "api" / "teachers" / teacherId / "sessions" =>
      req.attemptAs[CreateTeacherSessionPayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => GameSimulationService.createSession(teacherId, payload.sessionName, payload.location, payload.monthlyIncome).flatMap(res => Created(res))
        )

    case POST -> Root / "api" / "teachers" / teacherId / "sessions" / sessionId / "start" =>
      GameSimulationService.startSession(teacherId, sessionId).flatMap(result => handleServiceEither(result, Status.Accepted))

    case GET -> Root / "api" / "teachers" / teacherId / "sessions" =>
      GameSimulationService.listTeacherSessions(teacherId).flatMap(res => Ok(res))

    case req @ POST -> Root / "api" / "sessions" / joinCode / "students" =>
      req.attemptAs[JoinSessionPayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => GameSimulationService.joinSession(joinCode, payload.userName).flatMap(result => handleServiceEither(result, Status.Created))
        )

    case GET -> Root / "api" / "sessions" / sessionId / "students" / studentId =>
      GameSimulationService.studentDashboard(sessionId, studentId).flatMap(result => handleServiceEither(result))

    case GET -> Root / "api" / "sessions" / sessionId / "next-scenario" :? StudentIdParam(studentId) =>
      GameSimulationService.nextScenario(sessionId, studentId).flatMap(result => handleServiceEither(result))

    case req @ POST -> Root / "api" / "sessions" / sessionId / "prompts" / promptId =>
      req.attemptAs[PromptMessagePayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload =>
            val msg = GameSimulationService.PromptMessage(payload.studentId, payload.message, payload.scenarioId)
            GameSimulationService.submitPrompt(sessionId, promptId, msg).flatMap(result => handleServiceEither(result))
        )

    case GET -> Root / "api" / "sessions" / sessionId / "leaderboard" =>
      GameSimulationService.leaderboard(sessionId).flatMap(result => handleServiceEither(result))

    case GET -> Root / "api" / "sessions" / sessionId / "progress" =>
      GameSimulationService.progress(sessionId).flatMap(result => handleServiceEither(result))

    case GET -> Root / "api" / "sessions" / sessionId / "analytics" / "summary" =>
      GameSimulationService.analytics(sessionId).flatMap(result => handleServiceEither(result))

    case GET -> Root / "api" / "sessions" / sessionId / "students" / studentId / "insights" =>
      GameSimulationService.studentInsights(sessionId, studentId).flatMap(result => handleServiceEither(result))

    case GET -> Root / "api" / "sessions" / sessionId / "reports" / "classroom.pdf" =>
      GameSimulationService.classroomReport(sessionId).flatMap {
        case Right(bytes) =>
          Ok(bytes).map(
            _.putHeaders(
              Header.Raw(CIString("Content-Type"), "application/pdf"),
              Header.Raw(CIString("Content-Disposition"), "attachment; filename=classroom-report.pdf")
            )
          )
        case Left(err) => Response[IO](status = err.status).withEntity(ErrorResponse(err.message)).pure[IO]
      }

    case GET -> Root / "api" / "teachers" / teacherId / "sessions" / sessionId / "history" =>
      GameSimulationService.sessionHistory(teacherId, sessionId).flatMap(result => handleServiceEither(result))

    case req @ POST -> Root / "api" / "newSessionData" =>
      req
        .attemptAs[SessionPayload]
        .biflatMap[ErrorResponse, SuccessfulResponse](
          err => EitherT.leftT(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => EitherT(createNewSession(payload))
        )
        .toResponse

    case req @ POST -> Root / "api" / "newProfessor" =>
      req
        .attemptAs[LoginPayload]
        .biflatMap[ErrorResponse, SuccessfulResponse](
          err => EitherT.leftT(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => EitherT(createNewProfessor(payload))
        )
        .toResponse

    case req @ POST -> Root / "api" / "login" =>
      req
        .attemptAs[LoginPayload]
        .biflatMap[ErrorResponse, SuccessfulResponse](
          err => EitherT.leftT(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => EitherT(loginProfessor(payload))
        )
        .toResponse
  }
end JsonRoutes