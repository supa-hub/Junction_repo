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

given Conversion[StudentUserMongo, StudentUser] with
  override def apply(x: StudentUserMongo): StudentUser = StudentUser(
    userName = x.userName,
    stats = x.stats,
    habits = x.habits
  )

given Conversion[SessionMongo, Session] with
  override def apply(x: SessionMongo): Session = Session(
    sessionName = x.sessionName,
    sessionJoinCode = x.sessionJoinCode,
    students = x.students.map(identity)
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
      