package routes

import cats.Monad
import cats.data.EitherT
import cats.effect.*
import controllers.{createNewProfessor, createNewSession, loginProfessor}
import models.json.{ErrorResponse, LoginPayload, SessionPayload, SuccessfulResponse}
import models.json.http4sentities.given
import org.http4s.*
import org.http4s.dsl.io.*

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
end JsonRoutes