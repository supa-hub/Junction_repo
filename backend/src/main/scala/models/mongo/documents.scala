package models.mongo

import io.circe.*
import io.circe.generic.semiauto.*
import mongo4cats.bson.ObjectId
import mongo4cats.circe.*
import mongo4cats.codecs.MongoCodecProvider
import mongo4cats.bson.BsonValueEncoder

import scala.util.Random


final case class SessionMongo(
  _id: ObjectId,
  sessionName: String,
  sessionJoinCode: String,
  students: List[StudentUserMongo]
)

object SessionMongo:
  def generate(name: String, joinCode: String): SessionMongo =
    SessionMongo(
      _id = ObjectId.gen,
      sessionName = name,
      sessionJoinCode = joinCode,
      students = List()
    )

  def generateCode: String =
    Random
      .alphanumeric
      .take(6)
      .mkString

final case class StudentStatsMongo(
  _id: ObjectId,
  wealth: models.Number,
  health: models.Number,
  happiness: models.Number,
  scenariosDone: List[String],
)

final case class StudentUserMongo(
  _id: ObjectId = ObjectId.gen,
  userName: String,
  stats: StudentStatsMongo = StudentStatsMongo(
    _id = ObjectId.gen,
    wealth = 0,
    health = 0,
    happiness = 0,
    scenariosDone = List()
  )
)

// For every session create its own collection.
// Makes data streaming more efficient.
final case class ProfessorSessionMongo(
  _id: ObjectId,
  email: String,
  session: SessionMongo
)

object ProfessorSessionMongo:
  def generate(email: String, session: SessionMongo): ProfessorSessionMongo =
    ProfessorSessionMongo(
      _id = ObjectId.gen,
      email = email,
      session = session
    )
end ProfessorSessionMongo

final case class ProfessorUserMongo(
  _id: ObjectId,
  email: String,
  password: String
)


package circecoders:
  given sessionDecoder: Decoder[SessionMongo] = deriveDecoder[SessionMongo]
  given sessionEncoder: Encoder[SessionMongo] = deriveEncoder[SessionMongo]
  given studentStatsDecoder: Decoder[StudentStatsMongo] = deriveDecoder[StudentStatsMongo]
  given studentStatsEncoder: Encoder[StudentStatsMongo] = deriveEncoder[StudentStatsMongo]
  given studentUserDecoder: Decoder[StudentUserMongo] = deriveDecoder[StudentUserMongo]
  given studentUserEncoder: Encoder[StudentUserMongo] = deriveEncoder[StudentUserMongo]
  given professorSessionDecoder: Decoder[ProfessorSessionMongo] = deriveDecoder[ProfessorSessionMongo]
  given professorSessionEncoder: Encoder[ProfessorSessionMongo] = deriveEncoder[ProfessorSessionMongo]
  given professorUserDecoder: Decoder[ProfessorUserMongo] = deriveDecoder[ProfessorUserMongo]
  given professorUserEncoder: Encoder[ProfessorUserMongo] = deriveEncoder[ProfessorUserMongo]
end circecoders

package mongocodecs:
  import circecoders.given
  given sessionCodecProvider: MongoCodecProvider[SessionMongo] = deriveCirceCodecProvider
  given studentStatsCodecProvider: MongoCodecProvider[StudentStatsMongo] = deriveCirceCodecProvider
  given studentUserCodecProvider: MongoCodecProvider[StudentUserMongo] = deriveCirceCodecProvider
  given professorSessionCodecProvider: MongoCodecProvider[ProfessorSessionMongo] = deriveCirceCodecProvider
  given professorUserCodecProvider: MongoCodecProvider[ProfessorUserMongo] = deriveCirceCodecProvider
end mongocodecs

package bsonencoders:
  import circecoders.given
  given BsonValueEncoder[SessionMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[StudentUserMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[ProfessorSessionMongo] = deriveJsonBsonValueEncoder
  given BsonValueEncoder[ProfessorUserMongo] = deriveJsonBsonValueEncoder
end bsonencoders

