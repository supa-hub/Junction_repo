package models.json

final case class SuccessfulResponse(res: String = "success")
final case class ErrorResponse(err: String)


/**
 * I use this to serialize the data into a json format which will be returned as a response
 * for the request.
 */
package circecoders:
  import io.circe.*
  import io.circe.generic.semiauto.*
  given responseEncoder: Encoder[SuccessfulResponse] = deriveEncoder[SuccessfulResponse]
  given responseDecoder: Decoder[SuccessfulResponse] = deriveDecoder[SuccessfulResponse]
  given errorResponseEncoder: Encoder[ErrorResponse] = deriveEncoder[ErrorResponse]
  given errorResponseDecoder: Decoder[ErrorResponse] = deriveDecoder[ErrorResponse]
end circecoders

package http4sentities:
  import circecoders.given
  import cats.effect.IO
  import org.http4s.EntityEncoder
  import org.http4s.circe.jsonEncoderOf
  given responseEntity: EntityEncoder[IO, SuccessfulResponse] = jsonEncoderOf[IO, SuccessfulResponse]
  given errorResponseEntity: EntityEncoder[IO, ErrorResponse] = jsonEncoderOf[IO, ErrorResponse]
end http4sentities
