package models.implicitconversions

import models.json.*
import models.mongo.*
import mongo4cats.bson.ObjectId
import java.util.Locale

private inline def normalizeJoinCode(code: String): String = code.trim.toUpperCase(Locale.ROOT)


given Conversion[StudentStats, StudentStatsMongo] with
  override def apply(x: StudentStats): StudentStatsMongo = StudentStatsMongo(
    _id = ObjectId.gen,
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

given Conversion[StudentHabits, StudentHabitsMongo] with
  override def apply(x: StudentHabits): StudentHabitsMongo = StudentHabitsMongo(
    _id = ObjectId.gen,
    overTrusting = x.overTrusting,
    laziness = x.laziness,
    impulsiveness = x.impulsiveness,
    riskTaking = x.riskTaking
  )

given Conversion[ScenarioState, ScenarioStateMongo] with
  override def apply(x: ScenarioState): ScenarioStateMongo = ScenarioStateMongo(
    _id = ObjectId.gen,
    template = x.template,
    turnsTaken = x.turnsTaken,
    history = x.history.map(turn => ScenarioTurnMongo(role = turn.role, message = turn.message, timestamp = turn.timestamp))
  )

given Conversion[ScenarioTemplate, ScenarioTemplateMongo] with
  override def apply(x: ScenarioTemplate): ScenarioTemplateMongo = ScenarioTemplateMongo(
    key = x.key,
    title = x.title,
    narrative = x.narrative
  )

given Conversion[ScenarioTurn, ScenarioTurnMongo] with
  override def apply(x: ScenarioTurn): ScenarioTurnMongo = ScenarioTurnMongo(
    role = x.role,
    message = x.message,
    timestamp = x.timestamp
  )

given Conversion[StudentUser, StudentUserMongo] with
  override def apply(x: StudentUser): StudentUserMongo =
    val identifier = ObjectId.from(x.studentId).fold(_ => ObjectId.gen, identity)
    StudentUserMongo(
      _id = identifier,
      userName = x.userName,
      currentScenario = x.currentScenario.map(identity),
      completedScenarios = x.completedScenarios,
      stats = x.stats,
      habits = x.habits
    )

given Conversion[Session, SessionMongo] with
  override def apply(x: Session): SessionMongo = SessionMongo(
    _id = ObjectId.gen,
    sessionName = x.sessionName,
    sessionJoinCode = normalizeJoinCode(x.sessionJoinCode),
    location = x.location,
    monthlyIncome = x.monthlyIncome,
    students = x.students.map(identity),
    status = x.status,
    startedAt = x.startedAt,
    scenarioCompletions = Map(),
    historyRuns = x.historyRuns
  )

given Conversion[ProfessorUser, ProfessorUserMongo] with
  override def apply(x: ProfessorUser): ProfessorUserMongo = 
    ProfessorUserMongo(
      _id = ObjectId.gen,
      email = x.email,
      password = x.password
    )
