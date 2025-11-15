package routes

import cats.syntax.all.*
import org.http4s.implicits.*
import org.http4s.server.middleware.AutoSlash
import cats.effect.IO
import cats.data.Kleisli
import org.http4s.*


object AllRoutes:
  val route: HttpRoutes[IO] = JsonRoutes.route
  val withSlashRoute: HttpRoutes[IO] = AutoSlash(route)
end AllRoutes


