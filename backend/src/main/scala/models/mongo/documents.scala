package models.mongo

import io.circe.*
import io.circe.generic.semiauto.*
import models.{HistoryRun, SessionStatus}
import mongo4cats.bson.ObjectId
import mongo4cats.circe.*
import mongo4cats.codecs.MongoCodecProvider
import mongo4cats.bson.BsonValueEncoder

import scala.util.Random
import java.util.Locale


final case class SessionMongo(
  _id: ObjectId,
  sessionName: String,
  sessionJoinCode: String,
  location: String,
  monthlyIncome: models.Number,
  students: List[StudentUserMongo],
  status: SessionStatus,
  startedAt: Option[String],
  scenarioCompletions: Map[String, Int],
  historyRuns: List[HistoryRun]
)

final case class ScenarioTemplateMongo(
  key: String,
  title: String,
  narrative: String
)
final case class ScenarioStateMongo(
  _id: ObjectId,
  template: ScenarioTemplateMongo,
  turnsTaken: Int,
  history: List[ScenarioTurnMongo] = List.empty
)

final case class ScenarioTurnMongo(
  role: String,
  message: String,
  timestamp: Option[String]
)

final case class StudentStatsMongo(
  _id: ObjectId,
  wealth: models.Number,
  health: models.Number,
  happiness: models.Number,
  riskTaking: models.Number,
  overTrusting: models.Number,
  laziness: models.Number,
  impulsiveness: models.Number,
  scenariosDone: List[String],
  longTermEffects: List[String]
)

final case class StudentHabitsMongo(
  _id: ObjectId,
  riskTaking: models.Number,
  overTrusting: models.Number,
  laziness: models.Number,
  impulsiveness: models.Number
)

final case class StudentUserMongo(
  _id: ObjectId = ObjectId.gen,
  userName: String,
  currentScenario: Option[ScenarioStateMongo] = None,
  completedScenarios: List[String] = List(),
  stats: StudentStatsMongo = StudentStatsMongo(
    _id = ObjectId.gen,
    wealth = 1000,
    health = 60,
    happiness = 60,
    riskTaking = 0,
    overTrusting = 0,
    laziness = 0,
    impulsiveness = 0,
    scenariosDone = List(),
    longTermEffects = List()
  ),
  habits: StudentHabitsMongo = StudentHabitsMongo(
    _id = ObjectId.gen,
    riskTaking = 0.0,
    overTrusting = 0.0,
    laziness = 0.0,
    impulsiveness = 0.0
  )
)

// For every session create its own collection.
// Makes data streaming more efficient.
final case class ProfessorSessionMongo(
  _id: ObjectId,
  email: String,
  session: SessionMongo
)

final case class ProfessorUserMongo(
  _id: ObjectId,
  email: String,
  password: String
)

object ProfessorSessionMongo:
  def generate(email: String, session: SessionMongo): ProfessorSessionMongo =
    ProfessorSessionMongo(
      _id = ObjectId.gen,
      email = email,
      session = session
    )
end ProfessorSessionMongo

object SessionMongo:
  def generate(name: String, joinCode: String, location: String, monthlyIncome: models.Number): SessionMongo =
    SessionMongo(
      _id = ObjectId.gen,
      sessionName = name,
      sessionJoinCode = normalizeJoinCode(joinCode),
      students = List(),
      status = SessionStatus.Waiting,
      startedAt = None,
      scenarioCompletions = Map.empty,
      historyRuns = List(),
      location = location,
      monthlyIncome = monthlyIncome
    )

  private def normalizeJoinCode(code: String): String = code.trim.toUpperCase(Locale.ROOT)

  def generateCode: String =
    Random
      .alphanumeric
      .filter(_.isLetterOrDigit)
      .map(ch => if ch.isLetter then ch.toUpper else ch)
      .take(6)
      .mkString
end SessionMongo


package circecoders:
  import models.statuscodecs.given
  import models.historycodecs.given
  given sessionDecoder: Decoder[SessionMongo] = deriveDecoder[SessionMongo]
  given sessionEncoder: Encoder[SessionMongo] = deriveEncoder[SessionMongo]
  given studentStatsDecoder: Decoder[StudentStatsMongo] = deriveDecoder[StudentStatsMongo]
  given studentStatsEncoder: Encoder[StudentStatsMongo] = deriveEncoder[StudentStatsMongo]
  given studentHabitsDecoder: Decoder[StudentHabitsMongo] = deriveDecoder[StudentHabitsMongo]
  given studenthabitsEncoder: Encoder[StudentHabitsMongo] = deriveEncoder[StudentHabitsMongo]
  given studentUserDecoder: Decoder[StudentUserMongo] = deriveDecoder[StudentUserMongo]
  given studentUserEncoder: Encoder[StudentUserMongo] = deriveEncoder[StudentUserMongo]
  given professorSessionDecoder: Decoder[ProfessorSessionMongo] = deriveDecoder[ProfessorSessionMongo]
  given professorSessionEncoder: Encoder[ProfessorSessionMongo] = deriveEncoder[ProfessorSessionMongo]
  given professorUserDecoder: Decoder[ProfessorUserMongo] = deriveDecoder[ProfessorUserMongo]
  given professorUserEncoder: Encoder[ProfessorUserMongo] = deriveEncoder[ProfessorUserMongo]
  given scenarioTemplateEncoder: Encoder[ScenarioTemplateMongo] = deriveEncoder
  given scenarioTemplateDecoder: Decoder[ScenarioTemplateMongo] = deriveDecoder
  given scenarioEncoder: Encoder[ScenarioStateMongo] = deriveEncoder
  given scenarioDecoder: Decoder[ScenarioStateMongo] = deriveDecoder
  given scenarioTurnEncoder: Encoder[ScenarioTurnMongo] = deriveEncoder
  given scenarioTurnDecoder: Decoder[ScenarioTurnMongo] = deriveDecoder
end circecoders

package mongocodecs:
  import circecoders.given
  import models.historycodecs.given
  given sessionCodecProvider: MongoCodecProvider[SessionMongo] = deriveCirceCodecProvider
  given studentStatsCodecProvider: MongoCodecProvider[StudentStatsMongo] = deriveCirceCodecProvider
  given studentHabitsCodecProvider: MongoCodecProvider[StudentHabitsMongo] = deriveCirceCodecProvider
  given studentUserCodecProvider: MongoCodecProvider[StudentUserMongo] = deriveCirceCodecProvider
  given professorSessionCodecProvider: MongoCodecProvider[ProfessorSessionMongo] = deriveCirceCodecProvider
  given professorUserCodecProvider: MongoCodecProvider[ProfessorUserMongo] = deriveCirceCodecProvider
end mongocodecs

package bsonencoders:
  import circecoders.given
  import models.historycodecs.given
  given BsonValueEncoder[SessionMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[StudentUserMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[ProfessorSessionMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[ProfessorUserMongo] = deriveJsonBsonValueEncoder
end bsonencoders

