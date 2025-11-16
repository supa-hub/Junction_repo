import routes.*
import cats.syntax.all.*
import com.comcast.ip4s.*
import org.http4s.ember.server.*
import org.http4s.implicits.*
import org.http4s.server.Router
import org.http4s.server.middleware.CORS
import cats.effect.*
import org.http4s.{HttpRoutes, Method}
import org.typelevel.ci.CIString
import cats.effect.std.Console
import services.DataBaseService
import scala.concurrent.duration.*
import scala.util.Properties


object Main extends IOApp:
  override def run(args: List[String]): IO[ExitCode] =
    val port = Properties.envOrElse("PORT", "80").toInt
    val services = AllRoutes.withSlashRoute

    val allowedHeaders = Set(
      CIString("Content-Type"),
      CIString("Authorization"),
      CIString("Accept"),
      CIString("X-Requested-With")
    )

    val allowedMethods = Set(
      Method.GET,
      Method.POST,
      Method.PUT,
      Method.PATCH,
      Method.DELETE,
      Method.OPTIONS
    )

    val corsPolicy = CORS
      .policy
      .withAllowOriginAll
      .withAllowHeadersIn(allowedHeaders)
      .withAllowMethodsAll
      .withMaxAge(1.day)

    val httpApp = Router("/" -> services).orNotFound
    val corsHttpApp = corsPolicy(httpApp)

    // start the server which runs until you terminate it in the terminal where you started it
    EmberServerBuilder
      .default[IO]
      .withHost(ipv4"0.0.0.0")
      .withPort(Port.fromInt(port).get)
      .withHttpApp(corsHttpApp)
      .build
      .use(_ => IO.never)
      .guarantee(DataBaseService.getFinalizers)
      .as(ExitCode.Success)
end Main