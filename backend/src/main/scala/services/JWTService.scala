package services

import io.circe.Json
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


  def create(payload: LoginPayload): String =
    val claim = JwtClaim(
      content = payload.email,
      expiration = Some(Instant.now.plusSeconds(157784760).getEpochSecond),
      issuedAt = Some(Instant.now.getEpochSecond)
    )
    JwtCirce.encode(claim, key, algo)


  def decode(token: String): Try[JwtClaim] = JwtCirce.decode(token, key, Seq(algo))

end JWTService
