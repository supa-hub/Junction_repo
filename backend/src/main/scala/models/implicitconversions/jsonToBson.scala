package models.implicitconversions

import models.json.*
import models.mongo.*
import mongo4cats.bson.ObjectId


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
    scenariosDone = List(),
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
    turnsTaken = x.turnsTaken
  )

given Conversion[ScenarioTemplate, ScenarioTemplateMongo] with
  override def apply(x: ScenarioTemplate): ScenarioTemplateMongo = ScenarioTemplateMongo(
    key = x.key,
    title = x.title,
    narrative = x.narrative
  )

given Conversion[StudentUser, StudentUserMongo] with
  override def apply(x: StudentUser): StudentUserMongo = StudentUserMongo(
    _id = ObjectId.gen,
    userName = x.userName,
    currentScenario = x.currentScenario.map(identity),
    completedScenarios = x.completedScenarios.map(ObjectId.from(_).fold(_ => ObjectId.gen, id => id)),
    stats = x.stats
  )

given Conversion[Session, SessionMongo] with
  override def apply(x: Session): SessionMongo = SessionMongo(
    _id = ObjectId.gen,
    sessionName = x.sessionName,
    sessionJoinCode = x.sessionJoinCode,
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
