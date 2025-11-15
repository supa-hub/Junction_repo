ThisBuild / version := "0.1.0-SNAPSHOT"

ThisBuild / scalaVersion := "3.6.3"

val http4sVersion = "0.23.30"

lazy val root = (project in file("."))
  .settings(
    name := "backend",
    scalaVersion := "3.6.3",

    libraryDependencies += "org.scala-lang" %% "toolkit" % "0.7.0",

    libraryDependencies += "org.scalatest" %% "scalatest" % "3.2.19" % "test",

    libraryDependencies += "io.github.kirill5k" %% "mongo4cats-core" % "0.7.13",
    libraryDependencies += "io.github.kirill5k" %% "mongo4cats-circe" % "0.7.13",

    libraryDependencies += "org.typelevel" %% "cats-core" % "2.13.0",
    libraryDependencies += "org.gnieh" %% "fs2-data-csv" % "1.12.0",
    libraryDependencies += "org.gnieh" %% "fs2-data-csv-generic" % "1.12.0",
    libraryDependencies += "org.gnieh" %% "fs2-data-json" % "1.12.0",
    libraryDependencies += "co.fs2" %% "fs2-io" % "3.13.0-M5",

    libraryDependencies += "de.lhns" %% "fs2-compress-zip" % "2.3.0",

    libraryDependencies += "org.http4s" %% "http4s-ember-server" % http4sVersion,
    libraryDependencies += "org.http4s" %% "http4s-dsl"          % http4sVersion,
    libraryDependencies += "org.http4s" %% "http4s-circe"        % http4sVersion,
    libraryDependencies += "io.circe" %% "circe-generic" % "0.14.14",

    libraryDependencies += "com.github.jwt-scala" %% "jwt-circe" % "11.0.3",
    libraryDependencies += "com.github.jwt-scala" %% "jwt-play" % "11.0.3",

    libraryDependencies += "com.google.adk" % "google-adk" % "0.3.0"
  )
