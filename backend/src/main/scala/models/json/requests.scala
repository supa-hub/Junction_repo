package models.json

import models.{HistoryRun, SessionStatus}
import upickle.default.ReadWriter


final case class SessionSummary(
  sessionName: String,
  joinCode: String,
  status: String,
  startedAt: Option[String],
  playerCount: Int,
  location: String,
  monthlyIncome: models.Number
)

final case class Session(
  sessionName: String,
  sessionJoinCode: String,
  location: String,
  monthlyIncome: models.Number,
  students: List[StudentUser],
  status: SessionStatus,
  startedAt: Option[String],
  historyRuns: List[HistoryRun]
) derives ReadWriter

final case class ScenarioTemplate(
  key: String,
  title: String,
  narrative: String
) derives ReadWriter

final case class ScenarioState(
  template: ScenarioTemplate,
  turnsTaken: Int
) derives ReadWriter

final case class SessionPayload(
  email: String,
  sessionName: String,
  sessionLocation: String
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
  longTermEffects: List[String]
) derives ReadWriter

final case class StudentHabits(
  riskTaking: models.Number,
  overTrusting: models.Number,
  laziness: models.Number,
  impulsiveness: models.Number
) derives ReadWriter

final case class StudentUser(
  userName: String,
  currentScenario: Option[ScenarioState],
  completedScenarios: List[String],
  stats: StudentStats,
  habits: StudentHabits
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
  import models.statuscodecs.given
  import models.historycodecs.given
  given scenarioTemplateEncoder: Encoder[ScenarioTemplate] = deriveEncoder
  given scenarioTemplateDecoder: Decoder[ScenarioTemplate] = deriveDecoder
  given scenarioEncoder: Encoder[ScenarioState] = deriveEncoder
  given scenarioDecoder: Decoder[ScenarioState] = deriveDecoder
  given scenarioOptionEncoder: Encoder[Option[ScenarioState]] = deriveEncoder
  given scenarioOptionDecoder: Decoder[Option[ScenarioState]] = deriveDecoder
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
  given studentHabitsEncoder: Encoder[StudentHabits] = deriveEncoder[StudentHabits]
  given studentHabitsDecoder: Decoder[StudentHabits] = deriveDecoder[StudentHabits]
  given studentUserEncoder: Encoder[StudentUser] = deriveEncoder[StudentUser]
  given studentUserDecoder: Decoder[StudentUser] = deriveDecoder[StudentUser]
  given professorUserEncoder: Encoder[ProfessorUser] = deriveEncoder[ProfessorUser]
  given professorUserDecoder: Decoder[ProfessorUser] = deriveDecoder[ProfessorUser]
  given sessionSummaryEncoder: Encoder[SessionSummary] = deriveEncoder
  given sessionSummaryDecoder: Decoder[SessionSummary] = deriveDecoder
end circecoders

package http4sentities:
  import cats.effect.IO
  import models.json.circecoders.given
  import org.http4s.EntityDecoder
  import org.http4s.circe.jsonOf
  import models.statuscodecs.given
  import models.historycodecs.given
  given sessionStatusEntity: EntityDecoder[IO, SessionStatus] = jsonOf[IO, SessionStatus]
  given sessionPayloadEntity: EntityDecoder[IO, SessionPayload] = jsonOf[IO, SessionPayload]
  given createSessionEntity: EntityDecoder[IO, CreateTeacherSessionPayload] = jsonOf[IO, CreateTeacherSessionPayload]
  given loginPayloadEntity: EntityDecoder[IO, LoginPayload] = jsonOf[IO, LoginPayload]
  given joinSessionEntity: EntityDecoder[IO, JoinSessionPayload] = jsonOf[IO, JoinSessionPayload]
  given promptMessageEntity: EntityDecoder[IO, PromptMessagePayload] = jsonOf[IO, PromptMessagePayload]
  given studentStatsEntity: EntityDecoder[IO, StudentStats] = jsonOf[IO, StudentStats]
  given studentHabitsEntity: EntityDecoder[IO, StudentHabits] = jsonOf[IO, StudentHabits]
  given studentUserEntity: EntityDecoder[IO, StudentUser] = jsonOf[IO, StudentUser]
  given professorUserEntity: EntityDecoder[IO, ProfessorUser] = jsonOf[IO, ProfessorUser]
end http4sentities


package http4sencoders:
  import cats.effect.IO
  import models.json.circecoders.given
  import org.http4s.EntityEncoder
  import org.http4s.circe.jsonEncoderOf
  given sessionSummaryEncoder: EntityEncoder[IO, SessionSummary] = jsonEncoderOf
  given statsEncoder: EntityEncoder[IO, StudentStats] = jsonEncoderOf
  given habitsEncoder: EntityEncoder[IO, StudentHabits] = jsonEncoderOf
  given userEncoder: EntityEncoder[IO, StudentUser] = jsonEncoderOf
end http4sencoders