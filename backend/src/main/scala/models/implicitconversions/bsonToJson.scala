package models.implicitconversions

import models.json.*
import models.mongo.*
import java.util.Locale

private inline def normalizeJoinCode(code: String): String = code.trim.toUpperCase(Locale.ROOT)


given Conversion[StudentStatsMongo, StudentStats] with
  override def apply(x: StudentStatsMongo): StudentStats = StudentStats(
    wealth = x.wealth,
    health = x.health,
    happiness = x.happiness,
    riskTaking = x.riskTaking,
    overTrusting = x.overTrusting,
    laziness = x.laziness,
    impulsiveness = x.impulsiveness,
    scenariosDone = x.scenariosDone,
    longTermEffects = x.longTermEffects
  )

given Conversion[StudentHabitsMongo, StudentHabits] with
  override def apply(x: StudentHabitsMongo): StudentHabits = StudentHabits(
    overTrusting = x.overTrusting,
    laziness = x.laziness,
    impulsiveness = x.impulsiveness,
    riskTaking = x.riskTaking
  )

given Conversion[ScenarioStateMongo, ScenarioState] with
  override def apply(x: ScenarioStateMongo): ScenarioState = ScenarioState(
    template = x.template,
    turnsTaken = x.turnsTaken,
    history = x.history.map(turn => ScenarioTurn(role = turn.role, message = turn.message, timestamp = turn.timestamp))
  )

given Conversion[ScenarioTemplateMongo, ScenarioTemplate] with
  override def apply(x: ScenarioTemplateMongo): ScenarioTemplate = ScenarioTemplate(
    key = x.key,
    title = x.title,
    narrative = x.narrative
  )

given Conversion[ScenarioTurnMongo, ScenarioTurn] with
  override def apply(x: ScenarioTurnMongo): ScenarioTurn = ScenarioTurn(
    role = x.role,
    message = x.message,
    timestamp = x.timestamp
  )

given Conversion[StudentUserMongo, StudentUser] with
  override def apply(x: StudentUserMongo): StudentUser = StudentUser(
    studentId = x._id.toHexString,
    userName = x.userName,
    currentScenario = x.currentScenario.map(identity),
    completedScenarios = x.completedScenarios,
    stats = x.stats,
    habits = x.habits
  )

given Conversion[SessionMongo, Session] with
  override def apply(x: SessionMongo): Session = Session(
    sessionName = x.sessionName,
    sessionJoinCode = normalizeJoinCode(x.sessionJoinCode),
    location = x.location,
    monthlyIncome = x.monthlyIncome,
    students = x.students.map(identity),
    status = x.status,
    startedAt = x.startedAt,
    historyRuns = x.historyRuns
  )

given Conversion[ProfessorUserMongo, ProfessorUser] with
  override def apply(x: ProfessorUserMongo): ProfessorUser = ProfessorUser(
    email = x.email,
    password = x.password
  )

given Conversion[List[ProfessorUserMongo], ProfessorUser] with
  override def apply(x: List[ProfessorUserMongo]): ProfessorUser = ProfessorUser(
    email = x.headOption.map(_.email).getOrElse(""),
    password = x.headOption.map(_.password).getOrElse("")
  )
      