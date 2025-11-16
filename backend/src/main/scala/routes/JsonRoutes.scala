package routes

import cats.Monad
import cats.data.{EitherT, Kleisli, OptionT}
import cats.effect.*
import cats.syntax.all.*
import controllers.{
  createNewProfessor,
  createNewSession,
  getLeaderBoard,
  getStudentStats,
  getTeacherSessionsSummary,
  loginProfessor,
  getProgress,
  getAnalytics,
  getStudentInsights,
  startSession,
  nextScenario,
  addStudent
}
import models.json.{CreateTeacherSessionPayload, ErrorResponse, JoinSessionPayload, LoginPayload, ProfessorUser, PromptMessagePayload, SessionPayload, SuccessfulResponse}
import models.json.circecoders.given
import models.json.http4sentities.given
import models.json.http4sencoders.given
import org.http4s.*
import org.http4s.dsl.io.*
import org.http4s.headers.Authorization
import org.http4s.AuthScheme
import org.http4s.Credentials.Token
import org.http4s.server.AuthMiddleware
import services.{DataBaseService, GameSimulationService, JWTService}
import models.implicitconversions.given

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

  extension [F[_], A, B](x: F[Either[A, B]])
    def toEitherT: EitherT[F, A, B] = EitherT(x)

  // for authentication
  val authUser: Kleisli[IO, Request[IO], Either[String, ProfessorUser]] = Kleisli(req =>
    val jwtClaim = req
      .headers
      .get[Authorization]
      .toRight("Authorization parsing error")
      .flatMap {
        case Authorization(Token(AuthScheme.Bearer, token)) => JWTService.decode(token).toEither.leftMap(_.getMessage)
        case Authorization(BasicCredentials(creds)) => JWTService.decode(creds._2).toEither.leftMap(_.getMessage)
        case _ => Left("Couldn't decode auth header")
      }
      .toEitherT[IO]

    jwtClaim
      .flatMap(claim =>
        EitherT
          .fromEither[IO](JWTService.extractEmail(claim))
          .flatMap(email =>
            DataBaseService
              .getProfessorData[ProfessorUser](email)
              .toEitherT
              .biflatMap[String, ProfessorUser](
                err => EitherT.leftT(err.getMessage),
                user => EitherT
                    .right(user)
                    .leftMap(_ => "Couldn't find user")
                    .value
                    .getOrElse(Either.left("Couldn't find user"))
                    .toEitherT[IO]
              )
          )
      )
      .value
  )

  private val onFailure: AuthedRoutes[String, IO] = Kleisli(req => OptionT.liftF(Forbidden(req.context)))
  private val authMiddleware: AuthMiddleware[IO, ProfessorUser] = AuthMiddleware(authUser, onFailure)

  val route = HttpRoutes.of[IO] {
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

  private val authed = AuthedRoutes.of[ProfessorUser, IO] {
    case req @ POST -> Root / "api" / "teachers" / "newSession" as user =>
      req.req
        .attemptAs[SessionPayload]
        .biflatMap[ErrorResponse, SuccessfulResponse](
          err => EitherT.leftT(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => EitherT(createNewSession(payload))
        )
        .toResponse


    case POST -> Root / "api" / "teachers" / "sessions" / sessionId / "start" as user =>
      startSession(user.email, sessionId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

    case GET -> Root / "api" / "teachers" / "sessions" as user =>
      getTeacherSessionsSummary(user.email)
        .compile
        .toList
        .flatMap(list => Ok(list))

    case req @ POST -> Root / "api" / "sessions" / joinCode / "students" as user =>
      req.req
        .attemptAs[JoinSessionPayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload => addStudent(joinCode, payload.userName)
            .flatMap(
              _.fold(
                err => BadRequest(err),
                data => Ok(data)
              )
            )
        )

    case GET -> Root / "api" / "sessions" / sessionId / "students" / studentId as user =>
      getStudentStats(user.email, sessionId, studentId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

    case GET -> Root / "api" / "sessions" / sessionId / "next-scenario" :? StudentIdParam(studentId) as user =>
      nextScenario(user.email, sessionId, studentId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

      /*
    case req @ POST -> Root / "api" / "sessions" / sessionId / "prompts" / promptId as user =>
      req.req
        .attemptAs[PromptMessagePayload]
        .foldF(
          err => BadRequest(ErrorResponse(s"Received data could not be decoded: ${err.getMessage}")),
          payload =>
            val msg = GameSimulationService.PromptMessage(payload.studentId, payload.message, payload.scenarioId)
            GameSimulationService.submitPrompt(sessionId, promptId, msg).flatMap(result => handleServiceEither(result))
        )
    */
    case GET -> Root / "api" / "sessions" / sessionId / "leaderboard" as user =>
      getLeaderBoard(user.email, sessionId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

    case GET -> Root / "api" / "sessions" / sessionId / "progress" as user =>
      getProgress(user.email, sessionId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

    case GET -> Root / "api" / "sessions" / sessionId / "analytics" / "summary" as user =>
      getAnalytics(user.email, sessionId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

    case GET -> Root / "api" / "sessions" / sessionId / "students" / studentId / "insights" as user =>
      getStudentInsights(user.email, sessionId, studentId)
        .flatMap(
          _.fold(
            err => BadRequest(err),
            data => Ok(data)
          )
        )

      /*
    case GET -> Root / "api" / "sessions" / sessionId / "reports" / "classroom.pdf" as user =>
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
       */
    
    /*
    case GET -> Root / "api" / "teachers" / teacherId / "sessions" / sessionId / "history" as user =>
      GameSimulationService.sessionHistory(teacherId, sessionId).flatMap(result => handleServiceEither(result))
      
     */
  }

  val authedRoutes = authMiddleware(authed)
end JsonRoutes