package controllers

import cats.effect.IO
import fs2.{Chunk, Pipe, Stream}
import models.implicitconversions.given
import models.json.{ErrorResponse, LoginPayload, ProfessorUser, SessionPayload, SuccessfulResponse}
import services.{DataBaseService, JWTService}

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
    .addSession(payload.email, payload.sessionName)
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