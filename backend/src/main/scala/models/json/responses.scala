package models.json

final case class SuccessfulResponse(res: String = "success")
final case class ErrorResponse(err: String)

final case class JoinSessionResponse(
  sessionId: String,
  studentId: String,
  initialStats: StudentStats,
  sessionStatus: Option[String] = None
)

final case class StudentDashboardResponse(
  stats: StudentStats,
  sessionStatus: Option[String] = None
)

final case class LeaderBoardEntry(
  rank: Int,
  name: String,
  wealth: models.Number,
  health: models.Number,
  happiness: models.Number,
  scenariosDone: Int
)
final case class LeaderBoard(updatedAt: String, entries: List[LeaderBoardEntry])

final case class CoreScenarioProgress(
  templateKey: String,
  completed: Int,
  remaining: Int
)
final case class StudentPace(studentId: String, scenariosPerMinute: models.Number, needsSupport: Boolean)
final case class ProgressResponse(
  coreScenarioCompletion: List[CoreScenarioProgress],
  pace: List[StudentPace]
)


final case class ClassroomSummary(students: Int, engagementRate: models.Number, avgScenariosCompleted: models.Number)
final case class StatDistribution(median: models.Number, p90: models.Number, min: models.Number, max: models.Number)
final case class HabitAverage(mean: models.Number, trend: String)
final case class LeaderboardHighlight(studentId: String, nickname: String, stat: String, value: models.Number)
final case class Recommendation(curriculumRef: String, summary: String, rationale: String)
final case class AnalyticsSummary(
  classroomSummary: ClassroomSummary,
  statDistributions: Map[String, StatDistribution],
  habitAverages: Map[String, HabitAverage],
  leaderboardHighlights: List[LeaderboardHighlight],
  recommendations: List[Recommendation]
)

final case class StatReason(stat: String, reason: String)
final case class StudentInsights(
  studentId: String,
  summary: String,
  weakPoints: List[StatReason],
  strongPoints: List[StatReason],
  trend: Map[String, List[models.Number]]
)

final case class ScenarioView(
  scenarioId: String,
  title: String,
  scenarioText: String
)

final case class StatEffect(stat: String, delta: models.Number)

final case class PromptReply(
  promptId: String,
  aiReply: String,
  status: String,
  accepted: Boolean,
  effects: List[StatEffect],
  effectsSummary: Option[String] = None,
  updatedStats: Option[StudentStats] = None
)

final case class SessionStarted(sessionId: String, status: String, startedAt: String)

final case class StudentRosterEntry(
  studentName: String,
  wealth: models.Number,
  health: models.Number,
  happiness: models.Number,
  currentScenarioTitle: Option[String],
  completedScenarioCount: Int
)

final case class SessionRosterResponse(students: List[StudentRosterEntry])

/**
 * I use this to serialize the data into a json format which will be returned as a response
 * for the request.
 */
