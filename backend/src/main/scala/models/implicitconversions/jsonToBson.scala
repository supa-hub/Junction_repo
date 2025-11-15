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

given Conversion[StudentUser, StudentUserMongo] with
  override def apply(x: StudentUser): StudentUserMongo = StudentUserMongo(
    _id = ObjectId.gen,
    userName = x.userName,
    stats = x.stats
  )

given Conversion[Session, SessionMongo] with
  override def apply(x: Session): SessionMongo = SessionMongo(
    _id = ObjectId.gen,
    sessionName = x.sessionName,
    sessionJoinCode = x.sessionJoinCode,
    students = x.students.map(identity)
  )

given Conversion[ProfessorUser, ProfessorUserMongo] with
  override def apply(x: ProfessorUser): ProfessorUserMongo = 
    ProfessorUserMongo(
      _id = ObjectId.gen,
      email = x.email,
      password = x.password
    )
