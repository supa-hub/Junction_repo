package models.settings

import upickle.default.ReadWriter
import upickle.default.{read, write}
import os.Path
import scala.io.Source


final case class Settings(
  isSRV: Boolean,
  username: Option[String],
  password: Option[String],
  clusterName: Option[String],
  databaseName: String,
  userCollectionName: String,
  sessionCollectionName: String,
  adminUserName: Option[String],
  adminPassword: Option[String]
) derives ReadWriter:
  require(
    (username.isDefined && password.isDefined)
    || (username.isEmpty && password.isEmpty),
    "Either both username and password are defined, or neither are."
  )
  
  
object Settings:
  private val res: String = Source.fromResource("settings.json")
    .getLines
    .mkString
  
  def get: Settings = read(res)
end Settings
