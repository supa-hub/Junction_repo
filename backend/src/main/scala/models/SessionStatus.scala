package models

import upickle.default.ReadWriter


enum SessionStatus(val apiValue: String) derives ReadWriter:
  case Waiting extends SessionStatus("waiting_for_start")
  case InProgress extends SessionStatus("in_progress")
  case Completed extends SessionStatus("completed")
end SessionStatus


package statuscodecs:
  import io.circe.*
  import io.circe.generic.semiauto.*
  given sessionStatusEncoder: Encoder[SessionStatus] = deriveEncoder[SessionStatus]
  given sessionStatusDecoder: Decoder[SessionStatus] = deriveDecoder[SessionStatus]
end statuscodecs