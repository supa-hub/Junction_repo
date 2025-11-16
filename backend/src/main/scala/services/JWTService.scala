package services

import io.circe.{Json, parser}
import models.json.LoginPayload

import java.time.Instant
import pdi.jwt.{JwtAlgorithm, JwtCirce, JwtClaim, JwtSession}
import play.api.Configuration
import java.time.Clock
import scala.util.Try


object JWTService:
  private val key = "secretKey"
  private val algo = JwtAlgorithm.HS256
  given conf: Configuration = Configuration.reference
  given clock: Clock = Clock.systemUTC


  private val emailKey = "email"

  def create(payload: LoginPayload): String =
    val now = Instant.now
    val claim = JwtClaim(
      content = Json.obj(emailKey -> Json.fromString(payload.email)).noSpaces,
      subject = Some(payload.email),
      expiration = Some(now.plusSeconds(157784760).getEpochSecond),
      issuedAt = Some(now.getEpochSecond)
    )
    JwtCirce.encode(claim, key, algo)
  def decode(token: String): Try[JwtClaim] = JwtCirce.decode(token, key, Seq(algo))

  def extractEmail(claim: JwtClaim): Either[String, String] =
    claim.subject
      .orElse(
        parser
          .parse(claim.content)
          .toOption
          .flatMap(_.hcursor.get[String](emailKey).toOption)
      )
      .toRight("Couldn't decode email from token")

end JWTService
