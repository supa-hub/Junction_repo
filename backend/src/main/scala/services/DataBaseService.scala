package services

import cats.effect.IO
import cats.effect.unsafe.implicits.global
import com.mongodb.client.model.Indexes
import com.mongodb.client.result.{UpdateResult, DeleteResult}
import models.Number
import models.mongo.bsonencoders.given
import models.mongo.mongocodecs.given
import models.mongo.{ProfessorSessionMongo, ProfessorUserMongo, SessionMongo, StudentUserMongo}
import models.settings.*
import mongo4cats.bson.syntax.*
import mongo4cats.client.*
import mongo4cats.collection.MongoCollection
import mongo4cats.database.MongoDatabase
import mongo4cats.models.collection.IndexOptions
import mongo4cats.operations.{Filter, Index, Update}

import scala.jdk.CollectionConverters.*

object DataBaseService:
  // indexes to use in the compoundIndexes. The compoundIndex is used
  // to identify a users unique sessions
  private val sessionField = "session"
  private val userCompoundIndex = Indexes.ascending("email")
  private val sessionIndex = Index.ascending("sessionName")
  private val sessionCodeIndex = Index.ascending("sessionJoinCode")
  private val uniqueSessionIndex = sessionIndex.combinedWith(sessionCodeIndex)

  private val resourceAllocated = MongoClient
    .fromConnectionString[IO](constructConnectionString)
    .allocated // get the client and the finalizers
    .memoize
    .flatten

  private val client = resourceAllocated.map(_._1)
  private val finalizers = resourceAllocated.flatMap(_._2)
  private val database: IO[MongoDatabase[IO]] = client.flatMap(_.getDatabase(Settings.get.databaseName))


  // get the different collections
  private val professorCollection: IO[MongoCollection[IO, ProfessorUserMongo]] = database
    .flatMap(_.getCollectionWithCodec[ProfessorUserMongo](Settings.get.userCollectionName))
    .flatTap(_.createIndex(userCompoundIndex))
    .memoize
    .flatten

  private val professorSessionCollection: IO[MongoCollection[IO, ProfessorSessionMongo]] = database
    .flatMap(_.getCollectionWithCodec[ProfessorSessionMongo](Settings.get.sessionCollectionName))
    .flatTap(_.createIndex(userCompoundIndex))
    .memoize
    .flatten

  /*
  private val sessionCollection: IO[MongoCollection[IO, SessionMongo]] = database
    .flatMap(_.getCollectionWithCodec[SessionMongo](Settings.get.collectionName))
    .flatTap(coll =>
      // create the indexes in the collection
      val indexRes = coll.createIndex(sessionIndex)
      val indexResComp = coll.createIndex(uniqueSessionIndex)
      (indexRes, indexResComp).parTupled
    )
    .memoize
    .flatten
  */

  // filters
  // ------------
  private inline def userFilter(userId: String) = Filter.eq("email", userId)
  private inline def userSessionFilter[A](value: A) = Filter.eq(s"${sessionField}.sessionJoinCode", value)
  private inline def sessionFilter(sessionJoinCode: String) = Filter.eq("sessionJoinCode", sessionJoinCode)
  // ------------

  def getFinalizers: IO[Unit] = finalizers

  private def constructConnectionString: String =
    val settings = Settings.get

    val loginString = settings.username match
      case Some(name) => s"${name}:${settings.password.getOrElse("")}@"
      case None => ""

    val srvString = if settings.isSRV
      then "+srv"
      else ""

    val addressString = if settings.isSRV
      then s"${settings.clusterName.getOrElse("")}.mongodb.net"
      else "localhost:28017"

    s"mongodb${srvString}://${loginString}${addressString}/?retryWrites=true&w=majority"

  /*
  def studentExists(session: String, userName: String): IO[Boolean] =
    val filter = Filter.eq("session", session) && Filter.elemMatch("session.students", Filter.eq("userName", userName))
    sessionCollection
      .flatMap(_.count(filter))
      .map(_ > 0)
    */

  def exists[A](collection: IO[MongoCollection[IO, A]], filters: Filter*): IO[Boolean] =
    collection
      .flatMap(_.count(filters.reduce(_ && _)))
      .map(_ > 0)

  /**
   * Adds a single User into the collection
   * @param aUser the object which represents the User
   * @param x$2 implicit conversion from A to UserDataMongo
   * @tparam A type which can be converted into UserDataMongo
   * @return
   */
  def addProfessor[A](aUser: A)(using Conversion[A, ProfessorUserMongo]): IO[Either[Throwable, Option[String]]] =
    val user: ProfessorUserMongo = aUser // there is an implicit conversion implemented in models.implicitconversions so this is valid
    professorCollection
      .flatMap(_.insertOne(user))
      .map(res => Option(res.getInsertedId))
      .map {
        case Some(value) => Some(value.asObjectId.getValue.toHexString)
        case None => None
      }
      .attempt

  /**
   * Same as .addUser(), but adds multiple users at once
   * @param users
   * @param x$2 implicit conversion from A to UserDataMongo
   * @tparam A type which can be converted into UserDataMongo
   * @return
   */
  def addMultipleUsers[A](users: List[A])(using Conversion[A, ProfessorUserMongo]): IO[Either[Throwable, List[String]]] =
    val document: List[ProfessorUserMongo] = users.map(identity)
    professorCollection
      .flatMap(_.insertMany(document))
      .map(
        _.getInsertedIds
         .asScala
         .values
         .map(
           _.asObjectId
             .getValue
             .toHexString
         )
         .toList
      )
      .attempt

  /**
   * Overload which takes in a single value, which can be converted into multiple users
   * which are inserted into the database
   * @param user
   * @param x$2 implicit conversion from A to List[UserDataMongo]
   * @tparam A type which can be converted into List[UserDataMongo]
   * @return
   */
  def addMultipleStudents[A](user: A)(using Conversion[A, List[ProfessorUserMongo]]): IO[Either[Throwable, List[String]]] =
    val document: List[ProfessorUserMongo] = user
    professorCollection
      .flatMap(_.insertMany(document))
      .map(_.getInsertedIds.asScala)
      .map(
        _.values
         .map(
           _.asObjectId
             .getValue
             .toHexString
         )
         .toList
      )
      .attempt

  /**
   * Adds the data into the <session> -collection
   * @param userId
   * @param aSession data to be added
   * @param x$3 implicit conversion from A to SessionMongo
   * @tparam A type which can be converted into SessionMongo
   * @return
   */
  def addStudentToSession(student: StudentUserMongo, sessionJoinCode: String): IO[Either[Throwable, UpdateResult]] =
    val filter = userSessionFilter(sessionJoinCode)
    val update = Update.addToSet(s"${sessionField}.students", student.toBson)
    professorSessionCollection
      .flatMap(_.updateOne(filter, update))
      .attempt

  def addData[A](userName: String, aSessionCode: String)(using Conversion[A, SessionMongo]): IO[Either[Throwable, UpdateResult]] =
    addStudentToSession(StudentUserMongo(userName = userName), aSessionCode)

  private def addMultiple[A](userNames: List[String], aSessionCode: String)(using Conversion[A, SessionMongo]): IO[Either[Throwable, UpdateResult]] =
    val filter = sessionFilter(aSessionCode)
    val data = userNames.map(name => StudentUserMongo(userName = name))
    val update = Update.addEachToSet(s"${sessionField}.students", data.map(_.toBson))
    professorSessionCollection
      .flatMap(_.updateOne(filter, update))
      .attempt

  /**
   * Creates a new session
   * @param email
   * @param aSessionName
   * @param location
   * @param x$4
   * @tparam A
   * @return
   */
  def addSession[A](email: String, aSessionName: String, location: String, monthlyIncome: Number)(using Conversion[A, SessionMongo]): IO[Either[Throwable, Option[String]]] =
    // find a session join code that isn't used yet
    val sessionCode = fs2.Stream.repeatEval(
      professorSessionCollection
        .map(coll =>
          val code = SessionMongo.generateCode
          (code, coll.find(userSessionFilter(code)))
        )
        .flatMap((code, res) => (IO.pure(code), res.first).parTupled)
      )
      .dropWhile(_._2.nonEmpty)
      .head
      .compile
      .toList
      .map(_.headOption.map(_._1).getOrElse(SessionMongo.generateCode))

    // create the actual session
    (sessionCode, professorSessionCollection)
      .parTupled
      .flatMap((code, collection) =>
        val data = SessionMongo.generate(aSessionName, code, location, monthlyIncome)
        collection.insertOne(ProfessorSessionMongo.generate(email, data))
      )
      .map(res => Option(res.getInsertedId))
      .map {
        case Some(value) => Some(value.asObjectId.getValue.toHexString)
        case None => None
      }
      .attempt

  def updateSession[A](email: String, aSession: A)(using Conversion[A, SessionMongo]): IO[Either[Throwable, Option[String]]] =
    val session: SessionMongo = aSession
    val filter = userFilter(email) && userSessionFilter(session.sessionJoinCode)

    val action = for
      coll <- professorSessionCollection
      maybeExisting <- coll.find(filter).first
      result <- maybeExisting match
        case Some(existing) =>
          val replacement = existing.copy(session = session)
          coll.replaceOne(filter, replacement).map(_ => Some(existing._id.toHexString))
        case None =>
          coll
            .insertOne(ProfessorSessionMongo.generate(email, session))
            .map(_.getInsertedId)
            .map(id => Option(id).map(_.asObjectId.getValue.toHexString))
    yield result

    action.attempt

  def deleteSession(email: String, sessionId: String): IO[Either[Throwable, DeleteResult]] =
    val filter = userFilter(email) && userSessionFilter(sessionId)
    professorSessionCollection
      .flatMap(_.deleteOne(filter))
      .attempt


  /**
   * Gets the users data by the specified userId
   * @param email
   * @param x$2 implicit conversions from UserDataMongo to A
   * @tparam A type which can be converted from UserDataMongo
   * @return
   */
  def getProfessorData[A](email: String)(using Conversion[Option[ProfessorUserMongo], Option[A]]): IO[Either[Throwable, Option[A]]] =
    professorCollection
      .map(_.find(userFilter(email)))
      .flatMap(_.first)
      .map[Option[A]](identity)
      .attempt

  /**
   * Gets the users data by the specified userId
   *
   * @param email
   * @param x$2 implicit conversion from UserDataMongo to A
   * @tparam A type which can be converted from UserDataMongo
   * @return
   */
  def getUserDataFromMultiple[A](email: String)(using Conversion[List[ProfessorUserMongo], A]): IO[Either[Throwable, A]] =
    professorCollection
      .map(_.find(userFilter(email)))
      .flatMap(_.all)
      .map(_.toList)
      .map[A](identity)
      .attempt

  def getDataAsStream[A](email: String, sessionId: Option[String] = None)(using Conversion[ProfessorUserMongo, A]): fs2.Stream[IO, A] =
    val userFil = userFilter(email)
    val filter = sessionId match
      case Some(value) => userFil && userSessionFilter(value)
      case None => userFil

    fs2.Stream.eval(
      professorCollection
        .map(_.find(filter))
        .map(_.stream)
      )
      .flatten
      .map(identity)

  def getSessionDataAsStream[A](email: String, sessionId: Option[String] = None)(using Conversion[SessionMongo, A]): fs2.Stream[IO, A] =
    val userFil = userFilter(email)
    val filter = sessionId match
      case Some(value) => userFil && userSessionFilter(value)
      case None => userFil

    fs2.Stream.eval(
        professorSessionCollection
          .map(_.find(filter))
          .map(_.stream)
      )
      .flatten
      .map(_.session)
      .map(identity)

  def getStudent[A](email: String, sessionId: String, studentName: String)(using c: Conversion[StudentUserMongo, A]): IO[Either[Throwable, A]] =
    val filter = userFilter(email) && userSessionFilter(sessionId)

    professorSessionCollection
      .map(_.find(filter))
      .flatMap(_.first)
      .map(_.toRight(Throwable("Couldn't find session")))
      .map(_.map(_.session.students.find(_.userName == studentName)))
      .map(_.flatMap(_.toRight(Throwable("Couldn't find student"))))
      .map(_.map(c.apply))
      .attempt
      .map(_.flatten)


  def getSession[A](email: String, sessionId: String)(using c: Conversion[SessionMongo, A]): IO[Either[Throwable, A]] =
    val filter = userFilter(email) && userSessionFilter(sessionId)

    professorSessionCollection
      .map(_.find(filter))
      .flatMap(_.first)
      .map(_.toRight(Throwable("Couldn't find session")))
      .map(_.map(_.session))
      .map(_.map(c.apply))
      .attempt
      .map(_.flatten)

  def getSessionByJoinCode(sessionJoinCode: String): IO[Either[Throwable, ProfessorSessionMongo]] =
    val filter = userSessionFilter(sessionJoinCode)

    professorSessionCollection
      .map(_.find(filter))
      .flatMap(_.first)
      .map(_.toRight(Throwable("Couldn't find session")))
      .attempt
      .map(_.flatten)


end DataBaseService
