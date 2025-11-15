package models.implicitconversions

given optionConverter[A, B](using Conversion[A, B]): Conversion[Option[A], Option[B]] with
  override def apply(x: Option[A]): Option[B] = x match
      case Some(value) => Some(value)
      case None => None

given sameTypeOptionConverter[A]: Conversion[Option[A], Option[A]] with
  override def apply(x: Option[A]): Option[A] = x