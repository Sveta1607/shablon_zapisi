// Ошибки входа по credentials: отдельные коды для UI (не путать с неверным паролем)
import { CredentialsSignin } from "@auth/core/errors";

/** Бросается из authorize, чтобы на клиенте отличить от неверного пароля */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

/** БД недоступна или DATABASE_URL неверен — иначе NextAuth показывает как неверные учётные данные */
export class DatabaseConfigurationError extends CredentialsSignin {
  code = "database_configuration";
}
