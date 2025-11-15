package models.json

import upickle.default.ReadWriter

final case class Session(
  sessionName: String,
  sessionJoinCode: String,
  students: List[StudentUser]
) derives ReadWriter

final case class SessionPayload(
  email: String,
  sessionName: String
) derives ReadWriter

final case class CreateTeacherSessionPayload(
  sessionName: String,
  location: String,
  monthlyIncome: models.Number
) derives ReadWriter

final case class LoginPayload(
  email: String,
  password: String
) derives ReadWriter

final case class JoinSessionPayload(
  userName: String
) derives ReadWriter

final case class PromptMessagePayload(
  studentId: String,
  message: String,
  scenarioId: String,
  timestamp: String
) derives ReadWriter

final case class StudentStats(
  wealth: models.Number,
  health: models.Number,
  happiness: models.Number,
  riskTaking: models.Number,
  overTrusting: models.Number,
  laziness: models.Number,
  impulsiveness: models.Number,
  scenariosDone: List[String],
  longTermEffects: List[String]
) derives ReadWriter

final case class StudentUser(
  userName: String,
  stats: StudentStats
) derives ReadWriter

final case class ProfessorUser(
  email: String,
  password: String
)

/**
 * I use this to serialize the data into a json format which will be returned as a response
 * for the request. You need to define the implicits for every case class that is
 * used for deserializing the data
 */
package circecoders:
  import io.circe.*
  import io.circe.generic.semiauto.*
  given sessionEncoder: Encoder[Session] = deriveEncoder[Session]
  given sessionDecoder: Decoder[Session] = deriveDecoder[Session]
  given sessionPayloadEncoder: Encoder[SessionPayload] = deriveEncoder[SessionPayload]
  given sessionPayloadDecoder: Decoder[SessionPayload] = deriveDecoder[SessionPayload]
  given createTeacherSessionEncoder: Encoder[CreateTeacherSessionPayload] = deriveEncoder[CreateTeacherSessionPayload]
  given createTeacherSessionDecoder: Decoder[CreateTeacherSessionPayload] = deriveDecoder[CreateTeacherSessionPayload]
  given loginPayloadEncoder: Encoder[LoginPayload] = deriveEncoder[LoginPayload]
  given loginPayloadDecoder: Decoder[LoginPayload] = deriveDecoder[LoginPayload]
  given joinSessionEncoder: Encoder[JoinSessionPayload] = deriveEncoder[JoinSessionPayload]
  given joinSessionDecoder: Decoder[JoinSessionPayload] = deriveDecoder[JoinSessionPayload]
  given promptMessageEncoder: Encoder[PromptMessagePayload] = deriveEncoder[PromptMessagePayload]
  given promptMessageDecoder: Decoder[PromptMessagePayload] = deriveDecoder[PromptMessagePayload]
  given studentStatsEncoder: Encoder[StudentStats] = deriveEncoder[StudentStats]
  given studentStatsDecoder: Decoder[StudentStats] = deriveDecoder[StudentStats]
  given studentUserEncoder: Encoder[StudentUser] = deriveEncoder[StudentUser]
  given studentUserDecoder: Decoder[StudentUser] = deriveDecoder[StudentUser]
  given professorUserEncoder: Encoder[ProfessorUser] = deriveEncoder[ProfessorUser]
  given professorUserDecoder: Decoder[ProfessorUser] = deriveDecoder[ProfessorUser]
end circecoders

package http4sentities:
  import cats.effect.IO
  import models.json.circecoders.given
  import org.http4s.EntityDecoder
  import org.http4s.circe.jsonOf
  given sessionPayloadEntity: EntityDecoder[IO, SessionPayload] = jsonOf[IO, SessionPayload]
  given createSessionEntity: EntityDecoder[IO, CreateTeacherSessionPayload] = jsonOf[IO, CreateTeacherSessionPayload]
  given loginPayloadEntity: EntityDecoder[IO, LoginPayload] = jsonOf[IO, LoginPayload]
  given joinSessionEntity: EntityDecoder[IO, JoinSessionPayload] = jsonOf[IO, JoinSessionPayload]
  given promptMessageEntity: EntityDecoder[IO, PromptMessagePayload] = jsonOf[IO, PromptMessagePayload]
  given studentStatsEntity: EntityDecoder[IO, StudentStats] = jsonOf[IO, StudentStats]
  given studentUserEntity: EntityDecoder[IO, StudentUser] = jsonOf[IO, StudentUser]
  given professorUserEntity: EntityDecoder[IO, ProfessorUser] = jsonOf[IO, ProfessorUser]
end http4sentities

