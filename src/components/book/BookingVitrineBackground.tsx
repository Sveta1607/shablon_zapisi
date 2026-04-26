// Фон публичной витрины: цвет + фото. Нельзя использовать fixed + отрицательный z-index:
// в globals у body задан background — слои с -z20 уходят «под» фон body и не видны.
// isolation + absolute внутри relative — фон рисуется в своём контексте, поверх body.
import type { ReactNode } from "react";

type BookingVitrineBackgroundProps = {
  backgroundColor: string;
  backgroundImageUrl: string | null;
  children: ReactNode;
};

export function BookingVitrineBackground({
  backgroundColor,
  backgroundImageUrl,
  children,
}: BookingVitrineBackgroundProps) {
  // Валидация hex: иначе безопасный светлый тон, совместимый с type=color в админке
  const color = backgroundColor && /^#[0-9a-fA-F]{6}$/.test(backgroundColor) ? backgroundColor : "#f5f5f4";
  return (
    <div className="relative isolate min-h-dvh w-full max-w-full">
      {/* Слой заливки: под контентом, не перекрывает клики (контент выше) */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {backgroundImageUrl ? (
        // Картинка поверх заливки, ниже карточек; opacity, чтобы читались белые плашки
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            // Лёгкая смывка, чтобы картинка оставалась «фоном» и не мешала читать заголовок вне карточек
            opacity: 0.45,
          }}
          aria-hidden
        />
      ) : null}
      {/* Контент витрины: формы, карточки, логотип */}
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  );
}
