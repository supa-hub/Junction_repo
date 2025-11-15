package services

import cats.effect.unsafe.implicits.global
import io.circe.syntax.*
import org.scalatest.funsuite.AnyFunSuite

class GameSimulationServiceSpec extends AnyFunSuite:

  test("createSession stores location and monthly income") {
    val teacherId = "test-teacher"
    val sessionName = "Economics 101"
    val location = "Helsinki"
    val monthlyIncome = 4200.0

    val created = GameSimulationService
      .createSession(teacherId, sessionName, location, monthlyIncome)
      .unsafeRunSync()

    assert(created.location == location)
    assert(created.monthlyIncome == monthlyIncome)

    val sessions = GameSimulationService
      .listTeacherSessions(teacherId)
      .unsafeRunSync()

    val session = sessions.find(_.sessionId == created.sessionId).getOrElse(fail("session not found"))

    assert(session.location == location)
    assert(session.monthlyIncome == monthlyIncome)

    val json = session.asJson
    assert(json.hcursor.get[String]("location").toOption.contains(location))
    assert(json.hcursor.get[Double]("monthlyIncome").toOption.contains(monthlyIncome))
  }