package circecoders:
  import io.circe.*
  import io.circe.generic.semiauto.*
  import models.statuscodecs.given
  given responseEncoder: Encoder[SuccessfulResponse] = deriveEncoder[SuccessfulResponse]
  given responseDecoder: Decoder[SuccessfulResponse] = deriveDecoder[SuccessfulResponse]
  given errorResponseEncoder: Encoder[ErrorResponse] = deriveEncoder[ErrorResponse]
  given errorResponseDecoder: Decoder[ErrorResponse] = deriveDecoder[ErrorResponse]
  given joinSessionResponseEncoder: Encoder[JoinSessionResponse] = deriveEncoder[JoinSessionResponse]
  given studentDashboardResponseEncoder: Encoder[StudentDashboardResponse] = deriveEncoder[StudentDashboardResponse]
  given studentDashboardResponseDecoder: Decoder[StudentDashboardResponse] = deriveDecoder[StudentDashboardResponse]
  given entryEncoder: Encoder[LeaderBoardEntry] = deriveEncoder
  given entryDecoder: Decoder[LeaderBoardEntry] = deriveDecoder
  given leaderBoardEncoder: Encoder[LeaderBoard] = deriveEncoder
  given leaderBoardDecoder: Decoder[LeaderBoard] = deriveDecoder
  given coreScenarioEncoder: Encoder[CoreScenarioProgress] = deriveEncoder
  given coreScenarioDecoder: Decoder[CoreScenarioProgress] = deriveDecoder
  given studentPaceEncoder: Encoder[StudentPace] = deriveEncoder
  given studentPaceDecoder: Decoder[StudentPace] = deriveDecoder
  given progressResponseEncoder: Encoder[ProgressResponse] = deriveEncoder
  given progressResponseDecoder: Decoder[ProgressResponse] = deriveDecoder
  given classroomSummaryEncoder: Encoder[ClassroomSummary] = deriveEncoder
  given StatDistributionEncoder: Encoder[StatDistribution] = deriveEncoder
  given LeaderboardEncoder: Encoder[LeaderboardHighlight] = deriveEncoder
  given recommendationEncoder: Encoder[Recommendation] = deriveEncoder
  given habitAverageEncoder: Encoder[HabitAverage] = deriveEncoder
  given analyticsEncoder: Encoder[AnalyticsSummary] = deriveEncoder
  given statReasonEncoder: Encoder[StatReason] = deriveEncoder
  given studentInsightsEncoder: Encoder[StudentInsights] = deriveEncoder
  given sessionStartedEncoder: Encoder[SessionStarted] = deriveEncoder
  given scenarioViewEncoder: Encoder[ScenarioView] = deriveEncoder
  given studentRosterEntryEncoder: Encoder[StudentRosterEntry] = deriveEncoder
  given sessionRosterEncoder: Encoder[SessionRosterResponse] = deriveEncoder
  given statEffectEncoder: Encoder[StatEffect] = deriveEncoder
  given promptReplyEncoder: Encoder[PromptReply] = deriveEncoder
end circecoders

package http4sentities:
  import circecoders.given
  import cats.effect.IO
  import org.http4s.EntityEncoder
  import org.http4s.circe.jsonEncoderOf
  given responseEntity: EntityEncoder[IO, SuccessfulResponse] = jsonEncoderOf[IO, SuccessfulResponse]
  given errorResponseEntity: EntityEncoder[IO, ErrorResponse] = jsonEncoderOf[IO, ErrorResponse]
  given joinSessionResponseEntity: EntityEncoder[IO, JoinSessionResponse] = jsonEncoderOf
  given studentDashboardResponseEntity: EntityEncoder[IO, StudentDashboardResponse] = jsonEncoderOf
  given entryResponseEntity: EntityEncoder[IO, LeaderBoardEntry] = jsonEncoderOf
  given leaderBoardResponseEntity: EntityEncoder[IO, LeaderBoard] = jsonEncoderOf
  given coreScenarioResponseEntity: EntityEncoder[IO, CoreScenarioProgress] = jsonEncoderOf
  given studentPaceResponseEntity: EntityEncoder[IO, StudentPace] = jsonEncoderOf
  given progressResponseEntity: EntityEncoder[IO, ProgressResponse] = jsonEncoderOf
  given classroomSummaryEntity: EntityEncoder[IO, ClassroomSummary] = jsonEncoderOf
  given StatDistributionEntity: EntityEncoder[IO, StatDistribution] = jsonEncoderOf
  given LeaderboardEntity: EntityEncoder[IO, LeaderboardHighlight] = jsonEncoderOf
  given recommendationEntity: EntityEncoder[IO, Recommendation] = jsonEncoderOf
  given analyticsEntity: EntityEncoder[IO, AnalyticsSummary] = jsonEncoderOf
  given statReasonEntity: EntityEncoder[IO, StatReason] = jsonEncoderOf
  given studentInsightsEntity: EntityEncoder[IO, StudentInsights] = jsonEncoderOf
  given sessionStartedEntity: EntityEncoder[IO, SessionStarted] = jsonEncoderOf
  given scenarioViewEntity: EntityEncoder[IO, ScenarioView] = jsonEncoderOf
  given studentRosterEntryEntity: EntityEncoder[IO, StudentRosterEntry] = jsonEncoderOf
  given sessionRosterEntity: EntityEncoder[IO, SessionRosterResponse] = jsonEncoderOf
  given promptReplyEntity: EntityEncoder[IO, PromptReply] = jsonEncoderOf
end http4sentities
