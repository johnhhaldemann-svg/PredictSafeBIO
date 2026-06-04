"use client";

import { useState } from "react";

type Strength = "empty" | "weak" | "fair" | "good" | "strong";

function scorePassword(password: string): { strength: Strength; label: string; score: number } {
  if (!password) return { strength: "empty", label: "", score: 0 };

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Penalise very common patterns
  if (/^(.)\1+$/.test(password) || ["password", "12345678", "qwerty"].some((p) => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
  }

  if (score <= 1) return { strength: "weak",   label: "Weak",   score };
  if (score === 2) return { strength: "fair",   label: "Fair",   score };
  if (score === 3) return { strength: "good",   label: "Good",   score };
  return              { strength: "strong", label: "Strong", score };
}

const STRENGTH_WIDTH: Record<Strength, string> = {
  empty:  "0%",
  weak:   "25%",
  fair:   "50%",
  good:   "75%",
  strong: "100%",
};

const STRENGTH_COLOR: Record<Strength, string> = {
  empty:  "transparent",
  weak:   "#C00000",
  fair:   "#E26B0A",
  good:   "#1F6B2E",
  strong: "#375623",
};

type Props = {
  /** Pass the name to identify the input in formData — default "password" */
  name?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
};

export function PasswordStrengthMeter({
  name = "password",
  minLength = 8,
  required = true,
  autoComplete = "new-password"
}: Props) {
  const [value, setValue] = useState("");
  const { strength, label, score } = scorePassword(value);
  const tooShort = value.length > 0 && value.length < minLength;

  return (
    <div className="password-strength-field">
      <input
        name={name}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby="password-strength-hint"
      />
      {value && (
        <div className="password-strength-bar" role="presentation" aria-hidden>
          <div
            className="password-strength-fill"
            style={{
              width: STRENGTH_WIDTH[strength],
              background: STRENGTH_COLOR[strength],
              transition: "width 0.2s ease, background 0.2s ease"
            }}
          />
        </div>
      )}
      {value && (
        <p
          id="password-strength-hint"
          className="password-strength-hint"
          style={{ color: STRENGTH_COLOR[strength] }}
        >
          {tooShort
            ? `At least ${minLength} characters required`
            : `Password strength: ${label}`}
        </p>
      )}
    </div>
  );
}
