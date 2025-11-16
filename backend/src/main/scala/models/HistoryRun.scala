package models

import upickle.default.ReadWriter


final case class HistoryRun(
  runId: String,
  medianWealth: models.Number,
  medianHabits: Map[String, models.Number]
) derives ReadWriter


package historycodecs:
  import io.circe.*
  import io.circe.generic.semiauto.*
  given historyEncoder: Encoder[HistoryRun] = deriveEncoder[HistoryRun]
  given historyDecoder: Decoder[HistoryRun] = deriveDecoder[HistoryRun]
end historycodecs