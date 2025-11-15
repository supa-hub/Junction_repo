package models.labelGetters

import scala.compiletime.*
import scala.deriving.*

inline def getLabels[A]: List[String] =
  inline summonInline[Mirror.ProductOf[A]] match
    case m: Mirror.ProductOf[A] =>
      constValueTuple[m.MirroredElemLabels]
        .productIterator
        .map(_.toString)
        .toList

/*
inline def test[A <: Product](using p: Mirror.ProductOf[A]): List[String] =
  constValueTuple[p.MirroredElemLabels]
    .productIterator
    .map(_.toString)
    .toList
*/