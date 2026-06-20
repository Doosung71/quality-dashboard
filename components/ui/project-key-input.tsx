"use client";

import { useEffect, useState } from "react";
import { isValidProjectKey, normalizeProjectKey } from "@/lib/project-key";

// Q1 project_key 입력 — datalist 기반 autocomplete + kebab-case 자동 정규화.
// 기존 키 재사용을 유도해 표기 흔들림(같은 프로젝트 다른 키)을 방지한다.
// 선택 필드: 비워두면 키 없이 저장(fail-open).
export function ProjectKeyInput({
  value,
  onChange,
  inputClassName,
  id = "project-key",
}: {
  value: string;
  onChange: (v: string) => void;
  inputClassName?: string;
  id?: string;
}) {
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/project-keys")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (active && Array.isArray(d)) setOptions(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && !isValidProjectKey(trimmed);

  return (
    <div className="flex flex-col gap-1">
      <input
        id={id}
        list={`${id}-options`}
        type="text"
        value={value}
        placeholder="예: qat-gtc-3001-230kv (선택)"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const n = normalizeProjectKey(e.target.value);
          if (n !== e.target.value) onChange(n);
        }}
        className={inputClassName}
      />
      <datalist id={`${id}-options`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      {invalid && (
        <span className="text-[11px] text-red-600">
          소문자·숫자·하이픈만 사용하세요 (kebab-case)
        </span>
      )}
    </div>
  );
}
