// Расширение типов NextAuth: id пользователя в объекте session.user для серверных проверок
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}
