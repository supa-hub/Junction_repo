package models.implicitconversions

import models.json.*
import models.mongo.*


given Conversion[StudentStatsMongo, StudentStats] with
  override def apply(x: StudentStatsMongo): StudentStats = StudentStats(
    wealth = x.wealth,
    health = x.health,
    happiness = x.happiness,
    riskTaking = x.riskTaking,
    overTrusting = x.overTrusting,
    laziness = x.laziness,
    impulsiveness = x.impulsiveness,
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
    turnsTaken = x.turnsTaken
  )

given Conversion[ScenarioTemplateMongo, ScenarioTemplate] with
  override def apply(x: ScenarioTemplateMongo): ScenarioTemplate = ScenarioTemplate(
    key = x.key,
    title = x.title,
    narrative = x.narrative
  )

given Conversion[StudentUserMongo, StudentUser] with
  override def apply(x: StudentUserMongo): StudentUser = StudentUser(
    userName = x.userName,
    currentScenario = x.currentScenario.map(identity),
    completedScenarios = x.completedScenarios.map(_.toString),
    stats = x.stats,
    habits = x.habits
  )

given Conversion[SessionMongo, Session] with
  override def apply(x: SessionMongo): Session = Session(
    sessionName = x.sessionName,
    sessionJoinCode = x.sessionJoinCode,
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
      